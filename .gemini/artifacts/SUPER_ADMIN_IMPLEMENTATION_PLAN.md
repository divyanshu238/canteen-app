# Super Admin Control Plane - Implementation Plan

## 📋 Executive Summary

This document outlines the complete implementation plan for adding a **production-grade Super Admin Control Plane** to the Canteen food ordering platform. This is an **ADDITIVE, NON-DESTRUCTIVE** upgrade—**NO existing features will be removed, rewritten, or disabled**.

---

## 🏗️ Architecture Overview

### Current State Analysis
- **Backend**: Node.js + Express + MongoDB (ES Modules)
- **Frontend**: React + TypeScript + Vite + Redux
- **Auth**: Email/Password with JWT tokens
- **Existing Admin**: Basic analytics dashboard with limited CRUD operations
- **Roles**: `student`, `partner`, `admin`

### Proposed Additions

```
backend/src/
├── models/
│   └── index.js                    # ADD: AuditLog schema
├── controllers/
│   └── superadmin.controller.js    # NEW: Full super-admin controller
├── routes/
│   └── superadmin.routes.js        # NEW: /api/superadmin/* routes
├── middleware/
│   └── superadmin.js               # NEW: Super-admin specific guards
└── utils/
    └── auditLogger.js              # NEW: Audit logging utility

frontend/src/
├── pages/
│   ├── SuperAdminDashboard.tsx     # NEW: Main super-admin dashboard
│   ├── admin/
│   │   ├── UsersManagement.tsx     # NEW: Full user CRUD
│   │   ├── CanteensManagement.tsx  # NEW: Full canteen management
│   │   ├── OrdersManagement.tsx    # NEW: Order control center
│   │   ├── MenuManagement.tsx      # NEW: Global menu control
│   │   ├── PaymentsManagement.tsx  # NEW: Payment reconciliation
│   │   ├── ReviewsManagement.tsx   # NEW: Review moderation
│   │   ├── SystemSettings.tsx      # NEW: Feature flags & maintenance
│   │   └── AuditLogs.tsx           # NEW: Audit log viewer
└── api.ts                          # EXTEND: Add superadminAPI
```

---

## 📦 Phase 1: Backend - Schema Extensions

### 1.1 AuditLog Schema (NEW)
Add to `backend/src/models/index.js`:

```javascript
const auditLogSchema = new mongoose.Schema({
    // WHO performed the action
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    adminEmail: String,
    adminName: String,

    // WHAT action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // User actions
            'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_SUSPEND', 
            'USER_REACTIVATE', 'USER_FORCE_LOGOUT', 'USER_PASSWORD_RESET',
            // Canteen actions
            'CANTEEN_CREATE', 'CANTEEN_UPDATE', 'CANTEEN_DELETE', 
            'CANTEEN_APPROVE', 'CANTEEN_SUSPEND', 'CANTEEN_TOGGLE_ORDERING',
            // Menu actions
            'MENU_ITEM_CREATE', 'MENU_ITEM_UPDATE', 'MENU_ITEM_DELETE',
            'MENU_ITEM_STOCK_TOGGLE', 'MENU_BULK_UPDATE', 'MENU_PRICE_CHANGE',
            // Order actions
            'ORDER_STATUS_OVERRIDE', 'ORDER_CANCEL', 'ORDER_REFUND',
            'ORDER_REASSIGN', 'ORDER_PAYMENT_OVERRIDE',
            // Review actions
            'REVIEW_EDIT', 'REVIEW_DELETE', 'REVIEW_FLAG_TOGGLE',
            'REVIEW_LOCK', 'RATING_OVERRIDE',
            // System actions
            'FEATURE_FLAG_TOGGLE', 'MAINTENANCE_MODE_TOGGLE',
            'SYSTEM_SETTING_CHANGE', 'ADMIN_ROLE_CHANGE'
        ],
        index: true
    },

    // WHAT entity was affected
    entityType: {
        type: String,
        required: true,
        enum: ['User', 'Canteen', 'MenuItem', 'Order', 'Review', 'System'],
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // STATE before and after (for rollback capability)
    beforeState: mongoose.Schema.Types.Mixed,
    afterState: mongoose.Schema.Types.Mixed,

    // WHY (optional reason)
    reason: String,

    // METADATA
    ipAddress: String,
    userAgent: String,

    // TIMESTAMP (immutable)
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true
    }
}, {
    timestamps: false, // Use our own immutable timestamp
    collection: 'audit_logs'
});

// Compound index for efficient querying
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Prevent modification once created (append-only)
auditLogSchema.pre('findOneAndUpdate', function() {
    throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('updateOne', function() {
    throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('updateMany', function() {
    throw new Error('Audit logs are immutable');
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
```

