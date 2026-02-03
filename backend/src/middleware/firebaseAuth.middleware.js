/**
 * Firebase Authentication Middleware
 * 
 * SECURITY-CRITICAL: Verifies Firebase ID tokens for protected routes
 * 
 * This middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token with Firebase Admin SDK
 * 3. Attaches decoded user info to req.firebaseUser
 * 
 * Use this middleware BEFORE any route that requires Firebase authentication.
 */

import { verifyIdToken, isFirebaseReady } from '../config/firebase.js';

/**
 * Verify Firebase ID Token Middleware
 * 
 * Expects: Authorization: Bearer <firebase_id_token>
 * 
 * On success:
 * - req.firebaseUser = decoded token (contains uid, phone_number, etc.)
 * 
 * On failure:
 * - 401 Unauthorized with error message
 */
export const verifyFirebaseToken = async (req, res, next) => {
    // Check if Firebase is ready
    if (!isFirebaseReady()) {
        console.error('❌ Firebase middleware called but Firebase is not initialized');
        return res.status(503).json({
            success: false,
            error: 'Authentication service unavailable',
            code: 'AUTH_SERVICE_UNAVAILABLE'
        });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Authorization header is required',
            code: 'AUTH_HEADER_MISSING'
        });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization header must use Bearer scheme',
            code: 'INVALID_AUTH_SCHEME'
        });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!idToken || idToken.trim() === '') {
        return res.status(401).json({
            success: false,
            error: 'Firebase ID token is required',
            code: 'TOKEN_MISSING'
        });
    }

    // Verify token with Firebase
    const result = await verifyIdToken(idToken);

    if (!result.success) {
        return res.status(401).json({
            success: false,
            error: result.error,
            code: result.code || 'TOKEN_INVALID'
        });
    }

    // Attach decoded token to request
    req.firebaseUser = result.decodedToken;

    // Log authentication (without sensitive data)
    console.log(`🔐 Firebase auth: uid=${result.decodedToken.uid}, phone=${result.decodedToken.phone_number || 'N/A'}`);

    next();
};

/**
 * Extract phone number from Firebase token
 * 
 * Utility middleware to require phone number in token
 */
export const requirePhoneNumber = (req, res, next) => {
    if (!req.firebaseUser) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    const phoneNumber = req.firebaseUser.phone_number;

    if (!phoneNumber) {
        console.error(`❌ Firebase token missing phone_number: uid=${req.firebaseUser.uid}`);
        return res.status(400).json({
            success: false,
            error: 'Phone number is required for authentication',
            code: 'PHONE_NUMBER_REQUIRED'
        });
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number format',
            code: 'INVALID_PHONE_FORMAT'
        });
    }

    next();
};

export default {
    verifyFirebaseToken,
    requirePhoneNumber
};
