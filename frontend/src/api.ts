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
                    // Check if refresh was blocked due to OTP requirement
                    const isOtpRequired = refreshError.response?.status === 403 &&
                        (refreshError.response?.data?.code === 'OTP_REQUIRED' ||
                            refreshError.response?.data?.requiresOtp === true);

                    if (isOtpRequired) {
                        // Store verification context and redirect
                        const data = refreshError.response.data.data;
                        sessionStorage.setItem('pendingVerification', JSON.stringify({
                            phone: data?.phone,
                            phoneMasked: data?.phoneMasked,
                            email: data?.email,
                            userId: data?.userId,
                            source: 'session'
                        }));
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('user');
                        window.location.href = '/verify-phone';
                        return Promise.reject(refreshError);
                    }

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

// Auth API
export const authAPI = {
    register: (data: { name: string; email: string; password: string; role?: string; phone?: string }) =>
        api.post('/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),

    logout: (refreshToken?: string) =>
        api.post('/auth/logout', { refreshToken }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    getMe: () =>
        api.get('/auth/me'),

    updateProfile: (data: { name?: string; phone?: string }) =>
        api.put('/auth/profile', data),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        api.put('/auth/password', data),
};

// OTP API
export const otpAPI = {
    send: (data: { phone: string; purpose?: 'registration' | 'login' | 'password_reset' }) =>
        api.post('/otp/send', data),

    verify: (data: { phone: string; otp: string; purpose?: 'registration' | 'login' | 'password_reset' }) =>
        api.post('/otp/verify', data),

    resend: (data: { phone: string; purpose?: 'registration' | 'login' | 'password_reset' }) =>
        api.post('/otp/resend', data),

    getStatus: () =>
        api.get('/otp/status'),
};

// Canteen API
export const canteenAPI = {
    getAll: () =>
        api.get('/canteens'),

    getOne: (id: string) =>
        api.get(`/canteens/${id}`),

    getMenu: (id: string) =>
        api.get(`/canteens/${id}/menu`),
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

    setupAdmin: (data: { name: string; email: string; password: string }) =>
        api.post('/admin/setup', data),
};

export default api;