### 1.2 User Schema Extensions
Add these fields to the existing User schema:

```javascript
// Add to userSchema (non-breaking additions)
suspendedAt: Date,
suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
},
suspendReason: String,
lastLoginAt: Date,
lastLoginIp: String,
deletedAt: Date,        // Soft delete timestamp
deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
},
forceLogoutBefore: Date  // Ignore tokens issued before this time
```

### 1.3 MenuItem Schema Extensions
```javascript
// Add to menuItemSchema
priceHistory: [{
    price: Number,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}],
lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
}
```

### 1.4 Order Schema Extensions
```javascript
// Add to orderSchema
adminOverrides: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overriddenAt: { type: Date, default: Date.now },
    reason: String
}],
refundDetails: {
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    razorpayRefundId: String,
    amount: Number,
    reason: String
}
```

### 1.5 Review Schema Extensions
```javascript
// Add to reviewSchema
isLocked: { type: Boolean, default: false },
lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
lockedAt: Date,
adminEdits: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    previousRating: Number,
    previousComment: String,
    reason: String
}]
```

### 1.6 SystemSettings Schema (NEW)
```javascript
const systemSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'MAINTENANCE_MODE',
            'NEW_USER_REGISTRATION',
            'NEW_PARTNER_REGISTRATION',
            'ORDERING_ENABLED',
            'PAYMENT_ENABLED',
            'REVIEW_SUBMISSION_ENABLED',
            'MAX_ORDER_AMOUNT',
            'MIN_ORDER_AMOUNT',
            'PLATFORM_FEE_PERCENTAGE'
        ]
    },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
```

---

## 📦 Phase 2: Backend - Audit Logger Utility

### File: `backend/src/utils/auditLogger.js`

```javascript
import { AuditLog } from '../models/index.js';

/**
 * Creates an immutable audit log entry
 * @param {Object} params - Audit parameters
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
    req  // Express request object for IP/UA
}) => {
    try {
        await AuditLog.create({
            adminId,
            adminEmail,
            adminName,
            action,
            entityType,
            entityId: entityId || undefined,
            beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : undefined,
            afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : undefined,
            reason,
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.headers?.['user-agent']
        });
    } catch (error) {
        // Log but don't throw - audit logging should not break main flow
        console.error('[AUDIT] Failed to create audit log:', error.message);
    }
};

export default { createAuditLog };
```

---

## 📦 Phase 3: Backend - Super Admin Controller

### File: `backend/src/controllers/superadmin.controller.js`

This controller will implement:

### 3.1 User Management
- `GET /api/superadmin/users` - List all users with advanced filters
- `GET /api/superadmin/users/:id` - Get user details with activity history
- `POST /api/superadmin/users` - Create user (admin-created)
- `PUT /api/superadmin/users/:id` - Update any user field
- `DELETE /api/superadmin/users/:id` - Soft delete user
- `POST /api/superadmin/users/:id/suspend` - Suspend user
- `POST /api/superadmin/users/:id/reactivate` - Reactivate user
- `POST /api/superadmin/users/:id/force-logout` - Invalidate all tokens
- `POST /api/superadmin/users/:id/reset-password` - Admin password reset
- `GET /api/superadmin/users/:id/activity` - Get user activity history

