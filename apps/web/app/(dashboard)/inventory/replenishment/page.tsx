'use client';

import { useState, useEffect } from 'react';
import {
    fetchReplenishmentSummary,
    fetchReplenishmentAlerts,
    triggerStockCheck,
    createAutoReplenishmentPO,
    dismissReplenishmentAlert,
} from '@/lib/api';
import {
    AlertTriangle,
    ShieldAlert,
    Package,
    RefreshCw,
    ShoppingCart,
    XCircle,
    CheckCircle2,
    TrendingDown,
    Sparkles,
    Brain,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReplenishmentPage() {
    const [summary, setSummary] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [filter, setFilter] = useState<string>('ACTIVE');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [accuracy, setAccuracy] = useState<any>(null);

    useEffect(() => {
        fetch('/api/feature-flags')
            .then(r => r.json())
            .then((flags: any[]) => {
                const on = Array.isArray(flags) && flags.some(f => f.key === 'AI_REORDER' && f.enabled);
                setAiEnabled(on);
                if (on) loadAccuracy();
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        loadData();
    }, [filter]);

    async function loadAccuracy() {
        try {
            const res = await fetch('/api/replenishment/forecast/accuracy');
            if (res.ok) setAccuracy(await res.json());
        } catch { }
    }

    async function loadData() {
        setLoading(true);
        try {
            const [sum, al] = await Promise.all([
                fetchReplenishmentSummary(),
                fetchReplenishmentAlerts({ status: filter || undefined }),
            ]);
            setSummary(sum);
            setAlerts(al);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load replenishment data');
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckStock() {
        setChecking(true);
        try {
            const result = await triggerStockCheck();
            toast.success(`Stock check complete. ${result.newAlerts} new alert(s) created.`);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to check stock');
        } finally {
            setChecking(false);
        }
    }

    async function handleCreatePO(alertId: string) {
        try {
            const result = await createAutoReplenishmentPO(alertId);
            if (result.success) {
                toast.success('Purchase order created successfully');
                loadData();
            } else {
                toast.error(result.error || 'Failed to create PO');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to create PO');
        }
    }

    async function handleDismiss(alertId: string) {
        try {
            await dismissReplenishmentAlert(alertId);
            toast.success('Alert dismissed');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to dismiss alert');
        }
    }

    const forecastsReady = aiEnabled && alerts.some(a => a.forecastedDemand != null);

    if (loading && !summary) return <div className="p-8">Loading replenishment data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingDown className="h-6 w-6" />
                            Replenishment
                        </h1>
                        <p className="text-gray-500 mt-1">Monitor stock levels and auto-generate purchase orders</p>
                    </div>
                    <button
                        onClick={handleCheckStock}
                        disabled={checking}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                        {checking ? 'Checking...' : 'Check Stock Levels'}
                    </button>
                </div>

                {/* AI status banner */}
                {aiEnabled && !forecastsReady && (
                    <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-violet-50 border border-violet-200 rounded-lg text-violet-800 text-sm">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>AI forecasts are being trained — run a stock check after sales data has been aggregated to see AI-driven suggestions.</span>
                    </div>
                )}
                {aiEnabled && forecastsReady && (
                    <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-violet-50 border border-violet-200 rounded-lg text-violet-800 text-sm">
                        <Sparkles className="h-4 w-4 flex-shrink-0" />
                        <span>AI forecasting active — replenishment suggestions are powered by demand forecasts.</span>
                    </div>
                )}

                {/* Summary Cards */}
                {summary && (
                    <div className={`grid grid-cols-1 gap-4 mb-6 ${aiEnabled ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">{summary.totalActive}</div>
                                    <div className="text-sm text-gray-500">Active Alerts</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <ShieldAlert className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{summary.criticalCount}</div>
                                    <div className="text-sm text-gray-500">Critical Low</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Package className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-yellow-600">{summary.lowStockCount}</div>
                                    <div className="text-sm text-gray-500">Low Stock</div>
                                </div>
                            </div>
                        </div>
                        {aiEnabled && (
                            <div className="bg-white rounded-lg border border-violet-200 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 rounded-lg">
                                        <Brain className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-violet-700">
                                            {accuracy?.avgMape != null ? `${(100 - accuracy.avgMape * 100).toFixed(0)}%` : '—'}
                                        </div>
                                        <div className="text-sm text-gray-500">Forecast Accuracy</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    {['ACTIVE', 'PO_CREATED', 'DISMISSED', ''].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {f || 'All'}
                        </button>
                    ))}
                </div>

                {/* Alerts Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Current</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Threshold</th>
                                {aiEnabled && forecastsReady && (
                                    <>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-violet-500 uppercase">
                                            <span className="flex items-center justify-center gap-1"><Sparkles className="h-3 w-3" />Forecast/Day</span>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-violet-500 uppercase">
                                            <span className="flex items-center justify-center gap-1"><Sparkles className="h-3 w-3" />Days Cover</span>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-violet-500 uppercase">
                                            <span className="flex items-center justify-center gap-1"><Sparkles className="h-3 w-3" />Suggested Qty</span>
                                        </th>
                                    </>
                                )}
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={aiEnabled && forecastsReady ? 10 : 7} className="px-4 py-12 text-center text-gray-500">
                                        <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                                        No alerts found. Stock levels are healthy!
                                    </td>
                                </tr>
                            ) : (
                                alerts.map((alert: any) => (
                                    <tr key={alert.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{alert.product?.name}</div>
                                            <div className="text-xs text-gray-500">{alert.product?.sku}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {alert.warehouse?.name || 'All'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-bold ${alert.currentQty <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                                {alert.currentQty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                                            {alert.threshold}
                                        </td>
                                        {aiEnabled && forecastsReady && (
                                            <>
                                                <td className="px-4 py-3 text-center text-sm text-violet-700">
                                                    {alert.forecastedDemand != null ? alert.forecastedDemand.toFixed(1) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {alert.daysOfCover != null ? (
                                                        <span className={`text-sm font-medium ${alert.daysOfCover < 7 ? 'text-red-600' : alert.daysOfCover < 14 ? 'text-yellow-600' : 'text-green-700'}`}>
                                                            {alert.daysOfCover.toFixed(1)}d
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {alert.suggestedOrderQty != null ? (
                                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700">
                                                            {alert.suggestedOrderQty}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${alert.type === 'CRITICAL_LOW'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {alert.type === 'CRITICAL_LOW' ? '🔴 Critical' : '🟡 Low Stock'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${alert.status === 'ACTIVE'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : alert.status === 'PO_CREATED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {alert.status === 'ACTIVE' && (
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleCreatePO(alert.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium"
                                                        title={alert.suggestedOrderQty ? `AI suggests ${alert.suggestedOrderQty} units` : 'Auto-create PO'}
                                                    >
                                                        <ShoppingCart className="h-3 w-3" />
                                                        {alert.suggestedOrderQty ? `Create PO (${alert.suggestedOrderQty})` : 'Create PO'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDismiss(alert.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-xs text-gray-600"
                                                        title="Dismiss alert"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
