'use client';

import { useState, useEffect } from 'react';
import {
    ClipboardList,
    Box,
    Layers,
    CheckCircle2,
    ArrowRight,
    Package,
    Building
} from 'lucide-react';

import { createPickingBatch, createPickingCluster, createPickingWave, fetchWarehouses } from '@/lib/api';

export default function PickingPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [activeStrategy, setActiveStrategy] = useState<'batch' | 'cluster' | 'wave' | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadWarehouses();
    }, []);

    async function loadWarehouses() {
        try {
            const data = await fetchWarehouses();
            setWarehouses(data);
            if (data.length > 0) {
                setSelectedWarehouseId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load warehouses', err);
        }
    }

    const startSession = async (strategy: 'batch' | 'cluster' | 'wave') => {
        if (!selectedWarehouseId) {
            alert('Please select a warehouse first');
            return;
        }

        setLoading(true);
        setActiveStrategy(strategy);

        try {
            let data;
            if (strategy === 'batch') {
                // Default to 'location' criteria for now, or read from settings if available
                data = await createPickingBatch('location', selectedWarehouseId);

                // Map API response to UI state
                if (data.generatedBatches && data.generatedBatches.length > 0) {
                    const batch = data.generatedBatches[0]; // Just take the first batch for demo
                    setSession({
                        id: `BATCH-${Date.now()}`,
                        type: 'BATCH',
                        orders: batch.orderIds.map((id: string) => ({
                            id,
                            customer: 'Unknown', // API doesn't return customer name yet in this view
                            items: 'N/A' // API doesn't return item count per order in this view yet
                        })),
                        totalItems: batch.orderCount
                    });
                } else {
                    alert('No pending orders to batch for this warehouse.');
                    setActiveStrategy(null);
                }
            } else if (strategy === 'cluster') {
                data = await createPickingCluster(4, selectedWarehouseId);

                if (data.assignments && data.assignments.length > 0) {
                    setSession({
                        id: data.clusterId,
                        type: 'CLUSTER',
                        totes: data.assignments.map((a: any) => ({
                            label: a.toteLabel,
                            orderId: a.orderId,
                            items: a.items.length
                        }))
                    });
                } else {
                    alert('No pending orders for cluster in this warehouse.');
                    setActiveStrategy(null);
                }
            } else if (strategy === 'wave') {
                data = await createPickingWave('product', selectedWarehouseId);

                if (data.pickingList && data.pickingList.length > 0) {
                    setSession({
                        id: data.waveId,
                        type: 'WAVE',
                        lines: data.pickingList.map((item: any) => ({
                            product: item.productName,
                            sku: 'SKU-' + item.productId.substring(0, 4),
                            qty: item.totalQty,
                            locations: ['Zone-A'] // Placeholder
                        }))
                    });
                } else {
                    alert('No pending orders for wave in this warehouse.');
                    setActiveStrategy(null);
                }
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start picking session');
            setActiveStrategy(null);
        } finally {
            setLoading(false);
        }
    };

    const completeSession = () => {
        setSession(null);
        setActiveStrategy(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-blue-600" />
                        Picking Operations
                    </h1>
                    <p className="text-gray-600 mt-1">Select a picking strategy to begin your work session.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <Building className="h-5 w-5 text-gray-500 ml-2" />
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="border-none focus:ring-0 text-sm font-medium text-gray-700 bg-transparent cursor-pointer min-w-[200px]"
                    >
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            {!session ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StrategySelectionCard
                        title="Batch Picking"
                        description="Pick multiple orders for the same customer or route together."
                        icon={<Layers className="h-8 w-8 text-blue-600" />}
                        onClick={() => startSession('batch')}
                        loading={loading && activeStrategy === 'batch'}
                    />
                    <StrategySelectionCard
                        title="Cluster Picking"
                        description="Pick items into specific totes for multiple orders."
                        icon={<Box className="h-8 w-8 text-purple-600" />}
                        onClick={() => startSession('cluster')}
                        loading={loading && activeStrategy === 'cluster'}
                    />
                    <StrategySelectionCard
                        title="Wave Picking"
                        description="Pick all items of the same type for the entire shift."
                        icon={<Package className="h-8 w-8 text-orange-600" />}
                        onClick={() => startSession('wave')}
                        loading={loading && activeStrategy === 'wave'}
                    />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Active Session: {session.id}</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                {session.type} STRATEGY
                            </span>
                        </div>
                        <button
                            onClick={completeSession}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete Session
                        </button>
                    </div>

                    <div className="p-6">
                        {session.type === 'BATCH' && (
                            <div className="space-y-4">
                                <p className="text-gray-600 mb-4">You are picking the following orders together:</p>
                                {session.orders.map((order: any) => (
                                    <div key={order.id} className="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
                                        <div>
                                            <p className="font-medium text-gray-900">Order #{order.id}</p>
                                            <p className="text-sm text-gray-500">Customer: {order.customer}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">{order.items}</p>
                                            <p className="text-xs text-gray-500">Items</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {session.type === 'CLUSTER' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {session.totes.map((tote: any) => (
                                    <div key={tote.label} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                                        <Box className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">{tote.label}</h3>
                                        <p className="text-sm text-gray-500 mb-4">Order: {tote.orderId}</p>
                                        <div className="bg-white border rounded px-3 py-1 inline-block">
                                            <span className="font-bold text-blue-600">{tote.items}</span> items to pick
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {session.type === 'WAVE' && (
                            <div className="overflow-hidden border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {session.lines.map((line: any) => (
                                            <tr key={line.sku}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{line.product}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.sku}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.locations.join(', ')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{line.qty}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-blue-600 hover:text-blue-900 font-medium flex items-center justify-end gap-1 w-full">
                                                        Pick <ArrowRight className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function StrategySelectionCard({ title, description, icon, onClick, loading }: any) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="flex flex-col items-center text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group disabled:opacity-70"
        >
            <div className="p-4 bg-gray-50 rounded-full mb-4 group-hover:bg-blue-50 transition-colors">
                {loading ? <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /> : icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500">{description}</p>
        </button>
    );
}
