import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../store';
import { authAPI } from '../api';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ChefHat, GraduationCap, Phone } from 'lucide-react';

type AuthMode = 'login' | 'register';
type Role = 'student' | 'partner';

export const Login = () => {
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<AuthMode>(searchParams.get('register') ? 'register' : 'login');
    const [role, setRole] = useState<Role>('student');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let response;

            if (mode === 'register') {
                if (!name.trim()) {
                    throw new Error('Please enter your name');
                }
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                // Phone is REQUIRED for OTP verification - must be exactly 10 digits
                if (!phone || !/^[0-9]{10}$/.test(phone)) {
                    throw new Error('Please enter a valid 10-digit phone number. Phone verification is required.');
                }

                response = await authAPI.register({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    role,
                    phone // ALWAYS include phone - required for OTP flow
                });

                // Check if OTP verification is required (no tokens in response)
                // Handle both new flag (requiresOtp) and old flag (requiresPhoneVerification)
                if (response.data.requiresOtp || response.data.requiresPhoneVerification) {
                    // Store verification context in sessionStorage for persistence
                    const verificationData = {
                        phone: response.data.data.phone,
                        phoneMasked: response.data.data.phoneMasked,
                        email: response.data.data.email,
                        name: response.data.data.name,
                        userId: response.data.data.userId,
                        source: 'register' as const
                    };
                    sessionStorage.setItem('pendingVerification', JSON.stringify(verificationData));

                    // Redirect to OTP verification
                    navigate('/verify-phone', { state: verificationData });
                    return;
                }
            } else {
                response = await authAPI.login({
                    email: email.trim().toLowerCase(),
                    password
                });
            }

            const { user, accessToken, refreshToken } = response.data.data;

            dispatch(login({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    canteenId: user.canteenId,
                    isApproved: user.isApproved
                },
                accessToken,
                refreshToken
            }));

            // Redirect based on role
            if (user.role === 'admin') {
                navigate('/admin');
            } else if (user.role === 'partner') {
                navigate('/partner');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            const errorResponse = err.response?.data;

            // Check for OTP verification required (403)
            // Handle both old code (PHONE_VERIFICATION_REQUIRED) and new code (OTP_REQUIRED)
            const isOtpRequired = err.response?.status === 403 &&
                (errorResponse?.code === 'OTP_REQUIRED' ||
                    errorResponse?.code === 'PHONE_VERIFICATION_REQUIRED' ||
                    errorResponse?.requiresOtp === true);

            if (isOtpRequired) {
                // Store verification context in sessionStorage for persistence
                const verificationData = {
                    phone: errorResponse.data.phone,
                    phoneMasked: errorResponse.data.phoneMasked,
                    email: errorResponse.data.email,
                    userId: errorResponse.data.userId,
                    source: 'login' as const
                };
                sessionStorage.setItem('pendingVerification', JSON.stringify(verificationData));

                // Redirect to OTP verification
                navigate('/verify-phone', { state: verificationData });
                return;
            }

            const errorMessage = errorResponse?.error || err.message || 'Authentication failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
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
                            <h2 className="text-3xl font-black text-gray-900 mb-2">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-gray-500">
                                {mode === 'login'
                                    ? 'Sign in to continue ordering'
                                    : 'Join the campus food revolution'
                                }
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                {error}
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
                                        Full Name
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
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="you@university.edu"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Phone (Register only) - REQUIRED for OTP verification */}
                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Phone Number
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            placeholder="10-digit mobile number"
                                            maxLength={10}
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-orange-600 mt-1 font-medium">
                                        Required for account verification via OTP
                                    </p>
                                </div>
                            )}

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {mode === 'register' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Must be at least 6 characters
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'login' ? 'Sign In' : 'Create Account'}
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
                                    onClick={() => {
                                        setMode(mode === 'login' ? 'register' : 'login');
                                        setError('');
                                    }}
                                    className="text-orange-600 font-bold hover:text-orange-700"
                                >
                                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>
                        </div>

                        {/* Demo Credentials (Development Only) */}
                        {import.meta.env.DEV && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 mb-2">Demo Accounts:</p>
                                <div className="space-y-1 text-xs text-gray-500">
                                    <p>Admin: admin@canteen.com / admin123</p>
                                    <p>Partner: raju@canteen.com / partner123</p>
                                    <p>Student: student@test.com / student123</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
