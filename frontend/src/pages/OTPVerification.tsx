import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../store';
import { otpAPI } from '../api';
import { Mail, ArrowLeft, RefreshCw, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface PendingVerification {
    email: string;
    emailMasked: string;
    name?: string;
    userId?: string;
    source: 'login' | 'register';
    verificationType: 'email';
}

export const EmailVerification = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Get pending verification data from navigation state or sessionStorage
    const [pendingData, setPendingData] = useState<PendingVerification | null>(null);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Load pending verification data
    useEffect(() => {
        const stateData = location.state as PendingVerification | undefined;
        const storedData = sessionStorage.getItem('pendingVerification');

        if (stateData?.email) {
            setPendingData(stateData);
            sessionStorage.setItem('pendingVerification', JSON.stringify(stateData));
        } else if (storedData) {
            try {
                setPendingData(JSON.parse(storedData));
            } catch {
                navigate('/login');
            }
        } else {
            // No verification data, redirect to login
            navigate('/login');
        }
    }, [location.state, navigate]);

    // Send OTP on initial load (if coming from register, OTP was already sent)
    useEffect(() => {
        // Only auto-send for login flow (register already sent OTP)
        if (pendingData?.email && pendingData.source === 'login' && countdown === 0) {
            handleSendOTP();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingData?.email]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendOTP = async () => {
        if (!pendingData?.email || isSending) return;

        setIsSending(true);
        setError('');

        try {
            const response = await otpAPI.send({
                email: pendingData.email,
                purpose: 'registration'
            });

            setSuccess(response.data.message || 'Verification code sent to your email');
            setCountdown(60); // 60 second cooldown

            // In development, show the OTP
            if (response.data.data?.otp) {
                console.log('Dev OTP:', response.data.data.otp);
            }

            // Clear success after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData?.waitSeconds) {
                setCountdown(errorData.waitSeconds);
                setError(`Please wait ${errorData.waitSeconds} seconds before resending`);
            } else {
                setError(errorData?.error || 'Failed to send verification code. Please try again.');
            }
        } finally {
            setIsSending(false);
        }
    };

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

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

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

    const handleVerify = async (otpValue?: string) => {
        const otpCode = otpValue || otp.join('');
        if (otpCode.length !== 6 || !pendingData?.email) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await otpAPI.verify({
                email: pendingData.email,
                otp: otpCode,
                purpose: 'registration'
            });

            const data = response.data.data;

            if (data.loginComplete && data.accessToken && data.refreshToken && data.user) {
                // OTP verified and tokens received - complete login
                dispatch(login({
                    user: {
                        id: data.user.id,
                        name: data.user.name,
                        email: data.user.email,
                        role: data.user.role,
                        canteenId: data.user.canteenId,
                        isApproved: data.user.isApproved
                    },
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken
                }));

                // Clean up
                sessionStorage.removeItem('pendingVerification');

                // Redirect based on role
                if (data.user.role === 'admin') {
                    navigate('/admin', { replace: true });
                } else if (data.user.role === 'partner') {
                    navigate('/partner', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            } else {
                // Verification successful but unexpected response
                setSuccess('Email verified! Redirecting...');
                sessionStorage.removeItem('pendingVerification');
                navigate('/login', { replace: true });
            }
        } catch (err: any) {
            const errorData = err.response?.data;
            setError(errorData?.error || 'Verification failed. Please try again.');

            if (errorData?.attemptsRemaining !== undefined) {
                setAttemptsRemaining(errorData.attemptsRemaining);
            }

            // Clear OTP on error
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBack = () => {
        sessionStorage.removeItem('pendingVerification');
        navigate('/login', { replace: true });
    };

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
                            <p className="text-orange-100">We're verifying your email to keep your account safe</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Mail className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">One-Time Code</h3>
                            <p className="text-orange-100">Enter the 6-digit code sent to your email</p>
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
                                <Mail className="text-orange-600" size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">
                                Verify Your Email
                            </h2>
                            <p className="text-gray-500">
                                We've sent a verification code to
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                                {pendingData.emailMasked || pendingData.email}
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
                                <div>
                                    {error}
                                    {attemptsRemaining !== null && attemptsRemaining > 0 && (
                                        <p className="text-xs mt-1">
                                            {attemptsRemaining} attempts remaining
                                        </p>
                                    )}
                                </div>
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
                                    onClick={handleSendOTP}
                                    disabled={isSending}
                                    className="text-orange-600 font-bold hover:text-orange-700 flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <RefreshCw size={18} />
                                    )}
                                    Resend Code
                                </button>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 mb-2">Verifying for:</p>
                            <p className="text-sm text-gray-700">
                                {pendingData.name && <span className="font-bold">{pendingData.name}</span>}
                                {pendingData.name && ' • '}
                                {pendingData.email}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Also export as OTPVerification for backward compatibility with routes
export const OTPVerification = EmailVerification;
