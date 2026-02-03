/**
 * Authentication Routes - FIREBASE PHONE OTP ONLY
 * 
 * All phone OTP verification is handled by Firebase.
 * Backend only verifies Firebase ID tokens.
 */

import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { verifyFirebaseToken, requirePhoneNumber } from '../middleware/firebaseAuth.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with Firebase Phone OTP
 * @access  Public (requires Firebase ID token)
 * @header  Authorization: Bearer <firebase_id_token>
 * @body    { name: string, role?: 'student' | 'partner' }
 */
router.post('/signup',
    verifyFirebaseToken,
    requirePhoneNumber,
    authController.signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with Firebase Phone OTP
 * @access  Public (requires Firebase ID token)
 * @header  Authorization: Bearer <firebase_id_token>
 */
router.post('/login',
    verifyFirebaseToken,
    requirePhoneNumber,
    authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (optional)
 * @body    { refreshToken?: string, logoutAll?: boolean }
 */
router.post('/logout', optionalAuth, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { name?: string }
 */
router.put('/profile', authenticate, authController.updateProfile);

export default router;
