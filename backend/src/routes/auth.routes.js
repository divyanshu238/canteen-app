/**
 * Authentication Routes - Classic Email/Password Auth
 * 
 * NO Firebase. NO OTP. NO third-party auth.
 * Simple email + password authentication using bcrypt and JWT.
 */

import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with email/password
 * @access  Public
 * @body    { name, email, phone, password, role? }
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/signup
 * @desc    Alias for register (backward compatibility)
 * @access  Public
 */
router.post('/signup', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/password
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (optional)
 * @body    { refreshToken?, logoutAll? }
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
 * @body    { name? }
 */
router.put('/profile', authenticate, authController.updateProfile);

export default router;
