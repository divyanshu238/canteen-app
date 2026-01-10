import { Router } from 'express';
import partnerController from '../controllers/partner.controller.js';
import { authenticate, authorize, requireApproval } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and partner role
router.use(authenticate);
router.use(authorize('partner', 'admin'));

/**
 * @route   GET /api/partner/canteen
 * @desc    Get partner's canteen
 * @access  Partner
 */
router.get('/canteen', partnerController.getMyCanteen);

/**
 * @route   PUT /api/partner/canteen
 * @desc    Update canteen details
 * @access  Partner
 */
router.put('/canteen', partnerController.updateCanteen);

/**
 * @route   PUT /api/partner/canteen/toggle
 * @desc    Toggle canteen open/closed
 * @access  Partner
 */
router.put('/canteen/toggle', requireApproval, partnerController.toggleCanteenStatus);

/**
 * @route   GET /api/partner/menu
 * @desc    Get menu items
 * @access  Partner
 */
router.get('/menu', partnerController.getMenu);

/**
 * @route   POST /api/partner/menu
 * @desc    Add menu item
 * @access  Partner
 */
router.post('/menu', requireApproval, partnerController.addMenuItem);

/**
 * @route   PUT /api/partner/menu/:itemId
 * @desc    Update menu item
 * @access  Partner
 */
router.put('/menu/:itemId', partnerController.updateMenuItem);

/**
 * @route   DELETE /api/partner/menu/:itemId
 * @desc    Delete menu item
 * @access  Partner
 */
router.delete('/menu/:itemId', partnerController.deleteMenuItem);

/**
 * @route   PUT /api/partner/menu/:itemId/toggle
 * @desc    Toggle item stock
 * @access  Partner
 */
router.put('/menu/:itemId/toggle', partnerController.toggleItemStock);

/**
 * @route   GET /api/partner/orders
 * @desc    Get all orders
 * @access  Partner
 */
router.get('/orders', requireApproval, partnerController.getOrders);

/**
 * @route   GET /api/partner/orders/live
 * @desc    Get live orders
 * @access  Partner
 */
router.get('/orders/live', requireApproval, partnerController.getLiveOrders);

/**
 * @route   PUT /api/partner/orders/:orderId/status
 * @desc    Update order status
 * @access  Partner
 */
router.put('/orders/:orderId/status', requireApproval, partnerController.updateOrderStatus);

/**
 * @route   GET /api/partner/stats
 * @desc    Get dashboard stats
 * @access  Partner
 */
router.get('/stats', partnerController.getDashboardStats);

export default router;
