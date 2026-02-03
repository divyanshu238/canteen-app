/**
 * Production-ready configuration
 * 
 * EMAIL-ONLY OTP VERIFICATION SYSTEM
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
        'REQUIRE_EMAIL_VERIFICATION',  // MANDATORY in production - EMAIL ONLY
        'RESEND_API_KEY',                // Required for OTP delivery (HTTP API)
        'EMAIL_FROM'                     // Verified sender email
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
// SECURITY: Strict validation of EMAIL OTP config
// ============================================
const emailOtpEnvValue = process.env.REQUIRE_EMAIL_VERIFICATION;
if (isProduction && emailOtpEnvValue !== 'true' && emailOtpEnvValue !== 'false') {
    console.error('❌ FATAL: REQUIRE_EMAIL_VERIFICATION must be exactly "true" or "false"');
    console.error(`   Current value: "${emailOtpEnvValue}" (type: ${typeof emailOtpEnvValue})`);
    process.exit(1);
}

// HARD FAIL: Reject any phone-based config in production
if (isProduction && process.env.REQUIRE_PHONE_VERIFICATION) {
    console.error('❌ FATAL: REQUIRE_PHONE_VERIFICATION is deprecated. Use REQUIRE_EMAIL_VERIFICATION instead.');
    console.error('   Phone-based verification has been removed. Email is the ONLY verification method.');
    process.exit(1);
}

// HARD FAIL: OTP delivery channel MUST be 'email' in production
if (isProduction && process.env.OTP_DELIVERY_CHANNEL && process.env.OTP_DELIVERY_CHANNEL !== 'email') {
    console.error('❌ FATAL: OTP_DELIVERY_CHANNEL must be "email" (or unset). SMS is not supported.');
    console.error(`   Current value: "${process.env.OTP_DELIVERY_CHANNEL}"`);
    process.exit(1);
}

// ============================================
// VALIDATE RESEND API KEY
// ============================================
if (isProduction && process.env.RESEND_API_KEY) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey.startsWith('re_')) {
        console.warn('⚠️ RESEND_API_KEY does not start with "re_" - verify it is correct');
    }
}

export const config = {
    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,

    // Server
    port: parseInt(process.env.PORT) || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Database
    mongoUri: process.env.MONGO_URI || '',

    // JWT
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

    // Email Configuration (for OTP delivery via Resend HTTP API)
    // Sign up at https://resend.com for a free API key
    // For testing, use: onboarding@resend.dev as EMAIL_FROM
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'Canteen Connect <onboarding@resend.dev>',

    // OTP Configuration - EMAIL ONLY
    otpLength: parseInt(process.env.OTP_LENGTH) || 6,
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
    otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,

    // ============================================
    // EMAIL VERIFICATION - SINGLE SOURCE OF TRUTH
    // ============================================
    // When true: ALL users MUST verify email via OTP before getting tokens
    // When false: Email verification is NOT required (development mode)
    // There is NO phone verification. NO SMS. NO fallbacks.
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
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
        requireEmailVerification: config.requireEmailVerification,
        emailConfigured: !!config.resendApiKey,
    });
}

export default config;
