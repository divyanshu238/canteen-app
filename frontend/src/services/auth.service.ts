/**
 * Authentication Service - Firebase Phone OTP Integration
 * 
 * CRITICAL ARCHITECTURE:
 * - Uses global RecaptchaVerifier from firebase.ts (stored on window)
 * - NEVER creates or clears reCAPTCHA - only accesses the global instance
 * - confirmationResult stored on window for cross-page persistence
 * 
 * FLOW:
 * 1. User enters phone number
 * 2. Firebase sends OTP (using global invisible reCAPTCHA)
 * 3. User enters OTP
 * 4. Firebase verifies OTP
 * 5. Get Firebase ID token
 * 6. Send token to backend for signup/login
 * 7. Backend verifies token and issues JWT
 * 
 * SECURITY:
 * - Firebase tokens NOT stored in localStorage
 * - Only backend-issued JWTs are stored
 */

import axios from 'axios';
import config from '../config';
import {
    setupRecaptcha,
    sendOTP as firebaseSendOTP,
    verifyOTP as firebaseVerifyOTP,
    isFirebaseReady,
    isRecaptchaReady,
    hasActiveOTPSession as checkActiveSession,
    firebaseSignOut,
    type ConfirmationResult
} from '../firebase';

// Types
export interface AuthUser {
    id: string;
    name: string;
    phoneNumber: string;
    role: 'student' | 'partner' | 'admin';
    canteenId?: string;
    isApproved?: boolean;
    isPhoneVerified?: boolean;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    data: {
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
    };
}

export interface AuthError {
    success: false;
    error: string;
    code?: string;
}

/**
 * Initialize reCAPTCHA for phone authentication
 * This is a wrapper that delegates to the global singleton in firebase.ts
 * 
 * IMPORTANT: Can be called multiple times safely - only initializes once
 * 
 * @param containerId - DOM element ID for reCAPTCHA widget
 * @returns Promise<boolean> - true if ready
 */
export const initializeRecaptcha = async (containerId: string): Promise<boolean> => {
    // Already initialized
    if (isRecaptchaReady()) {
        console.log('✅ reCAPTCHA already ready');
        return true;
    }

    // Check if Firebase is ready
    if (!isFirebaseReady()) {
        console.error('❌ Firebase not configured');
        return false;
    }

    // Initialize the global reCAPTCHA
    return await setupRecaptcha(containerId);
};

/**
 * Check if reCAPTCHA is ready for use
 */
export const isRecaptchaInitialized = (): boolean => {
    return isRecaptchaReady();
};

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
    return isFirebaseReady();
};

/**
 * Send OTP to phone number
 * 
 * FLOW:
 * 1. Validate phone number format
 * 2. Use global reCAPTCHA verifier (NEVER create new one)
 * 3. Call Firebase signInWithPhoneNumber
 * 4. Store confirmationResult globally
 * 
 * @param phoneNumber - Phone number (with or without +91)
 * @returns Success status with optional error message
 */
export const requestOTP = async (
    phoneNumber: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Check reCAPTCHA is ready
        if (!isRecaptchaReady()) {
            console.error('❌ reCAPTCHA not initialized');
            return {
                success: false,
                error: 'Security verification not ready. Please refresh the page.'
            };
        }

        // Format phone number (E.164)
        // 1. Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // 2. Handle country code
        // If user typed 919876543210 (12 digits starting with 91), assume it's already got country code
        // If user typed 9876543210 (10 digits), add 91
        let formattedPhone = `+${cleaned}`;
        if (cleaned.length === 10) {
            formattedPhone = `+91${cleaned}`;
        } else if (cleaned.length > 10 && !cleaned.startsWith('91')) {
            // Heuristic: If >10 digits and doesn't start with 91, assume user might have typed 0 or other prefix? 
            // Ideally we just trust the input if it looks like a full number, but for this app context (+91 specific), 
            // let's ensure it starts with 91 if it's 12 digits.
            // Actually, safest is: if < 10 digits, invalid. If 10, add +91. If > 10, assume it includes CC.
            formattedPhone = `+${cleaned}`;
        }

        // CORRECTION: The simple consistent logic for India context:
        // Remove spaces/dashes. If it starts with +, keep it.
        // If it starts with 0, remove 0.
        // If length is 10, add +91.

        let digits = phoneNumber.replace(/[^0-9+]/g, ''); // Keep + and digits
        if (digits.startsWith('0')) digits = digits.slice(1); // Remove leading 0

        if (!digits.startsWith('+')) {
            if (digits.length === 10) {
                digits = `+91${digits}`;
            } else if (digits.startsWith('91') && digits.length === 12) {
                digits = `+${digits}`;
            } else {
                digits = `+91${digits}`; // Fallback, let Firebase validate
            }
        }

        const finalPhone = digits;

        // Validate phone number format (E.164 simple check)
        if (!/^\+\d{10,15}$/.test(finalPhone)) {
            return {
                success: false,
                error: `Invalid phone number format: ${finalPhone}`
            };
        }

        // Send OTP using global reCAPTCHA verifier
        await firebaseSendOTP(finalPhone);

        return { success: true };
    } catch (error: any) {
        console.error('❌ OTP send failed:', error);

        // Map Firebase error codes to user-friendly messages
        const errorCode = error.code || 'unknown';
        const rawMessage = error.message || 'Unknown error';
        let errorMessage = `Failed to send OTP (${errorCode})`;

        switch (errorCode) {
            case 'auth/invalid-phone-number':
                errorMessage = 'Invalid phone number format.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many attempts. Please wait a few minutes.';
                break;
            case 'auth/captcha-check-failed':
                errorMessage = 'Security check failed. Please refresh the page.';
                break;
            case 'auth/quota-exceeded':
                errorMessage = 'SMS quota exceeded. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'auth/internal-error':
                errorMessage = 'Service temporarily unavailable. Please try again.';
                break;
            case 'auth/billing-not-enabled':
                errorMessage = 'System configuration error (Billing).';
                break;
            default:
                if (rawMessage.includes('reCAPTCHA')) {
                    errorMessage = 'Security verification failed. Please refresh.';
                } else {
                    errorMessage = `Error: ${rawMessage} (${errorCode})`;
                }
        }

        // DO NOT clear reCAPTCHA on error - let user retry
        return { success: false, error: errorMessage };
    }
};

