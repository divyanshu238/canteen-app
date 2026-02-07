/**
 * Login/Signup Page - Premium Redesign
 * 
 * Logic: Classic Email + Password Authentication (Preserved)
 * UI: Modern, Glassmorphism, Split-screen, Animated
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    Mail, Lock, Phone, User, ArrowRight, ChefHat, GraduationCap,
    AlertCircle, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { register, login } from '../services/auth.service';
import { login as storeLogin } from '../store';
import { LoginBackground } from '../components/LoginBackground';

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

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    const cardVariants = {
        hidden: { y: 30, opacity: 0, scale: 0.98 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.1
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen flex items-stretch overflow-hidden bg-gray-50 font-sans"
        >
            {/* Left side - Branding (Desktop) */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                <LoginBackground>
                    <div className="flex flex-col justify-between h-full relative z-20">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20 mb-6"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-white text-xs font-medium tracking-wide">Live Campus Service</span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-sm"
                            >
                                Canteen Connect
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-orange-50 text-xl font-medium max-w-md leading-relaxed"
                            >
                                Skip the queue. Order your favorite food from campus canteens in seconds.
                            </motion.p>
                        </div>

                        <div className="space-y-6">
                            {[
                                { icon: GraduationCap, title: "Students", desc: "Fast pickup & exclusive deals" },
                                { icon: ChefHat, title: "Partners", desc: "Manage orders effortlessly" }
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + (idx * 0.1) }}
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-white/10 group-hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20 transition-all duration-300">
                                        <item.icon className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{item.title}</h3>
                                        <p className="text-orange-100/80 text-sm">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-orange-100/60 text-xs mt-8">
                            <p>© 2024 Canteen Connect</p>
                            <div className="flex gap-4">
                                <span>Privacy</span>
                                <span>Terms</span>
                            </div>
                        </div>
                    </div>
                </LoginBackground>
            </div>

            {/* Right side - Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
                {/* Mobile Background Gradient */}
                <div className="absolute inset-0 z-0 lg:hidden bg-gradient-to-br from-orange-50 via-white to-gray-50" />

                <motion.div
                    variants={cardVariants}
                    className="w-full max-w-[440px] z-10"
                >
                    {/* Floating Card */}
                    <div className="bg-white rounded-[2rem] shadow-2xl shadow-orange-500/10 border border-white p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">

                        {/* Decorative background blobs within card */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                        {/* Header */}
                        <div className="text-center mb-8 relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.3 }}
                                className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center mx-auto mb-6 transform rotate-3"
                            >
                                <ChefHat className="text-white" size={32} strokeWidth={2.5} />
                            </motion.div>

                            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
                                {mode === 'login' ? 'Welcome back 👋' : 'Create Account'}
                            </h2>
                            <p className="text-gray-500 font-medium">
                                {mode === 'login'
                                    ? 'Sign in to continue ordering'
                                    : 'Join the campus food revolution'
                                }
                            </p>
                        </div>

                        {/* Error Alert */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3 overflow-hidden shadow-sm"
                                >
                                    <div className="bg-red-100 p-1.5 rounded-full flex-shrink-0">
                                        <AlertCircle size={16} className="text-red-600" />
                                    </div>
                                    <span className="font-medium">{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Role Selection (Register only) */}
                        <AnimatePresence>
                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 overflow-hidden"
                                >
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        I am a...
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['student', 'partner'] as const).map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRole(r)}
                                                className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${role === r
                                                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md shadow-orange-100'
                                                        : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {role === r && (
                                                    <motion.div
                                                        layoutId="activeRole"
                                                        className="absolute inset-0 border-2 border-orange-500 rounded-2xl"
                                                    />
                                                )}
                                                <div className="relative z-10 flex flex-col items-center gap-2">
                                                    {r === 'student' ? <GraduationCap size={24} /> : <ChefHat size={24} />}
                                                    <span className="font-bold capitalize">{r}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Inputs */}
                            <div className="space-y-4">
                                {mode === 'register' && (
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                            placeholder="Full Name"
                                            required={mode === 'register'}
                                            minLength={2}
                                        />
                                    </div>
                                )}

                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                        placeholder="Email Address"
                                        required
                                    />
                                </div>

                                {mode === 'register' && (
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <Phone className="text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                            <span className="text-gray-400 font-medium text-sm">|</span>
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                            placeholder="Phone Number"
                                            required={mode === 'register'}
                                            maxLength={10}
                                        />
                                    </div>
                                )}

                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
                                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                        placeholder="Password"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password (Login Only) */}
                            {mode === 'login' && (
                                <div className="text-right">
                                    <button type="button" className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4)" }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Toggle Mode */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 font-medium">
                                {mode === 'login' ? "New to Canteen?" : 'Already have an account?'}
                                <button
                                    type="button"
                                    onClick={handleModeToggle}
                                    className="ml-2 text-orange-600 font-bold hover:text-orange-700 hover:underline transition-all"
                                >
                                    {mode === 'login' ? 'Create Account' : 'Sign In'}
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* Trust Signals */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-8 flex items-center justify-center gap-6 text-gray-400 grayscale opacity-70"
                    >
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            <ShieldCheck size={14} />
                            <span>Secure SSL</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            <GraduationCap size={14} />
                            <span>Campus Verified</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};
