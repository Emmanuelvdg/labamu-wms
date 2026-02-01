'use client';

import { useState, useEffect } from 'react';
import { fetchOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

export default function OrdersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        id: '',
        type: 'ALL',
        customer: '',
        status: 'ALL',
        priority: '',
        date: '',
        items: ''
    });

    useEffect(() => {
        // Sync filters with URL params on mount or param change
        const statusParam = searchParams.get('status');
        setFilters(prev => ({
            ...prev,
            status: statusParam || 'ALL'
        }));
    }, [searchParams]);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchOrders();
            setOrders(data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const filteredOrders = orders.filter(order => {
        // ID Filter
        if (filters.id && !order.id.toLowerCase().includes(filters.id.toLowerCase())) return false;

        // Type Filter
        const type = order.type || 'SALES';
        if (filters.type !== 'ALL' && type !== filters.type) return false;

        // Customer / Destination Filter
        const customerOrDest = (order.type === 'TRANSFER' || order.type === 'STO')
            ? (order.destinationWarehouse?.name || order.destinationWarehouseId || '-')
            : (order.customerId || '-');
        if (filters.customer && !customerOrDest.toLowerCase().includes(filters.customer.toLowerCase())) return false;

        // Status Filter
        if (filters.status !== 'ALL' && order.status !== filters.status) return false;

        // Priority Filter
        const priority = (order.priority || '').toString();
        if (filters.priority && !priority.toLowerCase().includes(filters.priority.toLowerCase())) return false;

        // Date Filter
        const dateStr = order.expectedDate ? format(new Date(order.expectedDate), 'MMM d, yyyy') : '';
        if (filters.date && !dateStr.toLowerCase().includes(filters.date.toLowerCase())) return false;

        // Items Count Filter
        const itemsCount = (order.items?.length || 0).toString();
        if (filters.items && !itemsCount.includes(filters.items)) return false;

        return true;
    });

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Orders</h1>
                </div>
                <Link href="/orders/new">
                    <Button data-testid="create-order-btn">+ New Order</Button>
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer / Destination</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        </tr>
                        {/* Filter Row */}
                        <tr className="bg-gray-100">
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Filter ID"
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.id}
                                    onChange={(e) => handleFilterChange('id', e.target.value)}
                                />
                            </th>
                            <th className="px-6 py-2">
                                <select
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                >
                                    <option value="ALL">All</option>
                                    <option value="SALES">Sales</option>
                                    <option value="TRANSFER">Internal (IWT)</option>
                                    <option value="STO">Stock Transfer</option>
                                </select>
                            </th>
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Filter Customer"
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.customer}
                                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                                />
                            </th>
                            <th className="px-6 py-2">
                                <select
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="ALL">All</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="RESERVED">Reserved</option>
                                    <option value="SHIPPED">Shipped</option>
                                    <option value="DONE">Done</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="DRAFT">Draft</option>
                                </select>
                            </th>
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Filter Priority"
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.priority}
                                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                                />
                            </th>
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Filter Date"
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.date}
                                    onChange={(e) => handleFilterChange('date', e.target.value)}
                                />
                            </th>
                            <th className="px-6 py-2">
                                <input
                                    type="text"
                                    placeholder="Count"
                                    className="w-full text-xs p-1 border rounded font-normal"
                                    value={filters.items}
                                    onChange={(e) => handleFilterChange('items', e.target.value)}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onDoubleClick={() => router.push(`/orders/${order.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {order.id.substring(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${order.type === 'TRANSFER' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {order.type || 'SALES'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(order.type === 'TRANSFER' || order.type === 'STO') ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400">Destination:</span>
                                                <span className="font-medium">{order.destinationWarehouse?.name || order.destinationWarehouseId || '-'}</span>
                                            </div>
                                        ) : (
                                            order.customerId || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.priority}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.expectedDate ? format(new Date(order.expectedDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.items?.length || 0} items
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
