/**
 * Email Service for OTP delivery
 * 
 * Uses Nodemailer with Gmail SMTP (FREE forever)
 * 
 * Configuration:
 * - EMAIL_USER: Gmail address
 * - EMAIL_PASS: App Password (not regular password)
 * - EMAIL_FROM: Display name for sender
 * 
 * How to get Gmail App Password:
 * 1. Enable 2FA on your Gmail account
 * 2. Go to Google Account > Security > App Passwords
 * 3. Create a new app password for "Mail"
 */

import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Create email transporter
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.emailUser,
            pass: config.emailPass
        }
    });
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
            console.log('📧 OTP EMAIL (Development Mode)');
            console.log('='.repeat(50));
            console.log(`To: ${email}`);
            console.log(`OTP: ${otp}`);
            console.log(`Purpose: ${purpose}`);
            console.log(`Valid for: 5 minutes`);
            console.log('='.repeat(50) + '\n');

            return {
                success: true,
                messageId: `dev_email_${Date.now()}`,
                provider: 'console'
            };
        }

        console.error('Email credentials not configured');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: config.emailFrom || `Canteen Connect <${config.emailUser}>`,
            to: email,
            subject: `Your Canteen Connect Verification Code: ${otp}`,
            text: getPlainTextEmail(otp, purpose),
            html: getHtmlEmail(otp, purpose)
        };

        const result = await transporter.sendMail(mailOptions);

        // Log masked email for debugging
        const [localPart, domain] = email.split('@');
        const masked = localPart.slice(0, 2) + '***@' + domain;
        console.log(`📧 OTP email sent to ${masked}`);

        return {
            success: true,
            messageId: result.messageId,
            provider: 'gmail'
        };
    } catch (error) {
        console.error('Email send failed:', error.message);
        return {
            success: false,
            error: 'Failed to send email'
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
    sendOTPEmail
};
