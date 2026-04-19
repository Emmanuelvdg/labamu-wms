'use client';

import { useState, useEffect, Suspense } from 'react';
import { fetchOrders } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

function ShipmentsPageContent() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        orderId: '',
        date: '',
        customer: '',
        carrier: '',
        trackingId: '',
        status: '',
    });
    const [statusTab, setStatusTab] = useState('ALL');

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchOrders();
            // Filter only orders that have a shipment
            const shippedOrders = data.filter((order: any) => order.shipment);
            setOrders(shippedOrders);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredOrders = orders.filter(order => {
        if (!order.shipment) return false;
        if (statusTab !== 'ALL' && order.shipment.status !== statusTab) return false;
        const id = order.id.substring(0, 8).toUpperCase();
        if (filters.orderId && !id.includes(filters.orderId.toUpperCase())) return false;
        if (filters.date && order.shipment.createdAt) {
            const dateStr = new Date(order.shipment.createdAt).toLocaleDateString();
            if (!dateStr.toLowerCase().includes(filters.date.toLowerCase())) return false;
        }
        const customer = (order.type === 'TRANSFER' || order.type === 'STO')
            ? (order.destinationWarehouse?.name || '')
            : (order.customer?.name || order.customerId || '');
        if (filters.customer && !customer.toLowerCase().includes(filters.customer.toLowerCase())) return false;
        if (filters.carrier && !order.shipment.carrier.toLowerCase().includes(filters.carrier.toLowerCase())) return false;
        if (filters.trackingId && !order.shipment.trackingId.toLowerCase().includes(filters.trackingId.toLowerCase())) return false;
        if (filters.status && order.shipment.status !== filters.status) return false;
        return true;
    });

    const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';
    const getCount = (s: string) => s === 'ALL' ? orders.length : orders.filter(o => o.shipment?.status === s).length;

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage outbound shipments and track deliveries</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {[{ label: 'All', value: 'ALL' }, { label: 'Shipped', value: 'SHIPPED' }, { label: 'Delivered', value: 'DELIVERED' }].map(tab => (
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

            <div className="bg-white shadow rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Shipped</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Destination</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Carrier</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Order ID..." value={filters.orderId}
                                    onChange={e => setFilters(p => ({ ...p, orderId: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={filters.date}
                                    onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Customer..." value={filters.customer}
                                    onChange={e => setFilters(p => ({ ...p, customer: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Carrier..." value={filters.carrier}
                                    onChange={e => setFilters(p => ({ ...p, carrier: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Tracking ID..." value={filters.trackingId}
                                    onChange={e => setFilters(p => ({ ...p, trackingId: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab === 'ALL' ? '' : statusTab} onChange={e => setStatusTab(e.target.value || 'ALL')} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="SHIPPED">Shipped</option>
                                    <option value="DELIVERED">Delivered</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <button onClick={() => { setStatusTab('ALL'); setFilters({ orderId:'', date:'', customer:'', carrier:'', trackingId:'', status:'' }); }}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    No shipments found.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr
                                    key={order.shipment.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/orders/${order.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-blue-600">#{order.id.substring(0, 8).toUpperCase()}</div>
                                        <div className="text-xs text-gray-500">{order.type || 'SALES'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="font-medium text-gray-900">
                                            {order.shipment.createdAt ? format(new Date(order.shipment.createdAt), 'MMM d, yyyy') : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(order.type === 'TRANSFER' || order.type === 'STO') ? (
                                            <span className="font-medium">{order.destinationWarehouse?.name || order.destinationWarehouseId || '-'}</span>
                                        ) : (
                                            <span className="font-medium text-gray-900">{order.customerId || order.customer?.name || '-'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.shipment.carrier || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.shipment.trackingId || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${order.shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                                order.shipment.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {order.shipment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-900 font-semibold bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            View Order
                                        </Link>
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

export default function ShipmentsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading shipments...</div>}>
            <ShipmentsPageContent />
        </Suspense>
    );
}
