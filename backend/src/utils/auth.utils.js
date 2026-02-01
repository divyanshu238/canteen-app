/**
 * Authentication Utilities
 * 
 * SECURITY-CRITICAL: Single source of truth for OTP verification logic.
 * 
 * RULES (ZERO EXCEPTIONS):
 * 1. If REQUIRE_PHONE_VERIFICATION === 'true', OTP is MANDATORY
 * 2. No grandfathering. No legacy exceptions.
 * 3. Every token issuance MUST pass through mustVerifyOtp()
 */

import config from '../config/index.js';

/**
 * SINGLE SOURCE OF TRUTH for OTP verification requirement
 * 
 * Call this BEFORE issuing ANY tokens (access or refresh).
 * 
 * @param {Object} user - User document (must have phone and isPhoneVerified)
 * @param {string} context - Where check is happening: 'register'|'login'|'refresh'|'password_change'
 * @returns {{
 *   required: boolean,      // TRUE if OTP is required
 *   verified: boolean,      // TRUE if user is already verified
 *   canIssueTokens: boolean,// TRUE if safe to issue tokens
 *   reason: string          // Human-readable reason
 * }}
 */
export const mustVerifyOtp = (user, context = 'unknown') => {
    // HARD CHECK: Is OTP enforcement enabled?
    if (!config.requirePhoneVerification) {
        return {
            required: false,
            verified: true,
            canIssueTokens: true,
            reason: 'OTP enforcement disabled in config'
        };
    }

    // User has no phone - they MUST add one to proceed
    if (!user.phone) {
        return {
            required: true,
            verified: false,
            canIssueTokens: false,
            reason: 'Phone number required for verification'
        };
    }

    // User has phone - check if verified
    if (user.isPhoneVerified === true) {
        return {
            required: false,
            verified: true,
            canIssueTokens: true,
            reason: 'Phone is verified'
        };
    }

    // User has phone but NOT verified - BLOCK
    return {
        required: true,
        verified: false,
        canIssueTokens: false,
        reason: `OTP verification required (context: ${context})`
    };
};

/**
 * DEPRECATED: Use mustVerifyOtp() instead
 * Kept for backward compatibility but now returns FALSE always if OTP is enabled
 */
export const isUserGrandfathered = (user) => {
    console.warn('⚠️ DEPRECATED: isUserGrandfathered() called. Use mustVerifyOtp() instead.');

    // If OTP is required, NO ONE is grandfathered
    if (config.requirePhoneVerification) {
        return false;
    }

    return true; // Only if feature is disabled
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

/**
 * Format OTP required response (for 403 responses)
 */
export const formatOtpRequiredResponse = (user) => ({
    success: false,
    error: 'Phone verification required',
    code: 'OTP_REQUIRED',
    requiresOtp: true,
    data: {
        userId: user._id?.toString() || user.id,
        phone: user.phone || null,
        phoneMasked: user.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-3) : null,
        email: user.email
    }
});

export default {
    mustVerifyOtp,
    isUserGrandfathered,
    validateVerificationToken,
    formatOtpRequiredResponse
};

