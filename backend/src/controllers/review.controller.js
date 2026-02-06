import { Review, Order, Canteen } from '../models/index.js';
import mongoose from 'mongoose';

// ============================================
// HELPER: FRAUD DETECTION
// ============================================
const detectFraud = async (userId, canteenId, rating, comment) => {
    try {
        const flags = [];

        // 1. Velocity Check (Max 3 reviews in 10 mins)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentCount = await Review.countDocuments({
            userId,
            createdAt: { $gte: tenMinutesAgo }
        });

        if (recentCount >= 3) {
            flags.push('Velocity Check: >3 reviews in 10 mins');
        }

        // 2. Duplicate Text Check
        if (comment) {
            const lastReview = await Review.findOne({ userId }).sort({ createdAt: -1 });
            if (lastReview && lastReview.comment === comment) {
                flags.push('Spam Check: Duplicate review text');
            }
        }

        // 3. Rating Deviation Check
        const canteen = await Canteen.findById(canteenId);
        if (canteen && canteen.totalRatings > 5) { // Only checking if established
            const deviation = Math.abs(canteen.rating - rating);
            if (deviation > 2.5) { // e.g. 5 vs 1, or 1 vs 5 (when avg is high/low)
                // flags.push(`Deviation Check: Rating deviates by ${deviation.toFixed(1)} stars`); 
                // Commented out deviation flag to avoid flagging genuine bad experiences too aggressively, 
                // but kept logic if needed. Let's stick to strict spam for now.
            }
        }

        return flags.length > 0 ? flags.join('; ') : null;
    } catch (err) {
        console.error('Fraud Check Error:', err);
        return null;
    }
};

// ============================================
// HELPER: AI SUMMARY GENERATOR (MOCKED)
// ============================================
const generateAiSummary = async (canteenId) => {
    try {
        // Fetch recent reviews (last 60 days, max 20)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const reviews = await Review.find({
            canteenId,
            comment: { $exists: true, $ne: '' },
            createdAt: { $gte: sixtyDaysAgo },
            isFlagged: false
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('comment rating');

        if (reviews.length < 5) return; // Not enough data

        // Keyword extraction (Simple Heuristic for "AI" feel)
        const keywords = {
            positive: ['tasty', 'fresh', 'fast', 'good', 'great', 'delicious', 'yummy', 'hot', 'best', 'clean'],
            negative: ['slow', 'cold', 'bad', 'stale', 'oily', 'expensive', 'small', 'dirty', 'late', 'messy']
        };

        const counts = { positive: {}, negative: {} };

        reviews.forEach(r => {
            const text = r.comment.toLowerCase();
            keywords.positive.forEach(word => {
                if (text.includes(word)) counts.positive[word] = (counts.positive[word] || 0) + 1;
            });
            keywords.negative.forEach(word => {
                if (text.includes(word)) counts.negative[word] = (counts.negative[word] || 0) + 1;
            });
        });

        // Get top traits
        const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
        const pros = getTop(counts.positive);
        const cons = getTop(counts.negative);

        let summary = "Customers haven't shared enough details yet.";

        if (pros.length > 0 && cons.length > 0) {
            summary = `Customers love the ${pros.join(' and ')}, but occasionally mention the food being ${cons.join(' or ')}.`;
        } else if (pros.length > 0) {
            summary = `Reviewers consistently praise the ${pros.join(' and ')}. A highly recommended spot!`;
        } else if (cons.length > 0) {
            summary = `Some customers reported issues with ${cons.join(' and ')}, though others had a decent experience.`;
        } else {
            // Fallback for generic reviews
            summary = "Diners generally have a positive experience, highlighting the consistent quality and service.";
        }

        // Update Canteen
        await Canteen.findByIdAndUpdate(canteenId, { reviewSummary: summary });

    } catch (err) {
        console.error('AI Summary Error:', err);
    }
};

/**
 * Recalculate and update canteen ratings with weighted logic
 */
const updateCanteenRating = async (canteenId) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = await Review.aggregate([
            { $match: { canteenId: new mongoose.Types.ObjectId(canteenId), isFlagged: false } }, // Exclude flagged
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
            const averageRating = result.totalWeight > 0
                ? (result.weightedSum / result.totalWeight)
                : 0;

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

            // Trigger AI Summary every 5 reviews (approx check)
            if (result.count % 5 === 0) {
                generateAiSummary(canteenId);
            }

        } else {
            await Canteen.findByIdAndUpdate(canteenId, {
                rating: 0,
                totalRatings: 0,
                ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                reviewSummary: ''
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

        const order = await Order.findOne({
            _id: orderId,
            userId,
            status: { $in: ['completed', 'delivered'] }
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found or not eligible for review' });
        }

        if (order.isReviewed) {
            return res.status(400).json({ success: false, error: 'Order already reviewed' });
        }

        // FRAUD CHECK
        const flagReason = await detectFraud(userId, order.canteenId, rating, comment);
        const isFlagged = !!flagReason;

        // Create Review
        const review = await Review.create({
            userId,
            canteenId: order.canteenId,
            orderId,
            rating,
            comment,
            isFlagged,
            flagReason
        });

        // Update Order
        order.isReviewed = true;
        order.rating = rating;
        order.review = comment;
        order.reviewCreatedAt = review.createdAt;
        await order.save();

        // Update Stats (only if not flagged)
        if (!isFlagged) {
            await updateCanteenRating(order.canteenId);
        }

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

        // Fraud check again on edit
        const flagReason = await detectFraud(userId, review.canteenId, rating, comment);
        const isFlagged = !!flagReason;

        // Update Review
        review.rating = rating || review.rating;
        review.comment = comment !== undefined ? comment : review.comment;
        review.isFlagged = isFlagged;
        review.flagReason = flagReason || undefined;

        await review.save();

        // Sync with Order
        await Order.findByIdAndUpdate(review.orderId, {
            rating: review.rating,
            review: review.comment
        });

        // Update Canteen Stats (if status changed or rating changed)
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
