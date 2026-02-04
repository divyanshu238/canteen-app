/**
 * Authentication Service - Classic Email/Password Auth
 * 
 * NO Firebase. NO OTP. NO third-party auth.
 * Simple API calls to backend with JWT authentication.
 */

import axios from 'axios';
import config from '../config';

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
 * Register a new user
 * 
 * @param name - User's full name
 * @param email - User's email
 * @param phone - User's phone number (stored only, not verified)
 * @param password - User's password
 * @param role - User role (student or partner)
 */
export const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: 'student' | 'partner' = 'student'
): Promise<{
    success: boolean;
    data?: AuthResponse['data'];
    error?: string;
}> => {
    try {
        // Validate inputs
        if (!name || name.trim().length < 2) {
            return { success: false, error: 'Name must be at least 2 characters' };
        }

        if (!email || !email.includes('@')) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        if (!phone || phone.replace(/\D/g, '').length < 10) {
            return { success: false, error: 'Please enter a valid phone number' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        // Format phone number
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;

        // Call backend register endpoint
        const response = await axios.post<AuthResponse>(
            `${config.apiUrl}/api/auth/register`,
            {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                phone: formattedPhone,
                password,
                role
            }
        );

        console.log('✅ Registration successful');
        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('❌ Registration failed:', error);
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Registration failed. Please try again.'
        };
    }
};

/**
 * Login with email and password
 * 
 * @param email - User's email
 * @param password - User's password
 */
export const login = async (
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

        // Call backend login endpoint
        const response = await axios.post<AuthResponse>(
            `${config.apiUrl}/api/auth/login`,
            {
                email: email.toLowerCase().trim(),
                password
            }
        );

        console.log('✅ Login successful');
        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('❌ Login failed:', error);
        const errorResponse = error.response?.data as AuthError | undefined;
        return {
            success: false,
            error: errorResponse?.error || 'Invalid email or password.'
        };
    }
};

/**
 * Logout - Clear local storage
 */
export const logout = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('✅ Logged out');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('accessToken');
};

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

export default {
    register,
    login,
    logout,
    isAuthenticated,
    getAccessToken
};
