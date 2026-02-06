/**
 * Super Admin Controller - Part 3: Orders, Reviews, Analytics, System
 */

import mongoose from 'mongoose';
import { Order, Review, User, Canteen, MenuItem, AuditLog, SystemSettings } from '../models/index.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/auditLogger.js';

// ========================
// ORDER MANAGEMENT
// ========================

export const listOrders = async (req, res, next) => {
    try {
        const { status, paymentStatus, canteenId, userId, date, limit = 50, page = 1 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (canteenId) query.canteenId = canteenId;
        if (userId) query.userId = userId;
        if (date) {
            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(date); end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email phoneNumber')
            .populate('canteenId', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Order.countDocuments(query);
        res.json({ success: true, count: orders.length, total, page: parseInt(page), pages: Math.ceil(total / limit), data: orders });
    } catch (error) { next(error); }
};

export const getLiveOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ status: { $in: ['placed', 'preparing', 'ready'] } })
            .populate('userId', 'name email')
            .populate('canteenId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: orders });
    } catch (error) { next(error); }
};

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email phoneNumber')
            .populate('canteenId', 'name')
            .lean();
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (error) { next(error); }
};

export const overrideOrderStatus = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const { status, reason } = req.body;
        const validStatuses = ['pending', 'placed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

        const beforeState = order.toObject();
        order.adminOverrides = order.adminOverrides || [];
        order.adminOverrides.push({ field: 'status', oldValue: order.status, newValue: status, overriddenBy: req.user._id, reason });
        order.status = status;
        await order.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.ORDER_STATUS_OVERRIDE, entityType: ENTITY_TYPES.ORDER, entityId: order._id, beforeState, afterState: order.toObject(), reason, req });

        if (req.io) req.io.to(`order_${order._id}`).emit('order_status', { orderId: order._id, status: order.status });
        res.json({ success: true, data: order });
    } catch (error) { next(error); }
};

export const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const beforeState = order.toObject();
        order.status = 'cancelled';
        order.cancelReason = req.body.reason || 'Cancelled by admin';
        order.adminOverrides = order.adminOverrides || [];
        order.adminOverrides.push({ field: 'status', oldValue: beforeState.status, newValue: 'cancelled', overriddenBy: req.user._id, reason: req.body.reason });
        await order.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.ORDER_CANCEL, entityType: ENTITY_TYPES.ORDER, entityId: order._id, beforeState, afterState: order.toObject(), reason: req.body.reason, req });
        res.json({ success: true, message: 'Order cancelled' });
    } catch (error) { next(error); }
};

export const refundOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const beforeState = order.toObject();
        order.paymentStatus = 'refunded';
        order.refundDetails = { refundedAt: new Date(), refundedBy: req.user._id, amount: req.body.amount || order.totalAmount, reason: req.body.reason };
        await order.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.ORDER_REFUND, entityType: ENTITY_TYPES.ORDER, entityId: order._id, beforeState, afterState: order.toObject(), reason: req.body.reason, req });
        res.json({ success: true, message: 'Refund processed' });
    } catch (error) { next(error); }
};

export const overridePaymentStatus = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const { paymentStatus, reason } = req.body;
        if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) return res.status(400).json({ success: false, error: 'Invalid payment status' });

        const beforeState = order.toObject();
        order.adminOverrides = order.adminOverrides || [];
        order.adminOverrides.push({ field: 'paymentStatus', oldValue: order.paymentStatus, newValue: paymentStatus, overriddenBy: req.user._id, reason });
        order.paymentStatus = paymentStatus;
        await order.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.ORDER_PAYMENT_OVERRIDE, entityType: ENTITY_TYPES.ORDER, entityId: order._id, beforeState, afterState: order.toObject(), reason, req });
        res.json({ success: true, data: order });
    } catch (error) { next(error); }
};

