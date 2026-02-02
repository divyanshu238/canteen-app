/**
 * Email Service for OTP delivery
 * 
 * Uses Nodemailer with Gmail SMTP (FREE forever)
 * 
 * PRODUCTION-HARDENED VERSION:
 * - Explicit SMTP configuration (no silent failures)
 * - transporter.verify() on startup
 * - Full error propagation
 * - TLS configuration for cloud environments (Render, Railway, etc.)
 * 
 * Configuration:
 * - EMAIL_USER: Gmail address
 * - EMAIL_PASS: App Password (16-char, no spaces) - NOT regular password
 * - EMAIL_FROM: Display name for sender
 * 
 * How to get Gmail App Password:
 * 1. Enable 2FA on your Gmail account (REQUIRED)
 * 2. Go to Google Account > Security > 2-Step Verification > App Passwords
 * 3. Create a new app password for "Mail" on "Other (Custom name)"
 * 4. Copy the 16-character password (remove spaces if any)
 */

import nodemailer from 'nodemailer';
import config from '../config/index.js';

// Singleton transporter instance
let transporterInstance = null;
let transporterVerified = false;

/**
 * Create and verify email transporter
 * Uses explicit Gmail SMTP configuration for production reliability
 * 
 * RENDER COMPATIBILITY:
 * - Render free tier BLOCKS port 465 (SSL) → causes ETIMEDOUT
 * - Use port 587 (STARTTLS) instead → works on all cloud platforms
 */
const createTransporter = () => {
    // Gmail SMTP configuration - RENDER COMPATIBLE
    // Port 587 with STARTTLS works on Render, Railway, Heroku, etc.
    const transporterConfig = {
        host: 'smtp.gmail.com',
        port: 587,              // STARTTLS port (NOT 465 which is blocked on Render)
        secure: false,          // false for port 587 - upgrades to TLS via STARTTLS
        requireTLS: true,       // Require STARTTLS upgrade (security)
        auth: {
            user: config.emailUser,
            pass: config.emailPass
        },
        // TLS settings for cloud environments
        tls: {
            // Allow self-signed certs (some cloud providers need this)
            rejectUnauthorized: false,
            // Minimum TLS version for security
            minVersion: 'TLSv1.2'
        },
        // Increased timeouts for cloud environments
        connectionTimeout: 30000, // 30 seconds (Render can be slow)
        greetingTimeout: 30000,   // 30 seconds for SMTP greeting
        socketTimeout: 30000,     // 30 seconds for socket operations
        // Debug logging in development
        debug: !config.isProduction,
        logger: !config.isProduction
    };

    console.log('📧 Creating SMTP transporter with config:');
    console.log(`   Host: ${transporterConfig.host}`);
    console.log(`   Port: ${transporterConfig.port}`);
    console.log(`   Secure: ${transporterConfig.secure} (STARTTLS)`);
    console.log(`   RequireTLS: ${transporterConfig.requireTLS}`);
    console.log(`   User: ${config.emailUser ? config.emailUser.slice(0, 3) + '***' : '(not set)'}`);
    console.log(`   Pass: ${config.emailPass ? '[SET - ' + config.emailPass.length + ' chars]' : '(not set)'}`);

    return nodemailer.createTransport(transporterConfig);
};

/**
 * Get or create the transporter singleton
 * Verifies connection on first use
 */
const getTransporter = async () => {
    if (!transporterInstance) {
        transporterInstance = createTransporter();
    }

    // Verify transporter on first use
    if (!transporterVerified) {
        console.log('🔍 Verifying SMTP connection...');
        try {
            await transporterInstance.verify();
            transporterVerified = true;
            console.log('✅ SMTP connection verified successfully');
        } catch (error) {
            console.error('❌ SMTP VERIFICATION FAILED:');
            console.error(`   Error: ${error.message}`);
            console.error(`   Code: ${error.code || 'N/A'}`);
            console.error(`   Response: ${error.response || 'N/A'}`);
            console.error(`   ResponseCode: ${error.responseCode || 'N/A'}`);

            // Reset transporter for retry
            transporterInstance = null;
            transporterVerified = false;

            // Re-throw with clear message
            throw new Error(`SMTP verification failed: ${error.message}`);
        }
    }

    return transporterInstance;
};

/**
 * Verify SMTP connection on startup (call from index.js)
 * This should be called during app initialization to fail fast
 */
export const verifyEmailTransporter = async () => {
    if (!config.emailUser || !config.emailPass) {
        if (config.isProduction) {
            throw new Error('EMAIL_USER and EMAIL_PASS are required in production');
        }
        console.warn('⚠️ Email credentials not configured - emails will be logged to console in development');
        return false;
    }

    try {
        await getTransporter();
        console.log('✅ Email service ready');
        return true;
    } catch (error) {
        console.error('❌ Email service initialization failed:', error.message);
        if (config.isProduction) {
            throw error; // Fail fast in production
        }
        return false;
    }
};