### 3.2 Canteen Management
- `GET /api/superadmin/canteens` - List all canteens with stats
- `GET /api/superadmin/canteens/:id` - Get canteen with full details
- `POST /api/superadmin/canteens` - Create canteen
- `PUT /api/superadmin/canteens/:id` - Update any canteen field
- `DELETE /api/superadmin/canteens/:id` - Soft delete canteen
- `POST /api/superadmin/canteens/:id/approve` - Approve canteen
- `POST /api/superadmin/canteens/:id/reject` - Reject canteen
- `POST /api/superadmin/canteens/:id/suspend` - Suspend canteen
- `POST /api/superadmin/canteens/:id/toggle-ordering` - Enable/disable ordering
- `GET /api/superadmin/canteens/:id/revenue` - Get canteen revenue stats

### 3.3 Menu & Inventory Management
- `GET /api/superadmin/menu` - List all menu items (cross-canteen)
- `GET /api/superadmin/menu/:id` - Get menu item with price history
- `POST /api/superadmin/menu` - Create menu item
- `PUT /api/superadmin/menu/:id` - Update menu item (with price tracking)
- `DELETE /api/superadmin/menu/:id` - Delete menu item
- `POST /api/superadmin/menu/:id/toggle-stock` - Force out of stock
- `POST /api/superadmin/menu/bulk-update` - Bulk update items
- `GET /api/superadmin/menu/categories` - Get all categories
- `POST /api/superadmin/menu/categories` - Create category

### 3.4 Order Management
- `GET /api/superadmin/orders` - List all orders with advanced filters
- `GET /api/superadmin/orders/:id` - Get order with full payment details
- `PUT /api/superadmin/orders/:id/status` - Override order status
- `POST /api/superadmin/orders/:id/cancel` - Cancel and optionally refund
- `POST /api/superadmin/orders/:id/refund` - Trigger refund
- `PUT /api/superadmin/orders/:id/payment-status` - Override payment status
- `POST /api/superadmin/orders/:id/reassign` - Reassign to different canteen
- `GET /api/superadmin/orders/live` - Get all live orders across platform

### 3.5 Payment Management
- `GET /api/superadmin/payments` - List all transactions
- `GET /api/superadmin/payments/:id` - Get payment details
- `POST /api/superadmin/payments/:id/verify` - Manual verify Razorpay payment
- `POST /api/superadmin/payments/:id/refund` - Trigger refund
- `GET /api/superadmin/payments/disputed` - Get disputed/failed payments
- `GET /api/superadmin/payments/reconciliation` - Order ↔ Payment reconciliation

### 3.6 Review Management
- `GET /api/superadmin/reviews` - List all reviews with fraud flags
- `GET /api/superadmin/reviews/:id` - Get review details
- `PUT /api/superadmin/reviews/:id` - Edit review (admin override)
- `DELETE /api/superadmin/reviews/:id` - Delete review
- `POST /api/superadmin/reviews/:id/flag` - Flag/unflag review
- `POST /api/superadmin/reviews/:id/lock` - Lock review (prevent edits)
- `PUT /api/superadmin/reviews/:id/rating-override` - Override rating

### 3.7 Analytics
- `GET /api/superadmin/analytics/overview` - Platform overview
- `GET /api/superadmin/analytics/revenue` - Revenue analytics
- `GET /api/superadmin/analytics/orders` - Order analytics
- `GET /api/superadmin/analytics/users` - User analytics
- `GET /api/superadmin/analytics/ratings` - Rating analytics
- `GET /api/superadmin/analytics/canteens` - Canteen performance
- `GET /api/superadmin/analytics/export` - Export CSV

