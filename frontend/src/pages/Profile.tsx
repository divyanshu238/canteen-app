import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUser, showNotification, logout } from '../store';
import type { RootState } from '../store';
import { authAPI } from '../api';
import { User, Lock, Save, Loader2, Mail, Phone, Shield, CheckCircle, LogOut } from 'lucide-react';

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
        phoneNumber: user?.phone || '' // Map 'phone' from User type to 'phoneNumber' for API
    });

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Explicit UI Feedback State
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleProfileSubmit = async (e: React.FormEvent) => {
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
                    phone: data.data.phoneNumber // API returns phoneNumber, store uses phone
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

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous messages
        setErrorMessage('');
        setSuccessMessage('');

        // 1. Client-side Validation
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
            // 2. API Call
            const { data } = await authAPI.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            // 3. Success Handling with Logout
            setSuccessMessage(data.message || 'Password updated successfully. Logging out...');

            // Clear form
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            // 4. Force Logout and Redirect
            if (data.forceLogout) {
                setTimeout(() => {
                    dispatch(logout());
                    navigate('/login');
                }, 2000);
            }

        } catch (error: any) {
            // 5. Error Handling
            console.error('Change password check failed:', error);

            const msg = error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to update password';

            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                    <p className="mt-2 text-gray-600">Manage your profile and security preferences</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row">
                        {/* Sidebar */}
                        <div className="w-full md:w-64 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 space-y-2">
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

                        {/* Content */}
                        <div className="flex-1 p-6 md:p-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'details' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-lg">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center text-orange-600 text-3xl font-bold border-4 border-white shadow-lg">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                                                    <p className="text-sm text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-full inline-block mt-1">
                                                        {user.role}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid gap-6">
                                                <InputGroup icon={<User size={18} />} label="Full Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                                                <InputGroup icon={<Mail size={18} />} label="Email Address" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} type="email" />
                                                <InputGroup icon={<Phone size={18} />} label="Phone Number" value={profileForm.phoneNumber} onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} type="tel" placeholder="+91" />

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                        <input
                                                            type="text"
                                                            value={user.role}
                                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed outline-none capitalize font-medium"
                                                            disabled
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
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
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
                                            <div className="mb-6">
                                                <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                                                <p className="text-sm text-gray-500 mt-1">Ensure your account uses a long, random password to stay secure.</p>
                                            </div>

                                            <AnimatePresence>
                                                {errorMessage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <CheckCircle className="rotate-45" size={16} />
                                                        {errorMessage}
                                                    </motion.div>
                                                )}

                                                {successMessage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-green-700 text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <CheckCircle size={16} />
                                                        {successMessage}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="grid gap-6">
                                                <InputGroup label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required icon={<Lock size={18} />} />

                                                <div>
                                                    <InputGroup label="New Password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} icon={<Lock size={18} />} />
                                                    <p className="mt-1.5 text-xs text-gray-500 pl-1">Minimum 6 characters</p>
                                                </div>

                                                <InputGroup label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required icon={<Lock size={18} />} />
                                            </div>

                                            <div className="pt-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="submit"
                                                    disabled={isLoading || !!successMessage} // Disable if success (logging out)
                                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                                                    Update Password
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
        </div>
    );
};

// Helper Components for Cleaner JSX
const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active
            ? 'bg-white text-orange-600 shadow-sm border border-gray-100 ring-1 ring-black/5'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
    >
        {icon}
        {label}
    </motion.button>
);

const InputGroup = ({ label, icon, ...props }: any) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                {icon}
            </div>
            <input
                {...props}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none bg-gray-50/30 focus:bg-white"
            />
        </div>
    </div>
);
