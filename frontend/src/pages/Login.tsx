/**
 * Login/Signup Page - Classic Email + Password Authentication
 * 
 * NO Firebase. NO OTP. NO third-party auth.
 * Simple email + password with backend validation.
 * 
 * SIGNUP: Name + Email + Phone + Password
 * LOGIN: Email + Password only
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, Phone, User, ArrowRight, ChefHat, GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { register, login } from '../services/auth.service';
import { login as storeLogin } from '../store';

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

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const formatPhoneNumber = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        return digits.slice(0, 10);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
        setError('');
    };

    const validateForm = (): boolean => {
        if (mode === 'register') {
            if (!name.trim() || name.trim().length < 2) {
                setError('Please enter your name (minimum 2 characters)');
                return false;
            }
            if (phone.length !== 10) {
                setError('Please enter a valid 10-digit phone number');
                return false;
            }
        }

        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return false;
        }

        if (!password || password.length < 6) {
            setError('Password must be at least 6 characters');
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
            let result;

            if (mode === 'register') {
                result = await register(name, email, phone, password, role);
            } else {
                result = await login(email, password);
            }

            if (!result.success) {
                setError(result.error || 'Authentication failed');
                setIsLoading(false);
                return;
            }

            const { user, accessToken, refreshToken } = result.data!;

            // Store tokens in localStorage
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // Dispatch login to Redux store
            dispatch(storeLogin({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phoneNumber,
                    canteenId: user.canteenId,
                    isApproved: user.isApproved
                },
                accessToken,
                refreshToken
            }));

            // Redirect based on role
            if (user.role === 'admin') {
                navigate('/admin', { replace: true });
            } else if (user.role === 'partner') {
                navigate('/partner', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeToggle = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
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
                            <Mail className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Simple Login</h3>
                            <p className="text-orange-100">Sign in with email and password</p>
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
                                <Mail className="text-orange-600" size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-gray-500">
                                {mode === 'login'
                                    ? 'Sign in with your email and password'
                                    : 'Join the campus food revolution'
                                }
                            </p>
                        </div>

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

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Phone Number (Register only) */}
                            {mode === 'register' && (
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
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            className="w-full pl-16 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            placeholder="9876543210"
                                            required
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Phone size={12} />
                                        Phone number is stored for contact purposes
                                    </p>
                                </div>
                            )}

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
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
                                        Minimum 6 characters
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
                                🔒 Your password is securely encrypted
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