### 3.8 System & Security
- `GET /api/superadmin/audit-logs` - Get audit logs (paginated, filterable)
- `GET /api/superadmin/audit-logs/:id` - Get specific audit log
- `GET /api/superadmin/settings` - Get all system settings
- `PUT /api/superadmin/settings/:key` - Update system setting
- `POST /api/superadmin/maintenance-mode` - Toggle maintenance mode

---

## 📦 Phase 4: Backend - Routes & Middleware

### File: `backend/src/middleware/superadmin.js`

```javascript
import { User, AuditLog } from '../models/index.js';

/**
 * Super Admin Guard - Strict admin-only access
 * This middleware OVERRIDES all business rules
 */
export const requireSuperAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        // Log unauthorized access attempt
        console.warn(`[SECURITY] Unauthorized super-admin access attempt by user ${req.user._id}`);
        return res.status(403).json({
            success: false,
            error: 'Super Admin access required'
        });
    }

    // Check if admin account is active
    if (!req.user.isActive) {
        return res.status(403).json({
            success: false,
            error: 'Admin account is suspended'
        });
    }

    next();
};

/**
 * Audit middleware - Automatically log admin actions
 */
export const withAuditLog = (action, entityType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            // Log after successful response
            if (data.success !== false && res.statusCode < 400) {
                // Audit log will be created by the controller
            }
            return originalJson(data);
        };
        
        // Attach audit context to request
        req.auditContext = { action, entityType };
        next();
    };
};
```

### File: `backend/src/routes/superadmin.routes.js`

```javascript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superadmin.js';
import superadminController from '../controllers/superadmin.controller.js';

const router = Router();

// All routes require authentication + super admin
router.use(authenticate);
router.use(requireSuperAdmin);

// ========================
// USER MANAGEMENT
// ========================
router.get('/users', superadminController.listUsers);
router.get('/users/:id', superadminController.getUser);
router.post('/users', superadminController.createUser);
router.put('/users/:id', superadminController.updateUser);
router.delete('/users/:id', superadminController.deleteUser);
router.post('/users/:id/suspend', superadminController.suspendUser);
router.post('/users/:id/reactivate', superadminController.reactivateUser);
router.post('/users/:id/force-logout', superadminController.forceLogout);
router.post('/users/:id/reset-password', superadminController.resetPassword);
router.get('/users/:id/activity', superadminController.getUserActivity);

// ========================
// CANTEEN MANAGEMENT
// ========================
router.get('/canteens', superadminController.listCanteens);
router.get('/canteens/:id', superadminController.getCanteen);
router.post('/canteens', superadminController.createCanteen);
router.put('/canteens/:id', superadminController.updateCanteen);
router.delete('/canteens/:id', superadminController.deleteCanteen);
router.post('/canteens/:id/approve', superadminController.approveCanteen);
router.post('/canteens/:id/reject', superadminController.rejectCanteen);
router.post('/canteens/:id/suspend', superadminController.suspendCanteen);
router.post('/canteens/:id/toggle-ordering', superadminController.toggleCanteenOrdering);
router.get('/canteens/:id/revenue', superadminController.getCanteenRevenue);

// ========================
// MENU MANAGEMENT
// ========================
router.get('/menu', superadminController.listMenuItems);
router.get('/menu/:id', superadminController.getMenuItem);
router.post('/menu', superadminController.createMenuItem);
router.put('/menu/:id', superadminController.updateMenuItem);
router.delete('/menu/:id', superadminController.deleteMenuItem);
router.post('/menu/:id/toggle-stock', superadminController.toggleMenuItemStock);
router.post('/menu/bulk-update', superadminController.bulkUpdateMenuItems);

// ========================
// ORDER MANAGEMENT
// ========================
router.get('/orders', superadminController.listOrders);
router.get('/orders/live', superadminController.getLiveOrders);
router.get('/orders/:id', superadminController.getOrder);
router.put('/orders/:id/status', superadminController.overrideOrderStatus);
router.post('/orders/:id/cancel', superadminController.cancelOrder);
router.post('/orders/:id/refund', superadminController.refundOrder);
router.put('/orders/:id/payment-status', superadminController.overridePaymentStatus);
router.post('/orders/:id/reassign', superadminController.reassignOrder);

// ========================
// PAYMENT MANAGEMENT
// ========================
router.get('/payments', superadminController.listPayments);
router.get('/payments/:id', superadminController.getPayment);
router.post('/payments/:id/verify', superadminController.verifyPayment);
router.post('/payments/:id/refund', superadminController.triggerRefund);
router.get('/payments/disputed', superadminController.getDisputedPayments);
router.get('/payments/reconciliation', superadminController.getReconciliation);

// ========================
// REVIEW MANAGEMENT
// ========================
router.get('/reviews', superadminController.listReviews);
router.get('/reviews/:id', superadminController.getReview);
router.put('/reviews/:id', superadminController.editReview);
router.delete('/reviews/:id', superadminController.deleteReview);
router.post('/reviews/:id/flag', superadminController.toggleReviewFlag);
router.post('/reviews/:id/lock', superadminController.lockReview);
router.put('/reviews/:id/rating-override', superadminController.overrideRating);

// ========================
// ANALYTICS
// ========================
router.get('/analytics/overview', superadminController.getOverviewAnalytics);
router.get('/analytics/revenue', superadminController.getRevenueAnalytics);
router.get('/analytics/orders', superadminController.getOrderAnalytics);
router.get('/analytics/users', superadminController.getUserAnalytics);
router.get('/analytics/ratings', superadminController.getRatingAnalytics);
router.get('/analytics/canteens', superadminController.getCanteenAnalytics);
router.get('/analytics/export', superadminController.exportAnalytics);

// ========================
// SYSTEM & SECURITY
// ========================
router.get('/audit-logs', superadminController.listAuditLogs);
router.get('/audit-logs/:id', superadminController.getAuditLog);
router.get('/settings', superadminController.getSystemSettings);
router.put('/settings/:key', superadminController.updateSystemSetting);
router.post('/maintenance-mode', superadminController.toggleMaintenanceMode);

export default router;
```

