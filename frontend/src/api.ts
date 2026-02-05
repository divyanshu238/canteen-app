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

    updateProfile: (data: { name?: string }) =>
        api.put('/auth/profile', data),
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
    getAllCategories: () =>
        api.get('/canteens/categories/all'),
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

    setupAdmin: (data: { name: string; phoneNumber: string }) =>
        api.post('/admin/setup', data),
};

export default api;
