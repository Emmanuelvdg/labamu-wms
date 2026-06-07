'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const ACTION_LABELS: Record<string, { label: string; colour: string }> = {
    ADJUSTMENT_APPLIED:    { label: 'Adjustment Applied',    colour: 'bg-yellow-100 text-yellow-800' },
    PO_APPROVED:           { label: 'PO Approved',           colour: 'bg-green-100 text-green-800' },
    PO_REJECTED:           { label: 'PO Rejected',           colour: 'bg-red-100 text-red-800' },
    GOODS_RECEIVED:        { label: 'Goods Received',        colour: 'bg-blue-100 text-blue-800' },
    ORDER_STATUS_CHANGED:  { label: 'Order Status Changed',  colour: 'bg-purple-100 text-purple-800' },
    ORDER_SHIPPED:         { label: 'Order Shipped',         colour: 'bg-indigo-100 text-indigo-800' },
};

const ENTITY_OPTIONS = ['', 'Adjustment', 'PurchaseOrder', 'Order'];
const ACTION_OPTIONS = ['', ...Object.keys(ACTION_LABELS)];
const PAGE_SIZE = 50;

interface AuditEntry {
    id: string;
    companyId: string | null;
    actorId: string | null;
    actorEmail: string | null;
    action: string;
    entity: string;
    entityId: string;
    before: string | null;
    after: string | null;
    metadata: string | null;
    createdAt: string;
}

export default function AuditLogPage() {
    const { user } = useAuth();

    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);

    const [entity, setEntity] = useState('');
    const [action, setAction] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async (pg: number) => {
        if (!user?.companyId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                companyId: user.companyId,
                take: String(PAGE_SIZE),
                skip: String(pg * PAGE_SIZE),
            });
            if (entity) params.set('entity', entity);
            if (action) params.set('action', action);
            if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
            if (dateTo) params.set('dateTo', new Date(dateTo + 'T23:59:59').toISOString());

            const result = await api.get(`/audit/operations?${params}`);
            setEntries(result.data ?? []);
            setTotal(result.total ?? 0);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [user?.companyId, entity, action, dateFrom, dateTo]);

    useEffect(() => {
        setPage(0);
        load(0);
    }, [load]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const parse = (json: string | null) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <ClipboardList className="h-8 w-8 text-gray-700" />
                    Operational Audit Log
                </h1>
                <p className="text-gray-600 mt-1">Track who changed what and when across inventory, orders, and procurement.</p>
            </header>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Entity type</label>
                    <select
                        value={entity}
                        onChange={(e) => setEntity(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {ENTITY_OPTIONS.map((o) => <option key={o} value={o}>{o || 'All entities'}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {ACTION_OPTIONS.map((o) => <option key={o} value={o}>{ACTION_LABELS[o]?.label ?? 'All actions'}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">No audit entries found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">When</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Entity</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Actor</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((entry) => {
                                const badge = ACTION_LABELS[entry.action];
                                const isOpen = expanded === entry.id;
                                const after = parse(entry.after);
                                const before = parse(entry.before);
                                const meta = parse(entry.metadata);

                                return (
                                    <>
                                        <tr
                                            key={entry.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => setExpanded(isOpen ? null : entry.id)}
                                        >
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {new Date(entry.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge?.colour ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {badge?.label ?? entry.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900">{entry.entity}</span>
                                                <span className="ml-2 text-gray-400 font-mono text-xs">{entry.entityId.slice(0, 8)}…</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{entry.actorEmail ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">
                                                {after ? Object.entries(after).map(([k, v]) => `${k}: ${v}`).join(' · ') : ''}
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr key={`${entry.id}-detail`} className="bg-blue-50">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                                        {before && (
                                                            <div>
                                                                <p className="font-semibold text-gray-700 mb-1">Before</p>
                                                                <pre className="bg-white border border-gray-200 rounded p-2 text-gray-600 overflow-auto">{JSON.stringify(before, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                        {after && (
                                                            <div>
                                                                <p className="font-semibold text-gray-700 mb-1">After</p>
                                                                <pre className="bg-white border border-gray-200 rounded p-2 text-gray-600 overflow-auto">{JSON.stringify(after, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                        {meta && (
                                                            <div>
                                                                <p className="font-semibold text-gray-700 mb-1">Metadata</p>
                                                                <pre className="bg-white border border-gray-200 rounded p-2 text-gray-600 overflow-auto">{JSON.stringify(meta, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 text-xs text-gray-400">Entity ID: {entry.entityId}</p>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>{total} entries total</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setPage(page - 1); load(page - 1); }}
                            disabled={page === 0}
                            className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span>Page {page + 1} of {totalPages}</span>
                        <button
                            onClick={() => { setPage(page + 1); load(page + 1); }}
                            disabled={page + 1 >= totalPages}
                            className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
