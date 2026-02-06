import { Review, Order, Canteen } from '../models/index.js';

export const createReview = async (req, res, next) => {
    try {
        const { orderId, rating, comment } = req.body;
        const userId = req.user._id;

        // Validation
        if (!orderId || !rating) {
            return res.status(400).json({ success: false, error: 'Order ID and rating are required' });
        }

        const order = await Order.findOne({ _id: orderId, userId, status: 'delivered' });

        // Basic check for testing (allow rating non-delivered in dev maybe? No, stick to prompt)
        // Prompt says: "Order must be delivered"
        // Prompt says check "Order must belong to user" -> Checked via query

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found or not eligible for review (must be delivered)' });
        }

        if (order.isReviewed) {
            return res.status(400).json({ success: false, error: 'Order already reviewed' });
        }

        // Create
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
        await order.save();

        // Update Canteen Stats (Async)
        updateCanteenRating(order.canteenId);

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Review already exists for this order' });
        }
        next(error);
    }
};

const updateCanteenRating = async (canteenId) => {
    try {
        const stats = await Review.aggregate([
            { $match: { canteenId: canteenId } },
            { $group: { _id: '$canteenId', avgRating: { $avg: '$rating' }, total: { $sum: 1 } } }
        ]);

        if (stats.length > 0) {
            await Canteen.findByIdAndUpdate(canteenId, {
                rating: Math.round(stats[0].avgRating * 10) / 10,
                totalRatings: stats[0].total
            });
        }
    } catch (err) {
        console.error('Stats Update Error:', err);
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

export default { createReview, getReviewByOrder };
