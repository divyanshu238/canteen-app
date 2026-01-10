import { Canteen, MenuItem, Order } from '../models/index.js';

/**
 * Get partner's canteen
 * GET /api/partner/canteen
 */
export const getMyCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'No canteen found. Please contact support.'
            });
        }

        res.json({
            success: true,
            data: canteen
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update canteen details
 * PUT /api/partner/canteen
 */
export const updateCanteen = async (req, res, next) => {
    try {
        const allowedUpdates = [
            'name', 'description', 'image', 'tags',
            'isOpen', 'preparationTime', 'priceRange', 'address'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const canteen = await Canteen.findOneAndUpdate(
            { ownerId: req.user._id },
            updates,
            { new: true, runValidators: true }
        );

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        res.json({
            success: true,
            data: canteen
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle canteen open/closed status
 * PUT /api/partner/canteen/toggle
 */
export const toggleCanteenStatus = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        canteen.isOpen = !canteen.isOpen;
        await canteen.save();

        res.json({
            success: true,
            data: { isOpen: canteen.isOpen },
            message: `Canteen is now ${canteen.isOpen ? 'open' : 'closed'}`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all menu items for partner's canteen
 * GET /api/partner/menu
 */
export const getMenu = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const menu = await MenuItem.find({ canteenId: canteen._id })
            .sort({ category: 1, name: 1 });

        res.json({
            success: true,
            count: menu.length,
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add new menu item
 * POST /api/partner/menu
 */
export const addMenuItem = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const { name, description, price, image, isVeg, category, preparationTime } = req.body;

        const menuItem = await MenuItem.create({
            canteenId: canteen._id,
            name: name.trim(),
            description: description?.trim(),
            price,
            image: image || '',
            isVeg: isVeg !== false,
            category: category || 'Mains',
            preparationTime: preparationTime || 15,
            inStock: true
        });

        res.status(201).json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update menu item
 * PUT /api/partner/menu/:itemId
 */
export const updateMenuItem = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const menuItem = await MenuItem.findOne({
            _id: req.params.itemId,
            canteenId: canteen._id
        });

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                error: 'Menu item not found'
            });
        }

        const allowedUpdates = ['name', 'description', 'price', 'image', 'isVeg', 'inStock', 'category', 'preparationTime'];

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                menuItem[key] = req.body[key];
            }
        });

        await menuItem.save();

        res.json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete menu item
 * DELETE /api/partner/menu/:itemId
 */
export const deleteMenuItem = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const result = await MenuItem.deleteOne({
            _id: req.params.itemId,
            canteenId: canteen._id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            message: 'Menu item deleted'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle item stock status
 * PUT /api/partner/menu/:itemId/toggle
 */
export const toggleItemStock = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const menuItem = await MenuItem.findOne({
            _id: req.params.itemId,
            canteenId: canteen._id
        });

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                error: 'Menu item not found'
            });
        }

        menuItem.inStock = !menuItem.inStock;
        await menuItem.save();

        res.json({
            success: true,
            data: { inStock: menuItem.inStock },
            message: `Item is now ${menuItem.inStock ? 'in stock' : 'out of stock'}`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get orders for partner's canteen
 * GET /api/partner/orders
 */
export const getOrders = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const { status, date, limit = 50 } = req.query;

        const query = {
            canteenId: canteen._id,
            paymentStatus: 'paid' // Only show paid orders
        };

        if (status) {
            query.status = status;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get live/active orders
 * GET /api/partner/orders/live
 */
export const getLiveOrders = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const orders = await Order.find({
            canteenId: canteen._id,
            paymentStatus: 'paid',
            status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }
        })
            .populate('userId', 'name email phone')
            .sort({ createdAt: 1 }); // Oldest first

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update order status
 * PUT /api/partner/orders/:orderId/status
 */
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const order = await Order.findOne({
            _id: req.params.orderId,
            canteenId: canteen._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Validate status transition
        const statusOrder = ['placed', 'confirmed', 'preparing', 'ready', 'completed'];
        if (status !== 'cancelled') {
            const currentIndex = statusOrder.indexOf(order.status);
            const newIndex = statusOrder.indexOf(status);

            if (newIndex < currentIndex) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot move order to previous status'
                });
            }
        }

        if (status === 'cancelled') {
            order.cancelReason = req.body.reason || 'Cancelled by canteen';
        }

        order.status = status;
        await order.save();

        // Emit socket event for real-time updates
        if (req.io) {
            req.io.to(`order_${order._id}`).emit('order_status', {
                orderId: order._id,
                status: order.status,
                updatedAt: new Date()
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard stats
 * GET /api/partner/stats
 */
export const getDashboardStats = async (req, res, next) => {
    try {
        const canteen = await Canteen.findOne({ ownerId: req.user._id });

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            todayOrders,
            totalOrders,
            menuItemCount,
            todayRevenue
        ] = await Promise.all([
            Order.countDocuments({
                canteenId: canteen._id,
                paymentStatus: 'paid',
                createdAt: { $gte: today }
            }),
            Order.countDocuments({
                canteenId: canteen._id,
                paymentStatus: 'paid'
            }),
            MenuItem.countDocuments({ canteenId: canteen._id }),
            Order.aggregate([
                {
                    $match: {
                        canteenId: canteen._id,
                        paymentStatus: 'paid',
                        createdAt: { $gte: today }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                todayOrders,
                totalOrders,
                menuItemCount,
                todayRevenue: todayRevenue[0]?.total || 0,
                canteen: {
                    isOpen: canteen.isOpen,
                    isApproved: canteen.isApproved
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getMyCanteen,
    updateCanteen,
    toggleCanteenStatus,
    getMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemStock,
    getOrders,
    getLiveOrders,
    updateOrderStatus,
    getDashboardStats
};
