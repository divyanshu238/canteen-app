/**
 * Authentication Controller - EMAIL-ONLY OTP VERIFICATION
 * 
 * SECURITY-CRITICAL: All token issuance paths use mustVerifyEmailOtp()
 * 
 * RULES (ZERO EXCEPTIONS):
 * 1. Register: Create user → Send OTP email → NO tokens
 * 2. Login: Check email verified → If not → 403 EMAIL_OTP_REQUIRED → NO tokens
 * 3. Refresh: Check email verified → If not → 403 EMAIL_OTP_REQUIRED → Revoke tokens
 * 4. Password Change: Check email verified → If not → Block
 * 5. ONLY after OTP verification → issue tokens
 * 
 * ZERO phone references. ZERO SMS. ZERO fallbacks.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { User, RefreshToken, Canteen, OTP } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import { mustVerifyEmailOtp, formatEmailOtpRequiredResponse, maskEmail } from '../utils/auth.utils.js';
import { sendOTPEmail } from '../services/email.service.js';

/**
 * Generate JWT tokens
 * Exported for use in OTP flow after verification
 */
export const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        {
            id: user._id,
            role: user.role,
            canteenId: user.canteenId
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
        { id: user._id },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
        token: refreshToken,
        userId: user._id,
        expiresAt
    });

    return { accessToken, refreshToken };
};

/**
 * Format user response
 * Exported for use in OTP flow after verification
 */
export const formatUserResponse = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    canteenId: user.canteenId?.toString(),
    isApproved: user.isApproved,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt
});

