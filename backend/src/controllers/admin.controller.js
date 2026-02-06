import { User, Canteen, Order, MenuItem, Review } from '../models/index.js';

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res, next) => {
    try {
        const { role, status, search, limit = 50, page = 1 } = req.query;

        const query = {};

        if (role) query.role = role;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            count: users.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: users
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user by ID
 * GET /api/admin/users/:id
 */
export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get additional info based on role
        let additionalInfo = {};
        if (user.role === 'partner') {
            const canteen = await Canteen.findOne({ ownerId: user._id });
            const orderCount = canteen ? await Order.countDocuments({ canteenId: canteen._id }) : 0;
            additionalInfo = { canteen, orderCount };
        } else if (user.role === 'student') {
            const orderCount = await Order.countDocuments({ userId: user._id });
            additionalInfo = { orderCount };
        }

        res.json({
            success: true,
            data: { ...user.toObject(), ...additionalInfo }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user status (activate/deactivate/approve)
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req, res, next) => {
    try {
        const { isActive, isApproved, role } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent modifying other admins
        if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Cannot modify other admin accounts'
            });
        }

        if (typeof isActive === 'boolean') user.isActive = isActive;
        if (typeof isApproved === 'boolean') user.isApproved = isApproved;
        if (role && ['student', 'partner'].includes(role)) user.role = role;

        await user.save();

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all canteens (including unapproved)
 * GET /api/admin/canteens
 */
export const getAllCanteens = async (req, res, next) => {
    try {
        const { status, search } = req.query;

        const query = {};

        if (status === 'approved') query.isApproved = true;
        if (status === 'pending') query.isApproved = false;
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const canteens = await Canteen.find(query)
            .populate('ownerId', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: canteens.length,
            data: canteens
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve or reject canteen
 * PUT /api/admin/canteens/:id
 */
export const updateCanteen = async (req, res, next) => {
    try {
        const { isApproved, isOpen } = req.body;

        const canteen = await Canteen.findById(req.params.id);

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        if (typeof isApproved === 'boolean') {
            canteen.isApproved = isApproved;

            // Also update partner's approval status
            if (canteen.ownerId) {
                await User.findByIdAndUpdate(canteen.ownerId, { isApproved });
            }
        }

        if (typeof isOpen === 'boolean') canteen.isOpen = isOpen;

        await canteen.save();

        res.json({
            success: true,
            message: `Canteen ${isApproved ? 'approved' : 'updated'}`,
            data: canteen
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all orders
 * GET /api/admin/orders
 */
export const getAllOrders = async (req, res, next) => {
    try {
        const { status, paymentStatus, date, canteenId, limit = 50, page = 1 } = req.query;

        const query = {};

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (canteenId) query.canteenId = canteenId;

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email phone')
            .populate('canteenId', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            count: orders.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Override order status (admin safety)
 * PUT /api/admin/orders/:id
 */
export const updateOrder = async (req, res, next) => {
    try {
        const { status, paymentStatus } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (status) {
            const validStatuses = ['pending', 'placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                });
            }
            order.status = status;
        }

        if (paymentStatus) {
            const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
            if (!validPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid payment status'
                });
            }
            order.paymentStatus = paymentStatus;
        }

        await order.save();

        // Emit socket event
        if (req.io) {
            req.io.to(`order_${order._id}`).emit('order_status', {
                orderId: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                updatedAt: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Order updated by admin',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get platform analytics
 * GET /api/admin/analytics
 */
export const getAnalytics = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalUsers,
            totalPartners,
            totalCanteens,
            approvedCanteens,
            todayOrders,
            monthlyOrders,
            todayRevenue,
            monthlyRevenue,
            ordersByStatus
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'partner' }),
            Canteen.countDocuments(),
            Canteen.countDocuments({ isApproved: true }),
            Order.countDocuments({ createdAt: { $gte: today }, paymentStatus: 'paid' }),
            Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' }),
            Order.aggregate([
                { $match: { createdAt: { $gte: today }, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        // Daily revenue for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyRevenue = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                users: {
                    students: totalUsers,
                    partners: totalPartners,
                    total: totalUsers + totalPartners
                },
                canteens: {
                    total: totalCanteens,
                    approved: approvedCanteens,
                    pending: totalCanteens - approvedCanteens
                },
                orders: {
                    today: todayOrders,
                    monthly: monthlyOrders,
                    byStatus: ordersByStatus.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {})
                },
                revenue: {
                    today: todayRevenue[0]?.total || 0,
                    monthly: monthlyRevenue[0]?.total || 0,
                    daily: dailyRevenue
                }
            }
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get Rating & Review Analytics
 * GET /api/admin/analytics/ratings
 */
export const getRatingAnalytics = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Avg Rating Over Time (Line Chart)
        const ratingTrend = await Review.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    avgRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Flagged Reviews Count
        const flaggedCount = await Review.countDocuments({ isFlagged: true });

        // 4. Top Rated Canteens (Ranking)
        const topCanteens = await Canteen.find({ isOpen: true, isApproved: true })
            .sort({ rating: -1, totalRatings: -1 })
            .limit(5)
            .select('name rating totalRatings');

        // 5. Recent Flagged Reviews
        const flaggedReviews = await Review.find({ isFlagged: true })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('canteenId', 'name')
            .populate('userId', 'name');

        res.json({
            success: true,
            data: {
                trend: ratingTrend,
                flaggedCount,
                topCanteens,
                flaggedReviews
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create admin user (one-time setup)
 * POST /api/admin/setup
 */
export const setupAdmin = async (req, res, next) => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                error: 'Admin already exists'
            });
        }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        const admin = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: 'admin',
            isApproved: true,
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getAllUsers,
    getUser,
    updateUser,
    getAllCanteens,
    updateCanteen,
    getAllOrders,
    updateOrder,
    getAnalytics,
    getRatingAnalytics,
    setupAdmin
};
