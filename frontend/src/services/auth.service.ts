/**
 * Authentication Service - Email/Password Authentication
 * 
 * NO OTP. NO reCAPTCHA. NO Phone Verification.
 * 
 * Simple email + password flow:
 * 1. User enters email + password
 * 2. Firebase creates/authenticates user
 * 3. Get Firebase ID token
 * 4. Send token to backend with user details
 * 5. Backend creates/returns user and issues JWT
 */

import axios from 'axios';
import config from '../config';
import {
    signUpWithEmail,
    signInWithEmail,
    isFirebaseReady,
    firebaseSignOut
} from '../firebase';

// Types
export interface AuthUser {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: 'student' | 'partner' | 'admin';
    canteenId?: string;
    isApproved?: boolean;
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
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
    return isFirebaseReady();
};

/**
 * Map Firebase error codes to user-friendly messages
 */
const mapFirebaseError = (error: any): string => {
    const errorCode = error.code || 'unknown';

    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please signup first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return error.message || 'Authentication failed. Please try again.';
    }
};

/**
 * Sign up with email and password
 * 
 * @param email - User email
 * @param password - User password
 * @param name - User full name
 * @param phone - User phone number (stored only, not verified)
 * @param role - User role (student or partner)
 */
export const signupWithEmailPassword = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: 'student' | 'partner' = 'student'
): Promise<{
    success: boolean;
    data?: AuthResponse['data'];
    error?: string;
}> => {
    try {
        // Validate inputs
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        if (!name || name.trim().length < 2) {
            return { success: false, error: 'Name must be at least 2 characters' };
        }

        if (!phone || phone.replace(/\D/g, '').length < 10) {
            return { success: false, error: 'Please enter a valid phone number' };
        }

        // Create Firebase user
        const userCredential = await signUpWithEmail(email, password);

        // Get Firebase ID token
        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
            return { success: false, error: 'Failed to get authentication token' };
        }

        // Format phone number
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;

        // Call backend to create user
        const backendUrl = config.apiUrl;
        const response = await axios.post<AuthResponse>(
            `${backendUrl}/api/auth/signup`,
            {
                name: name.trim(),
                phone: formattedPhone,
                role
            },
            {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Signup successful');
        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('❌ Signup failed:', error);

        // Handle Firebase errors
        if (error.code?.startsWith('auth/')) {
            return { success: false, error: mapFirebaseError(error) };
        }

        // Handle backend errors
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Signup failed. Please try again.'
        };
    }
};

/**
 * Login with email and password
 * 
 * @param email - User email
 * @param password - User password
 */
export const loginWithEmailPassword = async (
    email: string,
    password: string
): Promise<{
    success: boolean;
    data?: AuthResponse['data'];
    error?: string;
}> => {
    try {
        // Validate inputs
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        if (!password) {
            return { success: false, error: 'Password is required' };
        }

        // Sign in with Firebase
        const userCredential = await signInWithEmail(email, password);

        // Get Firebase ID token
        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
            return { success: false, error: 'Failed to get authentication token' };
        }

        // Call backend to login
        const backendUrl = config.apiUrl;
        const response = await axios.post<AuthResponse>(
            `${backendUrl}/api/auth/login`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Login successful');
        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('❌ Login failed:', error);

        // Handle Firebase errors
        if (error.code?.startsWith('auth/')) {
            return { success: false, error: mapFirebaseError(error) };
        }

        // Handle backend errors
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Login failed. Please try again.'
        };
    }
};

/**
 * Sign out and clear session
 */
export const signOut = async (): Promise<void> => {
    await firebaseSignOut();
};

export default {
    isFirebaseConfigured,
    signupWithEmailPassword,
    loginWithEmailPassword,
    signOut
};