/**
 * Register new user
 * POST /api/auth/register
 * 
 * FLOW:
 * 1. Create user (isEmailVerified = false)
 * 2. Generate OTP
 * 3. Send OTP to email
 * 4. Return success with requiresOtp: true
 * 5. DO NOT issue any tokens
 */
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role = 'student' } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Create user - ALWAYS unverified initially
        const userData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: ['student', 'partner'].includes(role) ? role : 'student',
            isApproved: role !== 'partner', // Partners need approval
            isEmailVerified: false  // ALWAYS false on registration
        };

        const user = await User.create(userData);
        console.log(`✅ User created: ${maskEmail(user.email)} (ID: ${user._id})`);

        // If partner, create a placeholder canteen
        if (role === 'partner') {
            const canteen = await Canteen.create({
                name: `${name}'s Kitchen`,
                description: 'New canteen - Update your details!',
                image: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?fit=crop&w=400',
                ownerId: user._id,
                isApproved: false,
                isOpen: false
            });

            user.canteenId = canteen._id;
            await user.save();
        }

        // ============================================
        // SEND OTP EMAIL (if email verification is enabled)
        // ============================================
        if (config.requireEmailVerification) {
            // Generate OTP
            const otpCode = OTP.generateOTP(config.otpLength);
            const otpHash = await OTP.hashOTP(otpCode);

            console.log(`🔐 OTP GENERATED for ${maskEmail(user.email)} (purpose: registration)`);

            // Invalidate any old OTPs for this email
            await OTP.updateMany(
                { email: user.email, purpose: 'registration', isUsed: false },
                { isUsed: true }
            );

            // Create new OTP record
            await OTP.create({
                email: user.email,
                otpHash,
                purpose: 'registration',
                userId: user._id,
                expiresAt: new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000),
                maxAttempts: config.otpMaxAttempts
            });

            // Send OTP via email
            console.log(`📤 SENDING OTP EMAIL to ${maskEmail(user.email)}`);
            const emailResult = await sendOTPEmail(user.email, otpCode, 'registration');

            let emailSent = true;
            if (!emailResult.success) {
                console.error(`❌ OTP EMAIL FAILED: ${emailResult.error}`);
                console.error(`   ErrorCode: ${emailResult.errorCode || 'N/A'}`);
                console.error(`   ErrorDetails: ${emailResult.errorDetails || 'N/A'}`);
                emailSent = false;

                // Invalidate the OTP record since email was not sent
                await OTP.updateMany(
                    { email: user.email, purpose: 'registration', isUsed: false },
                    { isUsed: true }
                );
                console.log(`🗑️ OTP record invalidated (email delivery failed)`);
            } else {
                console.log(`✅ OTP EMAIL SENT to ${maskEmail(user.email)}`);
                console.log(`   MessageId: ${emailResult.messageId || 'N/A'}`);
            }

            // Return success but NO TOKENS
            return res.status(201).json({
                success: true,
                requiresOtp: true,
                verificationType: 'email',
                message: emailSent
                    ? 'Account created. Please check your email for the verification code.'
                    : 'Account created but verification email failed. Please request a new code.',
                emailSent: emailSent,
                data: {
                    userId: user._id.toString(),
                    email: user.email,
                    emailMasked: maskEmail(user.email),
                    name: user.name
                }
            });
        }

        // ============================================
        // EMAIL VERIFICATION DISABLED - Issue tokens directly
        // This should NOT happen in production
        // ============================================
        console.warn('⚠️ WARNING: Email verification is DISABLED. Issuing tokens without verification.');
        const tokens = await generateTokens(user);

        res.status(201).json({
            success: true,
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 * POST /api/auth/login
 * 
 * FLOW:
 * 1. Validate credentials
 * 2. Check mustVerifyEmailOtp()
 * 3. If not verified → 403 EMAIL_OTP_REQUIRED → NO tokens
 * 4. If verified → Issue tokens
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact support.'
            });
        }

        // ============================================
        // SECURITY: Single source of truth for OTP check
        // ============================================
        const otpCheck = mustVerifyEmailOtp(user, 'login');

        if (!otpCheck.canIssueTokens) {
            // DO NOT issue tokens - user must verify email first
            console.log(`🔒 LOGIN BLOCKED: ${otpCheck.reason}`);
            return res.status(403).json(formatEmailOtpRequiredResponse(user));
        }

        // ============================================
        // SUCCESS: User is verified - issue tokens
        // ============================================
        const tokens = await generateTokens(user);

        res.json({
            success: true,
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 * 
 * SECURITY: Also checks email verification status
 * If user's email is not verified, revoke all tokens and require OTP
 */
export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwtRefreshSecret);
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }

        // Check if token exists in database and is not revoked
        const storedToken = await RefreshToken.findOne({
            token,
            userId: decoded.id,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!storedToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is invalid or revoked'
            });
        }

        // Get user
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // ============================================
        // SECURITY: Single source of truth for OTP check
        // ============================================
        const otpCheck = mustVerifyEmailOtp(user, 'refresh');

        if (!otpCheck.canIssueTokens) {
            // Revoke ALL tokens for this user - they must verify OTP
            console.log(`🔒 REFRESH BLOCKED: ${otpCheck.reason}`);
            await RefreshToken.updateMany(
                { userId: user._id },
                { isRevoked: true }
            );

            return res.status(403).json(formatEmailOtpRequiredResponse(user));
        }

        // Revoke old refresh token
        storedToken.isRevoked = true;
        await storedToken.save();

        // Generate new tokens (only for verified users)
        const tokens = await generateTokens(user);

        res.json({
            success: true,
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            // Revoke the refresh token
            await RefreshToken.updateOne(
                { token },
                { isRevoked: true }
            );
        }

        // Revoke all tokens for the user if requested
        if (req.body.logoutAll && req.user) {
            await RefreshToken.updateMany(
                { userId: req.user._id },
                { isRevoked: true }
            );
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            success: true,
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;

        const updates = {};
        if (name) updates.name = name.trim();

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            data: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * PUT /api/auth/password
 * 
 * SECURITY: Also checks email verification status
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Revoke all refresh tokens (force re-login on all devices)
        await RefreshToken.updateMany(
            { userId: user._id },
            { isRevoked: true }
        );

        // ============================================
        // SECURITY: Check OTP before issuing new tokens
        // ============================================
        const otpCheck = mustVerifyEmailOtp(user, 'password_change');

        if (!otpCheck.canIssueTokens) {
            // Password changed but NO tokens - user must verify OTP
            console.log(`🔒 PASSWORD CHANGE - TOKENS BLOCKED: ${otpCheck.reason}`);
            return res.status(200).json({
                success: true,
                message: 'Password changed. Please verify your email to continue.',
                requiresOtp: true,
                verificationType: 'email',
                data: {
                    userId: user._id.toString(),
                    email: user.email,
                    emailMasked: maskEmail(user.email)
                }
            });
        }

        // Generate new tokens (only for verified users)
        const tokens = await generateTokens(user);

        res.json({
            success: true,
            message: 'Password changed successfully',
            data: tokens
        });
    } catch (error) {
        next(error);
    }
};

export default {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    updateProfile,
    changePassword,
    generateTokens,
    formatUserResponse
};
