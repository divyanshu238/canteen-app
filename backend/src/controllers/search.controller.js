import { Canteen, MenuItem } from '../models/index.js';

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param {string} str - Raw search string
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Search for canteens and dishes
 * GET /api/search?q=pizza
 * 
 * This endpoint performs a comprehensive search across:
 * 1. Menu item names (dishes)
 * 2. Canteen names
 * 
 * Returns canteens that either:
 * - Have a name matching the query
 * - Have menu items matching the query
 * 
 * For each canteen, only matching items are included.
 * 
 * CRITICAL: Uses MongoDB $regex operator for aggregation, NOT JavaScript RegExp objects
 */
export const search = async (req, res, next) => {
    try {
        const { q } = req.query;

        // Validate query parameter
        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query (q) is required'
            });
        }

        // Trim and validate query length
        const query = q.trim();
        if (query.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query cannot be empty'
            });
        }

        if (query.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }

        if (query.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Search query is too long'
            });
        }

        // Escape special regex characters for MongoDB $regex operator
        const escapedQuery = escapeRegex(query);

        // STRATEGY: 
        // 1. Find all menu items matching the query (from open, approved canteens)
        // 2. Find all canteens matching the query by name
        // 3. Combine and return grouped results

        // Step 1: Find matching menu items with their canteens
        // CRITICAL: Use MongoDB $regex operator, NOT JavaScript RegExp for aggregation
        const matchingItemsAggregation = await MenuItem.aggregate([
            // Match items by name (partial, case-insensitive)
            {
                $match: {
                    name: { $regex: escapedQuery, $options: 'i' },
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
            // Unwind canteen array
            {
                $unwind: '$canteen'
            },
            // Only include items from open, approved canteens
            {
                $match: {
                    'canteen.isOpen': true,
                    'canteen.isApproved': true
                }
            },
            // Group by canteen
            {
                $group: {
                    _id: '$canteen._id',
                    canteen: { $first: '$canteen' },
                    matchingItems: {
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
                    matchCount: { $sum: 1 }
                }
            },
            // Sort by match count (most matches first), then by rating
            {
                $sort: {
                    matchCount: -1,
                    'canteen.rating': -1
                }
            },
            // Project final shape
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
                    matchingItems: 1,
                    matchCount: 1,
                    matchType: { $literal: 'items' }
                }
            }
        ]);

        // Step 2: Find canteens matching by name (that weren't already found via items)
        // Using Mongoose .find() which correctly handles JavaScript RegExp
        const foundCanteenIds = matchingItemsAggregation.map(r => r.canteen._id.toString());
        const searchRegex = new RegExp(escapedQuery, 'i');

        const matchingCanteens = await Canteen.find({
            name: searchRegex,
            isOpen: true,
            isApproved: true,
            _id: { $nin: foundCanteenIds }  // Exclude canteens already found via items
        }).select('_id name description image rating tags isOpen preparationTime priceRange');

        // For canteens found by name, get their top items (limited to 3 for preview)
        const canteenNameMatches = await Promise.all(
            matchingCanteens.map(async (canteen) => {
                const topItems = await MenuItem.find({
                    canteenId: canteen._id,
                    inStock: true
                })
                    .sort({ name: 1 })
                    .limit(3)
                    .select('_id name description price image isVeg category canteenId');

                return {
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
                    matchingItems: topItems,
                    matchCount: topItems.length,
                    matchType: 'canteen_name'
                };
            })
        );

        // Step 3: Combine results (item matches first, then canteen name matches)
        const allResults = [...matchingItemsAggregation, ...canteenNameMatches];

        // Calculate totals
        const totalCanteens = allResults.length;
        const totalItems = allResults.reduce((sum, r) => sum + r.matchCount, 0);

        res.json({
            success: true,
            query: query,
            totalCanteens,
            totalItems,
            data: allResults
        });

    } catch (error) {
        console.error('[search] Error:', error);
        next(error);
    }
};

/**
 * Search suggestions (autocomplete)
 * GET /api/search/suggestions?q=piz
 * 
 * Returns quick suggestions for search autocomplete
 * 
 * Note: Uses Mongoose .find() which correctly handles JavaScript RegExp
 */
export const searchSuggestions = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        const query = q.trim();
        const escapedQuery = escapeRegex(query);
        // Mongoose .find() correctly converts JavaScript RegExp to MongoDB query
        const searchRegex = new RegExp(escapedQuery, 'i');

        // Get unique item names matching the query
        const items = await MenuItem.find({
            name: searchRegex,
            inStock: true
        })
            .select('name')
            .limit(5);

        // Get canteen names matching the query
        const canteens = await Canteen.find({
            name: searchRegex,
            isOpen: true,
            isApproved: true
        })
            .select('name')
            .limit(3);

        const suggestions = [
            ...items.map(i => ({ type: 'dish', name: i.name })),
            ...canteens.map(c => ({ type: 'canteen', name: c.name }))
        ];

        res.json({
            success: true,
            suggestions
        });

    } catch (error) {
        console.error('[searchSuggestions] Error:', error);
        next(error);
    }
};

export default {
    search,
    searchSuggestions
};
