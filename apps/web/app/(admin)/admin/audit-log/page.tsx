'use client';

import { useEffect, useState } from 'react';
import { getAuditLog } from '@/lib/admin-api';
import { Search, RefreshCw } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
    TENANT_UPDATE: 'bg-blue-100 text-blue-700',
    STATUS_CHANGE: 'bg-amber-100 text-amber-700',
    PLAN_UPDATE: 'bg-purple-100 text-purple-700',
    FLAG_TOGGLE: 'bg-teal-100 text-teal-700',
    IMPERSONATE: 'bg-rose-100 text-rose-700',
    ANNOUNCE: 'bg-green-100 text-green-700',
    BULK_STATUS: 'bg-orange-100 text-orange-700',
    BULK_PLAN: 'bg-indigo-100 text-indigo-700',
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [limit, setLimit] = useState(200);

    const load = () => {
        setLoading(true);
        getAuditLog(limit)
            .then((data: any[]) => setLogs(Array.isArray(data) ? data : []))
            .catch((e: any) => setError(e.message || 'Failed to load audit log'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [limit]);

    const allActions = [...new Set(logs.map(l => l.action))].sort();

    const filtered = logs.filter(l => {
        if (actionFilter && l.action !== actionFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                l.actorEmail?.toLowerCase().includes(q) ||
                l.action?.toLowerCase().includes(q) ||
                l.targetId?.toLowerCase().includes(q) ||
                l.targetLabel?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                    <p className="text-sm text-gray-500 mt-1">All platform administration actions</p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search actor, target..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
                <select
                    value={actionFilter}
                    onChange={e => setActionFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    <option value="">All actions</option>
                    {allActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select
                    value={limit}
                    onChange={e => setLimit(Number(e.target.value))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    <option value={50}>Last 50</option>
                    <option value={200}>Last 200</option>
                    <option value={500}>Last 500</option>
                </select>
            </div>

            {/* Table — headers always visible so tests can assert on them regardless of load state */}
            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}
            {loading && <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Target</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                                    No audit log entries found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((log: any) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-medium text-gray-700">{log.actorEmail}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs text-gray-700">{log.targetLabel || log.targetId}</div>
                                        <div className="text-xs text-gray-400">{log.targetType}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.metadata ? (
                                            <code className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                                {typeof log.metadata === 'string'
                                                    ? log.metadata.slice(0, 80)
                                                    : JSON.stringify(log.metadata).slice(0, 80)}
                                            </code>
                                        ) : null}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                    Showing {filtered.length} of {logs.length} entries
                </div>
            </div>
        </div>
    );
}
