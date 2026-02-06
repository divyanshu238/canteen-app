
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { Search, Filter, Power, UserCheck, Ban, RefreshCw, AlertTriangle } from 'lucide-react';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    isApproved: boolean;
    createdAt: string;
    suspendedAt?: string;
}

export const UsersTab = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await superadminAPI.listUsers({
                search: searchQuery || undefined,
                role: selectedRole || undefined,
                status: selectedStatus || undefined,
                limit: 50
            });
            setUsers(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSuspendUser = async (userId: string) => {
        const reason = prompt('Enter suspension reason:');
        if (!reason) return;
        try {
            await superadminAPI.suspendUser(userId, reason);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to suspend user');
        }
    };

    const handleReactivateUser = async (userId: string) => {
        try {
            await superadminAPI.reactivateUser(userId);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reactivate user');
        }
    };

    const handleForceLogout = async (userId: string) => {
        if (!confirm('Force logout this user from all devices?')) return;
        try {
            await superadminAPI.forceLogout(userId, 'Admin-initiated force logout');
            alert('User has been logged out from all devices');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to force logout');
        }
    };

    return (
        <div>
            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>
                <select
                    value={selectedRole}
                    onChange={(e) => { setSelectedRole(e.target.value); }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="partner">Partners</option>
                    <option value="admin">Admins</option>
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                </select>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center gap-2 transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    Apply
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No users found matching your criteria
                                    </td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-semibold text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            user.role === 'partner' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.suspendedAt ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                Suspended
                                            </span>
                                        ) : user.isActive ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleForceLogout(user._id)}
                                                className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors border border-transparent hover:border-yellow-200"
                                                title="Force Logout"
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            {user.suspendedAt ? (
                                                <button
                                                    onClick={() => handleReactivateUser(user._id)}
                                                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors border border-transparent hover:border-green-200"
                                                    title="Reactivate"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSuspendUser(user._id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors border border-transparent hover:border-red-200"
                                                    title="Suspend"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
