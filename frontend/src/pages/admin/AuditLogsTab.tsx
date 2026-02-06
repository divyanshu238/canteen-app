
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditLogsTab = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        entityType: '',
        action: '',
        adminId: ''
    });

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listAuditLogs({
                entityType: filters.entityType || undefined,
                action: filters.action || undefined,
                adminId: filters.adminId || undefined,
                limit: 50
            });
            setLogs(res.data.data);
        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <button onClick={loadLogs} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <select
                    value={filters.entityType}
                    onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Entities</option>
                    <option value="User">User</option>
                    <option value="Canteen">Canteen</option>
                    <option value="Order">Order</option>
                    <option value="MenuItem">Menu Item</option>
                    <option value="Review">Review</option>
                    <option value="System">System</option>
                </select>
                <input
                    type="text"
                    placeholder="Search Admin ID..."
                    value={filters.adminId}
                    onChange={(e) => setFilters(prev => ({ ...prev, adminId: e.target.value }))}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Admin</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Action</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entity</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logs.map((log) => (
                            <>
                                <tr key={log._id} className="text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="font-medium">{log.adminName}</div>
                                        <div className="text-xs text-gray-500">{log.adminEmail}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-purple-600 bg-purple-50 w-fit rounded px-2">
                                        {log.action}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {log.entityType} <span className="text-gray-400 text-xs text-mono">#{log.entityId?.slice(-6)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">
                                        {log.reason || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400">
                                        {expandedLog === log._id ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                                    </td>
                                </tr>
                                {expandedLog === log._id && (
                                    <tr className="bg-gray-50">
                                        <td colSpan={6} className="px-6 py-4 border-t border-gray-100">
                                            <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-700 bg-white p-4 rounded-lg border border-gray-200">
                                                <div>
                                                    <div className="font-bold text-red-600 mb-2 uppercase tracking-wider">Before State</div>
                                                    <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-[200px] text-gray-600">
                                                        {log.beforeState ? JSON.stringify(log.beforeState, null, 2) : 'N/A'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-green-600 mb-2 uppercase tracking-wider">After State</div>
                                                    <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-[200px] text-gray-600">
                                                        {log.afterState ? JSON.stringify(log.afterState, null, 2) : 'N/A'}
                                                    </pre>
                                                </div>
                                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-100 text-gray-500 flex justify-between">
                                                    <span>Action: <strong>{log.action}</strong></span>
                                                    <span>IP: {log.ipAddress} | UA: {log.userAgent}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No audit logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
