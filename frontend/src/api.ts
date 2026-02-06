import axios from 'axios';
import config from './config';

// Create axios instance with base config
const api = axios.create({
    baseURL: `${config.apiUrl}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - Add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh and errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            const errorCode = error.response?.data?.code;

            if (errorCode === 'TOKEN_EXPIRED') {
                originalRequest._retry = true;

                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        const response = await axios.post(`${config.apiUrl}/api/auth/refresh`, {
                            refreshToken
                        });

                        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                        localStorage.setItem('token', accessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);

                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return api(originalRequest);
                    }
                } catch (refreshError: any) {
                    // Refresh failed, logout user
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            // Other 401 errors (invalid token, etc.)
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }

        return Promise.reject(error);
    }
);

// Auth API - Classic Email/Password Auth
export const authAPI = {
    // Login and signup are handled by auth.service.ts
    // These are kept for token refresh and session management

    logout: (refreshToken?: string) =>
        api.post('/auth/logout', { refreshToken }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    getMe: () =>
        api.get('/auth/me'),

    updateProfile: (data: { name?: string; email?: string; phoneNumber?: string }) =>
        api.put('/auth/profile', data),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        api.put('/auth/change-password', data),
};

// Canteen API
export const canteenAPI = {
    getAll: () =>
        api.get('/canteens'),

    getOne: (id: string) =>
        api.get(`/canteens/${id}`),

    getMenu: (id: string) =>
        api.get(`/canteens/${id}/menu`),

    /**
     * Get canteens filtered by category with ONLY items in that category
     * This is the key API for category filtering
     */
    getByCategory: (category: string) =>
        api.get(`/canteens/by-category/${encodeURIComponent(category)}`),

    /**
     * Get all available categories from the database
     */
    /**
     * Get all available categories from the database
     */
    getAllCategories: () =>
        api.get('/canteens/categories/all'),

    /**
     * Get top rated canteens by category
     */
    getTopRatedByCategory: (category: string) =>
        api.get('/canteens/top-rated', { params: { category } }),
};

// Search API
export const searchAPI = {
    /**
     * Search for canteens and dishes
     * @param query - Search query string (min 2 chars)
     */
    search: (query: string) =>
        api.get('/search', { params: { q: query } }),

    /**
     * Get search suggestions for autocomplete
     * @param query - Partial search query
     */
    suggestions: (query: string) =>
        api.get('/search/suggestions', { params: { q: query } }),
};

// Order API
export const orderAPI = {
    create: (data: { canteenId: string; items: Array<{ itemId: string; qty: number }>; specialInstructions?: string }) =>
        api.post('/orders', data),

    verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; orderId: string }) =>
        api.post('/orders/verify-payment', data),

    devConfirm: (orderId: string) =>
        api.post('/orders/dev-confirm', { orderId }),

    getAll: (params?: { status?: string; limit?: number; page?: number }) =>
        api.get('/orders', { params }),

    getStatus: (id: string) =>
        api.get(`/orders/${id}/status`),

    getOne: (id: string) =>
        api.get(`/orders/${id}`),

    cancel: (id: string, reason?: string) =>
        api.post(`/orders/${id}/cancel`, { reason }),

    /**
     * Get lightweight order history summary for "Previously ordered" badges
     * Returns: { orderedItems: {[itemId]: {orderCount, lastOrderedAt}}, favoriteItems: [...] }
     */
    getHistorySummary: () =>
        api.get('/orders/history-summary'),
};

// Partner API
export const partnerAPI = {
    getCanteen: () =>
        api.get('/partner/canteen'),

    updateCanteen: (data: any) =>
        api.put('/partner/canteen', data),

    toggleCanteenStatus: () =>
        api.put('/partner/canteen/toggle'),

    getMenu: () =>
        api.get('/partner/menu'),

    addMenuItem: (data: any) =>
        api.post('/partner/menu', data),

    updateMenuItem: (itemId: string, data: any) =>
        api.put(`/partner/menu/${itemId}`, data),

    deleteMenuItem: (itemId: string) =>
        api.delete(`/partner/menu/${itemId}`),

    toggleItemStock: (itemId: string) =>
        api.put(`/partner/menu/${itemId}/toggle`),

    getOrders: (params?: { status?: string; date?: string }) =>
        api.get('/partner/orders', { params }),

    getLiveOrders: () =>
        api.get('/partner/orders/live'),

    updateOrderStatus: (orderId: string, status: string, reason?: string) =>
        api.put(`/partner/orders/${orderId}/status`, { status, reason }),

    getStats: () =>
        api.get('/partner/stats'),
};

// Admin API
export const adminAPI = {
    getUsers: (params?: { role?: string; status?: string; search?: string }) =>
        api.get('/admin/users', { params }),

    getUser: (id: string) =>
        api.get(`/admin/users/${id}`),

    updateUser: (id: string, data: { isActive?: boolean; isApproved?: boolean }) =>
        api.put(`/admin/users/${id}`, data),

    getCanteens: (params?: { status?: string; search?: string }) =>
        api.get('/admin/canteens', { params }),

    updateCanteen: (id: string, data: { isApproved?: boolean; isOpen?: boolean }) =>
        api.put(`/admin/canteens/${id}`, data),

    getOrders: (params?: { status?: string; paymentStatus?: string; date?: string; canteenId?: string }) =>
        api.get('/admin/orders', { params }),

    updateOrder: (id: string, data: { status?: string; paymentStatus?: string }) =>
        api.put(`/admin/orders/${id}`, data),

    getAnalytics: () =>
        api.get('/admin/analytics'),

    getRatingAnalytics: () =>
        api.get('/admin/analytics/ratings'),

    setupAdmin: (data: { name: string; phoneNumber: string }) =>
        api.post('/admin/setup', data),
};

// Review API
export const reviewAPI = {
    create: (data: { orderId: string; rating: number; comment?: string }) =>
        api.post('/reviews', data),

    getByOrder: (orderId: string) =>
        api.get(`/reviews/order/${orderId}`),

    update: (reviewId: string, data: { rating: number; comment?: string }) =>
        api.put(`/reviews/${reviewId}`, data),
};

// ========================
// SUPER ADMIN API (God Mode)
// ========================
export const superadminAPI = {
    // Users
    listUsers: (params?: { role?: string; status?: string; search?: string; limit?: number; page?: number }) =>
        api.get('/superadmin/users', { params }),
    getUser: (id: string) =>
        api.get(`/superadmin/users/${id}`),
    createUser: (data: { name: string; email: string; password: string; phoneNumber?: string; role?: string }) =>
        api.post('/superadmin/users', data),
    updateUser: (id: string, data: any) =>
        api.put(`/superadmin/users/${id}`, data),
    deleteUser: (id: string, reason?: string) =>
        api.delete(`/superadmin/users/${id}`, { data: { reason } }),
    suspendUser: (id: string, reason?: string) =>
        api.post(`/superadmin/users/${id}/suspend`, { reason }),
    reactivateUser: (id: string) =>
        api.post(`/superadmin/users/${id}/reactivate`),
    forceLogout: (id: string, reason?: string) =>
        api.post(`/superadmin/users/${id}/force-logout`, { reason }),
    resetPassword: (id: string, newPassword: string) =>
        api.post(`/superadmin/users/${id}/reset-password`, { newPassword }),
    getUserActivity: (id: string, params?: { limit?: number; page?: number }) =>
        api.get(`/superadmin/users/${id}/activity`, { params }),

    // Canteens
    listCanteens: (params?: { status?: string; search?: string; limit?: number; page?: number }) =>
        api.get('/superadmin/canteens', { params }),
    getCanteen: (id: string) =>
        api.get(`/superadmin/canteens/${id}`),
    createCanteen: (data: { name: string; description?: string; image?: string; ownerId: string; tags?: string[] }) =>
        api.post('/superadmin/canteens', data),
    updateCanteen: (id: string, data: any) =>
        api.put(`/superadmin/canteens/${id}`, data),
    deleteCanteen: (id: string, reason?: string) =>
        api.delete(`/superadmin/canteens/${id}`, { data: { reason } }),
    approveCanteen: (id: string) =>
        api.post(`/superadmin/canteens/${id}/approve`),
    rejectCanteen: (id: string, reason?: string) =>
        api.post(`/superadmin/canteens/${id}/reject`, { reason }),
    suspendCanteen: (id: string, reason?: string) =>
        api.post(`/superadmin/canteens/${id}/suspend`, { reason }),
    toggleCanteenOrdering: (id: string) =>
        api.post(`/superadmin/canteens/${id}/toggle-ordering`),
    getCanteenRevenue: (id: string) =>
        api.get(`/superadmin/canteens/${id}/revenue`),

    // Menu
    listMenuItems: (params?: { canteenId?: string; category?: string; inStock?: string; search?: string }) =>
        api.get('/superadmin/menu', { params }),
    getMenuItem: (id: string) =>
        api.get(`/superadmin/menu/${id}`),
    createMenuItem: (data: { canteenId: string; name: string; price: number; description?: string; image?: string; category?: string; isVeg?: boolean }) =>
        api.post('/superadmin/menu', data),
    updateMenuItem: (id: string, data: any) =>
        api.put(`/superadmin/menu/${id}`, data),
    deleteMenuItem: (id: string, reason?: string) =>
        api.delete(`/superadmin/menu/${id}`, { data: { reason } }),
    toggleMenuItemStock: (id: string) =>
        api.post(`/superadmin/menu/${id}/toggle-stock`),
    bulkUpdateMenuItems: (items: Array<{ id: string; price?: number; inStock?: boolean }>) =>
        api.post('/superadmin/menu/bulk-update', { items }),

    // Orders
    listOrders: (params?: { status?: string; paymentStatus?: string; canteenId?: string; userId?: string; date?: string; limit?: number; page?: number }) =>
        api.get('/superadmin/orders', { params }),
    getLiveOrders: () =>
        api.get('/superadmin/orders/live'),
    getOrder: (id: string) =>
        api.get(`/superadmin/orders/${id}`),
    overrideOrderStatus: (id: string, status: string, reason?: string) =>
        api.put(`/superadmin/orders/${id}/status`, { status, reason }),
    cancelOrder: (id: string, reason?: string) =>
        api.post(`/superadmin/orders/${id}/cancel`, { reason }),
    refundOrder: (id: string, amount?: number, reason?: string) =>
        api.post(`/superadmin/orders/${id}/refund`, { amount, reason }),
    overridePaymentStatus: (id: string, paymentStatus: string, reason?: string) =>
        api.put(`/superadmin/orders/${id}/payment-status`, { paymentStatus, reason }),
    reassignOrder: (id: string, newCanteenId: string, reason?: string) =>
        api.post(`/superadmin/orders/${id}/reassign`, { newCanteenId, reason }),

    // Reviews
    listReviews: (params?: { canteenId?: string; userId?: string; isFlagged?: string; isLocked?: string; rating?: number; limit?: number; page?: number }) =>
        api.get('/superadmin/reviews', { params }),
    getReview: (id: string) =>
        api.get(`/superadmin/reviews/${id}`),
    editReview: (id: string, data: { rating?: number; comment?: string; reason?: string }) =>
        api.put(`/superadmin/reviews/${id}`, data),
    deleteReview: (id: string, reason?: string) =>
        api.delete(`/superadmin/reviews/${id}`, { data: { reason } }),
    toggleReviewFlag: (id: string, reason?: string) =>
        api.post(`/superadmin/reviews/${id}/flag`, { reason }),
    lockReview: (id: string) =>
        api.post(`/superadmin/reviews/${id}/lock`),
    overrideRating: (id: string, rating: number, reason?: string) =>
        api.put(`/superadmin/reviews/${id}/rating-override`, { rating, reason }),

    // Analytics
    getOverviewAnalytics: () =>
        api.get('/superadmin/analytics/overview'),

    // Audit Logs
    listAuditLogs: (params?: { adminId?: string; entityType?: string; action?: string; startDate?: string; endDate?: string; limit?: number; page?: number }) =>
        api.get('/superadmin/audit-logs', { params }),
    getAuditLog: (id: string) =>
        api.get(`/superadmin/audit-logs/${id}`),

    // System Settings
    getSystemSettings: () =>
        api.get('/superadmin/settings'),
    updateSystemSetting: (key: string, value: any, reason?: string) =>
        api.put(`/superadmin/settings/${key}`, { value, reason }),
    toggleMaintenanceMode: (enabled: boolean, message?: string) =>
        api.post('/superadmin/maintenance-mode', { enabled, message }),
};

export default api;

