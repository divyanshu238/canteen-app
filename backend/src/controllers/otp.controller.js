/**
 * OTP Controller
 * 
 * Handles OTP verification via Email (default, free) or SMS (optional, paid):
 * - New user registration (optional, controlled by feature flag)
 * - Resend OTP functionality
 * - OTP verification
 * 
 * Delivery Channel:
 * - email (default) - FREE via Gmail SMTP
 * - sms (optional) - Paid via Fast2SMS/Twilio
 * 
 * Backward Compatible:
 * - Feature flagged via REQUIRE_PHONE_VERIFICATION
 * - Existing users are grandfathered
 * - Phone field remains optional for existing workflows
 */

import config from '../config/index.js';
import { User, OTP } from '../models/index.js';
import { deliverOTP, getDeliveryMessage, getMaskedDestination, OTP_CHANNELS } from '../services/otp.service.js';
import { isUserGrandfathered, validateVerificationToken } from '../utils/auth.utils.js';

/**
 * Send OTP for phone verification (during or after registration)
 * POST /api/otp/send
 * 
 * Body: { phone: "1234567890", purpose?: "registration" | "login" | "password_reset" }
 * Auth: Optional (required for login/password_reset purpose)
 */
export const sendVerificationOTP = async (req, res, next) => {
    try {
        const { phone, purpose = 'registration' } = req.body;

        // Validate phone number
        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid 10-digit phone number'
            });
        }

        // For login/password_reset, user must be authenticated
        if (['login', 'password_reset'].includes(purpose)) {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required for this operation'
                });
            }

            // Verify phone matches user's phone
            if (req.user.phone !== phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number does not match your account'
                });
            }
        }

        // Check if phone is already verified by another user (for registration)
        if (purpose === 'registration') {
            const existingUserWithPhone = await User.findOne({
                phone,
                isPhoneVerified: true
            });

            if (existingUserWithPhone) {
                return res.status(400).json({
                    success: false,
                    error: 'This phone number is already registered and verified'
                });
            }
        }

        // Check for existing active OTP (rate limiting)
        const existingOTP = await OTP.findOne({
            phone,
            purpose,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (existingOTP) {
            const canResendResult = existingOTP.canResend(config.otpResendCooldownSeconds);

            if (!canResendResult.canResend) {
                return res.status(429).json({
                    success: false,
                    error: canResendResult.error || `Please wait ${canResendResult.waitSeconds} seconds before requesting another OTP`,
                    waitSeconds: canResendResult.waitSeconds
                });
            }

            // Update resend tracking
            existingOTP.resendCount += 1;
            existingOTP.lastResendAt = new Date();
        }

        // Generate new OTP
        const otpCode = OTP.generateOTP(config.otpLength);
        const otpHash = await OTP.hashOTP(otpCode);

        // Create or update OTP record
        if (existingOTP) {
            existingOTP.otpHash = otpHash;
            existingOTP.attempts = 0;
            existingOTP.expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
            await existingOTP.save();
        } else {
            // Invalidate any old OTPs for this phone/purpose
            await OTP.updateMany(
                { phone, purpose, isUsed: false },
                { isUsed: true }
            );

            // Create new OTP record
            await OTP.create({
                phone,
                otpHash,
                purpose,
                userId: req.user?._id,
                expiresAt: new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000),
                maxAttempts: config.otpMaxAttempts
            });
        }

        // Get user email for delivery (email is default, free channel)
        let userEmail = null;
        if (req.user?.email) {
            userEmail = req.user.email;
        } else {
            // Try to find user by phone to get their email
            const existingUser = await User.findOne({ phone });
            userEmail = existingUser?.email;
        }

        // Deliver OTP via configured channel (email by default)
        const deliveryResult = await deliverOTP({
            email: userEmail,
            phone,
            otp: otpCode,
            purpose
        });

        if (!deliveryResult.success) {
            console.error('Failed to deliver OTP:', deliveryResult.error);
            return res.status(500).json({
                success: false,
                error: 'Failed to send verification code. Please try again.'
            });
        }

        // Build response with channel information
        const destination = deliveryResult.destination || (deliveryResult.channel === OTP_CHANNELS.EMAIL ? userEmail : phone);
        const message = getDeliveryMessage(deliveryResult.channel, destination);
        const maskedDestination = getMaskedDestination(deliveryResult.channel, destination);

        res.status(200).json({
            success: true,
            message,
            data: {
                channel: deliveryResult.channel,
                destination: maskedDestination,
                expiresInMinutes: config.otpExpiryMinutes,
                purpose,
                // Include OTP in development for testing
                ...(config.isProduction ? {} : { otp: otpCode })
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP
 * POST /api/otp/verify
 * 
 * Body: { phone: "1234567890", otp: "123456", purpose?: "registration" }
 * Auth: Optional (depends on purpose)
 * 
 * IMPORTANT: After successful verification, this endpoint issues JWT tokens
 * to complete the login flow for users who were blocked at login.
 */
export const verifyOTP = async (req, res, next) => {
    try {
        const { phone, otp, purpose = 'registration' } = req.body;

        // Validate inputs
        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid 10-digit phone number'
            });
        }

        if (!otp || !/^[0-9]{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid 6-digit OTP'
            });
        }

        // Find the OTP record
        const otpRecord = await OTP.findOne({
            phone,
            purpose,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                error: 'No valid OTP found. Please request a new verification code.',
                code: 'OTP_NOT_FOUND'
            });
        }

        // Verify OTP
        const verifyResult = await otpRecord.verifyOTP(otp);

        if (!verifyResult.valid) {
            return res.status(400).json({
                success: false,
                error: verifyResult.error,
                code: 'OTP_INVALID',
                attemptsRemaining: verifyResult.attemptsRemaining
            });
        }

        // ============================================
        // OTP verified successfully - update user
        // ============================================

        // Import token generation utilities
        const { generateTokens, formatUserResponse } = await import('./auth.controller.js');

        let user = null;
        let tokens = null;
        let verificationToken = null;

        // Find user by phone
        user = await User.findOne({ phone });

        if (user) {
            // Update verification status
            user.isPhoneVerified = true;
            user.phoneVerifiedAt = new Date();
            await user.save();

            // ============================================
            // ISSUE TOKENS: Complete the login flow
            // ============================================
            tokens = await generateTokens(user);
        } else if (purpose === 'registration') {
            // No user exists yet - create a temporary verification token
            // This token proves phone ownership for registration
            verificationToken = Buffer.from(JSON.stringify({
                phone,
                purpose,
                verifiedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min validity
            })).toString('base64');
        }

        // Build response
        const responseData = {
            phone: phone.slice(0, 3) + '****' + phone.slice(-3),
            verified: true,
            purpose
        };

        // Include tokens if user exists (login flow completed)
        if (user && tokens) {
            responseData.user = formatUserResponse(user);
            responseData.accessToken = tokens.accessToken;
            responseData.refreshToken = tokens.refreshToken;
            responseData.loginComplete = true;
        }

        // Include verification token for registration flow
        if (verificationToken) {
            responseData.verificationToken = verificationToken;
            responseData.loginComplete = false;
        }

        res.status(200).json({
            success: true,
            message: user
                ? 'Phone verified successfully. You are now logged in.'
                : 'Phone number verified successfully.',
            data: responseData
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Resend OTP (alias for sendVerificationOTP with rate limiting)
 * POST /api/otp/resend
 * 
 * Body: { phone: "1234567890", purpose?: "registration" }
 */
export const resendOTP = async (req, res, next) => {
    // Same as send, but with stricter rate limiting message
    return sendVerificationOTP(req, res, next);
};

/**
 * Check verification status
 * GET /api/otp/status
 * 
 * Auth: Required
 */
export const getVerificationStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const user = await User.findById(req.user._id);

        // Check if user is grandfathered
        const grandfathered = isUserGrandfathered(user);

        res.status(200).json({
            success: true,
            data: {
                phone: user.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-3) : null,
                hasPhone: !!user.phone,
                isVerified: user.isPhoneVerified,
                verifiedAt: user.phoneVerifiedAt,
                requiresVerification: config.requirePhoneVerification && !grandfathered && !user.isPhoneVerified,
                isGrandfathered: grandfathered
            }
        });

    } catch (error) {
        next(error);
    }
};

export default {
    sendVerificationOTP,
    verifyOTP,
    resendOTP,
    getVerificationStatus
};
