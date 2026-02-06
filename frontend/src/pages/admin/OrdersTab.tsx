import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Search, Filter, CheckCircle, XCircle, AlertTriangle, Edit, DollarSign } from 'lucide-react';

export const OrdersTab = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // Search by Order ID or User ID (logic needed in API or handle locally/backend)
    // For now backend supports status, paymentStatus, canteenId, etc.
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadOrders();
    }, [statusFilter]); // Reload when filter changes

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listOrders({
                status: statusFilter || undefined,
                limit: 50
            });
            setOrders(res.data.data);
        } catch (error) {
            console.error('Failed to load orders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusOverride = async (orderId: string, currentStatus: string) => {
        const newStatus = prompt(`Override status for Order #${orderId.slice(-6)}\nCurrent: ${currentStatus}\nEnter new status (placed, preparing, ready, delivered, cancelled):`);
        if (!newStatus) return;

        const reason = prompt('Reason for override:');
        if (!reason) return;

        try {
            await superadminAPI.overrideOrderStatus(orderId, newStatus, reason);
            loadOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        const reason = prompt('Reason for cancellation:');
        if (!reason) return;

        try {
            await superadminAPI.cancelOrder(orderId, reason);
            loadOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to cancel order');
        }
    };

    const handleRefund = async (orderId: string) => {
        const amountStr = prompt('Enter refund amount (leave empty for full refund):');
        const amount = amountStr ? parseFloat(amountStr) : undefined;
        const reason = prompt('Reason for refund:');
        if (!reason) return;

        try {
            await superadminAPI.refundOrder(orderId, amount, reason);
            loadOrders();
            alert('Refund processed successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to process refund');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <button onClick={loadOrders} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                    <option value="">All Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-white/70">
                        <tr>
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Canteen</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Payment</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {orders.map((order) => (
                            <tr key={order._id} className="text-white hover:bg-white/5">
                                <td className="px-4 py-3 font-mono text-sm">
                                    {order.orderId || order._id.slice(-6)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-sm">{order.userId?.name || 'Unknown'}</div>
                                    <div className="text-xs text-white/50">{order.userId?.email}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">{order.canteenId?.name || 'Unknown'}</td>
                                <td className="px-4 py-3 font-medium">₹{order.totalAmount}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                        ${order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                                                'bg-blue-500/20 text-blue-300'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                        ${order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-300' :
                                            order.paymentStatus === 'refunded' ? 'bg-purple-500/20 text-purple-300' :
                                                'bg-yellow-500/20 text-yellow-300'}`}>
                                        {order.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleStatusOverride(order._id, order.status)}
                                            title="Override Status"
                                            className="p-1.5 hover:bg-white/10 rounded text-blue-400">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRefund(order._id)}
                                            title="Refund"
                                            className="p-1.5 hover:bg-white/10 rounded text-purple-400">
                                            <DollarSign className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCancelOrder(order._id)}
                                            title="Cancel"
                                            className="p-1.5 hover:bg-white/10 rounded text-red-400">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                                    No orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
