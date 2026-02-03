/**
 * Firebase Admin Configuration
 * 
 * SECURITY-CRITICAL: Initializes Firebase Admin SDK for ID token verification
 * 
 * FAIL-FAST BEHAVIOR:
 * - In production: Server MUST NOT start if Firebase config is invalid
 * - In development: Warnings are logged but server continues
 * 
 * Required Environment Variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (with newlines preserved)
 */

import admin from 'firebase-admin';

let firebaseApp = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * 
 * Call this ONCE during server startup.
 * In production, this will throw if configuration is invalid.
 */
export const initializeFirebase = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Check required environment variables
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        const errorMsg = `Missing required Firebase environment variables: ${missingVars.join(', ')}`;
        console.error(`❌ FIREBASE CONFIG ERROR: ${errorMsg}`);

        if (isProduction) {
            console.error('   FATAL: Cannot start server without valid Firebase configuration');
            process.exit(1);
        }

        console.warn('⚠️  Firebase will not be available (development mode)');
        return false;
    }

    try {
        // Parse private key (handle escaped newlines from environment variables)
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

        // Validate private key format
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('FIREBASE_PRIVATE_KEY does not contain a valid PEM-formatted private key');
        }

        // Initialize Firebase Admin
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });

        isInitialized = true;
        console.log('✅ Firebase Admin SDK initialized');
        console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`);
        console.log(`   Service Account: ${process.env.FIREBASE_CLIENT_EMAIL.slice(0, 10)}...`);

        return true;
    } catch (error) {
        console.error('❌ FIREBASE INITIALIZATION FAILED:', error.message);

        if (isProduction) {
            console.error('   FATAL: Cannot start server without valid Firebase configuration');
            process.exit(1);
        }

        console.warn('⚠️  Firebase will not be available (development mode)');
        return false;
    }
};

/**
 * Verify Firebase ID Token
 * 
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<{success: boolean, decodedToken?: object, error?: string}>}
 */
export const verifyIdToken = async (idToken) => {
    if (!isInitialized) {
        return {
            success: false,
            error: 'Firebase is not initialized'
        };
    }

    if (!idToken) {
        return {
            success: false,
            error: 'ID token is required'
        };
    }

    try {
        // Verify the ID token
        // checkRevoked: true ensures token hasn't been revoked
        const decodedToken = await admin.auth().verifyIdToken(idToken, true);

        // Log successful verification (without sensitive data)
        console.log(`✅ Firebase token verified: uid=${decodedToken.uid}`);

        return {
            success: true,
            decodedToken
        };
    } catch (error) {
        console.error('❌ Firebase token verification failed:', error.message);
        console.error(`   Code: ${error.code || 'N/A'}`);

        // Map Firebase error codes to user-friendly messages
        let userMessage = 'Invalid or expired authentication token';

        if (error.code === 'auth/id-token-expired') {
            userMessage = 'Authentication token has expired. Please sign in again.';
        } else if (error.code === 'auth/id-token-revoked') {
            userMessage = 'Authentication token has been revoked. Please sign in again.';
        } else if (error.code === 'auth/argument-error') {
            userMessage = 'Invalid authentication token format.';
        }

        return {
            success: false,
            error: userMessage,
            code: error.code
        };
    }
};

/**
 * Get Firebase Auth instance
 * Use for advanced operations like revoking refresh tokens
 */
export const getFirebaseAuth = () => {
    if (!isInitialized) {
        throw new Error('Firebase is not initialized');
    }
    return admin.auth();
};

/**
 * Check if Firebase is initialized
 */
export const isFirebaseReady = () => isInitialized;

export default {
    initializeFirebase,
    verifyIdToken,
    getFirebaseAuth,
    isFirebaseReady
};
