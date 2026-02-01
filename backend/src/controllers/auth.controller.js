import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { User, RefreshToken, Canteen, OTP } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import { validateVerificationToken, mustVerifyOtp, formatOtpRequiredResponse } from '../utils/auth.utils.js';

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
    phone: user.phone,
    canteenId: user.canteenId?.toString(),
    isApproved: user.isApproved,
    isPhoneVerified: user.isPhoneVerified,
    phoneVerifiedAt: user.phoneVerifiedAt,
    createdAt: user.createdAt
});

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
    try {
        const { name, email, password, phone, role = 'student', verificationToken } = req.body;

        // ============================================
        // SECURITY: Fail loudly if phone is required but missing
        // This prevents silent registration that can't complete OTP flow
        // ============================================
        if (config.requirePhoneVerification && !phone) {
            console.error('❌ REGISTRATION BLOCKED: Phone number required but not provided');
            console.error(`   Email: ${email}`);
            console.error(`   REQUIRE_PHONE_VERIFICATION: ${config.requirePhoneVerification}`);
            return res.status(400).json({
                success: false,
                error: 'Phone number is required for registration. Please provide a valid 10-digit phone number.',
                code: 'PHONE_REQUIRED'
            });
        }

        // Validate phone format if provided
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid 10-digit phone number',
                code: 'INVALID_PHONE_FORMAT'
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

        // Check phone verification if feature is enabled and phone is provided
        let isPhoneVerified = false;
        let phoneVerifiedAt = null;

        if (phone && config.requirePhoneVerification) {
            // Check if phone is already registered
            const existingPhoneUser = await User.findOne({ phone, isPhoneVerified: true });
            if (existingPhoneUser) {
                return res.status(400).json({
                    success: false,
                    error: 'This phone number is already registered'
                });
            }

            // Validate verification token if provided
            if (verificationToken) {
                const tokenResult = validateVerificationToken(verificationToken);
                if (tokenResult.valid && tokenResult.phone === phone) {
                    isPhoneVerified = true;
                    phoneVerifiedAt = new Date(tokenResult.verifiedAt);
                } else {
                    return res.status(400).json({
                        success: false,
                        error: tokenResult.error || 'Phone verification required'
                    });
                }
            }
            // If no token and verification is required, we'll create user but flag as unverified
        }

        // Create user
        const userData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phone,
            role: ['student', 'partner'].includes(role) ? role : 'student',
            isApproved: role !== 'partner', // Partners need approval
            isPhoneVerified,
            phoneVerifiedAt
        };

        const user = await User.create(userData);

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
        // SECURITY: Use single source of truth for OTP check
        // ============================================
        const otpCheck = mustVerifyOtp(user, 'register');

        if (!otpCheck.canIssueTokens) {
            // Account created but NO tokens issued until phone verified
            console.log(`🔒 REGISTER BLOCKED: ${otpCheck.reason}`);
            return res.status(201).json({
                success: true,
                requiresOtp: true,
                message: 'Account created. Please verify your phone number to continue.',
                data: {
                    userId: user._id.toString(),
                    phone: user.phone || null,
                    phoneMasked: user.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-3) : null,
                    email: user.email,
                    name: user.name
                }
            });
        }

        // ============================================
        // SUCCESS: User verified (or OTP disabled) - issue tokens
        // ============================================
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
        // SECURITY: Use single source of truth for OTP check
        // ============================================
        const otpCheck = mustVerifyOtp(user, 'login');

        if (!otpCheck.canIssueTokens) {
            // DO NOT issue tokens - user must verify phone first
            console.log(`🔒 LOGIN BLOCKED: ${otpCheck.reason}`);
            return res.status(403).json(formatOtpRequiredResponse(user));
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
        // SECURITY: Use single source of truth for OTP check
        // ============================================
        const otpCheck = mustVerifyOtp(user, 'refresh');

        if (!otpCheck.canIssueTokens) {
            // Revoke ALL tokens for this user - they must verify OTP
            console.log(`🔒 REFRESH BLOCKED: ${otpCheck.reason}`);
            await RefreshToken.updateMany(
                { userId: user._id },
                { isRevoked: true }
            );

            return res.status(403).json(formatOtpRequiredResponse(user));
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
        const { name, phone } = req.body;

        const updates = {};
        if (name) updates.name = name.trim();
        if (phone) updates.phone = phone;

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
        const otpCheck = mustVerifyOtp(user, 'password_change');

        if (!otpCheck.canIssueTokens) {
            // Password changed but NO tokens - user must verify OTP
            console.log(`🔒 PASSWORD CHANGE - TOKENS BLOCKED: ${otpCheck.reason}`);
            return res.status(200).json({
                success: true,
                message: 'Password changed. Please verify your phone to continue.',
                requiresOtp: true,
                data: {
                    userId: user._id.toString(),
                    phone: user.phone || null,
                    email: user.email
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
