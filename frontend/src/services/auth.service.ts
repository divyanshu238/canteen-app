/**
 * Authentication Service - Firebase Phone OTP Integration
 * 
 * FLOW:
 * 1. User enters phone number
 * 2. Firebase sends OTP (invisible reCAPTCHA)
 * 3. User enters OTP
 * 4. Firebase verifies OTP
 * 5. Get Firebase ID token
 * 6. Send token to backend for signup/login
 * 7. Backend verifies token and issues JWT
 * 
 * SECURITY:
 * - Firebase tokens NOT stored in localStorage
 * - Only backend-issued JWTs are stored
 * - Automatic token refresh handling
 */

import axios from 'axios';
import config from '../config';
import {
    setupRecaptcha,
    sendOTP,
    verifyOTP,
    getIdToken,
    firebaseSignOut,
    getFirebaseAuth,
    type ConfirmationResult,
    type RecaptchaVerifier
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

// State management for OTP flow
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA for phone authentication
 * Must be called before sending OTP
 */
export const initializeRecaptcha = (containerId: string): boolean => {
    try {
        // Clear existing verifier if any
        if (recaptchaVerifier) {
            try {
                recaptchaVerifier.clear();
            } catch {
                // Ignore clear errors
            }
        }

        recaptchaVerifier = setupRecaptcha(containerId);
        return recaptchaVerifier !== null;
    } catch (error) {
        console.error('Failed to initialize reCAPTCHA:', error);
        return false;
    }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number with or without country code
 * @returns Success status
 */
export const requestOTP = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!recaptchaVerifier) {
            return { success: false, error: 'reCAPTCHA not initialized. Please refresh the page.' };
        }

        // Format phone number (add +91 if no country code)
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '')}`;

        // Validate phone number format
        if (!/^\+\d{10,15}$/.test(formattedPhone)) {
            return { success: false, error: 'Please enter a valid phone number' };
        }

        confirmationResult = await sendOTP(formattedPhone, recaptchaVerifier);
        return { success: true };
    } catch (error: any) {
        console.error('OTP send failed:', error);

        // Handle specific Firebase errors
        const errorCode = error.code || '';
        let errorMessage = 'Failed to send OTP. Please try again.';

        if (errorCode === 'auth/invalid-phone-number') {
            errorMessage = 'Invalid phone number format. Please include country code.';
        } else if (errorCode === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
        } else if (errorCode === 'auth/captcha-check-failed') {
            errorMessage = 'Security verification failed. Please refresh and try again.';
        } else if (errorCode === 'auth/quota-exceeded') {
            errorMessage = 'SMS quota exceeded. Please try again later.';
        }

        // Reset reCAPTCHA on error
        if (recaptchaVerifier) {
            try {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            } catch {
                // Ignore
            }
        }

        return { success: false, error: errorMessage };
    }
};

/**
 * Verify OTP and authenticate with backend
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
): Promise<{ success: boolean; data?: AuthResponse['data']; error?: string; code?: string }> => {
    try {
        if (!confirmationResult) {
            return { success: false, error: 'OTP session expired. Please request a new code.' };
        }

        // Verify OTP with Firebase
        const user = await verifyOTP(confirmationResult, otp);

        // Get Firebase ID token
        const idToken = await user.getIdToken();

        if (!idToken) {
            return { success: false, error: 'Failed to get authentication token' };
        }

        // Call backend API
        const endpoint = action === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const backendUrl = config.apiUrl;

        const requestBody: { name?: string; role?: string } = {};
        if (action === 'signup') {
            if (!name || name.trim().length < 2) {
                return { success: false, error: 'Name is required (minimum 2 characters)' };
            }
            requestBody.name = name.trim();
            if (role) {
                requestBody.role = role;
            }
        }

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

        // Clear confirmation result after successful auth
        confirmationResult = null;

        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('OTP verification failed:', error);

        // Handle Firebase errors
        if (error.code) {
            const errorCode = error.code;
            let errorMessage = 'Verification failed. Please try again.';

            if (errorCode === 'auth/invalid-verification-code') {
                errorMessage = 'Invalid OTP. Please check and try again.';
            } else if (errorCode === 'auth/code-expired') {
                errorMessage = 'OTP has expired. Please request a new code.';
            } else if (errorCode === 'auth/session-expired') {
                errorMessage = 'Session expired. Please request a new OTP.';
            }

            return { success: false, error: errorMessage };
        }

        // Handle backend errors
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Authentication failed',
            code: errorResponse?.code
        };
    }
};

/**
 * Sign out from Firebase and clear state
 */
export const signOut = async (): Promise<void> => {
    confirmationResult = null;
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch {
            // Ignore
        }
        recaptchaVerifier = null;
    }
    await firebaseSignOut();
};

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
    return getFirebaseAuth() !== null;
};

/**
 * Get current confirmation result (for state checks)
 */
export const hasActiveOTPSession = (): boolean => {
    return confirmationResult !== null;
};

/**
 * Clear OTP session without signing out
 */
export const clearOTPSession = (): void => {
    confirmationResult = null;
};

export default {
    initializeRecaptcha,
    requestOTP,
    verifyOTPAndAuthenticate,
    signOut,
    isFirebaseConfigured,
    hasActiveOTPSession,
    clearOTPSession
};
