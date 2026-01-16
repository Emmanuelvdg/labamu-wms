
'use client';

import { useState, useEffect } from 'react';
import { fetchOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Returns Management</h1>
                <Link href="/returns/new">
                    <Button>+ New Return Request</Button>
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
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
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {returns.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No active returns
                                </td>
                            </tr>
                        ) : (
                            returns.map((rma) => (
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
