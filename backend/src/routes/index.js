import authRoutes from './auth.routes.js';
import canteenRoutes from './canteen.routes.js';
import orderRoutes from './order.routes.js';
import partnerRoutes from './partner.routes.js';
import adminRoutes from './admin.routes.js';

export const setupRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/canteens', canteenRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/partner', partnerRoutes);
    app.use('/api/admin', adminRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: 'API is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    });
};

export default {
    authRoutes,
    canteenRoutes,
    orderRoutes,
    partnerRoutes,
    adminRoutes,
    setupRoutes
};
