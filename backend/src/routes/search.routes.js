import { Router } from 'express';
import searchController from '../controllers/search.controller.js';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Search for canteens and dishes
 * @access  Public
 * @query   q - Search query string (required, min 2 chars)
 */
router.get('/', searchController.search);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions for autocomplete
 * @access  Public
 * @query   q - Partial search query
 */
router.get('/suggestions', searchController.searchSuggestions);

export default router;