export const reassignOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        const { newCanteenId, reason } = req.body;
        const newCanteen = await Canteen.findById(newCanteenId);
        if (!newCanteen) return res.status(404).json({ success: false, error: 'New canteen not found' });

        const beforeState = order.toObject();
        order.adminOverrides = order.adminOverrides || [];
        order.adminOverrides.push({ field: 'canteenId', oldValue: order.canteenId, newValue: newCanteenId, overriddenBy: req.user._id, reason });
        order.canteenId = newCanteenId;
        await order.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.ORDER_REASSIGN, entityType: ENTITY_TYPES.ORDER, entityId: order._id, beforeState, afterState: order.toObject(), reason, req });
        res.json({ success: true, message: 'Order reassigned' });
    } catch (error) { next(error); }
};

// ========================
// REVIEW MANAGEMENT
// ========================

export const listReviews = async (req, res, next) => {
    try {
        const { canteenId, userId, isFlagged, isLocked, rating, limit = 50, page = 1 } = req.query;
        const query = {};

        if (canteenId) query.canteenId = canteenId;
        if (userId) query.userId = userId;
        if (isFlagged === 'true') query.isFlagged = true;
        if (isLocked === 'true') query.isLocked = true;
        if (rating) query.rating = parseInt(rating);

        const reviews = await Review.find(query)
            .populate('userId', 'name email')
            .populate('canteenId', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Review.countDocuments(query);
        res.json({ success: true, count: reviews.length, total, data: reviews });
    } catch (error) { next(error); }
};

export const getReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id).populate('userId', 'name email').populate('canteenId', 'name').lean();
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
        res.json({ success: true, data: review });
    } catch (error) { next(error); }
};

export const editReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        const beforeState = review.toObject();
        const { rating, comment, reason } = req.body;

        review.adminEdits = review.adminEdits || [];
        review.adminEdits.push({ editedBy: req.user._id, previousRating: review.rating, previousComment: review.comment, reason });

        if (rating) review.rating = rating;
        if (comment !== undefined) review.comment = comment;
        await review.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.REVIEW_EDIT, entityType: ENTITY_TYPES.REVIEW, entityId: review._id, beforeState, afterState: review.toObject(), reason, req });
        res.json({ success: true, data: review });
    } catch (error) { next(error); }
};

export const deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        const beforeState = review.toObject();
        await Review.deleteOne({ _id: review._id });
        await Order.findByIdAndUpdate(review.orderId, { isReviewed: false, rating: null, review: null });

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.REVIEW_DELETE, entityType: ENTITY_TYPES.REVIEW, entityId: review._id, beforeState, reason: req.body.reason, req });
        res.json({ success: true, message: 'Review deleted' });
    } catch (error) { next(error); }
};

export const toggleReviewFlag = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        const beforeState = review.toObject();
        review.isFlagged = !review.isFlagged;
        review.flagReason = req.body.reason || (review.isFlagged ? 'Flagged by admin' : undefined);
        await review.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.REVIEW_FLAG_TOGGLE, entityType: ENTITY_TYPES.REVIEW, entityId: review._id, beforeState, afterState: review.toObject(), req });
        res.json({ success: true, data: { isFlagged: review.isFlagged } });
    } catch (error) { next(error); }
};

export const lockReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        const beforeState = review.toObject();
        review.isLocked = !review.isLocked;
        review.lockedBy = review.isLocked ? req.user._id : undefined;
        review.lockedAt = review.isLocked ? new Date() : undefined;
        await review.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.REVIEW_LOCK, entityType: ENTITY_TYPES.REVIEW, entityId: review._id, beforeState, afterState: review.toObject(), req });
        res.json({ success: true, data: { isLocked: review.isLocked } });
    } catch (error) { next(error); }
};

export const overrideRating = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        const { rating, reason } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Rating must be 1-5' });

        const beforeState = review.toObject();
        review.adminEdits = review.adminEdits || [];
        review.adminEdits.push({ editedBy: req.user._id, previousRating: review.rating, reason });
        review.rating = rating;
        await review.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.RATING_OVERRIDE, entityType: ENTITY_TYPES.REVIEW, entityId: review._id, beforeState, afterState: review.toObject(), reason, req });
        res.json({ success: true, data: review });
    } catch (error) { next(error); }
};

