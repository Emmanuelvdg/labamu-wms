'use client';

import { useState, useEffect } from 'react';
import { Download, Lock } from 'lucide-react';
import Link from 'next/link';

interface LedgerEntry {
    date: string;
    type: string;
    productName: string;
    productSku: string;
    locationName: string;
    warehouseName: string;
    quantityChange: number;
    newQuantity: number;
    origin: string;
    referenceId?: string;
}

const STATUS_OPTIONS = ['PUTAWAY', 'PICKING', 'SHIPPED', 'LOST', 'DAMAGED', 'ADJUSTMENT'];
const PERIOD_OPTIONS = [
    { label: '7 days', value: '7d' },
    { label: '30 days', value: '30d' },
    { label: '90 days', value: '90d' },
];

export default function InventoryLedgerPage() {
    const [flagEnabled, setFlagEnabled] = useState<boolean | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 50;

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (flagEnabled !== false) loadEntries();
    }, [period, statusFilter, page, flagEnabled]);

    async function init() {
        const flagRes = await fetch('/api/feature-flags').catch(() => null);
        if (flagRes?.ok) {
            const flags: Array<{ key: string; enabled: boolean }> = await flagRes.json();
            setFlagEnabled(flags.find(f => f.key === 'ADVANCED_ANALYTICS')?.enabled ?? false);
        } else {
            setFlagEnabled(false);
        }
        await loadEntries();
    }

    async function loadEntries() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ period, page: String(page), limit: String(PAGE_SIZE) });
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/reporting/inventory-ledger?${params}`);
            if (res.ok) {
                const data = await res.json();
                setEntries(Array.isArray(data.entries) ? data.entries : data);
                if (data.total != null) setTotal(data.total);
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }

    function handleExport(format: 'csv' | 'xlsx') {
        const params = new URLSearchParams({ period, format });
        if (statusFilter) params.set('status', statusFilter);
        window.open(`/api/reporting/inventory-ledger?${params}`, '_blank');
    }

    return (
        <div className="p-6 max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Link href="/reporting" className="hover:text-gray-700">Reporting</Link>
                        <span>/</span>
                        <span>Inventory Ledger</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Ledger</h1>
                    <p className="text-gray-600 mt-1">Full movement history — putaway, picking, shipments, adjustments</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <button
                        onClick={() => handleExport('xlsx')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                </div>
            </div>

            {/* M5.5 — ADVANCED_ANALYTICS flag banner */}
            {flagEnabled === false && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">Advanced Analytics not enabled</p>
                        <p className="text-sm text-amber-700 mt-1">Enable the <strong>Advanced Analytics</strong> feature flag in the admin portal to access the inventory ledger.</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex bg-white border rounded-lg p-1 gap-1">
                    {PERIOD_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => { setPeriod(opt.value); setPage(1); }}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === opt.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border rounded-md px-3 py-2 text-sm bg-white"
                >
                    <option value="">All types</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <p className="text-gray-500 py-8 text-center">Loading...</p>
            ) : entries.length === 0 ? (
                <div className="text-center py-12 bg-white border rounded-lg">
                    <p className="text-gray-500">No ledger entries found for the selected filters.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Date', 'Type', 'Product', 'SKU', 'Location', 'Δ Qty', 'New Qty', 'Origin'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {entries.map((e, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                e.type === 'PUTAWAY' ? 'bg-green-100 text-green-800' :
                                                e.type === 'PICKING' ? 'bg-blue-100 text-blue-800' :
                                                e.type === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                                                e.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>{e.type}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{e.productName}</td>
                                        <td className="px-4 py-3 text-gray-500 font-mono">{e.productSku}</td>
                                        <td className="px-4 py-3 text-gray-500">{e.locationName}</td>
                                        <td className={`px-4 py-3 font-medium tabular-nums ${e.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {e.quantityChange >= 0 ? '+' : ''}{e.quantityChange}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">{e.newQuantity}</td>
                                        <td className="px-4 py-3 text-gray-500">{e.origin}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > PAGE_SIZE && (
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                                <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
