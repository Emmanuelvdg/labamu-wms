'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    RECEIVED: 'bg-green-100 text-green-800',
    PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-800',
};

export default function SupplierDashboardPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/supplier-portal/purchase-orders')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(setOrders)
            .catch(() => setError('Failed to load purchase orders'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="text-gray-500">Loading…</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Purchase Orders</h1>
            {orders.length === 0 ? (
                <p className="text-gray-500">No purchase orders found.</p>
            ) : (
                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {['PO Number', 'Order Date', 'Expected', 'Status', 'Items', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map(po => (
                                <tr key={po.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-medium">{po.poNumber}</td>
                                    <td className="px-4 py-3 text-gray-600">{new Date(po.orderDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-gray-600">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{po.items?.length ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <Link href={`/portal/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800 text-xs">
                                            View →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
