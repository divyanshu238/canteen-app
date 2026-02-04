/**
 * Frontend Configuration
 * Environment variables are prefixed with VITE_ to be exposed to the client
 */

export const config = {
    // Backend API URL
    apiUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000',

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
