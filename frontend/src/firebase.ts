/**
 * Firebase Configuration - Email/Password Authentication
 * 
 * NO OTP. NO reCAPTCHA. NO Phone Authentication.
 * 
 * Simple email + password authentication using Firebase Auth.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOutMethod,
    type Auth,
    type User,
    type UserCredential
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
 * Sign up with email and password
 * 
 * @param email - User email
 * @param password - User password
 * @returns UserCredential with Firebase user
 */
export const signUpWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    if (!auth) {
        throw new Error('Firebase auth not initialized');
    }

    console.log(`📧 Creating account for ${email.slice(0, 3)}***`);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ Account created successfully');
        return userCredential;
    } catch (error: any) {
        console.error('❌ Signup failed:', error.code, error.message);
        throw error;
    }
};

/**
 * Sign in with email and password
 * 
 * @param email - User email
 * @param password - User password
 * @returns UserCredential with Firebase user
 */
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    if (!auth) {
        throw new Error('Firebase auth not initialized');
    }

    console.log(`📧 Signing in ${email.slice(0, 3)}***`);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Login successful');
        return userCredential;
    } catch (error: any) {
        console.error('❌ Login failed:', error.code, error.message);
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
 */
export const firebaseSignOut = async (): Promise<void> => {
    if (!auth) return;

    try {
        await firebaseSignOutMethod(auth);
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
export type { User as FirebaseUser, UserCredential };

// Export instances
export { auth, app };
