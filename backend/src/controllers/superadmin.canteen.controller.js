/**
 * Super Admin Controller - Part 2: Canteen, Menu, Orders
 */

import { Canteen, MenuItem, Order, User, Review, AuditLog, SystemSettings } from '../models/index.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/auditLogger.js';

// ========================
// CANTEEN MANAGEMENT
// ========================

export const listCanteens = async (req, res, next) => {
    try {
        const { status, search, limit = 50, page = 1 } = req.query;
        const query = {};

        if (status === 'approved') query.isApproved = true;
        if (status === 'pending') query.isApproved = false;
        if (status === 'open') query.isOpen = true;
        if (status === 'closed') query.isOpen = false;
        if (search) query.name = { $regex: search, $options: 'i' };

        const canteens = await Canteen.find(query)
            .populate('ownerId', 'name email phoneNumber')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Canteen.countDocuments(query);
        res.json({ success: true, count: canteens.length, total, page: parseInt(page), pages: Math.ceil(total / limit), data: canteens });
    } catch (error) { next(error); }
};

export const getCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id).populate('ownerId', 'name email phoneNumber').lean();
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const [menuCount, orderCount, revenue] = await Promise.all([
            MenuItem.countDocuments({ canteenId: canteen._id }),
            Order.countDocuments({ canteenId: canteen._id, paymentStatus: 'paid' }),
            Order.aggregate([
                { $match: { canteenId: canteen._id, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ])
        ]);

        res.json({ success: true, data: { ...canteen, menuCount, orderCount, totalRevenue: revenue[0]?.total || 0 } });
    } catch (error) { next(error); }
};

export const createCanteen = async (req, res, next) => {
    try {
        const { name, description, image, ownerId, tags } = req.body;
        if (!name || !ownerId) return res.status(400).json({ success: false, error: 'Name and ownerId required' });

        const canteen = await Canteen.create({ name, description, image: image || 'https://via.placeholder.com/400', ownerId, tags, isApproved: true, isOpen: false });
        await User.findByIdAndUpdate(ownerId, { canteenId: canteen._id, role: 'partner' });

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_CREATE, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, afterState: canteen.toObject(), req });
        res.status(201).json({ success: true, data: canteen });
    } catch (error) { next(error); }
};

export const updateCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        const { name, description, image, isOpen, isApproved, tags, preparationTime, priceRange, address, reason } = req.body;

        if (name) canteen.name = name;
        if (description !== undefined) canteen.description = description;
        if (image) canteen.image = image;
        if (typeof isOpen === 'boolean') canteen.isOpen = isOpen;
        if (typeof isApproved === 'boolean') canteen.isApproved = isApproved;
        if (tags) canteen.tags = tags;
        if (preparationTime) canteen.preparationTime = preparationTime;
        if (priceRange) canteen.priceRange = priceRange;
        if (address) canteen.address = address;

        await canteen.save();
        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_UPDATE, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, afterState: canteen.toObject(), reason, req });
        res.json({ success: true, data: canteen });
    } catch (error) { next(error); }
};

export const deleteCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        canteen.isApproved = false;
        canteen.isOpen = false;
        await canteen.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_DELETE, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, reason: req.body.reason, req });
        res.json({ success: true, message: 'Canteen deactivated' });
    } catch (error) { next(error); }
};

export const approveCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        canteen.isApproved = true;
        await canteen.save();
        if (canteen.ownerId) await User.findByIdAndUpdate(canteen.ownerId, { isApproved: true });

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_APPROVE, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, afterState: canteen.toObject(), req });
        res.json({ success: true, message: 'Canteen approved' });
    } catch (error) { next(error); }
};

export const rejectCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        canteen.isApproved = false;
        await canteen.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_REJECT, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, reason: req.body.reason, req });
        res.json({ success: true, message: 'Canteen rejected' });
    } catch (error) { next(error); }
};

export const suspendCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        canteen.isApproved = false;
        canteen.isOpen = false;
        await canteen.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_SUSPEND, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, reason: req.body.reason, req });
        res.json({ success: true, message: 'Canteen suspended' });
    } catch (error) { next(error); }
};

export const toggleCanteenOrdering = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) return res.status(404).json({ success: false, error: 'Canteen not found' });

        const beforeState = canteen.toObject();
        canteen.isOpen = !canteen.isOpen;
        await canteen.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.CANTEEN_TOGGLE_ORDERING, entityType: ENTITY_TYPES.CANTEEN, entityId: canteen._id, beforeState, afterState: canteen.toObject(), req });
        res.json({ success: true, data: { isOpen: canteen.isOpen } });
    } catch (error) { next(error); }
};

