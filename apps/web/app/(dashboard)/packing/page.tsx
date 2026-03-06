'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPackingQueue, createPackingSession } from '@/lib/api';
import { Package, Clock, User, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function PackingQueuePage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQueue();
    }, []);

    async function loadQueue() {
        setLoading(true);
        try {
            const data = await fetchPackingQueue();
            setOrders(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load packing queue');
        } finally {
            setLoading(false);
        }
    }

    async function handleStartPacking(orderId: string) {
        try {
            const session = await createPackingSession(orderId);
            toast.success('Packing session started');
            router.push(`/packing/${session.id}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start packing');
        }
    }

    async function handleResumePacking(sessionId: string) {
        router.push(`/packing/${sessionId}`);
    }

    if (loading) return <div className="p-8">Loading packing queue...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            Packing Station
                        </h1>
                        <p className="text-gray-500 mt-1">Orders ready to be packed and shipped</p>
                    </div>
                    <button
                        onClick={loadQueue}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No orders to pack</h3>
                        <p className="text-gray-500">Orders will appear here after picking is completed.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {orders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <div className="text-sm text-gray-500">Order</div>
                                            <div className="font-mono font-bold text-gray-900">
                                                #{order.id.substring(0, 8).toUpperCase()}
                                            </div>
                                        </div>

                                        {order.customer && (
                                            <div>
                                                <div className="text-sm text-gray-500">Customer</div>
                                                <div className="flex items-center gap-1 text-gray-900">
                                                    <User className="h-3.5 w-3.5" />
                                                    {order.customer.name}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="text-sm text-gray-500">Items</div>
                                            <div className="text-gray-900">
                                                {order.items.length} product{order.items.length !== 1 ? 's' : ''},{' '}
                                                {order.items.reduce((sum: number, i: any) => sum + i.quantity, 0)} units
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-gray-500">Created</div>
                                            <div className="flex items-center gap-1 text-gray-900">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        {order.hasSession ? (
                                            <button
                                                onClick={() => handleResumePacking(order.packingSession.id)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                            >
                                                Resume Packing
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStartPacking(order.id)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                                            >
                                                Start Packing
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Item preview */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {order.items.map((item: any) => (
                                        <span
                                            key={item.id}
                                            className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-md text-xs text-gray-700"
                                        >
                                            {item.product.sku} × {item.quantity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
