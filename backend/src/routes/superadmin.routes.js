/**
 * Super Admin Routes
 * 
 * Complete God Mode access - all routes require admin authentication.
 * All actions are audited.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin, validateObjectId, logAdminRequest } from '../middleware/superadmin.js';

// Import all controller parts
import userController from '../controllers/superadmin.controller.js';
import canteenController from '../controllers/superadmin.canteen.controller.js';
import ordersController from '../controllers/superadmin.orders.controller.js';

const router = Router();

// All routes require authentication + super admin + logging
router.use(authenticate);
router.use(requireSuperAdmin);
router.use(logAdminRequest);

// ========================
// USER MANAGEMENT
// ========================
router.get('/users', userController.listUsers);
router.get('/users/:id', validateObjectId('id'), userController.getUser);
router.post('/users', userController.createUser);
router.put('/users/:id', validateObjectId('id'), userController.updateUser);
router.delete('/users/:id', validateObjectId('id'), userController.deleteUser);
router.post('/users/:id/suspend', validateObjectId('id'), userController.suspendUser);
router.post('/users/:id/reactivate', validateObjectId('id'), userController.reactivateUser);
router.post('/users/:id/force-logout', validateObjectId('id'), userController.forceLogout);
router.post('/users/:id/reset-password', validateObjectId('id'), userController.resetPassword);
router.get('/users/:id/activity', validateObjectId('id'), userController.getUserActivity);

// ========================
// CANTEEN MANAGEMENT
// ========================
router.get('/canteens', canteenController.listCanteens);
router.get('/canteens/:id', validateObjectId('id'), canteenController.getCanteen);
router.post('/canteens', canteenController.createCanteen);
router.put('/canteens/:id', validateObjectId('id'), canteenController.updateCanteen);
router.delete('/canteens/:id', validateObjectId('id'), canteenController.deleteCanteen);
router.post('/canteens/:id/approve', validateObjectId('id'), canteenController.approveCanteen);
router.post('/canteens/:id/reject', validateObjectId('id'), canteenController.rejectCanteen);
router.post('/canteens/:id/suspend', validateObjectId('id'), canteenController.suspendCanteen);
router.post('/canteens/:id/toggle-ordering', validateObjectId('id'), canteenController.toggleCanteenOrdering);
router.get('/canteens/:id/revenue', validateObjectId('id'), canteenController.getCanteenRevenue);

// ========================
// MENU MANAGEMENT
// ========================
router.get('/menu', canteenController.listMenuItems);
router.get('/menu/:id', validateObjectId('id'), canteenController.getMenuItem);
router.post('/menu', canteenController.createMenuItem);
router.put('/menu/:id', validateObjectId('id'), canteenController.updateMenuItem);
router.delete('/menu/:id', validateObjectId('id'), canteenController.deleteMenuItem);
router.post('/menu/:id/toggle-stock', validateObjectId('id'), canteenController.toggleMenuItemStock);
router.post('/menu/bulk-update', canteenController.bulkUpdateMenuItems);

// ========================
// ORDER MANAGEMENT
// ========================
router.get('/orders', ordersController.listOrders);
router.get('/orders/live', ordersController.getLiveOrders);
router.get('/orders/:id', validateObjectId('id'), ordersController.getOrder);
router.put('/orders/:id/status', validateObjectId('id'), ordersController.overrideOrderStatus);
router.post('/orders/:id/cancel', validateObjectId('id'), ordersController.cancelOrder);
router.post('/orders/:id/refund', validateObjectId('id'), ordersController.refundOrder);
router.put('/orders/:id/payment-status', validateObjectId('id'), ordersController.overridePaymentStatus);
router.post('/orders/:id/reassign', validateObjectId('id'), ordersController.reassignOrder);

// ========================
// REVIEW MANAGEMENT
// ========================
router.get('/reviews', ordersController.listReviews);
router.get('/reviews/:id', validateObjectId('id'), ordersController.getReview);
router.put('/reviews/:id', validateObjectId('id'), ordersController.editReview);
router.delete('/reviews/:id', validateObjectId('id'), ordersController.deleteReview);
router.post('/reviews/:id/flag', validateObjectId('id'), ordersController.toggleReviewFlag);
router.post('/reviews/:id/lock', validateObjectId('id'), ordersController.lockReview);
router.put('/reviews/:id/rating-override', validateObjectId('id'), ordersController.overrideRating);

// ========================
// ANALYTICS
// ========================
router.get('/analytics/overview', ordersController.getOverviewAnalytics);

// ========================
// AUDIT LOGS
// ========================
router.get('/audit-logs', ordersController.listAuditLogs);
router.get('/audit-logs/:id', validateObjectId('id'), ordersController.getAuditLog);

// ========================
// SYSTEM SETTINGS
// ========================
router.get('/settings', ordersController.getSystemSettings);
router.put('/settings/:key', ordersController.updateSystemSetting);
router.post('/maintenance-mode', ordersController.toggleMaintenanceMode);

export default router;
