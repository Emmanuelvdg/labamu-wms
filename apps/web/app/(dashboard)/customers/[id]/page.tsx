'use client';

import { useEffect, useState, use } from 'react';
import { getCustomer } from '@/lib/api';
import Link from 'next/link';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCustomer();
    }, [id]);

    const loadCustomer = async () => {
        try {
            const data = await getCustomer(id);
            setCustomer(data);
        } catch (error) {
            console.error('Failed to load customer:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading CRM Profile...</div>;
    if (!customer) return <div className="p-8">Customer not found.</div>;

    const averageOrderValue = customer.totalOrders > 0
        ? customer.lifetimeValue / customer.totalOrders
        : 0;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                <Link href="/customers" className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50">
                    &larr; Back to Customers
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 col-span-1 md:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Profile Information</h2>
                    <div className="space-y-3">
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Address & Contact</span>
                            <span className="block text-gray-800 mt-1">{customer.address || 'No address provided'}</span>
                            {customer.phone && <span className="block text-gray-800">{customer.phone}</span>}
                        </div>
                        <div className="flex gap-8">
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 uppercase">Customer ID</span>
                                <span className="block text-gray-800 mt-1 text-sm font-mono">{customer.id}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 uppercase">Registered Date</span>
                                <span className="block text-gray-800 mt-1 text-sm">{new Date(customer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col justify-center space-y-6">
                    <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase text-center mb-1">Lifetime Value (LTV)</span>
                        <div className="text-3xl font-bold text-green-600 text-center">
                            IDR {customer.lifetimeValue.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="flex justify-around border-t pt-4">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-blue-600">{customer.totalOrders}</span>
                            <span className="block text-xs font-semibold text-gray-500 uppercase mt-1">Total Orders</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-purple-600">
                                IDR {averageOrderValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="block text-xs font-semibold text-gray-500 uppercase mt-1">Avg Order Value</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Sales Order History</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {customer.orders.length} Records
                    </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customer.orders.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No orders found for this customer.</td></tr>
                        ) : (
                            customer.orders.map((order: any) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                        <Link href={`/orders/${order.id}`}>
                                            {order.id.substring(0, 8).toUpperCase()}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {order.items.slice(0, 2).map((item: any, i: number) => (
                                            <div key={i} className="truncate max-w-[200px]" title={item.product?.name}>
                                                {item.quantity}x {item.product?.name || 'Unknown Item'}
                                            </div>
                                        ))}
                                        {order.items.length > 2 && (
                                            <div className="text-xs text-indigo-500 italic mt-1">
                                                + {order.items.length - 2} more items...
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                    order.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                        IDR {(order.totalAmount || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
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
