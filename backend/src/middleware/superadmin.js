/**
 * Super Admin Middleware
 * 
 * Provides strict admin-only access control.
 * Admin actions OVERRIDE all business rules.
 */

/**
 * Super Admin Guard - Strict admin-only access
 * This middleware OVERRIDES all business rules
 */
export const requireSuperAdmin = async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
        // Log unauthorized access attempt
        console.warn(`[SECURITY] Unauthorized super-admin access attempt by user ${req.user._id} (${req.user.email})`);
        return res.status(403).json({
            success: false,
            error: 'Super Admin access required. This incident has been logged.',
            code: 'ADMIN_REQUIRED'
        });
    }

    // Check if admin account is active
    if (!req.user.isActive) {
        console.warn(`[SECURITY] Suspended admin attempted access: ${req.user._id} (${req.user.email})`);
        return res.status(403).json({
            success: false,
            error: 'Admin account is suspended',
            code: 'ADMIN_SUSPENDED'
        });
    }

    // Attach admin context for audit logging
    req.adminContext = {
        adminId: req.user._id,
        adminEmail: req.user.email,
        adminName: req.user.name
    };

    next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName} format`,
                code: 'INVALID_ID'
            });
        }
        next();
    };
};

/**
 * Rate limiting for super admin endpoints
 * More permissive than regular endpoints but still protected
 */
export const superAdminRateLimit = (req, res, next) => {
    // For now, pass through - can implement stricter limits later
    // Super admin should have elevated limits
    next();
};

/**
 * Request logging for super admin actions
 */
export const logAdminRequest = (req, res, next) => {
    const startTime = Date.now();

    // Log request start
    console.log(`[SUPERADMIN] ${req.method} ${req.originalUrl} - Started by ${req.user?.email}`);

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        console.log(`[SUPERADMIN] ${req.method} ${req.originalUrl} - ${status} (${duration}ms)`);
    });

    next();
};

export default {
    requireSuperAdmin,
    validateObjectId,
    superAdminRateLimit,
    logAdminRequest
};
