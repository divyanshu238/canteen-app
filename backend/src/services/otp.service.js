/**
 * OTP Delivery Service - EMAIL ONLY
 * 
 * This service ONLY delivers OTPs via email.
 * 
 * ZERO phone logic. ZERO SMS. ZERO fallbacks.
 * 
 * Email is delivered via:
 * - Nodemailer + Gmail SMTP (FREE forever)
 */

import { sendOTPEmail } from './email.service.js';
import { maskEmail } from '../utils/auth.utils.js';

/**
 * Send OTP via Email
 * 
 * This is the ONLY OTP delivery method.
 * 
 * @param {Object} params - OTP parameters
 * @param {string} params.email - User's email address (REQUIRED)
 * @param {string} params.otp - OTP code to send
 * @param {string} params.purpose - Purpose of OTP
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const deliverOTP = async ({ email, otp, purpose = 'verification' }) => {
    // Validate email
    if (!email) {
        console.error('❌ OTP DELIVERY FAILED: Email is required');
        return {
            success: false,
            error: 'Email address is required for OTP delivery'
        };
    }

    // Validate OTP
    if (!otp || otp.length !== 6) {
        console.error('❌ OTP DELIVERY FAILED: Invalid OTP format');
        return {
            success: false,
            error: 'Invalid OTP format'
        };
    }

    console.log(`📤 DELIVERING OTP via EMAIL to ${maskEmail(email)} (purpose: ${purpose})`);

    // Send via email - the ONLY delivery method
    const result = await sendOTPEmail(email, otp, purpose);

    if (result.success) {
        console.log(`✅ OTP DELIVERED to ${maskEmail(email)}`);
        console.log(`   MessageId: ${result.messageId || 'N/A'}`);
    } else {
        console.error(`❌ OTP DELIVERY FAILED: ${result.error}`);
    }

    return {
        ...result,
        email: email,
        emailMasked: maskEmail(email)
    };
};

/**
 * Get user-friendly message for OTP delivery
 * @param {string} email - Email address
 * @returns {string} User-friendly message
 */
export const getDeliveryMessage = (email) => {
    if (!email) {
        return 'Verification code sent';
    }
    return `Verification code sent to ${maskEmail(email)}`;
};

export default {
    deliverOTP,
    getDeliveryMessage
};
