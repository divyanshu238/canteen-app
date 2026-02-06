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

        // STEP 1: Get ALL in-stock menu items and filter by category (case-insensitive)
        const allInStockItems = await MenuItem.find({ inStock: true })
            .populate({
                path: 'canteenId',
                match: { isOpen: true, isApproved: true },
                select: '_id name description image rating tags isOpen preparationTime priceRange'
            })
            .lean();

        // STEP 2: Filter items and those with valid canteens
        const matchingItems = allInStockItems.filter(item => {
            const itemCategory = (item.category || '').trim().toLowerCase();
            const categoryMatch = itemCategory.includes(normalizedCategory) || normalizedCategory.includes(itemCategory); // For loose matching
            const hasValidCanteen = item.canteenId && typeof item.canteenId === 'object';
            return categoryMatch && hasValidCanteen;
        });

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
                        priceRange: canteen.priceRange,
                        // Include relevant stats
                        totalRatings: canteen.totalRatings
                    },
                    items: [],
                    itemCount: 0
                });
            }

            const canteenData = canteenMap.get(canteenId);
            canteenData.items.push({
                _id: item._id,
                name: item.name,
                price: item.price,
                image: item.image,
                category: item.category
            });
            canteenData.itemCount++;
        }

        // STEP 4: Convert map to array and sort by rating
        const results = Array.from(canteenMap.values())
            .sort((a, b) => {
                const ratingDiff = (b.canteen.rating || 0) - (a.canteen.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                return b.itemCount - a.itemCount;
            });

        res.json({
            success: true,
            category: normalizedCategory,
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all available categories from the database
 * GET /api/canteens/categories/all
 */
export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await MenuItem.aggregate([
            { $match: { inStock: true } },
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
                $addFields: {
                    categoryLower: { $toLower: { $trim: { input: '$category' } } }
                }
            },
            {
                $group: {
                    _id: '$categoryLower',
                    originalName: { $first: '$category' },
                    itemCount: { $sum: 1 }
                }
            },
            { $sort: { itemCount: -1 } },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    displayName: '$originalName',
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
 * Get Top Rated Canteens by Category (For Home Page Sections)
 * GET /api/canteens/top-rated?category=Snacks
 */
export const getTopRatedByCategory = async (req, res, next) => {
    try {
        const { category } = req.query;
        if (!category) return res.status(400).json({ success: false, error: 'Category required' });

        // Reuse getCanteensByCategory logic but filter for high ratings
        // We can just call the logic or re-implement strictly for "Top Rated" criteria
        // Criteria: Rating >= 4.2 && Ratings Count >= 8 (per prompt)

        // Let's implement efficiently using aggregation since we need strict criteria

        const normalizedCategory = category.trim().toLowerCase();

        const topRated = await MenuItem.aggregate([
            {
                $match: { inStock: true } // Must have items to be shown
            },
            {
                $addFields: {
                    categoryLower: { $toLower: { $trim: { input: '$category' } } }
                }
            },
            {
                $match: {
                    // Match category (contains)
                    categoryLower: { $regex: normalizedCategory, $options: 'i' }
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
                    'canteen.isApproved': true,
                    'canteen.rating': { $gte: 4.2 },
                    'canteen.totalRatings': { $gte: 8 }
                }
            },
            {
                $group: {
                    _id: '$canteen._id',
                    canteen: { $first: '$canteen' }
                }
            },
            {
                $replaceRoot: { newRoot: '$canteen' }
            },
            { $sort: { rating: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: topRated
        });
    } catch (error) {
        next(error);
    }
};

export const debugCategoryCheck = async (req, res, next) => {
    // ... kept as is or removed, sticking to kept for debugging
    res.json({ message: "Debug endpoint disabled for prod" });
};

export default {
    getAllCanteens,
    getCanteen,
    getCanteenMenu,
    getCanteensByCategory,
    getAllCategories,
    getTopRatedByCategory,
    debugCategoryCheck
};
