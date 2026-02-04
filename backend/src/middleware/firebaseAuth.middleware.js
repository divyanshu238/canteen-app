/**
 * Firebase Authentication Middleware - EMAIL/PASSWORD
 * 
 * NO OTP. NO Phone Verification. NO reCAPTCHA.
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
 * - req.firebaseUser = decoded token (contains uid, email, etc.)
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
    const email = result.decodedToken.email || 'N/A';
    const maskedEmail = email !== 'N/A' && email.includes('@')
        ? email[0] + '***@' + email.split('@')[1]
        : email;
    console.log(`🔐 Firebase auth: uid=${result.decodedToken.uid}, email=${maskedEmail}`);

    next();
};

/**
 * Require email in Firebase token
 * 
 * Use after verifyFirebaseToken to ensure email is present
 */
export const requireEmail = (req, res, next) => {
    if (!req.firebaseUser) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    const email = req.firebaseUser.email;

    if (!email) {
        console.error(`❌ Firebase token missing email: uid=${req.firebaseUser.uid}`);
        return res.status(400).json({
            success: false,
            error: 'Email is required for authentication',
            code: 'EMAIL_REQUIRED'
        });
    }

    // Basic email format validation
    if (!email.includes('@')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT'
        });
    }

    next();
};

// Legacy export for compatibility (no longer checks phone)
export const requirePhoneNumber = (req, res, next) => {
    // Phone number is no longer required for authentication
    // This function exists for backward compatibility
    next();
};

export default {
    verifyFirebaseToken,
    requireEmail,
    requirePhoneNumber
};
