import { Canteen, MenuItem } from '../models/index.js';

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

export default {
    getAllCanteens,
    getCanteen,
    getCanteenMenu
};