/**
 * Verify OTP and authenticate with backend
 * 
 * FLOW:
 * 1. Verify OTP with Firebase (uses global confirmationResult)
 * 2. Get Firebase ID token
 * 3. Send token to backend for signup/login
 * 4. Return backend JWT for session management
 * 
 * @param otp - 6-digit OTP code
 * @param action - 'signup' or 'login'
 * @param name - User name (required for signup)
 * @param role - User role (optional, for signup)
 */
export const verifyOTPAndAuthenticate = async (
    otp: string,
    action: 'signup' | 'login',
    name?: string,
    role?: 'student' | 'partner'
): Promise<{
    success: boolean;
    data?: AuthResponse['data'];
    error?: string;
    code?: string
}> => {
    try {
        // Validate OTP format
        if (!/^\d{6}$/.test(otp)) {
            return { success: false, error: 'Please enter a valid 6-digit code' };
        }

        // Check for active OTP session
        if (!checkActiveSession()) {
            return {
                success: false,
                error: 'OTP session expired. Please request a new code.'
            };
        }

        // Verify OTP with Firebase
        const firebaseUser = await firebaseVerifyOTP(otp);

        // Get Firebase ID token
        const idToken = await firebaseUser.getIdToken();
        if (!idToken) {
            return { success: false, error: 'Failed to get authentication token' };
        }

        // Prepare backend request
        const endpoint = action === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const backendUrl = config.apiUrl;

        const requestBody: { name?: string; role?: string } = {};
        if (action === 'signup') {
            if (!name || name.trim().length < 2) {
                return {
                    success: false,
                    error: 'Name is required (minimum 2 characters)'
                };
            }
            requestBody.name = name.trim();
            if (role) {
                requestBody.role = role;
            }
        }

        // Call backend with Firebase ID token
        const response = await axios.post<AuthResponse>(
            `${backendUrl}${endpoint}`,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Backend authentication successful');

        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('❌ Authentication failed:', error);

        // Handle Firebase errors
        if (error.code) {
            const errorCode = error.code;
            let errorMessage = 'Verification failed. Please try again.';

            switch (errorCode) {
                case 'auth/invalid-verification-code':
                    errorMessage = 'Invalid OTP. Please check and try again.';
                    break;
                case 'auth/code-expired':
                    errorMessage = 'OTP has expired. Please request a new code.';
                    break;
                case 'auth/session-expired':
                    errorMessage = 'Session expired. Please request a new OTP.';
                    break;
            }

            return { success: false, error: errorMessage };
        }

        // Handle backend errors
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Authentication failed. Please try again.',
            code: errorResponse?.code
        };
    }
};

/**
 * Check if there's an active OTP session
 */
export const hasActiveOTPSession = (): boolean => {
    return checkActiveSession();
};

/**
 * Sign out and clear session
 * NOTE: Does NOT clear reCAPTCHA - it persists for next login
 */
export const signOut = async (): Promise<void> => {
    await firebaseSignOut();
};

export default {
    initializeRecaptcha,
    isRecaptchaInitialized,
    isFirebaseConfigured,
    requestOTP,
    verifyOTPAndAuthenticate,
    hasActiveOTPSession,
    signOut
};
