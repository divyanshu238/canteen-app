/**
 * Firebase Configuration - Phone Authentication ONLY
 * 
 * CRITICAL: reCAPTCHA LIFECYCLE
 * - RecaptchaVerifier is created ONCE and stored on window
 * - NEVER clear or recreate the verifier
 * - The same verifier is reused for all OTP sends
 * - confirmationResult is stored on window for cross-page access
 * 
 * SECURITY:
 * - Uses Firebase Web SDK (NOT admin SDK)
 * - Invisible reCAPTCHA for bot protection
 * - Firebase ID tokens are used to authenticate with backend
 * - No tokens stored in localStorage
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type Auth,
    type ConfirmationResult,
    type User
} from 'firebase/auth';

// Extend Window interface for global state
declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier | null;
        confirmationResult: ConfirmationResult | null;
        recaptchaWidgetId: number | null;
    }
}

// Initialize global state
if (typeof window !== 'undefined') {
    window.recaptchaVerifier = window.recaptchaVerifier || null;
    window.confirmationResult = window.confirmationResult || null;
    window.recaptchaWidgetId = window.recaptchaWidgetId || null;
}

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required config
const validateConfig = (): boolean => {
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

    if (missing.length > 0) {
        console.error('❌ Missing Firebase config:', missing.join(', '));
        console.error('Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
        return false;
    }
    return true;
};

// Initialize Firebase - SINGLETON
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let isInitialized = false;

const initializeFirebase = (): boolean => {
    if (isInitialized) return auth !== null;

    isInitialized = true;

    if (!validateConfig()) {
        console.error('❌ Firebase NOT initialized - missing configuration');
        return false;
    }

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        console.log('✅ Firebase initialized for project:', firebaseConfig.projectId);
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
};

// Initialize on module load
initializeFirebase();

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth | null => {
    if (!auth) initializeFirebase();
    return auth;
};

/**
 * Check if Firebase is configured and ready
 */
export const isFirebaseReady = (): boolean => {
    return auth !== null;
};

/**
 * Setup invisible reCAPTCHA verifier - SINGLETON PATTERN
 * 
 * CRITICAL: This function:
 * - Creates the verifier ONLY if it doesn't exist
 * - NEVER clears or recreates an existing verifier
 * - Returns existing verifier if already initialized
 * 
 * @param containerId - DOM element ID for reCAPTCHA widget
 * @returns Promise<boolean> - true if verifier is ready
 */
export const setupRecaptcha = async (containerId: string): Promise<boolean> => {
    // Already initialized - reuse existing
    if (window.recaptchaVerifier) {
        console.log('✅ reCAPTCHA already initialized, reusing');
        return true;
    }

    if (!auth) {
        console.error('❌ Firebase auth not initialized');
        return false;
    }

    // Check if container exists in DOM
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ reCAPTCHA container #${containerId} not found in DOM`);
        return false;
    }

    try {
        console.log('🔄 Initializing reCAPTCHA verifier...');

        const verifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
                console.log('✅ reCAPTCHA solved successfully');
            },
            'expired-callback': () => {
                console.log('⚠️ reCAPTCHA expired - will auto-refresh on next use');
                // DO NOT clear or recreate - Firebase handles refresh automatically
            }
        });

        // Render the reCAPTCHA widget
        const widgetId = await verifier.render();
        console.log('✅ reCAPTCHA rendered with widget ID:', widgetId);

        // Store globally - NEVER clear this
        window.recaptchaVerifier = verifier;
        window.recaptchaWidgetId = widgetId;

        return true;
    } catch (error: any) {
        console.error('❌ reCAPTCHA setup failed:', error);

        // Check for common errors
        if (error.code === 'auth/argument-error') {
            console.error('Invalid container element');
        } else if (error.message?.includes('reCAPTCHA')) {
            console.error('reCAPTCHA configuration error - check Firebase Console');
        }

        return false;
    }
};

/**
 * Get the global RecaptchaVerifier
 * Returns null if not initialized
 */
export const getRecaptchaVerifier = (): RecaptchaVerifier | null => {
    return window.recaptchaVerifier;
};

/**
 * Check if reCAPTCHA is ready
 */
export const isRecaptchaReady = (): boolean => {
    return window.recaptchaVerifier !== null;
};

/**
 * Send OTP to phone number
 * 
 * @param phoneNumber - Phone number with country code (e.g., +919876543210)
 * @returns ConfirmationResult for OTP verification
 */
export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
    if (!auth) {
        throw new Error('Firebase auth not initialized');
    }

    if (!window.recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized. Please refresh the page.');
    }

    // Phone number is already formatted to E.164 by auth.service
    const formattedPhone = phoneNumber;

    console.log(`📱 Sending OTP to ${formattedPhone.slice(0, 3)}****${formattedPhone.slice(-4)}`);

    try {
        const confirmationResult = await signInWithPhoneNumber(
            auth,
            formattedPhone,
            window.recaptchaVerifier
        );

        // Store globally for cross-page access
        window.confirmationResult = confirmationResult;

        console.log('✅ OTP sent successfully');
        return confirmationResult;
    } catch (error: any) {
        console.error('❌ OTP send failed:', error.code, error.message);

        // DO NOT clear reCAPTCHA on error - it can be reused
        // Firebase will handle token refresh automatically

        throw error;
    }
};

/**
 * Get stored confirmation result
 */
export const getConfirmationResult = (): ConfirmationResult | null => {
    return window.confirmationResult;
};

/**
 * Verify OTP and get Firebase user
 * 
 * @param otp - 6-digit OTP code
 * @param confirmationResult - Optional, uses global if not provided
 * @returns Firebase User
 */
export const verifyOTP = async (
    otp: string,
    confirmationResult?: ConfirmationResult
): Promise<User> => {
    const result = confirmationResult || window.confirmationResult;

    if (!result) {
        throw new Error('No OTP session found. Please request a new code.');
    }

    console.log('🔐 Verifying OTP...');

    try {
        const userCredential = await result.confirm(otp);
        console.log('✅ OTP verified successfully');

        // Clear confirmation result after successful verification
        window.confirmationResult = null;

        return userCredential.user;
    } catch (error: any) {
        console.error('❌ OTP verification failed:', error.code, error.message);
        throw error;
    }
};

/**
 * Get Firebase ID token for backend authentication
 * 
 * @param forceRefresh - Force refresh the token
 * @returns Firebase ID token string
 */
export const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
    if (!auth?.currentUser) {
        console.error('No authenticated user');
        return null;
    }

    try {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        return token;
    } catch (error) {
        console.error('❌ Failed to get ID token:', error);
        return null;
    }
};

/**
 * Sign out from Firebase
 * NOTE: Does NOT clear reCAPTCHA - it can be reused for next login
 */
export const firebaseSignOut = async (): Promise<void> => {
    if (!auth) return;

    try {
        await auth.signOut();
        window.confirmationResult = null;
        console.log('✅ Firebase sign out successful');
    } catch (error) {
        console.error('❌ Firebase sign out failed:', error);
    }
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = (): User | null => {
    return auth?.currentUser || null;
};

/**
 * Check if there's an active OTP session
 */
export const hasActiveOTPSession = (): boolean => {
    return window.confirmationResult !== null;
};

// Export types
export type { ConfirmationResult, RecaptchaVerifier, User as FirebaseUser };

// Export instances
export { auth, app };
