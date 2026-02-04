/**
 * Routes Index - EMAIL/PASSWORD AUTHENTICATION
 * 
 * All authentication is handled via Firebase Email/Password.
 * NO OTP routes. NO phone verification routes.
 */

import authRoutes from './auth.routes.js';
import canteenRoutes from './canteen.routes.js';
import orderRoutes from './order.routes.js';
import partnerRoutes from './partner.routes.js';
import adminRoutes from './admin.routes.js';
import searchRoutes from './search.routes.js';

export const setupRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/canteens', canteenRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/partner', partnerRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/search', searchRoutes);

    // Note: /api/health is defined in index.js BEFORE rate limiting middleware
    // to ensure it always responds with 200 for Render health checks
};

export default {
    authRoutes,
    canteenRoutes,
    orderRoutes,
    partnerRoutes,
    adminRoutes,
    searchRoutes,
    setupRoutes
};
