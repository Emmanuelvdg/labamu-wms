'use client';

import { useEffect, useState } from 'react';
import { getAvailableFlags, fetchTenants, getTenantFlags, setTenantFlag, getAiReorderReadiness } from '@/lib/admin-api';
import { ToggleLeft, ToggleRight, ChevronDown, AlertTriangle } from 'lucide-react';

export default function FeatureFlagsPage() {
    const [availableFlags, setAvailableFlags] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [tenantFlags, setTenantFlags] = useState<any[]>([]);
    const [loadingFlags, setLoadingFlags] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [readinessWarning, setReadinessWarning] = useState('');

    useEffect(() => {
        Promise.all([getAvailableFlags(), fetchTenants()])
            .then(([flags, tenantList]: [any[], any[]]) => {
                setAvailableFlags(flags);
                setTenants(Array.isArray(tenantList) ? tenantList : []);
            })
            .catch((e: any) => setError(e.message || 'Failed to load data'));
    }, []);

    useEffect(() => {
        if (!selectedTenantId) { setTenantFlags([]); return; }
        setLoadingFlags(true);
        getTenantFlags(selectedTenantId)
            .then((flags: any[]) => setTenantFlags(Array.isArray(flags) ? flags : []))
            .catch((e: any) => setError(e.message || 'Failed to load flags'))
            .finally(() => setLoadingFlags(false));
    }, [selectedTenantId]);

    const handleToggle = async (key: string, currentEnabled: boolean) => {
        setReadinessWarning('');
        if (key === 'AI_REORDER' && !currentEnabled) {
            try {
                const r = await getAiReorderReadiness(selectedTenantId);
                if (!r.ready) {
                    setReadinessWarning(`Only ${r.days} day(s) of sales data available — AI forecasts need at least 7 days. Enabling anyway, but forecasts will improve as data accumulates.`);
                }
            } catch { }
        }
        setToggling(key);
        try {
            await setTenantFlag(selectedTenantId, key, !currentEnabled);
            setTenantFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentEnabled } : f));
        } catch (e: any) {
            alert(e.message || 'Failed to toggle flag');
        } finally {
            setToggling(null);
        }
    };

    const selectedTenant = tenants.find(t => t.id === selectedTenantId);

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
                <p className="text-sm text-gray-500 mt-1">Enable or disable features per tenant</p>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}
            {readinessWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{readinessWarning}</span>
                </div>
            )}

            {/* Available Flags Overview */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Available Feature Flags</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {availableFlags.map(flag => (
                        <div key={flag.key} className="px-5 py-3 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-gray-800">{flag.label}</div>
                                <div className="text-xs text-gray-400">{flag.description}</div>
                            </div>
                            <code className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{flag.key}</code>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-tenant management */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
                    <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">Manage for Tenant</h2>
                    <div className="relative flex-1 max-w-xs">
                        <select
                            value={selectedTenantId}
                            onChange={e => setSelectedTenantId(e.target.value)}
                            className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                            <option value="">Select a tenant...</option>
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {!selectedTenantId ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-400">
                        Select a tenant above to manage their feature flags
                    </div>
                ) : loadingFlags ? (
                    <div className="px-5 py-8 text-sm text-gray-400">Loading flags...</div>
                ) : (
                    <>
                        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-600 font-medium">
                            {selectedTenant?.name} — {selectedTenant?.plan} plan
                        </div>
                        <div className="divide-y divide-gray-100">
                            {tenantFlags.map(flag => (
                                <div key={flag.key} className="px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{flag.label}</div>
                                        <div className="text-xs text-gray-400">{flag.description}</div>
                                        {flag.notes && (
                                            <div className="text-xs text-amber-600 mt-0.5">Note: {flag.notes}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggle(flag.key, flag.enabled)}
                                        disabled={toggling === flag.key}
                                        className="flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {flag.enabled ? (
                                            <ToggleRight className="w-8 h-8 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-gray-300" />
                                        )}
                                        <span className={`text-xs font-medium ${flag.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                            {flag.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
