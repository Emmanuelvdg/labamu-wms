'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { fetchOrdersPaginated } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchX, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

const TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Confirmed', value: 'PENDING' },
    { label: 'Reserved', value: 'RESERVED' },
    { label: 'Picking', value: 'PICKING' },
    { label: 'Packing', value: 'PACKING' },
    { label: 'Packed', value: 'PACKED' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Done', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

function OrdersPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState('ALL');

    const [filters, setFilters] = useState({
        id: '',
        customer: '',
        date: '',
        items: '',
        warehouse: '',
        total: '',
    });

    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam) setStatus(statusParam);
    }, [searchParams]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchOrdersPaginated(status, PAGE_SIZE, page * PAGE_SIZE);
            setOrders(res.data ?? []);
            setTotal(res.total ?? 0);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    }, [status, page]);

    useEffect(() => {
        load();
    }, [load]);

    // Reset to page 0 when status tab changes
    const handleStatusChange = (value: string) => {
        setStatus(value);
        setPage(0);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Client-side column filters applied on the current page
    const filteredOrders = orders.filter(order => {
        if (filters.id && !order.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
        const customerOrDest = (order.type === 'TRANSFER' || order.type === 'STO')
            ? (order.destinationWarehouse?.name || order.destinationWarehouseId || '-')
            : (order.customerId || '-');
        if (filters.customer && !customerOrDest.toLowerCase().includes(filters.customer.toLowerCase())) return false;
        const dateStr = order.expectedDate ? format(new Date(order.expectedDate), 'MMM d, yyyy') : '';
        if (filters.date && !dateStr.toLowerCase().includes(filters.date.toLowerCase())) return false;
        const totalQty = (order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0).toString();
        if (filters.items && !totalQty.includes(filters.items)) return false;
        const warehouseName = (order.warehouse?.name || '').toLowerCase();
        if (filters.warehouse && !warehouseName.includes(filters.warehouse.toLowerCase())) return false;
        const totalAmt = (order.totalAmount || 0).toString();
        if (filters.total && !totalAmt.includes(filters.total)) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);

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

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => handleStatusChange(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            status === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        {status === tab.value && (
                            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">
                                {total}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Destination</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Warehouse</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Order #..." value={filters.id}
                                    onChange={e => handleFilterChange('id', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={filters.date}
                                    onChange={e => handleFilterChange('date', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Customer..." value={filters.customer}
                                    onChange={e => handleFilterChange('customer', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Warehouse..." value={filters.warehouse}
                                    onChange={e => handleFilterChange('warehouse', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="Qty..." value={filters.items}
                                    onChange={e => handleFilterChange('items', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Total..." value={filters.total}
                                    onChange={e => handleFilterChange('total', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5" />
                            <th className="px-2 py-1.5">
                                <button
                                    onClick={() => setFilters({ id: '', customer: '', date: '', items: '', warehouse: '', total: '' })}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">Loading...</td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
                                        <p className="text-sm text-gray-500 max-w-sm">We couldn&apos;t find any orders matching your current filters.</p>
                                        <button
                                            onClick={() => setFilters({ id: '', customer: '', date: '', items: '', warehouse: '', total: '' })}
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
                                        <div className="text-sm font-medium text-blue-600">#{order.id.substring(0, 8).toUpperCase()}</div>
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
                                        {order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0}
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
                                        <Link href={`/orders/${order.id}`} onClick={e => e.stopPropagation()} className="text-blue-600 hover:text-blue-900 font-semibold bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination bar */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-500">
                        {total === 0 ? 'No orders' : `Showing ${from}–${to} of ${total} orders`}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
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
