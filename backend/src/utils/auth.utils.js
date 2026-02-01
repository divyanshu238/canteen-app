/**
 * Authentication Utilities - EMAIL-ONLY OTP VERIFICATION
 * 
 * SECURITY-CRITICAL: Single source of truth for EMAIL OTP verification logic.
 * 
 * RULES (ZERO EXCEPTIONS):
 * 1. If REQUIRE_EMAIL_VERIFICATION === 'true', EMAIL OTP is MANDATORY
 * 2. No grandfathering. No legacy exceptions. No phone logic.
 * 3. Every token issuance MUST pass through mustVerifyEmailOtp()
 * 4. EMAIL is the ONLY verification identifier. ZERO phone references.
 */

import config from '../config/index.js';

/**
 * SINGLE SOURCE OF TRUTH for EMAIL OTP verification requirement
 * 
 * Call this BEFORE issuing ANY tokens (access or refresh).
 * 
 * @param {Object} user - User document (must have email and isEmailVerified fields)
 * @param {string} context - Where check is happening: 'register'|'login'|'refresh'|'password_change'
 * @returns {{
 *   required: boolean,      // TRUE if EMAIL OTP is required
 *   verified: boolean,      // TRUE if user's email is already verified
 *   canIssueTokens: boolean,// TRUE if safe to issue tokens
 *   reason: string          // Human-readable reason
 * }}
 */
export const mustVerifyEmailOtp = (user, context = 'unknown') => {
    // HARD CHECK: Is EMAIL OTP enforcement enabled?
    if (!config.requireEmailVerification) {
        return {
            required: false,
            verified: true,
            canIssueTokens: true,
            reason: 'Email OTP enforcement disabled in config'
        };
    }

    // User MUST have an email (this should never fail as email is required in User schema)
    if (!user.email) {
        console.error('❌ CRITICAL: User without email attempted authentication');
        return {
            required: true,
            verified: false,
            canIssueTokens: false,
            reason: 'Email address is required'
        };
    }

    // Check if email is verified
    if (user.isEmailVerified === true) {
        return {
            required: false,
            verified: true,
            canIssueTokens: true,
            reason: 'Email is verified'
        };
    }

    // Email NOT verified - BLOCK token issuance
    return {
        required: true,
        verified: false,
        canIssueTokens: false,
        reason: `Email OTP verification required (context: ${context})`
    };
};

/**
 * Format EMAIL OTP required response (for 403 responses)
 * 
 * This is the ONLY response format for OTP requirements.
 * NO phone fields. NO SMS references.
 */
export const formatEmailOtpRequiredResponse = (user) => ({
    success: false,
    error: 'Email verification required',
    code: 'EMAIL_OTP_REQUIRED',
    requiresOtp: true,
    verificationType: 'email',
    data: {
        userId: user._id?.toString() || user.id,
        email: user.email,
        emailMasked: maskEmail(user.email)
    }
});

/**
 * Mask email for display (e.g., jo***@gmail.com)
 */
export const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
        return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.slice(0, 2)}***@${domain}`;
};

/**
 * Validate email verification token (for registration flow if using pre-verification)
 * 
 * Token contains: email, purpose, verifiedAt, expiresAt
 * 
 * @param {string} token - Base64 encoded verification token
 * @returns {{valid: boolean, email?: string, verifiedAt?: string, error?: string}}
 */
export const validateEmailVerificationToken = (token) => {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

        if (new Date(decoded.expiresAt) < new Date()) {
            return { valid: false, error: 'Verification token expired' };
        }

        if (!decoded.email) {
            return { valid: false, error: 'Invalid verification token: missing email' };
        }

        return {
            valid: true,
            email: decoded.email,
            verifiedAt: decoded.verifiedAt
        };
    } catch (error) {
        return { valid: false, error: 'Invalid verification token' };
    }
};

export default {
    mustVerifyEmailOtp,
    formatEmailOtpRequiredResponse,
    maskEmail,
    validateEmailVerificationToken
};
