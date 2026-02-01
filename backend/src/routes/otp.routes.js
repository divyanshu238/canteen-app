/**
 * OTP Routes
 * 
 * Phone verification via OTP
 * All routes are prefixed with /api/otp
 */

import { Router } from 'express';
import otpController from '../controllers/otp.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Validation schemas for OTP operations
const otpSchemas = {
    sendOTP: {
        phone: {
            required: true,
            type: 'string',
            minLength: 10,
            maxLength: 10
        },
        purpose: {
            type: 'string',
            enum: ['registration', 'login', 'password_reset']
        }
    },
    verifyOTP: {
        phone: {
            required: true,
            type: 'string',
            minLength: 10,
            maxLength: 10
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
 * @desc    Send OTP to phone number
 * @access  Public (for registration) / Private (for login/password_reset)
 * 
 * Request Body:
 * {
 *   "phone": "1234567890",      // Required: 10-digit Indian mobile number
 *   "purpose": "registration"   // Optional: 'registration' | 'login' | 'password_reset'
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Verification code sent successfully",
 *   "data": {
 *     "phone": "123****890",
 *     "expiresInMinutes": 5,
 *     "purpose": "registration"
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
 * @desc    Verify OTP and mark phone as verified
 * @access  Public (for registration) / Private (for login/password_reset)
 * 
 * Request Body:
 * {
 *   "phone": "1234567890",      // Required: 10-digit mobile number
 *   "otp": "123456",            // Required: 6-digit OTP
 *   "purpose": "registration"   // Optional: purpose of verification
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Phone number verified successfully",
 *   "data": {
 *     "phone": "123****890",
 *     "verified": true,
 *     "verificationToken": "..." // Only for registration (to use during signup)
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
 * @desc    Get phone verification status for current user
 * @access  Private
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "phone": "123****890",
 *     "hasPhone": true,
 *     "isVerified": false,
 *     "requiresVerification": true,
 *     "isGrandfathered": false
 *   }
 * }
 */
router.get('/status',
    authenticate,
    otpController.getVerificationStatus
);

export default router;
