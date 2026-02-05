import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUser, showNotification, logout } from '../store';
import type { RootState } from '../store';
import { authAPI } from '../api';
import { User, Lock, Save, Loader2, Mail, Phone, Shield, CheckCircle, LogOut } from 'lucide-react';
import { pageVariants, fadeInUp, buttonClick } from '../utils/motion';
import { Navbar } from '../components/Navbar';

export const Profile = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
    const [isLoading, setIsLoading] = useState(false);

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phoneNumber: user?.phone || ''
    });

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data } = await authAPI.updateProfile({
                name: profileForm.name,
                email: profileForm.email,
                phoneNumber: profileForm.phoneNumber
            });

            if (data.success) {
                dispatch(updateUser({
                    name: data.data.name,
                    email: data.data.email,
                    phone: data.data.phoneNumber
                }));
                dispatch(showNotification({
                    message: 'Profile updated successfully',
                    type: 'success'
                }));
            }
        } catch (error: any) {
            dispatch(showNotification({
                message: error.response?.data?.error || 'Failed to update profile',
                type: 'error'
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setErrorMessage('All password fields are required');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setErrorMessage('New password and confirm password do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setErrorMessage('New password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await authAPI.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            setSuccessMessage('Password updated. Logging out for security...');

            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            if (data.forceLogout) {
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('refreshToken');
                    sessionStorage.clear();
                    dispatch(logout());
                    navigate('/login', { replace: true });
                }, 2000);
            }

        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to update password';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />
            <motion.div
                initial="initial" animate="animate" exit="exit" variants={pageVariants}
                className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
            >
                <div className="mb-8 pl-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account Settings</h1>
                    <p className="mt-2 text-gray-600 font-medium">Manage your personal info and security.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-72 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-6 space-y-2">
                        <TabButton
                            active={activeTab === 'details'}
                            onClick={() => setActiveTab('details')}
                            icon={<User size={20} />}
                            label="Profile Details"
                        />
                        <TabButton
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            icon={<Lock size={20} />}
                            label="Security"
                        />
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 md:p-10">
                        <AnimatePresence mode="wait">
                            {activeTab === 'details' ? (
                                <motion.div
                                    key="details"
                                    variants={fadeInUp}
                                    initial="hidden" animate="show" exit={{ opacity: 0, y: 10 }}
                                >
                                    <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-lg">
                                        <div className="flex items-center gap-6 mb-10">
                                            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-lg shadow-orange-200">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-6">
                                            <InputGroup
                                                icon={<User size={18} />}
                                                label="Full Name"
                                                value={profileForm.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            />
                                            <InputGroup
                                                icon={<Mail size={18} />}
                                                label="Email Address"
                                                value={profileForm.email}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, email: e.target.value })}
                                                type="email"
                                            />
                                            <InputGroup
                                                icon={<Phone size={18} />}
                                                label="Phone Number"
                                                value={profileForm.phoneNumber}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                                                type="tel"
                                                placeholder="+91"
                                            />
                                        </div>

                                        <div className="pt-6">
                                            <motion.button
                                                variants={buttonClick}
                                                whileHover="hover"
                                                whileTap="tap"
                                                type="submit"
                                                disabled={isLoading}
                                                className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                                Save Changes
                                            </motion.button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="security"
                                    variants={fadeInUp}
                                    initial="hidden" animate="show" exit={{ opacity: 0, y: 10 }}
                                >
                                    <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
                                            <p className="text-gray-500">Ensure your account is secure with a strong password.</p>
                                        </div>

                                        <AnimatePresence>
                                            {errorMessage && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mb-6 rounded-2xl bg-red-50 p-4 text-red-600 text-sm font-semibold flex items-center gap-3"
                                                >
                                                    <XCircle size={18} />
                                                    {errorMessage}
                                                </motion.div>
                                            )}

                                            {successMessage && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mb-6 rounded-2xl bg-green-50 p-4 text-green-700 text-sm font-semibold flex items-center gap-3"
                                                >
                                                    <CheckCircle size={18} />
                                                    {successMessage}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="grid gap-6">
                                            <InputGroup
                                                label="Current Password"
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                required
                                                icon={<Lock size={18} />}
                                            />
                                            <div className="space-y-2">
                                                <InputGroup
                                                    label="New Password"
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    required
                                                    minLength={6}
                                                    icon={<Lock size={18} />}
                                                />
                                                <p className="text-xs text-gray-400 font-medium pl-1">Must be at least 6 characters</p>
                                            </div>
                                            <InputGroup
                                                label="Confirm New Password"
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                required
                                                icon={<Lock size={18} />}
                                            />
                                        </div>

                                        <div className="pt-6">
                                            <motion.button
                                                variants={buttonClick}
                                                whileHover="hover"
                                                whileTap="tap"
                                                type="submit"
                                                disabled={isLoading || !!successMessage}
                                                className="flex items-center gap-2 px-8 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                                            >
                                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                                                Update & Logout
                                            </motion.button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ x: 4 }}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${active
            ? 'bg-white text-orange-600 shadow-md shadow-gray-100 border border-gray-100'
            : 'text-gray-500 hover:bg-white hover:text-gray-900'
            }`}
    >
        {icon}
        {label}
    </motion.button>
);

const InputGroup: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: React.ReactNode }> = ({ label, icon, ...props }) => (
    <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                {icon}
            </div>
            <input
                {...props}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none bg-gray-50/50 focus:bg-white font-medium placeholder:text-gray-400"
            />
        </div>
    </div>
);
