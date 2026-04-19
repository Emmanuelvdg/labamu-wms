'use client';

import { useState, useEffect } from 'react';
import { fetchAllBatches } from '@/lib/api';
import { format } from 'date-fns';
import { SearchX } from 'lucide-react';

const STATUS_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'Active' },
    { label: 'Quarantine', value: 'Quarantine' },
    { label: 'Expired', value: 'Expired' },
];

const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

export default function BatchesPage() {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('ALL');
    const [colFilters, setColFilters] = useState({
        batchNumber: '',
        product: '',
        status: '',
        location: '',
        expiry: '',
    });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const data = await fetchAllBatches();
            setBatches(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch batches:', err);
        } finally {
            setLoading(false);
        }
    }

    const setCF = (key: string, val: string) =>
        setColFilters(prev => ({ ...prev, [key]: val }));

    const clearAll = () => {
        setStatusTab('ALL');
        setColFilters({ batchNumber: '', product: '', status: '', location: '', expiry: '' });
    };

    const getCount = (status: string) => {
        if (status === 'ALL') return batches.length;
        return batches.filter(b => b.status === status).length;
    };

    const filtered = batches.filter(b => {
        if (statusTab !== 'ALL' && b.status !== statusTab) return false;
        if (colFilters.batchNumber && !(b.batchNumber || '').toLowerCase().includes(colFilters.batchNumber.toLowerCase())) return false;
        const productStr = `${b.product?.name || ''} ${b.product?.sku || ''}`.toLowerCase();
        if (colFilters.product && !productStr.includes(colFilters.product.toLowerCase())) return false;
        if (colFilters.status && (b.status || '').toLowerCase() !== colFilters.status.toLowerCase()) return false;
        const locationStr = `${b.warehouse?.name || ''} ${b.location?.name || ''}`.toLowerCase();
        if (colFilters.location && !locationStr.includes(colFilters.location.toLowerCase())) return false;
        if (colFilters.expiry) {
            const expiryStr = b.expiryDate ? format(new Date(b.expiryDate), 'MMM d, yyyy') : '';
            if (!expiryStr.toLowerCase().includes(colFilters.expiry.toLowerCase())) return false;
        }
        return true;
    });

    if (loading) return <div className="p-8">Loading batches...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lot Numbers &amp; Batches</h1>
                    <p className="text-sm text-gray-500">Track and manage inventory batches across all locations</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            statusTab === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            statusTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {getCount(tab.value)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch / Lot #</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Batch #..." value={colFilters.batchNumber}
                                    onChange={e => setCF('batchNumber', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Product..." value={colFilters.product}
                                    onChange={e => setCF('product', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={colFilters.status} onChange={e => setCF('status', e.target.value)} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Quarantine">Quarantine</option>
                                    <option value="Expired">Expired</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                {/* Qty — no column filter */}
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Location..." value={colFilters.location}
                                    onChange={e => setCF('location', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                    <input type="text" placeholder="Expiry..." value={colFilters.expiry}
                                        onChange={e => setCF('expiry', e.target.value)} className={inputCls} />
                                    <button onClick={clearAll}
                                        className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors" title="Clear all filters">
                                        ✕
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No batches found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters</p>
                                        <button
                                            onClick={clearAll}
                                            className="mt-2 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors text-sm"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(batch => (
                                <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {batch.batchNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{batch.product?.name || 'Unknown'}</div>
                                        <div className="text-sm text-gray-500">{batch.product?.sku || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            batch.status === 'Active' ? 'bg-green-100 text-green-800' :
                                            batch.status === 'Expired' ? 'bg-red-100 text-red-800' :
                                            batch.status === 'Quarantine' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>Current: <span className="font-medium text-gray-900">{batch.currentQuantity}</span></div>
                                        <div className="text-xs">Init: {batch.initialQuantity} | Res: {batch.reserved}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{batch.warehouse?.name || 'Unassigned'}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs" title={batch.location?.fullAddress || ''}>
                                            {batch.location?.fullAddress || batch.location?.name || ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {batch.expiryDate ? format(new Date(batch.expiryDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-xs text-gray-500">
                Showing {filtered.length} of {batches.length} batches
            </p>
        </div>
    );
}
