'use client';

import { useState, useEffect, Suspense } from 'react';
import { fetchOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchX } from 'lucide-react';

function OrdersPageContent() {
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

    const TABS = [
        { label: 'All', value: 'ALL' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Confirmed', value: 'PENDING' }, // Pending = Confirmed in this context? Or RESERVED? Let's use PENDING as Confirmed/New
        { label: 'Reserved', value: 'RESERVED' },
        { label: 'Picking', value: 'PICKING' },
        { label: 'Packing', value: 'PACKING' },
        { label: 'Packed', value: 'PACKED' },
        { label: 'Shipped', value: 'SHIPPED' },
        { label: 'Done', value: 'DELIVERED' }, // Done = DELIVERED
        { label: 'Cancelled', value: 'CANCELLED' }
    ];

    // Helper to count orders for each tab
    const getCount = (status: string) => {
        if (status === 'ALL') return orders.length;
        if (status === 'PENDING') return orders.filter(o => o.status === 'PENDING').length;
        if (status === 'RESERVED') return orders.filter(o => o.status === 'RESERVED').length;
        // ... simple mapping
        return orders.filter(o => o.status === status).length;
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                </div>
                <div className="space-x-4">
                    <Link href="/orders/new">
                        <Button data-testid="create-order-btn" className="bg-blue-600 hover:bg-blue-700 text-white">
                            + New Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => handleFilterChange('status', tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${filters.status === tab.value
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${filters.status === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {getCount(tab.value)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filters Row (Simplified or moved to table header as per design? Design usually implies cleaner header) 
                I'll keep the filter row inside the table for consistency with Inventory Page redesign if I did it there (I didn't, I kept separate).
                Here, I'll integrate it into the table header like before but styled better.
            */}

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Destination</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Warehouse</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
                                        <p className="text-sm text-gray-500 max-w-sm">We couldn't find any orders matching your current filters.</p>
                                        <button
                                            onClick={() => setFilters({ id: '', type: 'ALL', customer: '', status: 'ALL', priority: '', date: '', items: '' })}
                                            className="mt-4 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/orders/${order.id}`)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 text-blue-600">#{order.id.substring(0, 8).toUpperCase()}</div>
                                        <div className="text-xs text-gray-500">{order.type || 'SALES'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="font-medium text-gray-900">{order.expectedDate ? format(new Date(order.expectedDate), 'MMM d, yyyy') : '-'}</div>
                                        <div className="text-xs text-gray-400">Created: {format(new Date(order.createdAt), 'MMM d')}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(order.type === 'TRANSFER' || order.type === 'STO') ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400">Destination:</span>
                                                <span className="font-medium">{order.destinationWarehouse?.name || order.destinationWarehouseId || '-'}</span>
                                            </div>
                                        ) : (
                                            <span className="font-medium text-gray-900">{order.customerId || order.customer?.name || '-'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.warehouse?.name || 'All Warehouses'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                                        {order.items?.length || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(order.totalAmount || 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'PICKING' ? 'bg-indigo-100 text-indigo-800' :
                                                        order.status === 'PACKING' ? 'bg-orange-100 text-orange-800' :
                                                            order.status === 'PACKED' ? 'bg-teal-100 text-teal-800' :
                                                                order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                                                                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                                                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-900 font-semibold bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            View
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

export default function OrdersPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading orders...</div>}>
            <OrdersPageContent />
        </Suspense>
    );
}