---

## 📦 Phase 5: Frontend - Super Admin UI

### 5.1 New Components Structure

```
frontend/src/
├── pages/
│   └── admin/
│       ├── SuperAdminLayout.tsx      # Shell layout with sidebar
│       ├── SuperAdminDashboard.tsx   # Overview page
│       ├── UsersManagement.tsx       # Users CRUD
│       ├── CanteensManagement.tsx    # Canteens CRUD
│       ├── OrdersManagement.tsx      # Orders management
│       ├── MenuManagement.tsx        # Global menu management
│       ├── PaymentsManagement.tsx    # Payment reconciliation
│       ├── ReviewsManagement.tsx     # Review moderation
│       ├── AuditLogs.tsx             # Audit log viewer
│       └── SystemSettings.tsx        # Feature flags
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx          # Navigation sidebar
│       ├── AdminDataTable.tsx        # Reusable data table
│       ├── AdminModal.tsx            # Modal for CRUD
│       ├── AdminFilters.tsx          # Filter component
│       ├── AuditLogEntry.tsx         # Single audit entry
│       └── StatusBadge.tsx           # Status indicators
```

### 5.2 API Extensions

Add to `frontend/src/api.ts`:

```typescript
// Super Admin API (God Mode)
export const superadminAPI = {
    // Users
    listUsers: (params?: any) => api.get('/superadmin/users', { params }),
    getUser: (id: string) => api.get(`/superadmin/users/${id}`),
    createUser: (data: any) => api.post('/superadmin/users', data),
    updateUser: (id: string, data: any) => api.put(`/superadmin/users/${id}`, data),
    deleteUser: (id: string) => api.delete(`/superadmin/users/${id}`),
    suspendUser: (id: string, reason: string) => api.post(`/superadmin/users/${id}/suspend`, { reason }),
    reactivateUser: (id: string) => api.post(`/superadmin/users/${id}/reactivate`),
    forceLogout: (id: string) => api.post(`/superadmin/users/${id}/force-logout`),
    resetPassword: (id: string, newPassword: string) => api.post(`/superadmin/users/${id}/reset-password`, { newPassword }),
    
    // Canteens
    listCanteens: (params?: any) => api.get('/superadmin/canteens', { params }),
    getCanteen: (id: string) => api.get(`/superadmin/canteens/${id}`),
    createCanteen: (data: any) => api.post('/superadmin/canteens', data),
    updateCanteen: (id: string, data: any) => api.put(`/superadmin/canteens/${id}`, data),
    deleteCanteen: (id: string) => api.delete(`/superadmin/canteens/${id}`),
    approveCanteen: (id: string) => api.post(`/superadmin/canteens/${id}/approve`),
    suspendCanteen: (id: string, reason: string) => api.post(`/superadmin/canteens/${id}/suspend`, { reason }),
    
    // Menu
    listMenuItems: (params?: any) => api.get('/superadmin/menu', { params }),
    updateMenuItem: (id: string, data: any) => api.put(`/superadmin/menu/${id}`, data),
    toggleStock: (id: string) => api.post(`/superadmin/menu/${id}/toggle-stock`),
    bulkUpdateMenu: (items: any[]) => api.post('/superadmin/menu/bulk-update', { items }),
    
    // Orders
    listOrders: (params?: any) => api.get('/superadmin/orders', { params }),
    getLiveOrders: () => api.get('/superadmin/orders/live'),
    overrideOrderStatus: (id: string, status: string, reason: string) => 
        api.put(`/superadmin/orders/${id}/status`, { status, reason }),
    cancelOrder: (id: string, reason: string, refund: boolean) => 
        api.post(`/superadmin/orders/${id}/cancel`, { reason, refund }),
    refundOrder: (id: string, amount: number, reason: string) => 
        api.post(`/superadmin/orders/${id}/refund`, { amount, reason }),
    
    // Payments
    listPayments: (params?: any) => api.get('/superadmin/payments', { params }),
    verifyPayment: (id: string) => api.post(`/superadmin/payments/${id}/verify`),
    triggerRefund: (id: string, amount: number, reason: string) => 
        api.post(`/superadmin/payments/${id}/refund`, { amount, reason }),
    getReconciliation: () => api.get('/superadmin/payments/reconciliation'),
    
    // Reviews
    listReviews: (params?: any) => api.get('/superadmin/reviews', { params }),
    editReview: (id: string, data: any) => api.put(`/superadmin/reviews/${id}`, data),
    deleteReview: (id: string, reason: string) => api.delete(`/superadmin/reviews/${id}`, { data: { reason } }),
    toggleFlag: (id: string) => api.post(`/superadmin/reviews/${id}/flag`),
    lockReview: (id: string) => api.post(`/superadmin/reviews/${id}/lock`),
    
    // Analytics
    getOverview: () => api.get('/superadmin/analytics/overview'),
    getRevenueAnalytics: (params?: any) => api.get('/superadmin/analytics/revenue', { params }),
    exportCSV: (type: string) => api.get(`/superadmin/analytics/export`, { params: { type }, responseType: 'blob' }),
    
    // System
    getAuditLogs: (params?: any) => api.get('/superadmin/audit-logs', { params }),
    getSettings: () => api.get('/superadmin/settings'),
    updateSetting: (key: string, value: any) => api.put(`/superadmin/settings/${key}`, { value }),
    toggleMaintenanceMode: (enabled: boolean, message?: string) => 
        api.post('/superadmin/maintenance-mode', { enabled, message }),
};
```

