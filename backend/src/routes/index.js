/**
 * Routes Index - Classic Email/Password Authentication
 * 
 * NO Firebase. NO OTP. NO third-party auth.
 */

import authRoutes from './auth.routes.js';
import canteenRoutes from './canteen.routes.js';
import orderRoutes from './order.routes.js';
import partnerRoutes from './partner.routes.js';
import adminRoutes from './admin.routes.js';
import searchRoutes from './search.routes.js';
import reviewRoutes from './review.routes.js';
import superadminRoutes from './superadmin.routes.js';

export const setupRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/canteens', canteenRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/partner', partnerRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/reviews', reviewRoutes);

    // Super Admin Control Plane - God Mode
    app.use('/api/superadmin', superadminRoutes);

    console.log('✅ Routes registered (including /api/superadmin - God Mode)');
};

export default {
    authRoutes,
    canteenRoutes,
    orderRoutes,
    partnerRoutes,
    adminRoutes,
    searchRoutes,
    reviewRoutes,
    superadminRoutes,
    setupRoutes
};
