import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config/index.js';
import { Order, MenuItem, Canteen } from '../models/index.js';

// Initialize Razorpay only if keys are available
let razorpay = null;
if (config.razorpayKeyId && config.razorpayKeySecret) {
    razorpay = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret
    });
}

/**
 * Create a new order
 * POST /api/orders
 */
export const createOrder = async (req, res, next) => {
    try {
        const { canteenId, items, specialInstructions } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order must have at least one item'
            });
        }

        // Verify canteen exists and is open
        const canteen = await Canteen.findById(canteenId);
        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        if (!canteen.isOpen) {
            return res.status(400).json({
                success: false,
                error: 'Canteen is currently closed'
            });
        }

        if (!canteen.isApproved) {
            return res.status(400).json({
                success: false,
                error: 'Canteen is not available'
            });
        }

        // Verify all items and calculate total
        const itemIds = items.map(i => i.itemId);
        const menuItems = await MenuItem.find({
            _id: { $in: itemIds },
            canteenId,
            inStock: true
        });

        if (menuItems.length !== items.length) {
            return res.status(400).json({
                success: false,
                error: 'Some items are not available or out of stock'
            });
        }

        // Build order items with verified prices (prevent price manipulation)
        const orderItems = items.map(item => {
            const menuItem = menuItems.find(m => m._id.toString() === item.itemId);
            return {
                itemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price, // Use server-side price
                qty: Math.max(1, Math.min(10, item.qty)) // Limit qty 1-10
            };
        });

        // Calculate totals
        const itemTotal = orderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const tax = Math.round(itemTotal * 0.05 * 100) / 100; // 5% GST
        const deliveryFee = 20;
        const totalAmount = Math.round((itemTotal + tax + deliveryFee) * 100) / 100;

        // Create order in pending state
        const order = await Order.create({
            userId: req.user._id,
            canteenId,
            items: orderItems,
            itemTotal,
            tax,
            deliveryFee,
            totalAmount,
            specialInstructions,
            status: 'pending',
            paymentStatus: 'pending'
        });

        // Create Razorpay order if configured
        let razorpayOrder = null;
        if (razorpay) {
            try {
                razorpayOrder = await razorpay.orders.create({
                    amount: Math.round(totalAmount * 100), // Amount in paise
                    currency: 'INR',
                    receipt: order.orderId,
                    notes: {
                        orderId: order._id.toString(),
                        userId: req.user._id.toString()
                    }
                });

                order.razorpayOrderId = razorpayOrder.id;
                await order.save();
            } catch (error) {
                console.error('Razorpay order creation failed:', error);
                // Delete the order if payment creation fails
                await Order.deleteOne({ _id: order._id });
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create payment order. Please try again.'
                });
            }
        } else {
            // Development mode without Razorpay keys
            console.warn('⚠️ Razorpay not configured. Running in development mode.');
        }

        res.status(201).json({
            success: true,
            data: {
                order: {
                    _id: order._id,
                    orderId: order.orderId,
                    items: order.items,
                    itemTotal: order.itemTotal,
                    tax: order.tax,
                    deliveryFee: order.deliveryFee,
                    totalAmount: order.totalAmount,
                    status: order.status
                },
                payment: razorpayOrder ? {
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    keyId: config.razorpayKeyId
                } : null,
                isDevMode: !razorpay
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify payment and confirm order
 * POST /api/orders/verify-payment
 */
export const verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        } = req.body;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify the order belongs to the user
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized access to order'
            });
        }

        // Check if already paid
        if (order.paymentStatus === 'paid') {
            return res.json({
                success: true,
                message: 'Payment already verified',
                data: order
            });
        }

        // Verify signature if Razorpay is configured
        if (razorpay && config.razorpayKeySecret) {
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', config.razorpayKeySecret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                order.paymentStatus = 'failed';
                await order.save();

                return res.status(400).json({
                    success: false,
                    error: 'Payment verification failed. Invalid signature.'
                });
            }
        }

        // Update order status
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.paymentStatus = 'paid';
        order.status = 'placed';
        await order.save();

        // Emit socket event for canteen
        if (req.io) {
            req.io.to(`canteen_${order.canteenId}`).emit('new_order', {
                _id: order._id,
                orderId: order.orderId,
                items: order.items,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                orderId: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Development mode: Simulate payment
 * POST /api/orders/dev-confirm
 * Only available when Razorpay is not configured
 */
export const devConfirmOrder = async (req, res, next) => {
    try {
        if (razorpay) {
            return res.status(400).json({
                success: false,
                error: 'This endpoint is only available in development mode'
            });
        }

        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        order.paymentStatus = 'paid';
        order.status = 'placed';
        order.razorpayPaymentId = 'DEV_' + Date.now();
        await order.save();

        if (req.io) {
            req.io.to(`canteen_${order.canteenId}`).emit('new_order', {
                _id: order._id,
                orderId: order.orderId,
                items: order.items,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt
            });
        }

        res.json({
            success: true,
            message: 'Order confirmed (DEV MODE)',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Razorpay Webhook Handler
 * POST /api/orders/webhook
 */
export const handleWebhook = async (req, res) => {
    try {
        // Verify webhook signature
        const webhookSecret = config.razorpayWebhookSecret;

        if (webhookSecret) {
            const shasum = crypto.createHmac('sha256', webhookSecret);
            shasum.update(JSON.stringify(req.body));
            const digest = shasum.digest('hex');

            if (digest !== req.headers['x-razorpay-signature']) {
                console.error('Webhook signature verification failed');
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log('Webhook received:', event);

        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(payload.payment.entity);
                break;
            case 'payment.failed':
                await handlePaymentFailed(payload.payment.entity);
                break;
            case 'order.paid':
                await handleOrderPaid(payload.order.entity);
                break;
            default:
                console.log('Unhandled webhook event:', event);
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

async function handlePaymentCaptured(payment) {
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    if (order && order.paymentStatus !== 'paid') {
        order.razorpayPaymentId = payment.id;
        order.paymentStatus = 'paid';
        order.status = 'placed';
        await order.save();
        console.log('Payment captured for order:', order.orderId);
    }
}

async function handlePaymentFailed(payment) {
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    if (order && order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        await order.save();
        console.log('Payment failed for order:', order.orderId);
    }
}

async function handleOrderPaid(razorpayOrder) {
    const order = await Order.findOne({ razorpayOrderId: razorpayOrder.id });
    if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'placed';
        await order.save();
        console.log('Order paid:', order.orderId);
    }
}

/**
 * Get order details
 * GET /api/orders/:id
 */
export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email phone')
            .populate('canteenId', 'name image');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check access (user can view own orders, partner can view canteen orders, admin can view all)
        const isOwner = order.userId._id.toString() === req.user._id.toString();
        const isCanteenOwner = req.user.canteenId?.toString() === order.canteenId._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isCanteenOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
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
 * Get user's orders
 * GET /api/orders
 */
export const getMyOrders = async (req, res, next) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;

        const query = { userId: req.user._id };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('canteenId', 'name image')
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
 * Cancel order
 * POST /api/orders/:id/cancel
 */
export const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Only owner can cancel
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Can only cancel pending or placed orders
        if (!['pending', 'placed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                error: 'Order cannot be cancelled at this stage'
            });
        }

        order.status = 'cancelled';
        order.cancelReason = req.body.reason || 'Cancelled by customer';
        await order.save();

        // TODO: Handle refund if payment was made
        if (order.paymentStatus === 'paid') {
            // In production, initiate Razorpay refund here
            console.log('Refund required for order:', order.orderId);
        }

        res.json({
            success: true,
            message: 'Order cancelled',
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createOrder,
    verifyPayment,
    devConfirmOrder,
    handleWebhook,
    getOrder,
    getMyOrders,
    cancelOrder
};
