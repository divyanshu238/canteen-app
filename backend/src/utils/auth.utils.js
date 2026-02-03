/**
 * Authentication Utilities - FIREBASE PHONE OTP
 * 
 * Utility functions for phone-based authentication.
 * 
 * NOTE: All OTP logic is handled by Firebase.
 * Backend only verifies Firebase ID tokens.
 */

/**
 * Mask phone number for display (e.g., +91****1234)
 */
export const maskPhone = (phone) => {
    if (!phone || phone.length < 6) return '***';
    return phone.slice(0, 3) + '****' + phone.slice(-4);
};

/**
 * Validate E.164 phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid E.164 format
 */
export const isValidE164 = (phone) => {
    if (!phone) return false;
    // E.164: + followed by 7-15 digits
    return /^\+[1-9]\d{6,14}$/.test(phone);
};

/**
 * Format phone number for logging (safely masked)
 */
export const safeLogPhone = (phone) => {
    if (!phone) return '(no phone)';
    return maskPhone(phone);
};

export default {
    maskPhone,
    isValidE164,
    safeLogPhone
};
