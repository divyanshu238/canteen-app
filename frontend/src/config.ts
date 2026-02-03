/**
 * Frontend Configuration
 * Environment variables are prefixed with VITE_ to be exposed to the client
 */

export const config = {
    // Backend API URL
    apiUrl: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000',

    // Firebase Configuration
    firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    },

    // Razorpay
    razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',

    // App Info
    appName: 'Canteen Connect',
    appVersion: '1.0.0',

    // Feature Flags
    isDevMode: import.meta.env.DEV,
    enablePayments: !!import.meta.env.VITE_RAZORPAY_KEY_ID,

    // Check if Firebase is configured
    isFirebaseConfigured: (): boolean => {
        return !!(
            import.meta.env.VITE_FIREBASE_API_KEY &&
            import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
            import.meta.env.VITE_FIREBASE_PROJECT_ID &&
            import.meta.env.VITE_FIREBASE_APP_ID
        );
    }
};

export default config;
