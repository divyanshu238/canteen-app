/**
 * Login/Signup Page - Firebase Phone OTP Authentication
 * 
 * CRITICAL reCAPTCHA LIFECYCLE:
 * - reCAPTCHA is initialized ONCE on component mount
 * - NEVER re-initialized on mode change or errors
 * - Uses global singleton from firebase.ts
 * - Container must exist in DOM before initialization
 * 
 * FLOW:
 * 1. Component mounts → initialize reCAPTCHA once
 * 2. User enters phone (and name for register)
 * 3. Submit → Firebase sends OTP using pre-initialized reCAPTCHA
 * 4. Navigate to OTP verification page
 * 
 * NO email/password logic. Phone number is the ONLY identifier.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, User, ArrowRight, ChefHat, GraduationCap, AlertCircle, Shield, Loader } from 'lucide-react';
import {
    initializeRecaptcha,
    isRecaptchaInitialized,
    requestOTP,
    isFirebaseConfigured
} from '../services/auth.service';

type AuthMode = 'login' | 'register';
type Role = 'student' | 'partner';

export const Login = () => {
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<AuthMode>(searchParams.get('register') ? 'register' : 'login');
    const [role, setRole] = useState<Role>('student');

    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState('');
    const [recaptchaReady, setRecaptchaReady] = useState(false);

    const navigate = useNavigate();
    const initAttempted = useRef(false);

    /**
     * Initialize reCAPTCHA - ONCE ONLY
     * Uses useCallback to ensure stable reference
     */
    const initRecaptcha = useCallback(async () => {
        // Prevent multiple initialization attempts
        if (initAttempted.current) {
            setRecaptchaReady(isRecaptchaInitialized());
            setIsInitializing(false);
            return;
        }

        initAttempted.current = true;

        if (!isFirebaseConfigured()) {
            setError('Firebase is not configured. Please contact support.');
            setIsInitializing(false);
            return;
        }

        // Already initialized (from previous page visit)
        if (isRecaptchaInitialized()) {
            console.log('✅ reCAPTCHA already initialized from previous session');
            setRecaptchaReady(true);
            setIsInitializing(false);
            return;
        }

        console.log('🔄 Initializing reCAPTCHA...');

        // Initialize with the container ID
        const success = await initializeRecaptcha('recaptcha-container');

        if (success) {
            console.log('✅ reCAPTCHA ready');
            setRecaptchaReady(true);
        } else {
            console.error('❌ reCAPTCHA initialization failed');
            setError('Failed to initialize security check. Please refresh the page.');
        }

        setIsInitializing(false);
    }, []);

    /**
     * Effect: Initialize reCAPTCHA on mount
     * - Waits for DOM to be ready
     * - Only runs once per session
     */
    useEffect(() => {
        initRecaptcha();
    }, [initRecaptcha]);

    const formatPhoneNumber = (value: string): string => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        // Limit to 10 digits for Indian numbers
        return digits.slice(0, 10);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
        setError('');
    };

    const validateForm = (): boolean => {
        if (mode === 'register' && (!name.trim() || name.trim().length < 2)) {
            setError('Please enter your name (minimum 2 characters)');
            return false;
        }

        if (phoneNumber.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return false;
        }

        if (!recaptchaReady) {
            setError('Security check not ready. Please wait or refresh the page.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Request OTP using global reCAPTCHA
            const result = await requestOTP(phoneNumber);

            if (!result.success) {
                setError(result.error || 'Failed to send OTP');
                setIsLoading(false);
                return;
            }

            // Store verification context for OTP page
            const verificationData = {
                phoneNumber: `+91${phoneNumber}`,
                phoneNumberMasked: `+91 ******${phoneNumber.slice(-4)}`,
                name: mode === 'register' ? name.trim() : undefined,
                role: mode === 'register' ? role : undefined,
                action: mode
            };

            sessionStorage.setItem('pendingPhoneVerification', JSON.stringify(verificationData));

            // Navigate to OTP verification page
            navigate('/verify-phone', { state: verificationData });
        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeToggle = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        // DO NOT re-initialize reCAPTCHA when mode changes
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 p-12 flex-col justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Canteen Connect</h1>
                    <p className="text-orange-100 text-lg">Campus food ordering made simple</p>
                </div>

                <div className="space-y-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Phone className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Phone Verification</h3>
                            <p className="text-orange-100">Quick and secure login with OTP</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">For Students</h3>
                            <p className="text-orange-100">Order from campus canteens in seconds</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ChefHat className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">For Partners</h3>
                            <p className="text-orange-100">Manage your canteen, receive orders instantly</p>
                        </div>
                    </div>
                </div>

                <p className="text-orange-200 text-sm">
                    © 2024 Canteen Connect. All rights reserved.
                </p>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Phone className="text-orange-600" size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-gray-500">
                                {mode === 'login'
                                    ? 'Sign in with your phone number'
                                    : 'Join the campus food revolution'
                                }
                            </p>
                        </div>

                        {/* Firebase Config Warning */}
                        {!isFirebaseConfigured() && (
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2">
                                <AlertCircle size={18} />
                                <span>Firebase configuration missing. Authentication disabled.</span>
                            </div>
                        )}

                        {/* Initializing State */}
                        {isInitializing && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center gap-2">
                                <Loader size={18} className="animate-spin" />
                                <span>Initializing secure authentication...</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Role Selection (Register only) */}
                        {mode === 'register' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    I am a...
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={`p-4 rounded-xl border-2 transition-all ${role === 'student'
                                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <GraduationCap className="mx-auto mb-2" size={24} />
                                        <span className="font-bold block">Student</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('partner')}
                                        className={`p-4 rounded-xl border-2 transition-all ${role === 'partner'
                                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <ChefHat className="mx-auto mb-2" size={24} />
                                        <span className="font-bold block">Partner</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name (Register only) */}
                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            placeholder="John Doe"
                                            required
                                            minLength={2}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <span className="text-gray-600 font-medium">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={handlePhoneChange}
                                        className="w-full pl-16 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="9876543210"
                                        required
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <Shield size={12} />
                                    An OTP will be sent to verify your number
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading || isInitializing || !recaptchaReady || !isFirebaseConfigured()}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send OTP
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Toggle Mode */}
                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                                <button
                                    type="button"
                                    onClick={handleModeToggle}
                                    className="text-orange-600 font-bold hover:text-orange-700"
                                >
                                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>
                        </div>

                        {/* Security Notice */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                                🔒 Protected by reCAPTCHA &amp; Firebase Authentication
                            </p>
                        </div>

                        {/* reCAPTCHA container - MUST exist in DOM for initialization */}
                        <div id="recaptcha-container"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
