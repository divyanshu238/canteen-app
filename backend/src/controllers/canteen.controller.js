import { Canteen, MenuItem } from '../models/index.js';
import mongoose from 'mongoose';

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
 * CRITICAL FIX v2: 
 * 1. Uses $toLower for reliable case-insensitive matching
 * 2. Uses pipeline-based $lookup to handle ObjectId conversion properly
 * 3. Adds debug logging to diagnose empty results
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

        // Normalize to lowercase and trim whitespace
        const normalizedCategory = category.trim().toLowerCase();

        console.log('[getCanteensByCategory] Input:', category);
        console.log('[getCanteensByCategory] Normalized:', normalizedCategory);

        // STEP 1: First, find all items matching this category (for debugging)
        const matchingItemsRaw = await MenuItem.find({ inStock: true }).lean();
        const matchingItems = matchingItemsRaw.filter(item =>
            item.category && item.category.trim().toLowerCase() === normalizedCategory
        );
        console.log('[getCanteensByCategory] Matching items (direct query):', matchingItems.length);

        if (matchingItems.length > 0) {
            console.log('[getCanteensByCategory] Sample item:', {
                name: matchingItems[0].name,
                category: matchingItems[0].category,
                canteenId: matchingItems[0].canteenId,
                canteenIdType: typeof matchingItems[0].canteenId
            });
        }

        // STEP 2: Run the aggregation with enhanced $lookup
        const results = await MenuItem.aggregate([
            // Add a lowercase version of the category field
            {
                $addFields: {
                    categoryLower: { $toLower: { $trim: { input: { $ifNull: ['$category', ''] } } } }
                }
            },
            // Match items where lowercase category equals our query AND item is in stock
            {
                $match: {
                    categoryLower: normalizedCategory,
                    inStock: true
                }
            },
            // CRITICAL FIX: Use pipeline-based $lookup with proper ObjectId handling
            // This works whether canteenId is stored as ObjectId or string
            {
                $lookup: {
                    from: 'canteens',
                    let: { menuCanteenId: '$canteenId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$menuCanteenId']
                                }
                            }
                        }
                    ],
                    as: 'canteen'
                }
            },
            // Unwind the canteen array (each item has exactly one canteen)
            // preserveNullAndEmptyArrays: true for debugging - we'll filter after
            {
                $unwind: {
                    path: '$canteen',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Add debug field to track why items might be filtered
            {
                $addFields: {
                    _debug_hasCanteen: { $cond: [{ $ifNull: ['$canteen', false] }, true, false] },
                    _debug_canteenOpen: { $ifNull: ['$canteen.isOpen', false] },
                    _debug_canteenApproved: { $ifNull: ['$canteen.isApproved', false] }
                }
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

        console.log('[getCanteensByCategory] Aggregation results count:', results.length);

        // DEBUG: If aggregation returns 0 but we found items, investigate why
        if (results.length === 0 && matchingItems.length > 0) {
            console.log('[getCanteensByCategory] DEBUG: Items found but aggregation empty!');

            // Check canteen status for the first matching item
            const sampleCanteenId = matchingItems[0].canteenId;
            const canteen = await Canteen.findById(sampleCanteenId).lean();

            if (canteen) {
                console.log('[getCanteensByCategory] DEBUG: Canteen status:', {
                    name: canteen.name,
                    isOpen: canteen.isOpen,
                    isApproved: canteen.isApproved
                });
            } else {
                console.log('[getCanteensByCategory] DEBUG: Canteen not found for id:', sampleCanteenId);
            }
        }

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
            // Normalize category to lowercase for grouping
            {
                $addFields: {
                    categoryLower: { $toLower: { $trim: { input: '$category' } } }
                }
            },
            // Get distinct categories with count
            {
                $group: {
                    _id: '$categoryLower',
                    originalName: { $first: '$category' },  // Keep original for display
                    itemCount: { $sum: 1 }
                }
            },
            // Sort by item count
            { $sort: { itemCount: -1 } },
            // Project
            {
                $project: {
                    _id: 0,
                    name: '$_id',  // lowercase slug for URL
                    displayName: '$originalName',  // Title case for display
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

/**
 * Debug endpoint to diagnose category issues
 * GET /api/canteens/debug/category-check
 */
export const debugCategoryCheck = async (req, res, next) => {
    try {
        // Count total documents
        const menuItemCount = await MenuItem.countDocuments({});
        const canteenCount = await Canteen.countDocuments({});

        // Get all distinct categories
        const distinctCategories = await MenuItem.distinct('category');

        // Get all canteens with their status
        const canteens = await Canteen.find({}).select('name isOpen isApproved');

        // Get sample menu items with their canteen reference
        const sampleItems = await MenuItem.find({})
            .limit(10)
            .select('name category inStock canteenId');

        // Test the aggregation for a specific category
        const testCategory = req.query.test || 'burger';
        const normalizedTest = testCategory.toLowerCase();

        const testResults = await MenuItem.aggregate([
            {
                $addFields: {
                    categoryLower: { $toLower: { $trim: { input: '$category' } } }
                }
            },
            {
                $match: {
                    categoryLower: normalizedTest,
                    inStock: true
                }
            },
            {
                $lookup: {
                    from: 'canteens',
                    localField: 'canteenId',
                    foreignField: '_id',
                    as: 'canteen'
                }
            },
            { $unwind: '$canteen' },
            {
                $match: {
                    'canteen.isOpen': true,
                    'canteen.isApproved': true
                }
            },
            {
                $project: {
                    name: 1,
                    category: 1,
                    inStock: 1,
                    'canteen.name': 1,
                    'canteen.isOpen': 1,
                    'canteen.isApproved': 1
                }
            }
        ]);

        res.json({
            success: true,
            debug: {
                totalMenuItems: menuItemCount,
                totalCanteens: canteenCount,
                distinctCategories,
                canteens: canteens.map(c => ({
                    name: c.name,
                    isOpen: c.isOpen,
                    isApproved: c.isApproved
                })),
                sampleItems: sampleItems.map(i => ({
                    name: i.name,
                    category: i.category,
                    inStock: i.inStock,
                    hasCanteenId: !!i.canteenId
                })),
                testQuery: {
                    category: testCategory,
                    normalized: normalizedTest,
                    matchingItemsCount: testResults.length,
                    matchingItems: testResults
                }
            }
        });
    } catch (error) {
        console.error('[debugCategoryCheck] Error:', error);
        next(error);
    }
};

export default {
    getAllCanteens,
    getCanteen,
    getCanteenMenu,
    getCanteensByCategory,
    getAllCategories,
    debugCategoryCheck
};
