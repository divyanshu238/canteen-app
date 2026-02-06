/**
 * Audit Logger Utility
 * 
 * Creates immutable, append-only audit logs for all admin actions.
 * Logs are tamper-resistant and queryable.
 */

import mongoose from 'mongoose';

// We'll import AuditLog after it's created in models
let AuditLog = null;

/**
 * Initialize the AuditLog model reference
 * Called after models are loaded
 */
export const initializeAuditLogger = (model) => {
    AuditLog = model;
};

/**
 * Creates an immutable audit log entry
 * @param {Object} params - Audit parameters
 * @param {string} params.adminId - ID of admin performing action
 * @param {string} params.adminEmail - Email of admin
 * @param {string} params.adminName - Name of admin
 * @param {string} params.action - Action type (from enum)
 * @param {string} params.entityType - Entity type being modified
 * @param {string} params.entityId - ID of entity being modified
 * @param {Object} params.beforeState - State before modification
 * @param {Object} params.afterState - State after modification
 * @param {string} params.reason - Optional reason for action
 * @param {Object} params.req - Express request object for IP/UA
 */
export const createAuditLog = async ({
    adminId,
    adminEmail,
    adminName,
    action,
    entityType,
    entityId,
    beforeState,
    afterState,
    reason,
    req
}) => {
    try {
        // Lazy load if not initialized
        if (!AuditLog) {
            const models = await import('../models/index.js');
            AuditLog = models.AuditLog;
        }

        if (!AuditLog) {
            console.warn('[AUDIT] AuditLog model not available, skipping audit');
            return null;
        }

        const logEntry = await AuditLog.create({
            adminId: mongoose.Types.ObjectId.isValid(adminId) ? adminId : undefined,
            adminEmail,
            adminName,
            action,
            entityType,
            entityId: mongoose.Types.ObjectId.isValid(entityId) ? entityId : undefined,
            beforeState: beforeState ? sanitizeForStorage(beforeState) : undefined,
            afterState: afterState ? sanitizeForStorage(afterState) : undefined,
            reason,
            ipAddress: getIpAddress(req),
            userAgent: req?.headers?.['user-agent'] || 'Unknown'
        });

        console.log(`[AUDIT] ${action} on ${entityType}${entityId ? `:${entityId}` : ''} by ${adminEmail}`);
        return logEntry;
    } catch (error) {
        // Log but don't throw - audit logging should not break main flow
        console.error('[AUDIT] Failed to create audit log:', error.message);
        return null;
    }
};

/**
 * Sanitize object for MongoDB storage
 * Removes circular references and converts to plain object
 */
const sanitizeForStorage = (obj) => {
    try {
        // Convert Mongoose documents to plain objects
        if (obj && typeof obj.toObject === 'function') {
            obj = obj.toObject();
        }
        // Parse and stringify to remove circular refs and functions
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        return { error: 'Could not serialize state' };
    }
};

/**
 * Extract IP address from request
 */
const getIpAddress = (req) => {
    if (!req) return 'Unknown';
    return req.ip ||
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers?.['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'Unknown';
};

/**
 * Audit action types enum
 */
export const AUDIT_ACTIONS = {
    // User actions
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',
    USER_SUSPEND: 'USER_SUSPEND',
    USER_REACTIVATE: 'USER_REACTIVATE',
    USER_FORCE_LOGOUT: 'USER_FORCE_LOGOUT',
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',

    // Canteen actions
    CANTEEN_CREATE: 'CANTEEN_CREATE',
    CANTEEN_UPDATE: 'CANTEEN_UPDATE',
    CANTEEN_DELETE: 'CANTEEN_DELETE',
    CANTEEN_APPROVE: 'CANTEEN_APPROVE',
    CANTEEN_REJECT: 'CANTEEN_REJECT',
    CANTEEN_SUSPEND: 'CANTEEN_SUSPEND',
    CANTEEN_TOGGLE_ORDERING: 'CANTEEN_TOGGLE_ORDERING',

    // Menu actions
    MENU_ITEM_CREATE: 'MENU_ITEM_CREATE',
    MENU_ITEM_UPDATE: 'MENU_ITEM_UPDATE',
    MENU_ITEM_DELETE: 'MENU_ITEM_DELETE',
    MENU_ITEM_STOCK_TOGGLE: 'MENU_ITEM_STOCK_TOGGLE',
    MENU_BULK_UPDATE: 'MENU_BULK_UPDATE',
    MENU_PRICE_CHANGE: 'MENU_PRICE_CHANGE',

    // Order actions
    ORDER_STATUS_OVERRIDE: 'ORDER_STATUS_OVERRIDE',
    ORDER_CANCEL: 'ORDER_CANCEL',
    ORDER_REFUND: 'ORDER_REFUND',
    ORDER_REASSIGN: 'ORDER_REASSIGN',
    ORDER_PAYMENT_OVERRIDE: 'ORDER_PAYMENT_OVERRIDE',

    // Review actions
    REVIEW_EDIT: 'REVIEW_EDIT',
    REVIEW_DELETE: 'REVIEW_DELETE',
    REVIEW_FLAG_TOGGLE: 'REVIEW_FLAG_TOGGLE',
    REVIEW_LOCK: 'REVIEW_LOCK',
    RATING_OVERRIDE: 'RATING_OVERRIDE',

    // System actions
    FEATURE_FLAG_TOGGLE: 'FEATURE_FLAG_TOGGLE',
    MAINTENANCE_MODE_TOGGLE: 'MAINTENANCE_MODE_TOGGLE',
    SYSTEM_SETTING_CHANGE: 'SYSTEM_SETTING_CHANGE',
    ADMIN_ROLE_CHANGE: 'ADMIN_ROLE_CHANGE'
};

/**
 * Entity types enum
 */
export const ENTITY_TYPES = {
    USER: 'User',
    CANTEEN: 'Canteen',
    MENU_ITEM: 'MenuItem',
    ORDER: 'Order',
    REVIEW: 'Review',
    SYSTEM: 'System'
};

export default {
    createAuditLog,
    initializeAuditLogger,
    AUDIT_ACTIONS,
    ENTITY_TYPES
};
