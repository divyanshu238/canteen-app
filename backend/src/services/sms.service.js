/**
 * SMS Service for OTP delivery
 * 
 * Supports multiple SMS providers:
 * - Fast2SMS (India-focused, cost-effective)
 * - Twilio (Global, reliable)
 * 
 * In development mode, OTPs are logged to console instead of being sent.
 */

import config from '../config/index.js';

/**
 * SMS Provider configurations
 */
const SMS_PROVIDERS = {
    FAST2SMS: 'fast2sms',
    TWILIO: 'twilio',
    CONSOLE: 'console' // For development
};

/**
 * Send OTP via Fast2SMS
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp - OTP to send
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendViaFast2SMS = async (phone, otp) => {
    const apiKey = config.fast2smsApiKey;

    if (!apiKey) {
        console.error('Fast2SMS API key not configured');
        return { success: false, error: 'SMS service not configured' };
    }

    try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'otp',
                variables_values: otp,
                numbers: phone,
                flash: 0 // Regular SMS, not flash
            })
        });

        const data = await response.json();

        if (data.return === true || data.return === 'true') {
            return {
                success: true,
                messageId: data.request_id,
                provider: SMS_PROVIDERS.FAST2SMS
            };
        } else {
            console.error('Fast2SMS error:', data);
            return {
                success: false,
                error: data.message || 'Failed to send SMS'
            };
        }
    } catch (error) {
        console.error('Fast2SMS request failed:', error);
        return { success: false, error: 'SMS delivery failed' };
    }
};

/**
 * Send OTP via Twilio
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp - OTP to send
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendViaTwilio = async (phone, otp) => {
    const accountSid = config.twilioAccountSid;
    const authToken = config.twilioAuthToken;
    const fromNumber = config.twilioPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
        console.error('Twilio credentials not configured');
        return { success: false, error: 'SMS service not configured' };
    }

    try {
        // Format phone number for India (+91)
        const formattedPhone = `+91${phone}`;

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: formattedPhone,
                    From: fromNumber,
                    Body: `Your Canteen Connect verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                messageId: data.sid,
                provider: SMS_PROVIDERS.TWILIO
            };
        } else {
            console.error('Twilio error:', data);
            return {
                success: false,
                error: data.message || 'Failed to send SMS'
            };
        }
    } catch (error) {
        console.error('Twilio request failed:', error);
        return { success: false, error: 'SMS delivery failed' };
    }
};

/**
 * Log OTP to console (development mode)
 * @param {string} phone - Phone number
 * @param {string} otp - OTP to log
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
const sendViaConsole = async (phone, otp) => {
    console.log('\n' + '='.repeat(50));
    console.log('📱 OTP SENT (Development Mode)');
    console.log('='.repeat(50));
    console.log(`Phone: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log(`Valid for: 5 minutes`);
    console.log('='.repeat(50) + '\n');

    return {
        success: true,
        messageId: `dev_${Date.now()}`,
        provider: SMS_PROVIDERS.CONSOLE
    };
};

/**
 * Send OTP via configured provider
 * @param {string} phone - 10-digit mobile number
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP (for logging)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendOTP = async (phone, otp, purpose = 'verification') => {
    // Validate phone number
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
        return {
            success: false,
            error: 'Invalid phone number format'
        };
    }

    // Rate limiting check (will be enforced at controller level too)
    if (!otp || otp.length !== 6) {
        return {
            success: false,
            error: 'Invalid OTP format'
        };
    }

    // Select provider based on configuration
    const provider = config.smsProvider || SMS_PROVIDERS.CONSOLE;

    console.log(`📤 Sending OTP via ${provider} for ${purpose}...`);

    switch (provider) {
        case SMS_PROVIDERS.FAST2SMS:
            return await sendViaFast2SMS(phone, otp);

        case SMS_PROVIDERS.TWILIO:
            return await sendViaTwilio(phone, otp);

        case SMS_PROVIDERS.CONSOLE:
        default:
            // Development mode or fallback
            if (config.isProduction) {
                console.warn('⚠️ SMS provider not configured in production mode!');
            }
            return await sendViaConsole(phone, otp);
    }
};

/**
 * Verify SMS delivery status (for providers that support it)
 * @param {string} messageId - Message ID from send response
 * @param {string} provider - Provider used
 * @returns {Promise<{delivered: boolean, status: string}>}
 */
export const checkDeliveryStatus = async (messageId, provider = null) => {
    // This is a placeholder for delivery status checking
    // Implementation depends on provider webhook support
    return {
        delivered: true,
        status: 'delivered',
        note: 'Status checking not implemented for this provider'
    };
};

export default {
    sendOTP,
    checkDeliveryStatus,
    SMS_PROVIDERS
};
