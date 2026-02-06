import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { Save, RefreshCw, Power, AlertOctagon } from 'lucide-react';

export const SystemSettingsTab = () => {
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
            <div className={`p-6 rounded-xl border ${maintenanceMode.enabled ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className={`text-xl font-bold ${maintenanceMode.enabled ? 'text-red-400' : 'text-green-400'} flex items-center gap-2`}>
                            {maintenanceMode.enabled ? <AlertOctagon /> : <Power />}
                            Maintenance Mode is {maintenanceMode.enabled ? 'ON' : 'OFF'}
                        </h3>
                        <p className="text-white/60 mt-1">
                            {maintenanceMode.enabled
                                ? 'Users cannot place orders. Admin access remains active.'
                                : 'System is fully operational.'}
                        </p>
                    </div>
                    <button
                        onClick={handleMaintenanceToggle}
                        className={`px-6 py-3 rounded-lg font-bold transition-all ${maintenanceMode.enabled
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                    >
                        {maintenanceMode.enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                    </button>
                </div>
                {maintenanceMode.enabled && (
                    <div className="mt-4 p-3 bg-black/20 rounded">
                        <span className="text-xs text-white/50 uppercase tracking-wider">Current Message:</span>
                        <p className="text-white font-mono">{maintenanceMode.message}</p>
                    </div>
                )}
            </div>

            {/* Other Settings (Placeholder for future expansion) */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Feature Flags & Configuration</h3>
                    <button onClick={loadSettings} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="text-white/50 text-center py-8 bg-black/20 rounded-lg border border-white/5">
                    More system settings (Payment Gateways, Fees, Registration Controls) can be added here.
                    <br />
                    <span className="text-xs opacity-50">Currently managed via environment variables.</span>
                </div>
            </div>
        </div>
    );
};
