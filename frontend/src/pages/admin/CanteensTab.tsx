
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, CheckCircle, Ban, AlertTriangle } from 'lucide-react';

interface Canteen {
    _id: string;
    name: string;
    isApproved: boolean;
    isOpen: boolean;
    ownerId?: { name: string; email: string };
    createdAt: string;
}

export const CanteensTab = () => {
    const [canteens, setCanteens] = useState<Canteen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await superadminAPI.listCanteens({ limit: 50 });
            setCanteens(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load canteens');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApproveCanteen = async (canteenId: string) => {
        try {
            await superadminAPI.approveCanteen(canteenId);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to approve canteen');
        }
    };

    const handleSuspendCanteen = async (canteenId: string) => {
        const reason = prompt('Enter suspension reason:');
        if (!reason) return;
        try {
            await superadminAPI.suspendCanteen(canteenId, reason);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to suspend canteen');
        }
    };

    return (
        <div>
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Canteen</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Open</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {canteens.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No canteens found
                                    </td>
                                </tr>
                            ) : canteens.map((canteen) => (
                                <tr key={canteen._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{canteen.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {canteen.ownerId?.name || 'Unknown'}
                                            <div className="text-xs text-gray-400">{canteen.ownerId?.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {canteen.isApproved ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                Approved
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {canteen.isOpen ? (
                                            <span className="text-green-600 font-medium text-sm">Open</span>
                                        ) : (
                                            <span className="text-red-500 font-medium text-sm">Closed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            {!canteen.isApproved && (
                                                <button
                                                    onClick={() => handleApproveCanteen(canteen._id)}
                                                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors border border-transparent hover:border-green-200"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleSuspendCanteen(canteen._id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors border border-transparent hover:border-red-200"
                                                title="Suspend"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
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
