import { Router } from 'express';
import canteenController from '../controllers/canteen.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/canteens/debug/category-check
 * @desc    Debug endpoint to check category data
 * @access  Public (for debugging only - remove in production)
 * NOTE: This route MUST be before /:id to avoid matching 'debug' as an ID
 */
router.get('/debug/category-check', canteenController.debugCategoryCheck);

/**
 * @route   GET /api/canteens/categories/all
 * @desc    Get all available categories with item counts
 * @access  Public
 * NOTE: This route MUST be before /:id to avoid matching 'categories' as an ID
 */
router.get('/top-rated', canteenController.getTopRatedByCategory);
router.get('/categories/all', canteenController.getAllCategories);

/**
 * @route   GET /api/canteens/by-category/:category
 * @desc    Get canteens filtered by category with only matching items
 * @access  Public
 * NOTE: This route MUST be before /:id to avoid matching 'by-category' as an ID
 */
router.get('/by-category/:category', canteenController.getCanteensByCategory);

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
