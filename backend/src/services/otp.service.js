/**
 * OTP Delivery Service - EMAIL ONLY
 * 
 * This service ONLY delivers OTPs via email.
 * 
 * ZERO phone logic. ZERO SMS. ZERO fallbacks.
 * 
 * HARDENED FOR PRODUCTION:
 * - Full error propagation (no swallowed exceptions)
 * - Clear success/failure indicators
 * - Detailed logging for debugging
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
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, errorDetails?: string}>}
 */
export const deliverOTP = async ({ email, otp, purpose = 'verification' }) => {
    console.log('='.repeat(50));
    console.log('📤 OTP DELIVERY SERVICE INVOKED');
    console.log('='.repeat(50));

    // Validate email
    if (!email) {
        console.error('❌ OTP DELIVERY FAILED: Email is required');
        return {
            success: false,
            error: 'Email address is required for OTP delivery'
        };
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('❌ OTP DELIVERY FAILED: Invalid email format');
        return {
            success: false,
            error: 'Invalid email address format'
        };
    }

    // Validate OTP
    if (!otp) {
        console.error('❌ OTP DELIVERY FAILED: OTP is required');
        return {
            success: false,
            error: 'OTP is required'
        };
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        console.error('❌ OTP DELIVERY FAILED: Invalid OTP format (must be 6 digits)');
        return {
            success: false,
            error: 'Invalid OTP format'
        };
    }

    console.log(`📧 Delivering OTP via EMAIL`);
    console.log(`   To: ${maskEmail(email)}`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   OTP Length: ${otp.length} digits`);

    // Send via email - the ONLY delivery method
    const result = await sendOTPEmail(email, otp, purpose);

    console.log('='.repeat(50));
    if (result.success) {
        console.log(`✅ OTP DELIVERY SUCCESS`);
        console.log(`   Email: ${maskEmail(email)}`);
        console.log(`   MessageId: ${result.messageId || 'N/A'}`);
        console.log(`   Provider: ${result.provider || 'gmail'}`);
    } else {
        console.error(`❌ OTP DELIVERY FAILED`);
        console.error(`   Email: ${maskEmail(email)}`);
        console.error(`   Error: ${result.error}`);
        console.error(`   ErrorCode: ${result.errorCode || 'N/A'}`);
        console.error(`   ErrorDetails: ${result.errorDetails || 'N/A'}`);
    }
    console.log('='.repeat(50));

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
