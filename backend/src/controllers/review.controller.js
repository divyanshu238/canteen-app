import { Review, Order, Canteen } from '../models/index.js';
import mongoose from 'mongoose';

/**
 * Recalculate and update canteen ratings with weighted logic
 * Weight Rules:
 * - Reviews <= 30 days old: 1.5x weight
 * - Reviews > 30 days old: 1.0x weight
 */
const updateCanteenRating = async (canteenId) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = await Review.aggregate([
            { $match: { canteenId: new mongoose.Types.ObjectId(canteenId) } },
            {
                $project: {
                    rating: 1,
                    createdAt: 1,
                    weight: {
                        $cond: {
                            if: { $gte: ["$createdAt", thirtyDaysAgo] },
                            then: 1.5,
                            else: 1.0
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$canteenId",
                    weightedSum: { $sum: { $multiply: ["$rating", "$weight"] } },
                    totalWeight: { $sum: "$weight" },
                    count: { $sum: 1 },
                    star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
                    star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                    star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                    star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                    star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }
                }
            }
        ]);

        if (stats.length > 0) {
            const result = stats[0];
            // Avoid division by zero (though count > 0 implies totalWeight > 0)
            const averageRating = result.totalWeight > 0
                ? (result.weightedSum / result.totalWeight)
                : 0;

            // Round to 1 decimal place
            const roundedRating = Math.round(averageRating * 10) / 10;

            await Canteen.findByIdAndUpdate(canteenId, {
                rating: roundedRating,
                totalRatings: result.count,
                ratingBreakdown: {
                    5: result.star5,
                    4: result.star4,
                    3: result.star3,
                    2: result.star2,
                    1: result.star1
                }
            });
        } else {
            // Reset if no reviews
            await Canteen.findByIdAndUpdate(canteenId, {
                rating: 0,
                totalRatings: 0,
                ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            });
        }
    } catch (err) {
        console.error('Stats Update Error:', err);
    }
};

export const createReview = async (req, res, next) => {
    try {
        const { orderId, rating, comment } = req.body;
        const userId = req.user._id;

        if (!orderId || !rating) {
            return res.status(400).json({ success: false, error: 'Order ID and rating are required' });
        }

        // Check for completed order
        const order = await Order.findOne({
            _id: orderId,
            userId,
            status: { $in: ['completed', 'delivered'] } // Handle legacy 'delivered' if exists, prefer 'completed'
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found or not eligible for review (must be completed)' });
        }

        if (order.isReviewed) {
            return res.status(400).json({ success: false, error: 'Order already reviewed' });
        }

        // Create Review
        const review = await Review.create({
            userId,
            canteenId: order.canteenId,
            orderId,
            rating,
            comment
        });

        // Update Order
        order.isReviewed = true;
        order.rating = rating;
        order.review = comment;
        order.reviewCreatedAt = review.createdAt;
        await order.save();

        // Update Canteen Stats
        await updateCanteenRating(order.canteenId);

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Review already exists for this order' });
        }
        next(error);
    }
};

export const updateReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, userId });

        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }

        // 15-Minute Edit Window Rule
        const fifteenMinutes = 15 * 60 * 1000;
        const timeDiff = Date.now() - new Date(review.createdAt).getTime();

        if (timeDiff > fifteenMinutes) {
            return res.status(403).json({ success: false, error: 'Edit window expired (15 minutes limit)' });
        }

        // Update Review
        review.rating = rating || review.rating;
        review.comment = comment !== undefined ? comment : review.comment;
        await review.save();

        // Sync with Order
        await Order.findByIdAndUpdate(review.orderId, {
            rating: review.rating,
            review: review.comment
        });

        // Update Canteen Stats
        await updateCanteenRating(review.canteenId);

        res.json({ success: true, data: review });

    } catch (error) {
        next(error);
    }
};

export const getReviewByOrder = async (req, res, next) => {
    try {
        const review = await Review.findOne({ orderId: req.params.orderId, userId: req.user._id });
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
        res.json({ success: true, data: review });
    } catch (error) {
        next(error);
    }
};

export default { createReview, updateReview, getReviewByOrder };
