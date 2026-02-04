/**
 * Authentication Controller - EMAIL/PASSWORD AUTHENTICATION
 * 
 * NO OTP. NO Phone Verification. NO reCAPTCHA.
 * 
 * ARCHITECTURE:
 * 1. Frontend authenticates with Firebase using email/password
 * 2. Backend receives Firebase ID token
 * 3. Backend verifies token and extracts email
 * 4. Backend creates/finds user by email
 * 5. Backend issues JWT for session management
 * 
 * Phone number is stored for contact purposes only, NOT for authentication.
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User, RefreshToken, Canteen } from '../models/index.js';

/**
 * Generate JWT tokens (for session management AFTER Firebase auth)
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
    firebaseUid: user.firebaseUid,
    role: user.role,
    canteenId: user.canteenId?.toString(),
    isApproved: user.isApproved,
    createdAt: user.createdAt
});

/**
 * Mask email for logging (e.g., j***@example.com)
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local[0] + '***' : local;
    return `${maskedLocal}@${domain}`;
};

/**
 * Signup with Email/Password
 * POST /api/auth/signup
 * 
 * FLOW:
 * 1. Receive Firebase ID token (already verified by middleware)
 * 2. Extract email and uid from token
 * 3. Check if email already exists
 * 4. Create new user with email as unique identifier
 * 5. Issue JWT tokens for session management
 * 
 * Headers: Authorization: Bearer <firebase_id_token>
 * Body: { name: string, phone: string, role?: 'student' | 'partner' }
 */
export const signup = async (req, res, next) => {
    try {
        const { name, phone, role = 'student' } = req.body;
        const { firebaseUser } = req;

        // Extract from verified Firebase token
        const email = firebaseUser.email;
        const firebaseUid = firebaseUser.uid;

        // Validate required fields
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Name is required (minimum 2 characters)',
                code: 'NAME_REQUIRED'
            });
        }

        // Email is REQUIRED
        if (!email) {
            console.error(`❌ SIGNUP BLOCKED: No email in Firebase token (uid: ${firebaseUid})`);
            return res.status(400).json({
                success: false,
                error: 'Email is required for signup',
                code: 'EMAIL_REQUIRED'
            });
        }

        // Phone number is REQUIRED
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required',
                code: 'PHONE_REQUIRED'
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

        console.log(`� SIGNUP ATTEMPT: ${maskEmail(email)} (Firebase UID: ${firebaseUid})`);

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log(`❌ SIGNUP BLOCKED: Email already registered: ${maskEmail(email)}`);
            return res.status(409).json({
                success: false,
                error: 'Email is already registered. Please login instead.',
                code: 'EMAIL_ALREADY_REGISTERED'
            });
        }

        // Check if Firebase UID already exists (prevent multiple accounts)
        const existingFirebaseUser = await User.findOne({ firebaseUid });
        if (existingFirebaseUser) {
            console.log(`❌ SIGNUP BLOCKED: Firebase UID already registered: ${firebaseUid}`);
            return res.status(409).json({
                success: false,
                error: 'This account is already registered. Please login instead.',
                code: 'FIREBASE_UID_ALREADY_REGISTERED'
            });
        }

        // Create user
        const userData = {
            name: name.trim(),
            email: email.toLowerCase(),
            phoneNumber: phoneNumber,
            firebaseUid: firebaseUid,
            role: ['student', 'partner'].includes(role) ? role : 'student',
            isApproved: role !== 'partner' // Partners need admin approval
        };

        const user = await User.create(userData);
        console.log(`✅ User created: ${maskEmail(email)} (ID: ${user._id}, Role: ${user.role})`);

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
        console.log(`🔑 Tokens issued for: ${maskEmail(email)}`);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: formatUserResponse(user),
                ...tokens
            }
        });
    } catch (error) {
        console.error('❌ SIGNUP ERROR:', error.message);
        next(error);
    }
};

/**
 * Login with Email/Password
 * POST /api/auth/login
 * 
 * FLOW:
 * 1. Receive Firebase ID token (already verified by middleware)
 * 2. Extract email from token
 * 3. Find user by email
 * 4. Issue JWT tokens for session management
 * 
 * Headers: Authorization: Bearer <firebase_id_token>
 */
export const login = async (req, res, next) => {
    try {
        const { firebaseUser } = req;

        // Extract from verified Firebase token
        const email = firebaseUser.email;
        const firebaseUid = firebaseUser.uid;

        // Email is REQUIRED
        if (!email) {
            console.error(`❌ LOGIN BLOCKED: No email in Firebase token (uid: ${firebaseUid})`);
            return res.status(400).json({
                success: false,
                error: 'Email is required for login',
                code: 'EMAIL_REQUIRED'
            });
        }

        console.log(`� LOGIN ATTEMPT: ${maskEmail(email)}`);

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log(`❌ LOGIN BLOCKED: User not found: ${maskEmail(email)}`);
            return res.status(404).json({
                success: false,
                error: 'No account found with this email. Please signup first.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            console.log(`❌ LOGIN BLOCKED: Account deactivated: ${maskEmail(email)}`);
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated. Please contact support.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Update Firebase UID if changed
        if (user.firebaseUid !== firebaseUid) {
            console.warn(`⚠️ Firebase UID mismatch for ${maskEmail(email)}: stored=${user.firebaseUid}, received=${firebaseUid}`);
            user.firebaseUid = firebaseUid;
            await user.save();
        }

        // Generate JWT tokens
        const tokens = await generateTokens(user);
        console.log(`✅ LOGIN SUCCESS: ${maskEmail(email)} (ID: ${user._id})`);

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
        const { name } = req.body;

        const updates = {};
        if (name && name.trim().length >= 2) {
            updates.name = name.trim();
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

export default {
    signup,
    login,
    refreshToken,
    logout,
    getMe,
    updateProfile,
    generateTokens,
    formatUserResponse
};
