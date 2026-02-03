import { Canteen, MenuItem } from '../models/index.js';

/**
 * Search for canteens and dishes
 * GET /api/search?q=pizza
 * 
 * Uses $toLower for robust case-insensitive matching in aggregation
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

        // Normalize query for case-insensitive matching
        const lowerQuery = query.toLowerCase();

        // Step 1: Find matching menu items with their canteens
        // Using $toLower and $indexOfCP for case-insensitive partial matching
        const matchingItemsAggregation = await MenuItem.aggregate([
            // Add lowercase name field
            {
                $addFields: {
                    nameLower: { $toLower: '$name' }
                }
            },
            // Match items where lowercase name contains the query AND is in stock
            {
                $match: {
                    $expr: {
                        $gte: [{ $indexOfCP: ['$nameLower', lowerQuery] }, 0]
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
            // Unwind canteen array
            {
                $unwind: {
                    path: '$canteen',
                    preserveNullAndEmptyArrays: false
                }
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
        const searchRegex = new RegExp(lowerQuery, 'i');

        const matchingCanteens = await Canteen.find({
            name: searchRegex,
            isOpen: true,
            isApproved: true,
            _id: { $nin: foundCanteenIds }
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
        // Mongoose .find() correctly handles JavaScript RegExp
        const searchRegex = new RegExp(query, 'i');

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
