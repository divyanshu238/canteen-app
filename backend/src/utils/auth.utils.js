/**
 * Authentication Utilities
 * 
 * Shared utilities for authentication and verification logic.
 * Separated to avoid circular dependencies.
 */

import config from '../config/index.js';

/**
 * Check if user is grandfathered (exempt from phone verification)
 * 
 * Grandfathering logic:
 * 1. If feature is disabled, everyone is "grandfathered"
 * 2. If user is already verified, they're not grandfathered (just verified)
 * 3. If grandfather date is set, users created before that date are exempt
 * 4. Otherwise, existing users (created before feature deployment) are exempt
 * 
 * @param {Object} user - User document
 * @returns {boolean} - True if user is exempt from phone verification
 */
export const isUserGrandfathered = (user) => {
    // If feature is disabled, everyone is "grandfathered"
    if (!config.requirePhoneVerification) {
        return true;
    }

    // If already verified, not grandfathered but verified
    if (user.isPhoneVerified) {
        return false;
    }

    // If grandfather date is set, check against it
    if (config.phoneVerificationGrandfatherDate) {
        const grandfatherDate = new Date(config.phoneVerificationGrandfatherDate);
        return user.createdAt < grandfatherDate;
    }

    // If no grandfather date, check if user was created before feature was enabled
    // Users without phoneVerifiedAt who have isPhoneVerified: false are grandfathered
    // This works because the field didn't exist before
    return !user.isPhoneVerified && !user.phoneVerifiedAt && user.createdAt < new Date();
};

/**
 * Validate verification token (for registration flow)
 * 
 * The token proves phone ownership and can be used during user creation.
 * Token contains: phone, purpose, verifiedAt, expiresAt
 * 
 * @param {string} token - Base64 encoded verification token
 * @returns {{valid: boolean, phone?: string, verifiedAt?: string, error?: string}}
 */
export const validateVerificationToken = (token) => {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

        if (new Date(decoded.expiresAt) < new Date()) {
            return { valid: false, error: 'Verification token expired' };
        }

        return {
            valid: true,
            phone: decoded.phone,
            verifiedAt: decoded.verifiedAt
        };
    } catch (error) {
        return { valid: false, error: 'Invalid verification token' };
    }
};

export default {
    isUserGrandfathered,
    validateVerificationToken
};
