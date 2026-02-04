/**
 * Frontend Configuration
 * Environment variables are prefixed with VITE_ to be exposed to the client
 */

export const config = {
    // Backend API URL
    // Backend API URL - Prioritize VITE_API_URL (Vercel) over VITE_BACKEND_URL (Local .env)
    apiUrl: (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, ''),

    // Razorpay
    razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',

    // App Info
    appName: 'Canteen Connect',
    appVersion: '1.0.0',

    // Feature Flags
    isDevMode: import.meta.env.DEV,
    enablePayments: !!import.meta.env.VITE_RAZORPAY_KEY_ID
};

export default config;
