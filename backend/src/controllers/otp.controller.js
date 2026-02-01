/**
 * OTP Controller - EMAIL-ONLY VERIFICATION
 * 
 * ALL OTP operations use EMAIL as the primary identifier.
 * 
 * ZERO phone logic. ZERO SMS. ZERO fallbacks.
 * 
 * FLOWS:
 * - Send OTP: Require email → Generate OTP → Send via email
 * - Verify OTP: Validate email + OTP → Mark user as verified → Issue tokens
 * - Resend OTP: Rate-limited resend functionality
 * - Status: Check verification status
 */

import config from '../config/index.js';
import { User, OTP } from '../models/index.js';
import { sendOTPEmail } from '../services/email.service.js';
import { maskEmail } from '../utils/auth.utils.js';

/**
 * Send OTP for email verification
 * POST /api/otp/send
 * 
 * Body: { email: "user@example.com", purpose?: "registration" | "login" | "password_reset" }
 */
export const sendVerificationOTP = async (req, res, next) => {
    try {
        const { email, purpose = 'registration' } = req.body;

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'No account found with this email address',
                code: 'USER_NOT_FOUND'
            });
        }

        // If already verified and purpose is registration, inform user
        if (user.isEmailVerified && purpose === 'registration') {
            return res.status(400).json({
                success: false,
                error: 'This email is already verified. Please login.',
                code: 'ALREADY_VERIFIED'
            });
        }

        // Check for existing active OTP (rate limiting)
        const existingOTP = await OTP.findOne({
            email: normalizedEmail,
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

        console.log(`🔐 OTP GENERATED for ${maskEmail(normalizedEmail)} (purpose: ${purpose})`);

        // Create or update OTP record
        if (existingOTP) {
            existingOTP.otpHash = otpHash;
            existingOTP.attempts = 0;
            existingOTP.expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
            await existingOTP.save();
            console.log(`📝 OTP record UPDATED (resend #${existingOTP.resendCount})`);
        } else {
            // Invalidate any old OTPs for this email/purpose
            await OTP.updateMany(
                { email: normalizedEmail, purpose, isUsed: false },
                { isUsed: true }
            );

            // Create new OTP record
            await OTP.create({
                email: normalizedEmail,
                otpHash,
                purpose,
                userId: user._id,
                expiresAt: new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000),
                maxAttempts: config.otpMaxAttempts
            });
            console.log(`📝 OTP record CREATED`);
        }

        // Send OTP via email
        console.log(`📤 SENDING OTP EMAIL to ${maskEmail(normalizedEmail)}`);
        const emailResult = await sendOTPEmail(normalizedEmail, otpCode, purpose);

        if (!emailResult.success) {
            console.error(`❌ OTP EMAIL FAILED: ${emailResult.error}`);
            return res.status(500).json({
                success: false,
                error: 'Failed to send verification email. Please try again.'
            });
        }

        console.log(`✅ OTP EMAIL SENT to ${maskEmail(normalizedEmail)}`);
        console.log(`   MessageId: ${emailResult.messageId || 'N/A'}`);

        res.status(200).json({
            success: true,
            message: `Verification code sent to ${maskEmail(normalizedEmail)}`,
            data: {
                email: normalizedEmail,
                emailMasked: maskEmail(normalizedEmail),
                expiresInMinutes: config.otpExpiryMinutes,
                purpose,
                verificationType: 'email',
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
 * Body: { email: "user@example.com", otp: "123456", purpose?: "registration" }
 * 
 * IMPORTANT: After successful verification, this endpoint:
 * 1. Marks user as email verified
 * 2. Issues JWT tokens (completing the auth flow)
 */
export const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp, purpose = 'registration' } = req.body;

        // Validate inputs
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        if (!otp || !/^[0-9]{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid 6-digit OTP'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find the OTP record
        const otpRecord = await OTP.findOne({
            email: normalizedEmail,
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
        // OTP VERIFIED - Update user and issue tokens
        // ============================================

        // Import token generation utilities
        const { generateTokens, formatUserResponse } = await import('./auth.controller.js');

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        await user.save();

        console.log(`✅ EMAIL VERIFIED for ${maskEmail(normalizedEmail)}`);

        // Generate and issue tokens
        const tokens = await generateTokens(user);

        console.log(`🔑 TOKENS ISSUED for ${maskEmail(normalizedEmail)}`);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You are now logged in.',
            data: {
                email: normalizedEmail,
                emailMasked: maskEmail(normalizedEmail),
                verified: true,
                purpose,
                verificationType: 'email',
                user: formatUserResponse(user),
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                loginComplete: true
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Resend OTP (alias for sendVerificationOTP with rate limiting)
 * POST /api/otp/resend
 * 
 * Body: { email: "user@example.com", purpose?: "registration" }
 */
export const resendOTP = async (req, res, next) => {
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

        res.status(200).json({
            success: true,
            data: {
                email: user.email,
                emailMasked: maskEmail(user.email),
                isVerified: user.isEmailVerified,
                verifiedAt: user.emailVerifiedAt,
                requiresVerification: config.requireEmailVerification && !user.isEmailVerified,
                verificationType: 'email'
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
