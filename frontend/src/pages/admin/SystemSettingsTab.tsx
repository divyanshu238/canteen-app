
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { Save, RefreshCw, Power, AlertOctagon } from 'lucide-react';

export const SystemSettingsTab = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean, message: string }>({ enabled: false, message: '' });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.getSystemSettings();
            setSettings(res.data.data);

            const maint = res.data.data.find((s: any) => s.key === 'MAINTENANCE_MODE');
            if (maint && maint.value) {
                setMaintenanceMode(maint.value);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMaintenanceToggle = async () => {
        const enabled = !maintenanceMode.enabled;
        const message = enabled ? prompt('Enter maintenance message for users:', maintenanceMode.message || 'System is under maintenance') : '';

        if (enabled && message === null) return; // Cancelled

        try {
            await superadminAPI.toggleMaintenanceMode(enabled, message || '');
            setMaintenanceMode({ enabled, message: message || '' });
            alert(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to toggle maintenance mode');
        }
    };

    return (
        <div className="space-y-8">
            {/* Maintenance Mode Control */}
            <div className={`p-6 rounded-xl border ${maintenanceMode.enabled ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className={`text-xl font-bold ${maintenanceMode.enabled ? 'text-red-700' : 'text-green-700'} flex items-center gap-2`}>
                            {maintenanceMode.enabled ? <AlertOctagon /> : <Power />}
                            Maintenance Mode is {maintenanceMode.enabled ? 'ON' : 'OFF'}
                        </h3>
                        <p className="text-gray-600 mt-1">
                            {maintenanceMode.enabled
                                ? 'Users cannot place orders. Admin access remains active.'
                                : 'System is fully operational.'}
                        </p>
                    </div>
                    <button
                        onClick={handleMaintenanceToggle}
                        className={`px-6 py-3 rounded-lg font-bold transition-all shadow-sm ${maintenanceMode.enabled
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                    >
                        {maintenanceMode.enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                    </button>
                </div>
                {maintenanceMode.enabled && (
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Current Message:</span>
                        <p className="text-gray-900 font-mono">{maintenanceMode.message}</p>
                    </div>
                )}
            </div>

            {/* Other Settings (Placeholder for future expansion) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Feature Flags & Configuration</h3>
                    <button onClick={loadSettings} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                    More system settings (Payment Gateways, Fees, Registration Controls) can be added here.
                    <br />
                    <span className="text-xs opacity-70">Currently managed via environment variables.</span>
                </div>
            </div>
        </div>
    );
};
