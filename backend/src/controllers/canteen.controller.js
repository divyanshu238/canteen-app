import { Canteen, MenuItem } from '../models/index.js';
import mongoose from 'mongoose';

// Valid categories - case-insensitive matching will be used
const VALID_CATEGORIES = [
    'burger',
    'pizza',
    'biryani',
    'rolls',
    'coffee',
    'dessert',
    'noodles',
    'sandwich',
    'breakfast',
    'beverages',
    'snacks',
    'main course',
    'mains',
    'pasta',
    'sides',
    'other'
];

/**
 * Normalize category for case-insensitive matching
 * @param {string} category - Raw category input
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegexString = (category) => {
    // Escape special regex characters for safe pattern matching
    return category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Get all open and approved canteens
 * GET /api/canteens
 */
export const getAllCanteens = async (req, res, next) => {
    try {
        const { search, tags } = req.query;

        const query = { isOpen: true, isApproved: true };

        if (search) {
            query.$text = { $search: search };
        }

        if (tags) {
            query.tags = { $in: tags.split(',') };
        }

        const canteens = await Canteen.find(query)
            .select('-__v')
            .sort({ rating: -1, createdAt: -1 });

        res.json({
            success: true,
            count: canteens.length,
            data: canteens
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single canteen with menu
 * GET /api/canteens/:id
 */
export const getCanteen = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        res.json({
            success: true,
            data: canteen
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get canteen menu
 * GET /api/canteens/:id/menu
 */
export const getCanteenMenu = async (req, res, next) => {
    try {
        const canteen = await Canteen.findById(req.params.id);

        if (!canteen) {
            return res.status(404).json({
                success: false,
                error: 'Canteen not found'
            });
        }

        const query = { canteenId: req.params.id };

        // Only show in-stock items for non-owners
        if (!req.user || req.user.canteenId?.toString() !== req.params.id) {
            query.inStock = true;
        }

        const menu = await MenuItem.find(query).sort({ category: 1, name: 1 });

        // Group by category
        const menuByCategory = menu.reduce((acc, item) => {
            const category = item.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                canteen,
                menu,
                menuByCategory
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get canteens filtered by category with ONLY items in that category
 * GET /api/canteens/by-category/:category
 * 
 * This is the CRITICAL endpoint for category filtering:
 * 1. Finds all menu items matching the category (case-insensitive)
 * 2. Groups items by canteen
 * 3. Returns only canteens that have items in that category
 * 4. Each canteen includes ONLY the filtered items, not their full menu
 * 
 * IMPORTANT: Uses MongoDB $regex operator (not JavaScript RegExp) for aggregation
 */
export const getCanteensByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;

        // Validate category input
        if (!category || typeof category !== 'string' || category.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Category parameter is required'
            });
        }

        const normalizedCategory = category.trim();

        // Escape special regex characters for MongoDB $regex
        // CRITICAL: Must use MongoDB $regex operator, NOT JavaScript RegExp object
        const escapedCategory = escapeRegexString(normalizedCategory);

        // Step 1: Find all menu items in this category that are in stock
        // Using aggregation for better performance and to avoid N+1 queries
        const results = await MenuItem.aggregate([
            // Match items in the requested category that are in stock
            // CRITICAL FIX: Use MongoDB $regex operator, not JS RegExp
            {
                $match: {
                    category: {
                        $regex: `^${escapedCategory}$`,
                        $options: 'i'  // Case-insensitive
                    },
                    inStock: true
                }
            },
            // Lookup the canteen for each item
            {
                $lookup: {
                    from: 'canteens',
                    localField: 'canteenId',
                    foreignField: '_id',
                    as: 'canteen'
                }
            },
            // Unwind the canteen array (each item has exactly one canteen)
            {
                $unwind: '$canteen'
            },
            // Only include items from open and approved canteens
            {
                $match: {
                    'canteen.isOpen': true,
                    'canteen.isApproved': true
                }
            },
            // Group by canteen to collect all matching items per canteen
            {
                $group: {
                    _id: '$canteen._id',
                    canteen: { $first: '$canteen' },
                    items: {
                        $push: {
                            _id: '$_id',
                            name: '$name',
                            description: '$description',
                            price: '$price',
                            image: '$image',
                            isVeg: '$isVeg',
                            inStock: '$inStock',
                            category: '$category',
                            preparationTime: '$preparationTime',
                            canteenId: '$canteenId'
                        }
                    },
                    itemCount: { $sum: 1 }
                }
            },
            // Sort by canteen rating (highest first), then by item count
            {
                $sort: {
                    'canteen.rating': -1,
                    itemCount: -1
                }
            },
            // Project the final shape
            {
                $project: {
                    _id: 0,
                    canteen: {
                        _id: '$canteen._id',
                        name: '$canteen.name',
                        description: '$canteen.description',
                        image: '$canteen.image',
                        rating: '$canteen.rating',
                        tags: '$canteen.tags',
                        isOpen: '$canteen.isOpen',
                        preparationTime: '$canteen.preparationTime',
                        priceRange: '$canteen.priceRange'
                    },
                    items: 1,
                    itemCount: 1
                }
            }
        ]);

        // Return the filtered results
        res.json({
            success: true,
            category: normalizedCategory,
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('[getCanteensByCategory] Error:', error);
        next(error);
    }
};

/**
 * Get all available categories from the database
 * GET /api/canteens/categories/all
 * 
 * Returns list of unique categories that have at least one in-stock item
 * in an open, approved canteen
 */
export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await MenuItem.aggregate([
            // Only in-stock items
            { $match: { inStock: true } },
            // Lookup canteen
            {
                $lookup: {
                    from: 'canteens',
                    localField: 'canteenId',
                    foreignField: '_id',
                    as: 'canteen'
                }
            },
            { $unwind: '$canteen' },
            // Only from open, approved canteens
            {
                $match: {
                    'canteen.isOpen': true,
                    'canteen.isApproved': true
                }
            },
            // Get distinct categories with count
            {
                $group: {
                    _id: '$category',
                    itemCount: { $sum: 1 }
                }
            },
            // Sort by item count
            { $sort: { itemCount: -1 } },
            // Project
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    itemCount: 1
                }
            }
        ]);

        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getAllCanteens,
    getCanteen,
    getCanteenMenu,
    getCanteensByCategory,
    getAllCategories
};
