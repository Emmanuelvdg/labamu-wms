
'use client';

import { useState, useEffect } from 'react';
import { fetchOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('ALL');
    const [colFilters, setColFilters] = useState({ id: '', orderId: '', date: '' });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            // Fetch all orders and filter by type 'RETURN'
            // Ideally, backend should support filtering, but for now client-side is fine for MVP
            const data = await fetchOrders();
            setReturns(data.filter((o: any) => o.type === 'RETURN'));
        } catch (error) {
            console.error('Failed to fetch returns:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';
    const getCount = (s: string) => s === 'ALL' ? returns.length : returns.filter(r => r.status === s).length;
    const filtered = returns.filter(r => {
        if (statusTab !== 'ALL' && r.status !== statusTab) return false;
        if (colFilters.id && !r.id.substring(0, 8).toLowerCase().includes(colFilters.id.toLowerCase())) return false;
        if (colFilters.orderId && r.parentOrderId && !r.parentOrderId.substring(0, 8).toLowerCase().includes(colFilters.orderId.toLowerCase())) return false;
        if (colFilters.date) {
            const dateStr = new Date(r.createdAt).toLocaleDateString();
            if (!dateStr.toLowerCase().includes(colFilters.date.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Returns Management</h1>
                <Link href="/returns/new">
                    <Button>+ New Return Request</Button>
                </Link>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {[{ label: 'All', value: 'ALL' }, { label: 'Requested', value: 'REQUESTED' }, { label: 'Completed', value: 'COMPLETED' }].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            statusTab === tab.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            statusTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>{getCount(tab.value)}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white shadow rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Order</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Return ID..." value={colFilters.id}
                                    onChange={e => setColFilters(p => ({ ...p, id: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Order ID..." value={colFilters.orderId}
                                    onChange={e => setColFilters(p => ({ ...p, orderId: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab === 'ALL' ? '' : statusTab} onChange={e => setStatusTab(e.target.value || 'ALL')} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="REQUESTED">Requested</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={colFilters.date}
                                    onChange={e => setColFilters(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5"></th>
                            <th className="px-2 py-1.5">
                                <button onClick={() => { setStatusTab('ALL'); setColFilters({ id:'', orderId:'', date:'' }); }}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No active returns
                                </td>
                            </tr>
                        ) : (
                            filtered.map((rma) => (
                                <tr key={rma.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {rma.id.substring(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {rma.parentOrderId ? (
                                            <Link href={`/orders/${rma.parentOrderId}`} className="text-blue-600 hover:underline">
                                                {rma.parentOrderId.substring(0, 8)}
                                            </Link>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${rma.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                                                rma.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {rma.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(rma.createdAt), 'MMM d, HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {rma.items?.length || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {rma.status === 'REQUESTED' && (
                                            <Link href={`/returns/${rma.id}/receive`}>
                                                <Button variant="outline" size="sm">Receive</Button>
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