---

## 📦 Phase 6: Implementation Order

### Week 1: Backend Foundation
1. ✅ Extend schemas (AuditLog, User extensions, etc.)
2. ✅ Create audit logger utility
3. ✅ Create super admin middleware
4. ✅ Create super admin routes file
5. ✅ Register routes in main app

### Week 2: Backend Controllers - Part 1
6. ✅ User management endpoints
7. ✅ Canteen management endpoints
8. ✅ Menu management endpoints

### Week 3: Backend Controllers - Part 2
9. ✅ Order management endpoints
10. ✅ Payment management endpoints
11. ✅ Review management endpoints

### Week 4: Backend Controllers - Part 3
12. ✅ Analytics endpoints
13. ✅ System settings endpoints
14. ✅ Audit log endpoints

### Week 5: Frontend - Part 1
15. ✅ Super admin layout shell
16. ✅ Admin dashboard overview
17. ✅ Users management page
18. ✅ Canteens management page

### Week 6: Frontend - Part 2
19. ✅ Orders management page
20. ✅ Menu management page
21. ✅ Payments management page
22. ✅ Reviews management page

### Week 7: Frontend - Part 3
23. ✅ Audit logs viewer
24. ✅ System settings page
25. ✅ Analytics dashboards
26. ✅ CSV export functionality

