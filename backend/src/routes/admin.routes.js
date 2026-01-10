import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * @route   POST /api/admin/setup
 * @desc    Create first admin account (one-time)
 * @access  Public (only works if no admin exists)
 */
router.post('/setup', adminController.setupAdmin);

// All other routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/users/:id', adminController.getUser);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (activate/deactivate/approve)
 * @access  Admin
 */
router.put('/users/:id', adminController.updateUser);

/**
 * @route   GET /api/admin/canteens
 * @desc    Get all canteens
 * @access  Admin
 */
router.get('/canteens', adminController.getAllCanteens);

/**
 * @route   PUT /api/admin/canteens/:id
 * @desc    Approve/update canteen
 * @access  Admin
 */
router.put('/canteens/:id', adminController.updateCanteen);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders
 * @access  Admin
 */
router.get('/orders', adminController.getAllOrders);

/**
 * @route   PUT /api/admin/orders/:id
 * @desc    Override order status
 * @access  Admin
 */
router.put('/orders/:id', adminController.updateOrder);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics
 * @access  Admin
 */
router.get('/analytics', adminController.getAnalytics);

export default router;
