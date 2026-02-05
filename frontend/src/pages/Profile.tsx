import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser, showNotification } from '../store';
import type { RootState } from '../store';
import { authAPI } from '../api';
import { User, Lock, Save, Loader2, Mail, Phone, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export const Profile = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();

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

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            dispatch(showNotification({
                message: 'New passwords do not match',
                type: 'error'
            }));
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await authAPI.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            if (data.success) {
                dispatch(showNotification({
                    message: 'Password changed successfully',
                    type: 'success'
                }));
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setActiveTab('details');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to change password';

            dispatch(showNotification({
                message: errorMessage,
                type: 'error'
            }));
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                    <p className="mt-2 text-gray-600">Manage your profile and security preferences</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        {/* Sidebar */}
                        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 space-y-2">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'details'
                                    ? 'bg-orange-50 text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <User size={20} />
                                Profile Details
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'security'
                                    ? 'bg-orange-50 text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Lock size={20} />
                                Security
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 md:p-8">
                            {activeTab === 'details' ? (
                                <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-lg">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-3xl font-bold border-4 border-white shadow-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                                            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="tel"
                                                    value={profileForm.phoneNumber}
                                                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    placeholder="+91"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={user.role}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none capitalize"
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 focus:ring-4 focus:ring-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                                        <p className="text-sm text-gray-500 mt-1">Ensure your account uses a long, random password to stay secure.</p>
                                    </div>

                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
