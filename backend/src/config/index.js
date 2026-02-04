/**
 * Production-ready configuration
 * 
 * EMAIL/PASSWORD AUTHENTICATION SYSTEM
 * 
 * NOTE: dotenv.config() is called in index.js BEFORE this module is imported.
 * Do NOT call dotenv.config() here - environment variables are already loaded.
 */

const requiredEnvVars = [];
const isProduction = process.env.NODE_ENV === 'production';

// In production, these are required
if (isProduction) {
    requiredEnvVars.push(
        'MONGO_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
        'FRONTEND_URL',
        // Firebase configuration (MANDATORY for email/password auth)
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY'
    );
}

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
}

// ============================================
// VALIDATE FIREBASE PRIVATE KEY FORMAT
// ============================================
if (isProduction && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('❌ FATAL: FIREBASE_PRIVATE_KEY does not contain a valid PEM-formatted private key');
        console.error('   Make sure to include the BEGIN/END markers and preserve newlines');
        process.exit(1);
    }
}

// ============================================
// REJECT DEPRECATED CONFIG (OTP NO LONGER USED)
// ============================================
const deprecatedVars = [
    'REQUIRE_EMAIL_VERIFICATION',
    'REQUIRE_PHONE_VERIFICATION',
    'RESEND_API_KEY',
    'EMAIL_USER',
    'EMAIL_PASS',
    'OTP_DELIVERY_CHANNEL'
];

deprecatedVars.forEach(varName => {
    if (process.env[varName]) {
        console.warn(`⚠️  DEPRECATED: ${varName} is no longer used. Using email/password authentication.`);
    }
});

export const config = {
    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,

    // Server
    port: parseInt(process.env.PORT) || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Database
    mongoUri: process.env.MONGO_URI || '',

    // JWT (for session tokens AFTER Firebase auth)
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Razorpay
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,

    // CORS
    corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:5174'],

    // Firebase Configuration
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY || ''
    }
};

// Log config (without secrets) in development
if (!isProduction) {
    console.log('📋 Configuration loaded:', {
        nodeEnv: config.nodeEnv,
        port: config.port,
        frontendUrl: config.frontendUrl,
        mongoUri: config.mongoUri ? config.mongoUri.replace(/\/\/.*@/, '//***@') : '(not set)',
        jwtExpiresIn: config.jwtExpiresIn,
        razorpayConfigured: !!config.razorpayKeyId,
        firebaseConfigured: !!(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey),
    });
}

export default config;
