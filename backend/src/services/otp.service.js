/**
 * OTP Delivery Service
 * 
 * Unified abstraction for OTP delivery across channels:
 * - email (DEFAULT - FREE via Gmail SMTP)
 * - sms (optional - paid via Fast2SMS/Twilio)
 * 
 * The channel is determined by:
 * 1. OTP_DELIVERY_CHANNEL env var (default: 'email')
 * 2. Explicit channel parameter
 * 3. Fallback logic based on user data availability
 */

import config from '../config/index.js';
import { sendOTPEmail } from './email.service.js';
import { sendOTP as sendOTPSMS } from './sms.service.js';

export const OTP_CHANNELS = {
    EMAIL: 'email',
    SMS: 'sms'
};

/**
 * Send OTP via configured channel
 * 
 * @param {Object} params - OTP parameters
 * @param {string} params.email - User's email address
 * @param {string} params.phone - User's phone number (optional for SMS fallback)
 * @param {string} params.otp - OTP code to send
 * @param {string} params.purpose - Purpose of OTP
 * @param {string} params.channel - Override channel ('email' | 'sms')
 * @returns {Promise<{success: boolean, channel: string, messageId?: string, error?: string}>}
 */
export const deliverOTP = async ({ email, phone, otp, purpose = 'verification', channel = null }) => {
    // Determine channel: explicit > config > default (email)
    const selectedChannel = channel || config.otpDeliveryChannel || OTP_CHANNELS.EMAIL;

    console.log(`📤 Delivering OTP via ${selectedChannel.toUpperCase()} for ${purpose}...`);

    // Validate OTP
    if (!otp || otp.length !== 6) {
        return {
            success: false,
            channel: selectedChannel,
            error: 'Invalid OTP format'
        };
    }

    // Route to appropriate service based on channel
    if (selectedChannel === OTP_CHANNELS.SMS) {
        // SMS delivery
        if (!phone) {
            return {
                success: false,
                channel: selectedChannel,
                error: 'Phone number required for SMS delivery'
            };
        }

        const result = await sendOTPSMS(phone, otp, purpose);
        return {
            ...result,
            channel: OTP_CHANNELS.SMS,
            destination: phone
        };
    }

    // Default: Email delivery
    if (!email) {
        // If email not available, try SMS as fallback (if phone exists and SMS is configured)
        if (phone && config.smsProvider && config.smsProvider !== 'console') {
            console.log('⚠️ Email not available, falling back to SMS');
            const result = await sendOTPSMS(phone, otp, purpose);
            return {
                ...result,
                channel: OTP_CHANNELS.SMS,
                destination: phone
            };
        }

        // If in development, log to console anyway
        if (!config.isProduction) {
            console.log('\n' + '='.repeat(50));
            console.log('📧 OTP (No Email Available - Development Mode)');
            console.log('='.repeat(50));
            console.log(`Phone: ${phone || 'N/A'}`);
            console.log(`OTP: ${otp}`);
            console.log(`Purpose: ${purpose}`);
            console.log('='.repeat(50) + '\n');

            return {
                success: true,
                messageId: `dev_fallback_${Date.now()}`,
                channel: 'console',
                destination: phone || 'console'
            };
        }

        return {
            success: false,
            channel: selectedChannel,
            error: 'Email address required for OTP delivery'
        };
    }

    // Send via email
    const result = await sendOTPEmail(email, otp, purpose);
    return {
        ...result,
        channel: OTP_CHANNELS.EMAIL,
        destination: email
    };
};

/**
 * Get user-friendly message for OTP delivery
 * @param {string} channel - Delivery channel used
 * @param {string} destination - Email or phone
 * @returns {string} User-friendly message
 */
export const getDeliveryMessage = (channel, destination) => {
    if (!destination) {
        return 'Verification code sent';
    }

    if (channel === OTP_CHANNELS.SMS) {
        const masked = destination.slice(0, 3) + '****' + destination.slice(-3);
        return `Verification code sent to +91 ${masked}`;
    }

    // Email masking: jo***@gmail.com
    if (destination.includes('@')) {
        const [localPart, domain] = destination.split('@');
        const masked = localPart.slice(0, 2) + '***@' + domain;
        return `Verification code sent to ${masked}`;
    }

    return 'Verification code sent';
};

/**
 * Get masked destination for response
 * @param {string} channel - Delivery channel
 * @param {string} destination - Email or phone
 * @returns {string} Masked destination
 */
export const getMaskedDestination = (channel, destination) => {
    if (!destination) return '';

    if (channel === OTP_CHANNELS.SMS) {
        return destination.slice(0, 3) + '****' + destination.slice(-3);
    }

    if (destination.includes('@')) {
        const [localPart, domain] = destination.split('@');
        return localPart.slice(0, 2) + '***@' + domain;
    }

    return destination;
};

export default {
    deliverOTP,
    getDeliveryMessage,
    getMaskedDestination,
    OTP_CHANNELS
};
