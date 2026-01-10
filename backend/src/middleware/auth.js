import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/index.js';

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Get user from database
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found.'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated.'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication - attaches user if token present, but doesn't fail if not
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        }
        next();
    } catch (error) {
        // Continue without user if token is invalid
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Check if user is approved (for partners)
 */
export const requireApproval = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (req.user.role === 'partner' && !req.user.isApproved) {
        return res.status(403).json({
            success: false,
            error: 'Your account is pending approval by admin'
        });
    }

    next();
};

/**
 * Check if user owns the canteen
 */
export const requireCanteenOwnership = async (req, res, next) => {
    const canteenId = req.params.canteenId || req.body.canteenId;

    if (!canteenId) {
        return res.status(400).json({
            success: false,
            error: 'Canteen ID is required'
        });
    }

    if (req.user.role === 'admin') {
        return next(); // Admin can access any canteen
    }

    if (req.user.role !== 'partner') {
        return res.status(403).json({
            success: false,
            error: 'Only partners can access this resource'
        });
    }

    if (req.user.canteenId?.toString() !== canteenId) {
        return res.status(403).json({
            success: false,
            error: 'You can only manage your own canteen'
        });
    }

    next();
};

export default {
    authenticate,
    optionalAuth,
    authorize,
    requireApproval,
    requireCanteenOwnership
};