### Week 8: Testing & Polish
27. ✅ Integration testing
28. ✅ Security audit
29. ✅ Performance optimization
30. ✅ Documentation

---

## ✅ Success Criteria

After implementation:
- [ ] Admin can view ALL entities (users, canteens, orders, etc.)
- [ ] Admin can CREATE any entity from dashboard
- [ ] Admin can UPDATE any field on any entity
- [ ] Admin can DELETE (soft delete) any entity
- [ ] Admin can OVERRIDE any status/state
- [ ] ALL admin actions are logged in immutable audit logs
- [ ] Existing features remain FULLY OPERATIONAL
- [ ] Backend boots cleanly in production
- [ ] No breaking changes to existing APIs
- [ ] No data loss possible

---

## ⛔ FORBIDDEN ACTIONS (Reminders)

- ❌ Do NOT remove any existing feature
- ❌ Do NOT simplify business logic
- ❌ Do NOT replace existing flows
- ❌ Do NOT rewrite schemas unnecessarily  
- ❌ Do NOT break existing routes
- ❌ Do NOT cause data loss
- ❌ Do NOT create silent failures

---

## 📁 Files to Create

### Backend (New Files)
1. `backend/src/controllers/superadmin.controller.js`
2. `backend/src/routes/superadmin.routes.js`
3. `backend/src/middleware/superadmin.js`
4. `backend/src/utils/auditLogger.js`

### Backend (Modify)
1. `backend/src/models/index.js` - Add AuditLog, SystemSettings, extend existing schemas
2. `backend/src/routes/index.js` - Register superadmin routes
3. `backend/src/middleware/auth.js` - Add forceLogoutBefore check

### Frontend (New Files)
1. `frontend/src/pages/admin/SuperAdminLayout.tsx`
2. `frontend/src/pages/admin/SuperAdminDashboard.tsx`
3. `frontend/src/pages/admin/UsersManagement.tsx`
4. `frontend/src/pages/admin/CanteensManagement.tsx`
5. `frontend/src/pages/admin/OrdersManagement.tsx`
6. `frontend/src/pages/admin/MenuManagement.tsx`
7. `frontend/src/pages/admin/PaymentsManagement.tsx`
8. `frontend/src/pages/admin/ReviewsManagement.tsx`
9. `frontend/src/pages/admin/AuditLogs.tsx`
10. `frontend/src/pages/admin/SystemSettings.tsx`
11. `frontend/src/components/admin/AdminSidebar.tsx`
12. `frontend/src/components/admin/AdminDataTable.tsx`

### Frontend (Modify)
1. `frontend/src/api.ts` - Add superadminAPI
2. `frontend/src/main.tsx` - Add routes
