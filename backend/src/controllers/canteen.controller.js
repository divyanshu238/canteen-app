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
 * CRITICAL FIX v3: Uses Mongoose find() + populate() approach
 * The aggregation $lookup was failing silently because of ObjectId type mismatches.
 * Mongoose's find() with populate() handles type coercion automatically.
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

        // STEP 1: Get ALL in-stock menu items and filter by category (case-insensitive)
        // Using Mongoose find() which properly handles ObjectId references
        const allInStockItems = await MenuItem.find({ inStock: true })
            .populate({
                path: 'canteenId',
                match: { isOpen: true, isApproved: true },
                select: '_id name description image rating tags isOpen preparationTime priceRange'
            })
            .lean();

        console.log('[getCanteensByCategory] Total in-stock items:', allInStockItems.length);

        // STEP 2: Filter items by category (case-insensitive) and those with valid canteens
        const matchingItems = allInStockItems.filter(item => {
            // Check category match (case-insensitive)
            const itemCategory = (item.category || '').trim().toLowerCase();
            const categoryMatch = itemCategory === normalizedCategory;

            // Check if canteen was populated (open + approved)
            const hasValidCanteen = item.canteenId && typeof item.canteenId === 'object';

            return categoryMatch && hasValidCanteen;
        });

        console.log('[getCanteensByCategory] Matching items after filter:', matchingItems.length);

        if (matchingItems.length > 0) {
            console.log('[getCanteensByCategory] Sample matching item:', {
                name: matchingItems[0].name,
                category: matchingItems[0].category,
                canteenName: matchingItems[0].canteenId?.name
            });
        }

        // STEP 3: Group items by canteen
        const canteenMap = new Map();

        for (const item of matchingItems) {
            const canteen = item.canteenId;
            const canteenId = canteen._id.toString();

            if (!canteenMap.has(canteenId)) {
                canteenMap.set(canteenId, {
                    canteen: {
                        _id: canteen._id,
                        name: canteen.name,
                        description: canteen.description,
                        image: canteen.image,
                        rating: canteen.rating,
                        tags: canteen.tags,
                        isOpen: canteen.isOpen,
                        preparationTime: canteen.preparationTime,
                        priceRange: canteen.priceRange
                    },
                    items: [],
                    itemCount: 0
                });
            }

            const canteenData = canteenMap.get(canteenId);
            canteenData.items.push({
                _id: item._id,
                name: item.name,
                description: item.description,
                price: item.price,
                image: item.image,
                isVeg: item.isVeg,
                inStock: item.inStock,
                category: item.category,
                preparationTime: item.preparationTime,
                canteenId: canteen._id
            });
            canteenData.itemCount++;
        }

        // STEP 4: Convert map to array and sort by rating
        const results = Array.from(canteenMap.values())
            .sort((a, b) => {
                // Sort by rating descending, then by item count descending
                const ratingDiff = (b.canteen.rating || 0) - (a.canteen.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                return b.itemCount - a.itemCount;
            });

        console.log('[getCanteensByCategory] Final results count:', results.length);

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
