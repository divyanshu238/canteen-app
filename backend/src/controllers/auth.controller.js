import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { User, RefreshToken, Canteen, OTP } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import { validateVerificationToken, isUserGrandfathered } from '../utils/auth.utils.js';

/**
 * Generate JWT tokens
 */
const generateTokens = async (user) => {
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
 */
const formatUserResponse = (user) => ({
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

        // Generate tokens
        const tokens = await generateTokens(user);

        // Determine if verification is required for this user
        const requiresVerification = config.requirePhoneVerification &&
            phone &&
            !isPhoneVerified;

        res.status(201).json({
            success: true,
            data: {
                user: formatUserResponse(user),
                ...tokens,
                requiresPhoneVerification: requiresVerification,
                message: requiresVerification
                    ? 'Account created. Please verify your phone number to access all features.'
                    : undefined
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

        // Check phone verification (with grandfathering)
        const grandfathered = isUserGrandfathered(user);
        const requiresVerification = config.requirePhoneVerification &&
            user.phone &&
            !user.isPhoneVerified &&
            !grandfathered;

        // Generate tokens
        const tokens = await generateTokens(user);

        res.json({
            success: true,
            data: {
                user: formatUserResponse(user),
                ...tokens,
                requiresPhoneVerification: requiresVerification,
                isGrandfathered: grandfathered,
                message: requiresVerification
                    ? 'Please verify your phone number to continue.'
                    : undefined
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

        // Revoke old refresh token
        storedToken.isRevoked = true;
        await storedToken.save();

        // Generate new tokens
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

        // Generate new tokens
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
    changePassword
};
