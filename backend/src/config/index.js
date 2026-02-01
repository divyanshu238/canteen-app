/**
 * Production-ready configuration
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
        'FRONTEND_URL'
    );
}

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
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

    // SMS Provider Configuration
    // Options: 'fast2sms', 'twilio', 'console' (for dev)
    smsProvider: process.env.SMS_PROVIDER || 'console',

    // Fast2SMS (India-focused provider)
    fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',

    // Twilio (Global provider)
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',

    // OTP Configuration
    otpLength: parseInt(process.env.OTP_LENGTH) || 6,
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
    otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,

    // Feature Flags (backward compatible - defaults to false)
    // When false, existing users can login without phone verification
    // When true, new registrations require phone verification
    requirePhoneVerification: process.env.REQUIRE_PHONE_VERIFICATION === 'true',

    // Grandfather date - users created before this date are exempt from phone verification
    // Format: ISO date string (e.g., '2026-02-01T00:00:00Z')
    // If not set, all existing users at time of deployment are grandfathered
    phoneVerificationGrandfatherDate: process.env.PHONE_VERIFICATION_GRANDFATHER_DATE || null,
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
    });
}

export default config;
