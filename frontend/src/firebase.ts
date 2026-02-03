/**
 * Firebase Configuration - Phone Authentication ONLY
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
        console.error('Please set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
        return false;
    }
    return true;
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (validateConfig()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase initialized for project:', firebaseConfig.projectId);
} else {
    console.error('❌ Firebase NOT initialized - missing configuration');
}

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth | null => auth;

/**
 * Setup invisible reCAPTCHA verifier
 * Must be called before sending OTP
 */
export const setupRecaptcha = (containerId: string): RecaptchaVerifier | null => {
    if (!auth) {
        console.error('Firebase auth not initialized');
        return null;
    }

    try {
        const verifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
                console.log('✅ reCAPTCHA solved');
            },
            'expired-callback': () => {
                console.log('⚠️ reCAPTCHA expired');
            }
        });
        return verifier;
    } catch (error) {
        console.error('❌ Failed to setup reCAPTCHA:', error);
        return null;
    }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number with country code (e.g., +919876543210)
 * @param recaptchaVerifier - reCAPTCHA verifier instance
 * @returns ConfirmationResult for OTP verification
 */
export const sendOTP = async (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
    if (!auth) {
        throw new Error('Firebase auth not initialized');
    }

    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    console.log(`📱 Sending OTP to ${formattedPhone.slice(0, 3)}****${formattedPhone.slice(-4)}`);

    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log('✅ OTP sent successfully');

    return confirmationResult;
};

/**
 * Verify OTP and get Firebase user
 * @param confirmationResult - ConfirmationResult from sendOTP
 * @param otp - 6-digit OTP code
 * @returns Firebase User
 */
export const verifyOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
): Promise<User> => {
    if (!auth) {
        throw new Error('Firebase auth not initialized');
    }

    console.log('🔐 Verifying OTP...');
    const result = await confirmationResult.confirm(otp);
    console.log('✅ OTP verified successfully');

    return result.user;
};

/**
 * Get Firebase ID token for backend authentication
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
 */
export const firebaseSignOut = async (): Promise<void> => {
    if (!auth) return;

    try {
        await auth.signOut();
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

// Export types
export type { ConfirmationResult, RecaptchaVerifier, User as FirebaseUser };

export { auth, app };
