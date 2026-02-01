/**
 * OTP Routes - EMAIL ONLY
 * 
 * Email verification via OTP
 * All routes are prefixed with /api/otp
 * 
 * ZERO phone references. All OTP operations use email.
 */

import { Router } from 'express';
import otpController from '../controllers/otp.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Validation schemas for OTP operations - EMAIL ONLY
const otpSchemas = {
    sendOTP: {
        email: {
            required: true,
            type: 'string',
            minLength: 5,
            maxLength: 255
        },
        purpose: {
            type: 'string',
            enum: ['registration', 'login', 'password_reset']
        }
    },
    verifyOTP: {
        email: {
            required: true,
            type: 'string',
            minLength: 5,
            maxLength: 255
        },
        otp: {
            required: true,
            type: 'string',
            minLength: 6,
            maxLength: 6
        },
        purpose: {
            type: 'string',
            enum: ['registration', 'login', 'password_reset']
        }
    }
};

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to email address
 * @access  Public (for registration) / Private (for login/password_reset)
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",   // Required: valid email address
 *   "purpose": "registration"       // Optional: 'registration' | 'login' | 'password_reset'
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Verification code sent to us***@example.com",
 *   "data": {
 *     "emailMasked": "us***@example.com",
 *     "expiresInMinutes": 5,
 *     "purpose": "registration",
 *     "verificationType": "email"
 *   }
 * }
 */
router.post('/send',
    optionalAuth,  // Allow both authenticated and unauthenticated
    validate(otpSchemas.sendOTP),
    otpController.sendVerificationOTP
);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP and mark email as verified, issue tokens
 * @access  Public (for registration) / Private (for login/password_reset)
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",   // Required: email address
 *   "otp": "123456",               // Required: 6-digit OTP
 *   "purpose": "registration"       // Optional: purpose of verification
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Email verified successfully. You are now logged in.",
 *   "data": {
 *     "emailMasked": "us***@example.com",
 *     "verified": true,
 *     "verificationType": "email",
 *     "user": { ... },
 *     "accessToken": "...",
 *     "refreshToken": "...",
 *     "loginComplete": true
 *   }
 * }
 */
router.post('/verify',
    optionalAuth,
    validate(otpSchemas.verifyOTP),
    otpController.verifyOTP
);

/**
 * @route   POST /api/otp/resend
 * @desc    Resend OTP (rate limited)
 * @access  Public (for registration) / Private (for login/password_reset)
 * 
 * Request Body: Same as /send
 * 
 * Rate Limits:
 * - 60 second cooldown between resends
 * - Maximum 5 resends per OTP session
 */
router.post('/resend',
    optionalAuth,
    validate(otpSchemas.sendOTP),
    otpController.resendOTP
);

/**
 * @route   GET /api/otp/status
 * @desc    Get email verification status for current user
 * @access  Private
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "emailMasked": "us***@example.com",
 *     "isVerified": false,
 *     "verifiedAt": null,
 *     "requiresVerification": true,
 *     "verificationType": "email"
 *   }
 * }
 */
router.get('/status',
    authenticate,
    otpController.getVerificationStatus
);

export default router;
