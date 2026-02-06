/**
 * Super Admin Controller - Part 1: User Management
 * 
 * Full CRUD operations for user management with audit logging.
 * Admin actions OVERRIDE all business rules.
 */

import bcrypt from 'bcryptjs';
import { User, Canteen, Order, MenuItem, Review, RefreshToken, AuditLog, SystemSettings } from '../models/index.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/auditLogger.js';

// ========================
// USER MANAGEMENT
// ========================

/**
 * List all users with advanced filters
 * GET /api/superadmin/users
 */
export const listUsers = async (req, res, next) => {
    try {
        const { role, status, search, includeDeleted, limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};

        // Exclude soft-deleted by default
        if (includeDeleted !== 'true') {
            query.deletedAt = { $exists: false };
        }

        if (role && ['student', 'partner', 'admin'].includes(role)) {
            query.role = role;
        }
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (status === 'suspended') query.suspendedAt = { $exists: true };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const users = await User.find(query)
            .select('-password')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

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
 * Get user by ID with full details
 * GET /api/superadmin/users/:id
 */
export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get additional stats
        const [orderCount, canteen, recentOrders] = await Promise.all([
            Order.countDocuments({ userId: user._id }),
            user.role === 'partner' ? Canteen.findOne({ ownerId: user._id }).lean() : null,
            Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean()
        ]);

        res.json({
            success: true,
            data: { ...user, orderCount, canteen, recentOrders }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create user (admin-created)
 * POST /api/superadmin/users
 */
export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, phoneNumber, role = 'student' } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phoneNumber,
            role: ['student', 'partner', 'admin'].includes(role) ? role : 'student',
            isApproved: true,
            isActive: true
        });

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_CREATE,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            afterState: { name: user.name, email: user.email, role: user.role },
            req
        });

        res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

/**
 * Update any user field
 * PUT /api/superadmin/users/:id
 */
export const updateUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const beforeState = user.toObject();
        const { name, email, phoneNumber, role, isActive, isApproved, reason } = req.body;

        if (name) user.name = name.trim();
        if (email) user.email = email.toLowerCase().trim();
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (role && ['student', 'partner', 'admin'].includes(role)) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;
        if (typeof isApproved === 'boolean') user.isApproved = isApproved;

        await user.save();

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_UPDATE,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            beforeState,
            afterState: user.toObject(),
            reason,
            req
        });

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

/**
 * Soft delete user
 * DELETE /api/superadmin/users/:id
 */
export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own admin account' });
        }

        const beforeState = user.toObject();
        user.deletedAt = new Date();
        user.deletedBy = req.user._id;
        user.isActive = false;
        await user.save();

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_DELETE,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            beforeState,
            reason: req.body.reason,
            req
        });

        res.json({ success: true, message: 'User soft deleted' });
    } catch (error) {
        next(error);
    }
};

/**
 * Suspend user
 * POST /api/superadmin/users/:id/suspend
 */
export const suspendUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const beforeState = user.toObject();
        user.isActive = false;
        user.suspendedAt = new Date();
        user.suspendedBy = req.user._id;
        user.suspendReason = req.body.reason || 'Suspended by admin';
        await user.save();

        // Revoke all tokens
        await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_SUSPEND,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            beforeState,
            afterState: user.toObject(),
            reason: req.body.reason,
            req
        });

        res.json({ success: true, message: 'User suspended' });
    } catch (error) {
        next(error);
    }
};

/**
 * Reactivate user
 * POST /api/superadmin/users/:id/reactivate
 */
export const reactivateUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const beforeState = user.toObject();
        user.isActive = true;
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspendReason = undefined;
        await user.save();

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_REACTIVATE,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            beforeState,
            afterState: user.toObject(),
            req
        });

        res.json({ success: true, message: 'User reactivated' });
    } catch (error) {
        next(error);
    }
};

/**
 * Force logout (invalidate all tokens)
 * POST /api/superadmin/users/:id/force-logout
 */
export const forceLogout = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.forceLogoutBefore = new Date();
        await user.save();
        await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_FORCE_LOGOUT,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            reason: req.body.reason,
            req
        });

        res.json({ success: true, message: 'All user sessions invalidated' });
    } catch (error) {
        next(error);
    }
};

/**
 * Reset user password
 * POST /api/superadmin/users/:id/reset-password
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.password = newPassword;
        user.forceLogoutBefore = new Date();
        await user.save();
        await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

        await createAuditLog({
            adminId: req.user._id,
            adminEmail: req.user.email,
            adminName: req.user.name,
            action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
            entityType: ENTITY_TYPES.USER,
            entityId: user._id,
            req
        });

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user activity history
 * GET /api/superadmin/users/:id/activity
 */
export const getUserActivity = async (req, res, next) => {
    try {
        const { limit = 50, page = 1 } = req.query;

        const logs = await AuditLog.find({
            $or: [
                { entityType: 'User', entityId: req.params.id },
                { adminId: req.params.id }
            ]
        })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

export default {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    suspendUser,
    reactivateUser,
    forceLogout,
    resetPassword,
    getUserActivity
};