// ========================
// ANALYTICS
// ========================

export const getOverviewAnalytics = async (req, res, next) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [users, canteens, todayOrders, monthlyRevenue] = await Promise.all([
            User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
            Canteen.aggregate([{ $group: { _id: '$isApproved', count: { $sum: 1 } } }]),
            Order.countDocuments({ createdAt: { $gte: today }, paymentStatus: 'paid' }),
            Order.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }])
        ]);

        res.json({ success: true, data: { users: users.reduce((a, c) => { a[c._id] = c.count; return a; }, {}), canteens: canteens.reduce((a, c) => { a[c._id ? 'approved' : 'pending'] = c.count; return a; }, {}), todayOrders, monthlyRevenue: monthlyRevenue[0]?.total || 0 } });
    } catch (error) { next(error); }
};

// ========================
// AUDIT LOGS
// ========================

export const listAuditLogs = async (req, res, next) => {
    try {
        const { adminId, entityType, action, startDate, endDate, limit = 50, page = 1 } = req.query;
        const query = {};

        if (adminId) query.adminId = adminId;
        if (entityType) query.entityType = entityType;
        if (action) query.action = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean();
        const total = await AuditLog.countDocuments(query);

        res.json({ success: true, count: logs.length, total, page: parseInt(page), pages: Math.ceil(total / limit), data: logs });
    } catch (error) { next(error); }
};

export const getAuditLog = async (req, res, next) => {
    try {
        const log = await AuditLog.findById(req.params.id).lean();
        if (!log) return res.status(404).json({ success: false, error: 'Audit log not found' });
        res.json({ success: true, data: log });
    } catch (error) { next(error); }
};

// ========================
// SYSTEM SETTINGS
// ========================

export const getSystemSettings = async (req, res, next) => {
    try {
        const settings = await SystemSettings.find().lean();
        res.json({ success: true, data: settings });
    } catch (error) { next(error); }
};

export const updateSystemSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value, reason } = req.body;

        let setting = await SystemSettings.findOne({ key });
        const beforeState = setting?.toObject();

        if (!setting) {
            setting = new SystemSettings({ key, value, lastModifiedBy: req.user._id });
        } else {
            setting.value = value;
            setting.lastModifiedBy = req.user._id;
            setting.lastModifiedAt = new Date();
        }
        await setting.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, entityType: ENTITY_TYPES.SYSTEM, beforeState, afterState: setting.toObject(), reason, req });
        res.json({ success: true, data: setting });
    } catch (error) { next(error); }
};

export const toggleMaintenanceMode = async (req, res, next) => {
    try {
        const { enabled, message } = req.body;
        let setting = await SystemSettings.findOne({ key: 'MAINTENANCE_MODE' });

        if (!setting) {
            setting = new SystemSettings({ key: 'MAINTENANCE_MODE', value: { enabled, message }, lastModifiedBy: req.user._id });
        } else {
            setting.value = { enabled, message };
            setting.lastModifiedBy = req.user._id;
            setting.lastModifiedAt = new Date();
        }
        await setting.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MAINTENANCE_MODE_TOGGLE, entityType: ENTITY_TYPES.SYSTEM, afterState: { enabled, message }, req });
        res.json({ success: true, data: setting });
    } catch (error) { next(error); }
};

export default {
    listOrders, getLiveOrders, getOrder, overrideOrderStatus, cancelOrder, refundOrder, overridePaymentStatus, reassignOrder,
    listReviews, getReview, editReview, deleteReview, toggleReviewFlag, lockReview, overrideRating,
    getOverviewAnalytics, listAuditLogs, getAuditLog, getSystemSettings, updateSystemSetting, toggleMaintenanceMode
};
