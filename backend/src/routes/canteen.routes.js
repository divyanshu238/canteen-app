import { Router } from 'express';
import canteenController from '../controllers/canteen.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/canteens
 * @desc    Get all open canteens
 * @access  Public
 */
router.get('/', canteenController.getAllCanteens);

/**
 * @route   GET /api/canteens/:id
 * @desc    Get single canteen
 * @access  Public
 */
router.get('/:id', canteenController.getCanteen);

/**
 * @route   GET /api/canteens/:id/menu
 * @desc    Get canteen menu
 * @access  Public
 */
router.get('/:id/menu', optionalAuth, canteenController.getCanteenMenu);

export default router;