/**
 * Send OTP via Email
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('❌ EMAIL SEND FAILED: Invalid email address');
        return {
            success: false,
            error: 'Invalid email address'
        };
    }

    // Check configuration
    if (!config.emailUser || !config.emailPass) {
        // Fallback to console logging in development
        if (!config.isProduction) {
            console.log('\n' + '='.repeat(50));
            console.log('📧 OTP EMAIL (Development Mode - Console Only)');
            console.log('='.repeat(50));
            console.log(`To: ${email}`);
            console.log(`OTP: ${otp}`);
            console.log(`Purpose: ${purpose}`);
            console.log(`Valid for: 5 minutes`);
            console.log('='.repeat(50) + '\n');

            return {
                success: true,
                messageId: `dev_console_${Date.now()}`,
                provider: 'console'
            };
        }

        console.error('❌ EMAIL SEND FAILED: Email credentials not configured in production');
        return {
            success: false,
            error: 'Email service not configured'
        };
    }

    try {
        console.log(`📧 EMAIL SEND ATTEMPT:`);
        console.log(`   From: ${config.emailFrom || config.emailUser}`);
        console.log(`   To: ${email.slice(0, 3)}***${email.slice(email.indexOf('@'))}`);
        console.log(`   Purpose: ${purpose}`);
        console.log(`   Time: ${new Date().toISOString()}`);

        // Get verified transporter
        const transporter = await getTransporter();

        const mailOptions = {
            from: config.emailFrom || `Canteen Connect <${config.emailUser}>`,
            to: email,
            subject: `Your Canteen Connect Verification Code: ${otp}`,
            text: getPlainTextEmail(otp, purpose),
            html: getHtmlEmail(otp, purpose),
            // Add envelope for explicit sender
            envelope: {
                from: config.emailUser,
                to: email
            }
        };

        console.log(`📤 Sending email via SMTP...`);
        const startTime = Date.now();

        const result = await transporter.sendMail(mailOptions);

        const elapsed = Date.now() - startTime;

        // Verify result has required fields
        if (!result || !result.messageId) {
            console.error('❌ EMAIL SEND FAILED: No messageId in response');
            console.error(`   Response: ${JSON.stringify(result)}`);
            return {
                success: false,
                error: 'Email send returned empty response'
            };
        }

        // Check for rejected recipients
        if (result.rejected && result.rejected.length > 0) {
            console.error('❌ EMAIL REJECTED by server:');
            console.error(`   Rejected: ${result.rejected.join(', ')}`);
            return {
                success: false,
                error: `Email rejected: ${result.rejected.join(', ')}`
            };
        }

        // Check accepted recipients
        if (!result.accepted || result.accepted.length === 0) {
            console.error('❌ EMAIL NOT ACCEPTED: No recipients accepted');
            console.error(`   Response: ${JSON.stringify(result)}`);
            return {
                success: false,
                error: 'Email was not accepted by the server'
            };
        }

        // Log success with full details
        const [localPart, domain] = email.split('@');
        const masked = localPart.slice(0, 2) + '***@' + domain;
        console.log(`✅ EMAIL SENT successfully to ${masked}`);
        console.log(`   MessageId: ${result.messageId}`);
        console.log(`   Accepted: ${result.accepted.join(', ')}`);
        console.log(`   Response: ${result.response}`);
        console.log(`   Elapsed: ${elapsed}ms`);

        return {
            success: true,
            messageId: result.messageId,
            accepted: result.accepted,
            response: result.response,
            provider: 'gmail'
        };
    } catch (error) {
        // Full error logging - NEVER swallow errors
        console.error(`❌ EMAIL SEND FAILED:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        console.error(`   Command: ${error.command || 'N/A'}`);
        console.error(`   Response: ${error.response || 'N/A'}`);
        console.error(`   ResponseCode: ${error.responseCode || 'N/A'}`);
        console.error(`   Stack: ${error.stack}`);

        // Reset transporter on auth errors to force re-verification
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('🔄 Resetting transporter due to auth error...');
            transporterInstance = null;
            transporterVerified = false;
        }

        return {
            success: false,
            error: `Failed to send email: ${error.message}`,
            errorCode: error.code,
            errorDetails: error.response
        };
    }
};

/**
 * Plain text email template
 */
const getPlainTextEmail = (otp, purpose) => {
    return `
Your Canteen Connect Verification Code

Your OTP is: ${otp}

This code will expire in 5 minutes.
Do not share this code with anyone.

If you didn't request this code, please ignore this email.

- Canteen Connect Team
    `.trim();
};

/**
 * HTML email template (simple, mobile-friendly)
 */
const getHtmlEmail = (otp, purpose) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 400px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">Canteen Connect</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <p style="color: #666; margin: 0 0 20px; font-size: 16px;">Your verification code is:</p>
                            <div style="background: #fff7ed; border: 2px solid #f97316; border-radius: 12px; padding: 20px; margin: 20px 0;">
                                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ea580c;">${otp}</span>
                            </div>
                            <p style="color: #999; margin: 20px 0 0; font-size: 14px;">This code expires in <strong>5 minutes</strong></p>
                            <p style="color: #999; margin: 10px 0 0; font-size: 13px;">Do not share this code with anyone.</p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background: #fafafa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; margin: 0; font-size: 12px;">
                                If you didn't request this code, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

export default {
    sendOTPEmail,
    verifyEmailTransporter
};