export const getCanteenRevenue = async (req, res, next) => {
    try {
        const canteenId = req.params.id;
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [total, monthly, daily] = await Promise.all([
            Order.aggregate([{ $match: { canteenId: new (await import('mongoose')).default.Types.ObjectId(canteenId), paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
            Order.aggregate([{ $match: { canteenId: new (await import('mongoose')).default.Types.ObjectId(canteenId), paymentStatus: 'paid', createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
            Order.aggregate([{ $match: { canteenId: new (await import('mongoose')).default.Types.ObjectId(canteenId), paymentStatus: 'paid', createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }])
        ]);

        res.json({ success: true, data: { totalRevenue: total[0]?.total || 0, totalOrders: total[0]?.count || 0, monthlyRevenue: monthly[0]?.total || 0, dailyBreakdown: daily } });
    } catch (error) { next(error); }
};

// ========================
// MENU MANAGEMENT
// ========================

export const listMenuItems = async (req, res, next) => {
    try {
        const { canteenId, category, inStock, search, limit = 100, page = 1 } = req.query;
        const query = {};

        if (canteenId) query.canteenId = canteenId;
        if (category) query.category = category;
        if (inStock === 'true') query.inStock = true;
        if (inStock === 'false') query.inStock = false;
        if (search) query.name = { $regex: search, $options: 'i' };

        const items = await MenuItem.find(query).populate('canteenId', 'name').sort({ canteenId: 1, category: 1, name: 1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean();
        const total = await MenuItem.countDocuments(query);

        res.json({ success: true, count: items.length, total, data: items });
    } catch (error) { next(error); }
};

export const getMenuItem = async (req, res, next) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('canteenId', 'name').lean();
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });
        res.json({ success: true, data: item });
    } catch (error) { next(error); }
};

export const createMenuItem = async (req, res, next) => {
    try {
        const { canteenId, name, price, description, image, category, isVeg = true } = req.body;
        if (!canteenId || !name || price === undefined) return res.status(400).json({ success: false, error: 'canteenId, name, and price required' });

        const item = await MenuItem.create({ canteenId, name, price, description, image, category, isVeg, inStock: true, lastModifiedBy: req.user._id, priceHistory: [{ price, changedBy: req.user._id }] });

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MENU_ITEM_CREATE, entityType: ENTITY_TYPES.MENU_ITEM, entityId: item._id, afterState: item.toObject(), req });
        res.status(201).json({ success: true, data: item });
    } catch (error) { next(error); }
};

export const updateMenuItem = async (req, res, next) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

        const beforeState = item.toObject();
        const { name, price, description, image, category, isVeg, inStock, reason } = req.body;

        if (name) item.name = name;
        if (description !== undefined) item.description = description;
        if (image) item.image = image;
        if (category) item.category = category;
        if (typeof isVeg === 'boolean') item.isVeg = isVeg;
        if (typeof inStock === 'boolean') item.inStock = inStock;

        // Track price changes
        if (price !== undefined && price !== item.price) {
            item.priceHistory = item.priceHistory || [];
            item.priceHistory.push({ price, changedAt: new Date(), changedBy: req.user._id });
            item.price = price;
        }

        item.lastModifiedBy = req.user._id;
        await item.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MENU_ITEM_UPDATE, entityType: ENTITY_TYPES.MENU_ITEM, entityId: item._id, beforeState, afterState: item.toObject(), reason, req });
        res.json({ success: true, data: item });
    } catch (error) { next(error); }
};

export const deleteMenuItem = async (req, res, next) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

        const beforeState = item.toObject();
        await MenuItem.deleteOne({ _id: item._id });

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MENU_ITEM_DELETE, entityType: ENTITY_TYPES.MENU_ITEM, entityId: item._id, beforeState, reason: req.body.reason, req });
        res.json({ success: true, message: 'Menu item deleted' });
    } catch (error) { next(error); }
};

export const toggleMenuItemStock = async (req, res, next) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

        const beforeState = item.toObject();
        item.inStock = !item.inStock;
        item.lastModifiedBy = req.user._id;
        await item.save();

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MENU_ITEM_STOCK_TOGGLE, entityType: ENTITY_TYPES.MENU_ITEM, entityId: item._id, beforeState, afterState: item.toObject(), req });
        res.json({ success: true, data: { inStock: item.inStock } });
    } catch (error) { next(error); }
};

export const bulkUpdateMenuItems = async (req, res, next) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ success: false, error: 'items array required' });

        const results = [];
        for (const update of items) {
            if (!update.id) continue;
            const item = await MenuItem.findById(update.id);
            if (!item) continue;

            if (update.price !== undefined) item.price = update.price;
            if (typeof update.inStock === 'boolean') item.inStock = update.inStock;
            item.lastModifiedBy = req.user._id;
            await item.save();
            results.push({ id: item._id, success: true });
        }

        await createAuditLog({ adminId: req.user._id, adminEmail: req.user.email, adminName: req.user.name, action: AUDIT_ACTIONS.MENU_BULK_UPDATE, entityType: ENTITY_TYPES.MENU_ITEM, afterState: { updatedCount: results.length }, req });
        res.json({ success: true, data: results });
    } catch (error) { next(error); }
};

export default {
    listCanteens, getCanteen, createCanteen, updateCanteen, deleteCanteen,
    approveCanteen, rejectCanteen, suspendCanteen, toggleCanteenOrdering, getCanteenRevenue,
    listMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem,
    toggleMenuItemStock, bulkUpdateMenuItems
};
