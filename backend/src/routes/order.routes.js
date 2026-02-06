import { Router } from 'express';
import orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', authenticate, orderController.createOrder);

/**
 * @route   POST /api/orders/verify-payment
 * @desc    Verify Razorpay payment
 * @access  Private
 */
router.post('/verify-payment', authenticate, orderController.verifyPayment);

/**
 * @route   POST /api/orders/dev-confirm
 * @desc    Dev mode order confirmation (no Razorpay)
 * @access  Private - DEVELOPMENT ONLY
 */
if (!isProduction) {
    router.post('/dev-confirm', authenticate, orderController.devConfirmOrder);
}

/**
 * @route   POST /api/orders/webhook
 * @desc    Razorpay webhook handler
 * @access  Public (verified by signature)
 */
router.post('/webhook', orderController.handleWebhook);

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', authenticate, orderController.getMyOrders);

/**
 * @route   GET /api/orders/history-summary
 * @desc    Get lightweight order history summary for "Previously ordered" badges
 * @access  Private
 */
router.get('/history-summary', authenticate, orderController.getOrderHistorySummary);

/**
 * @route   GET /api/orders/:id/status
 * @desc    Get order status
 * @access  Private
 */
router.get('/:id/status', authenticate, orderController.getOrderStatus);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details
 * @access  Private
 */
router.get('/:id', authenticate, orderController.getOrder);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', authenticate, orderController.cancelOrder);

export default router;

