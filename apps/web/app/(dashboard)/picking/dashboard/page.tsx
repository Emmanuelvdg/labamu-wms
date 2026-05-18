'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllPickingSessions, fetchWarehouses, reoptimisePickingSession, previewReoptimisePickingSession } from '@/lib/api';
import { LayoutDashboard, RefreshCw, Building, ArrowRight, X, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const STRATEGY_COLORS: Record<string, string> = {
    SINGLE: 'bg-gray-100 text-gray-700',
    BATCH: 'bg-blue-100 text-blue-700',
    CLUSTER: 'bg-purple-100 text-purple-700',
    WAVE: 'bg-teal-100 text-teal-700',
    WAVELESS: 'bg-green-100 text-green-700',
    ZONE: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    PLANNED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

type PreviewRow = { rank: number; taskId: string; productName: string; locationName: string; quantity: number };
type ResequencePreview = { sessionId: string; current: PreviewRow[]; proposed: PreviewRow[] };

function ResequencePanel({
    preview,
    onAccept,
    onReject,
    accepting,
}: {
    preview: ResequencePreview;
    onAccept: () => void;
    onReject: () => void;
    accepting: boolean;
}) {
    const changed = preview.proposed.some((p, i) => p.taskId !== preview.current[i]?.taskId);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Re-sequence Preview</h2>
                        <p className="text-sm text-gray-500">
                            {changed
                                ? 'Tasks will be re-ordered by location to minimise travel.'
                                : 'Tasks are already in optimal order — no changes needed.'}
                        </p>
                    </div>
                    <button onClick={onReject} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {!changed ? (
                        <p className="text-center text-gray-400 py-8 text-sm">No reordering required.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current order</h3>
                                <div className="space-y-1.5">
                                    {preview.current.map(row => (
                                        <div key={row.taskId}
                                            className={`flex items-center gap-2 px-3 py-2 rounded text-xs border ${
                                                preview.proposed.findIndex(p => p.taskId === row.taskId) !== preview.current.findIndex(c => c.taskId === row.taskId)
                                                    ? 'bg-yellow-50 border-yellow-200'
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}>
                                            <span className="font-mono text-gray-400 w-5 text-right">{row.rank}</span>
                                            <span className="font-medium text-gray-800 truncate flex-1">{row.productName}</span>
                                            <span className="text-gray-500 truncate">{row.locationName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Proposed order</h3>
                                <div className="space-y-1.5">
                                    {preview.proposed.map(row => (
                                        <div key={row.taskId}
                                            className={`flex items-center gap-2 px-3 py-2 rounded text-xs border ${
                                                preview.proposed.findIndex(p => p.taskId === row.taskId) !== preview.current.findIndex(c => c.taskId === row.taskId)
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}>
                                            <span className="font-mono text-gray-400 w-5 text-right">{row.rank}</span>
                                            <span className="font-medium text-gray-800 truncate flex-1">{row.productName}</span>
                                            <span className="text-gray-500 truncate">{row.locationName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                    <button onClick={onReject}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Reject
                    </button>
                    {changed && (
                        <button onClick={onAccept} disabled={accepting}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                            {accepting
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <Check className="h-4 w-4" />}
                            Accept & Apply
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PickingDashboardPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Re-sequence preview state
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [preview, setPreview] = useState<ResequencePreview | null>(null);
    const [accepting, setAccepting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllPickingSessions(selectedWarehouseId || undefined);
            setSessions(Array.isArray(data) ? data : []);
            setLastRefresh(new Date());
        } catch {
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId]);

    useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(console.error);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handlePreviewResequence = async (sessionId: string) => {
        setPreviewLoading(sessionId);
        try {
            const data = await previewReoptimisePickingSession(sessionId);
            setPreview({ sessionId, ...data });
        } catch {
            toast.error('Failed to load re-sequence preview');
        } finally {
            setPreviewLoading(null);
        }
    };

    const handleAccept = async () => {
        if (!preview) return;
        setAccepting(true);
        try {
            await reoptimisePickingSession(preview.sessionId);
            toast.success('Tasks re-sequenced successfully');
            setPreview(null);
            load();
        } catch {
            toast.error('Re-sequence failed');
        } finally {
            setAccepting(false);
        }
    };

    const activeSessions = sessions.filter(s => s.status === 'IN_PROGRESS');
    const completedSessions = sessions.filter(s => s.status !== 'IN_PROGRESS');

    const totalPending = activeSessions.reduce((sum, s) => sum + (s.taskStats?.pending ?? 0), 0);
    const totalPicked = activeSessions.reduce((sum, s) => sum + (s.taskStats?.picked ?? 0), 0);
    const totalFailed = activeSessions.reduce((sum, s) => sum + (s.taskStats?.failed ?? 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <LayoutDashboard className="h-8 w-8 text-blue-600" />
                        Picking Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Supervisor overview — last refreshed {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                        <Building className="h-5 w-5 text-gray-400 ml-1" />
                        <select value={selectedWarehouseId}
                            onChange={e => setSelectedWarehouseId(e.target.value)}
                            className="border-none focus:ring-0 text-sm text-gray-700 bg-transparent min-w-[180px]">
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <button onClick={load} disabled={loading}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link href="/picking"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                        + New Session
                    </Link>
                </div>
            </header>

            {/* KPI summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Active Sessions', value: activeSessions.length, color: 'text-blue-600' },
                    { label: 'Tasks Pending', value: totalPending, color: 'text-yellow-600' },
                    { label: 'Tasks Picked', value: totalPicked, color: 'text-green-600' },
                    { label: 'Tasks Failed', value: totalFailed, color: 'text-red-600' },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Active sessions */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Sessions</h2>
                {activeSessions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                        No active picking sessions.{' '}
                        <Link href="/picking" className="text-blue-600 hover:underline">Start one →</Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Session', 'Warehouse', 'Strategy', 'Progress', 'Failed', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeSessions.map(s => {
                                    const { total, pending, picked, partial, failed } = s.taskStats ?? {};
                                    const done = (picked ?? 0) + (partial ?? 0);
                                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-5 py-3 text-sm font-mono text-gray-700">{s.id.slice(0, 8)}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{s.warehouseName}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STRATEGY_COLORS[s.strategy] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {s.strategy}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2 min-w-[140px]">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs text-gray-500">{done}/{total}</span>
                                                </div>
                                                {(pending ?? 0) > 0 && (
                                                    <p className="text-xs text-yellow-600 mt-0.5">{pending} pending</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm">
                                                {(failed ?? 0) > 0
                                                    ? <span className="text-red-600 font-medium">{failed} failed</span>
                                                    : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <button
                                                    onClick={() => handlePreviewResequence(s.id)}
                                                    disabled={previewLoading === s.id}
                                                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                    title="Preview and accept/reject task re-ordering">
                                                    {previewLoading === s.id
                                                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                        : <ArrowRight className="h-3 w-3" />}
                                                    Re-sequence…
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Recent completed sessions */}
            {completedSessions.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Completed / Planned</h2>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Session', 'Warehouse', 'Strategy', 'Status', 'Total Tasks', 'Created'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {completedSessions.slice(0, 20).map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 text-sm text-gray-600">
                                        <td className="px-5 py-3 font-mono">{s.id.slice(0, 8)}</td>
                                        <td className="px-5 py-3">{s.warehouseName}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STRATEGY_COLORS[s.strategy] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {s.strategy}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">{s.taskStats?.total ?? 0}</td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Re-sequence preview modal */}
            {preview && (
                <ResequencePanel
                    preview={preview}
                    onAccept={handleAccept}
                    onReject={() => setPreview(null)}
                    accepting={accepting}
                />
            )}
        </div>
    );
}
