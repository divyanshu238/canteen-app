/**
 * Email Service for OTP delivery
 * 
 * Uses Resend HTTP API (works on Render FREE tier)
 * 
 * IMPORTANT: Render blocks SMTP ports (465, 587). Resend uses HTTPS.
 * 
 * Configuration:
 * - RESEND_API_KEY: API key from resend.com
 * - EMAIL_FROM: Verified sender email (e.g., "onboarding@resend.dev" for testing)
 * 
 * STARTUP BEHAVIOR:
 * - Does NOT block server startup if email service is unreachable
 * - Email delivery errors fail individual REQUESTS, not BOOT
 */

import { Resend } from 'resend';
import config from '../config/index.js';

// Resend client instance (lazy initialized)
let resendClient = null;

/**
 * Get or create Resend client
 */
const getResendClient = () => {
    if (!resendClient && config.resendApiKey) {
        resendClient = new Resend(config.resendApiKey);
        console.log('📧 Resend client initialized');
    }
    return resendClient;
};

/**
 * Send OTP via Email using Resend HTTP API
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, errorCode?: string, errorDetails?: string}>}
 */
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('❌ EMAIL SEND FAILED: Invalid email address');
        return {
            success: false,
            error: 'Invalid email address',
            errorCode: 'INVALID_EMAIL'
        };
    }

    // Check configuration
    if (!config.resendApiKey) {
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

        console.error('❌ EMAIL SEND FAILED: RESEND_API_KEY not configured');
        return {
            success: false,
            error: 'Email service not configured',
            errorCode: 'EMAIL_NOT_CONFIGURED'
        };
    }

    try {
        const maskedEmail = maskEmailForLog(email);
        console.log(`📧 EMAIL SEND ATTEMPT:`);
        console.log(`   From: ${config.emailFrom}`);
        console.log(`   To: ${maskedEmail}`);
        console.log(`   Purpose: ${purpose}`);
        console.log(`   Time: ${new Date().toISOString()}`);

        const client = getResendClient();
        if (!client) {
            console.error('❌ EMAIL SEND FAILED: Could not initialize Resend client');
            return {
                success: false,
                error: 'Email client initialization failed',
                errorCode: 'CLIENT_INIT_FAILED'
            };
        }

        const startTime = Date.now();

        // Send email via Resend HTTP API
        const { data, error } = await client.emails.send({
            from: config.emailFrom,
            to: [email],
            subject: `Your Canteen Connect Verification Code: ${otp}`,
            text: getPlainTextEmail(otp, purpose),
            html: getHtmlEmail(otp, purpose)
        });

        const elapsed = Date.now() - startTime;

        // Handle Resend API error
        if (error) {
            console.error(`❌ EMAIL SEND FAILED (Resend API Error):`);
            console.error(`   Error: ${error.message || JSON.stringify(error)}`);
            console.error(`   Name: ${error.name || 'N/A'}`);
            console.error(`   StatusCode: ${error.statusCode || 'N/A'}`);

            return {
                success: false,
                error: `Failed to send email: ${error.message || 'Unknown error'}`,
                errorCode: 'EMAIL_DELIVERY_FAILED',
                errorDetails: JSON.stringify(error)
            };
        }

        // Verify we got a response with an ID
        if (!data || !data.id) {
            console.error('❌ EMAIL SEND FAILED: No message ID in response');
            console.error(`   Response: ${JSON.stringify(data)}`);
            return {
                success: false,
                error: 'Email send returned empty response',
                errorCode: 'EMPTY_RESPONSE'
            };
        }

        // Success!
        console.log(`✅ EMAIL SENT successfully to ${maskedEmail}`);
        console.log(`   MessageId: ${data.id}`);
        console.log(`   Provider: resend`);
        console.log(`   Elapsed: ${elapsed}ms`);

        return {
            success: true,
            messageId: data.id,
            provider: 'resend'
        };
    } catch (error) {
        // Catch any unexpected errors
        console.error(`❌ EMAIL SEND FAILED (Exception):`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);

        return {
            success: false,
            error: `Failed to send email: ${error.message}`,
            errorCode: 'EMAIL_DELIVERY_FAILED',
            errorDetails: error.message
        };
    }
};

/**
 * Mask email for logging
 */
const maskEmailForLog = (email) => {
    if (!email) return '(no email)';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    return localPart.slice(0, 2) + '***@' + domain;
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
    sendOTPEmail
};
