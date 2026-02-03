/**
 * Phone OTP Verification Page - Firebase Phone Authentication
 * 
 * CRITICAL reCAPTCHA LIFECYCLE:
 * - Uses the SAME global reCAPTCHA from Login page
 * - For resend: reuses existing verifier, NEVER creates new one
 * - confirmationResult stored on window for cross-page access
 * 
 * FLOW:
 * 1. User arrives from Login page with OTP already sent
 * 2. User enters 6-digit OTP
 * 3. Firebase verifies OTP (uses window.confirmationResult)
 * 4. On success, get Firebase ID token
 * 5. Send token to backend for signup/login
 * 6. Backend issues JWT and logs user in
 * 
 * NO email verification. Phone is the ONLY authentication method.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../store';
import {
    verifyOTPAndAuthenticate,
    hasActiveOTPSession,
    initializeRecaptcha,
    requestOTP,
    signOut
} from '../services/auth.service';
import { Phone, ArrowLeft, RefreshCw, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface PendingPhoneVerification {
    phoneNumber: string;
    phoneNumberMasked: string;
    name?: string;
    role?: 'student' | 'partner';
    action: 'login' | 'register';
}

export const PhoneVerification = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [pendingData, setPendingData] = useState<PendingPhoneVerification | null>(null);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [recaptchaReady, setRecaptchaReady] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const initAttempted = useRef(false);

    /**
     * Load pending verification data from navigation state or sessionStorage
     */
    useEffect(() => {
        const stateData = location.state as PendingPhoneVerification | undefined;
        const storedData = sessionStorage.getItem('pendingPhoneVerification');

        if (stateData?.phoneNumber) {
            setPendingData(stateData);
            // Sync to sessionStorage
            sessionStorage.setItem('pendingPhoneVerification', JSON.stringify(stateData));
        } else if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.phoneNumber) {
                    setPendingData(parsed);
                } else {
                    navigate('/login', { replace: true });
                }
            } catch {
                navigate('/login', { replace: true });
            }
        } else {
            // No verification data - redirect to login
            navigate('/login', { replace: true });
        }
    }, [location.state, navigate]);

    /**
     * Initialize reCAPTCHA - needed for resend functionality
     * Uses the same global verifier if already initialized
     */
    const ensureRecaptchaReady = useCallback(async () => {
        if (initAttempted.current) {
            return;
        }

        initAttempted.current = true;



        // Initialize for resend functionality
        console.log('🔄 Initializing reCAPTCHA for resend...');
        const success = await initializeRecaptcha('recaptcha-container');
        setRecaptchaReady(success);
    }, []);

    /**
     * Effect: Initialize reCAPTCHA on mount (for resend)
     */
    useEffect(() => {
        ensureRecaptchaReady();
    }, [ensureRecaptchaReady]);

    /**
     * Countdown timer for resend
     */
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    /**
     * Handle OTP input change
     */
    const handleOtpChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (value && index === 5 && newOtp.every(d => d)) {
            handleVerify(newOtp.join(''));
        }
    };

    /**
     * Handle backspace navigation
     */
    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    /**
     * Handle paste of full OTP
     */
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            inputRefs.current[5]?.focus();
            handleVerify(pastedData);
        }
    };

    /**
     * Verify OTP and authenticate with backend
     */
    const handleVerify = async (otpValue?: string) => {
        const otpCode = otpValue || otp.join('');
        if (otpCode.length !== 6 || !pendingData) return;

        setIsLoading(true);
        setError('');

        try {
            // Convert 'register' to 'signup' for backend API
            const authAction = pendingData.action === 'register' ? 'signup' : 'login';

            const result = await verifyOTPAndAuthenticate(
                otpCode,
                authAction,
                pendingData.name,
                pendingData.role
            );

            if (!result.success) {
                setError(result.error || 'Verification failed');
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }

            const { user, accessToken, refreshToken } = result.data!;

            // Dispatch login to Redux store
            dispatch(login({
                user: {
                    id: user.id,
                    name: user.name,
                    email: '', // No email in phone auth
                    role: user.role,
                    phone: user.phoneNumber,
                    canteenId: user.canteenId,
                    isApproved: user.isApproved
                },
                accessToken,
                refreshToken
            }));

            // Clean up
            sessionStorage.removeItem('pendingPhoneVerification');

            // Show success briefly
            setSuccess('Verification successful! Redirecting...');

            // Redirect based on role
            setTimeout(() => {
                if (user.role === 'admin') {
                    navigate('/admin', { replace: true });
                } else if (user.role === 'partner') {
                    navigate('/partner', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            }, 500);
        } catch (err: any) {
            console.error('Verification error:', err);
            setError(err.message || 'Verification failed. Please try again.');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Resend OTP
     * Uses the SAME global reCAPTCHA verifier
     */
    const handleResendOTP = async () => {
        if (!pendingData || isResending || countdown > 0) return;

        setIsResending(true);
        setError('');

        try {
            // Ensure reCAPTCHA is initialized
            const success = await initializeRecaptcha('recaptcha-container');
            if (!success) {
                setError('Security check not ready. Please refresh the page.');
                return;
            }

            // Extract phone number digits
            const phoneDigits = pendingData.phoneNumber.replace(/\D/g, '').slice(-10);

            const result = await requestOTP(phoneDigits);

            if (!result.success) {
                setError(result.error || 'Failed to resend OTP');
                return;
            }

            setSuccess('New OTP sent successfully!');
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();

            // Clear success after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Resend error:', err);
            setError(err.message || 'Failed to resend OTP');
        } finally {
            setIsResending(false);
        }
    };

    /**
     * Go back to login
     */
    const handleGoBack = async () => {
        sessionStorage.removeItem('pendingPhoneVerification');
        await signOut();
        navigate('/login', { replace: true });
    };

    // Loading state while checking verification data
    if (!pendingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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
                            <Shield className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Secure Verification</h3>
                            <p className="text-orange-100">We're verifying your phone to keep your account safe</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Phone className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">One-Time Code</h3>
                            <p className="text-orange-100">Enter the 6-digit code sent to your phone</p>
                        </div>
                    </div>
                </div>

                <p className="text-orange-200 text-sm">
                    © 2024 Canteen Connect. All rights reserved.
                </p>
            </div>

            {/* Right side - OTP Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                        {/* Back Button */}
                        <button
                            onClick={handleGoBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Login</span>
                        </button>

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Phone className="text-orange-600" size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">
                                Verify Your Phone
                            </h2>
                            <p className="text-gray-500">
                                We've sent a verification code to
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                                {pendingData.phoneNumberMasked}
                            </p>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm flex items-center gap-2">
                                <CheckCircle size={18} />
                                {success}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                                <AlertCircle size={18} />
                                <div>{error}</div>
                            </div>
                        )}

                        {/* No Active Session Warning */}
                        {!hasActiveOTPSession() && !success && (
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2">
                                <AlertCircle size={18} />
                                <div>OTP session expired. Please click "Resend Code" below.</div>
                            </div>
                        )}

                        {/* OTP Input */}
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 mb-4 text-center">
                                Enter 6-digit verification code
                            </label>
                            <div className="flex justify-center gap-3" onPaste={handlePaste}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => inputRefs.current[index] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(index, e.target.value)}
                                        onKeyDown={e => handleKeyDown(index, e)}
                                        className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all ${digit
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 bg-gray-50'
                                            } focus:border-orange-500 focus:ring-2 focus:ring-orange-200`}
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={() => handleVerify()}
                            disabled={isLoading || otp.some(d => !d)}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Shield size={20} />
                                    Verify & Continue
                                </>
                            )}
                        </button>

                        {/* Resend Section */}
                        <div className="mt-6 text-center">
                            <p className="text-gray-600 mb-2">
                                Didn't receive the code?
                            </p>
                            {countdown > 0 ? (
                                <p className="text-gray-500">
                                    Resend available in <span className="font-bold text-orange-600">{countdown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendOTP}
                                    disabled={isResending}
                                    className="text-orange-600 font-bold hover:text-orange-700 flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {isResending ? (
                                        <Loader size={18} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={18} />
                                    )}
                                    Resend Code
                                </button>
                            )}
                        </div>

                        {/* User Info */}
                        {pendingData.name && (
                            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 mb-2">Registering as:</p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-bold">{pendingData.name}</span>
                                    {pendingData.role && (
                                        <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full capitalize">
                                            {pendingData.role}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* reCAPTCHA container for resend */}
                        <div id="recaptcha-container"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Export for compatibility
export const EmailVerification = PhoneVerification;
export const OTPVerification = PhoneVerification;
