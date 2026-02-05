/**
 * Authentication Controller - Classic Email/Password Auth
 * 
 * NO Firebase. NO OTP. NO third-party auth.
 * 
 * Simple authentication using:
 * - bcrypt for password hashing
 * - JWT for session tokens
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User, RefreshToken, Canteen } from '../models/index.js';

const BCRYPT_ROUNDS = 12;

/**
 * Generate JWT tokens for session management
 */
export const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        {
            id: user._id,
            role: user.role,
            email: user.email,
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
 * Format user response (exclude sensitive fields)
 */
export const formatUserResponse = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    canteenId: user.canteenId?.toString(),
    isApproved: user.isApproved,
    createdAt: user.createdAt
});

/**
 * Mask email for logging
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local[0] + '***' : local;
    return `${maskedLocal}@${domain}`;
};

/**
 * Register new user
 * POST /api/auth/register
 * 
 * Body: { name, email, phone, password, role? }
 */
export const register = async (req, res, next) => {
    try {
        const { name, email, phone, password, role = 'student' } = req.body;

        // Validate required fields
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Name is required (minimum 2 characters)',
                code: 'NAME_REQUIRED'
            });
        }

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Valid email is required',
                code: 'EMAIL_REQUIRED'
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required',
                code: 'PHONE_REQUIRED'
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters',
                code: 'PASSWORD_REQUIRED'
            });
        }

        // Format phone number
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneNumber = cleanPhone.length === 10 ? `+91${cleanPhone}` :
            cleanPhone.startsWith('91') && cleanPhone.length === 12 ? `+${cleanPhone}` :
                `+${cleanPhone}`;

        // Validate phone number format
        if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format',
                code: 'INVALID_PHONE_FORMAT'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`📧 REGISTER ATTEMPT: ${maskEmail(normalizedEmail)}`);

        // Check if email already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            console.log(`❌ REGISTER BLOCKED: Email already registered: ${maskEmail(normalizedEmail)}`);
            return res.status(409).json({
                success: false,
                error: 'Email is already registered. Please login instead.',
                code: 'EMAIL_ALREADY_REGISTERED'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const userData = {
            name: name.trim(),
            email: normalizedEmail,
            phoneNumber: phoneNumber,
            password: hashedPassword,
            role: ['student', 'partner'].includes(role) ? role : 'student',
            isApproved: role !== 'partner' // Partners need admin approval
        };

        const user = await User.create(userData);
        console.log(`✅ User created: ${maskEmail(normalizedEmail)} (ID: ${user._id}, Role: ${user.role})`);

        // If partner, create placeholder canteen
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
            console.log(`📦 Canteen created for partner: ${canteen._id}`);
        }

        // Generate JWT tokens for session
        const tokens = await generateTokens(user);
        console.log(`🔑 Tokens issued for: ${maskEmail(normalizedEmail)}`);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        console.error('❌ REGISTER ERROR:', error.message);
        next(error);
    }
};

/**
 * Login user
 * POST /api/auth/login
 * 
 * Body: { email, password }
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Valid email is required',
                code: 'EMAIL_REQUIRED'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required',
                code: 'PASSWORD_REQUIRED'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`📧 LOGIN ATTEMPT: ${maskEmail(normalizedEmail)}`);

        // Find user by email
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        if (!user) {
            console.log(`❌ LOGIN BLOCKED: User not found: ${maskEmail(normalizedEmail)}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`❌ LOGIN BLOCKED: Invalid password for: ${maskEmail(normalizedEmail)}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            console.log(`❌ LOGIN BLOCKED: Account deactivated: ${maskEmail(normalizedEmail)}`);
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated. Please contact support.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Generate JWT tokens
        const tokens = await generateTokens(user);
        console.log(`✅ LOGIN SUCCESS: ${maskEmail(normalizedEmail)} (ID: ${user._id})`);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        console.error('❌ LOGIN ERROR:', error.message);
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
                error: 'Refresh token is required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwtRefreshSecret);
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN'
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
                error: 'Refresh token is invalid or revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        // Get user
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive',
                code: 'USER_INACTIVE'
            });
        }

        // Revoke old refresh token (rotation)
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
        const { refreshToken: token, logoutAll } = req.body;

        if (token) {
            await RefreshToken.updateOne(
                { token },
                { isRevoked: true }
            );
        }

        // Revoke all tokens if requested
        if (logoutAll && req.user) {
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

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

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
        const { name, email, phoneNumber } = req.body;

        const updates = {};
        if (name && name.trim().length >= 2) {
            updates.name = name.trim();
        }

        // Allow updating email if provided and valid
        if (email && email.includes('@')) {
            const normalizedEmail = email.toLowerCase().trim();
            // Check if email is taken by another user
            if (normalizedEmail !== req.user.email) {
                const existing = await User.findOne({ email: normalizedEmail });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        error: 'Email is already in use'
                    });
                }
                updates.email = normalizedEmail;
            }
        }

        // Allow updating phone if provided and valid
        if (phoneNumber) {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            // simple validation
            if (cleanPhone.length >= 10) {
                // Format strictly if needed, for now trusting the input/schema validation slightly or doing basic format
                // Re-using register logic for format would be best but let's keep it simple as per schema
                const formatted = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
                updates.phoneNumber = formatted;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid updates provided'
            });
        }

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
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current and new passwords are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get user with password select
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect current password'
            });
        }

        // Hash new password
        user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await user.save();

        // Optional: Revoke all refresh tokens (logout from other devices)
        // await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Legacy export for compatibility
export const signup = register;

export default {
    register,
    signup,
    login,
    refreshToken,
    logout,
    getMe,
    updateProfile,
    changePassword,
    generateTokens,
    formatUserResponse
};
