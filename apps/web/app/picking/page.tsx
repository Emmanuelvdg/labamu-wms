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
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) {
            checkActiveSession();
        }
    }, [selectedWarehouseId]);

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

    async function checkActiveSession() {
        try {
            const session = await import('@/lib/api').then(m => m.getActivePickingSession(selectedWarehouseId));
            if (session) {
                setActiveSession(session);
            } else {
                setActiveSession(null);
            }
        } catch (error) {
            console.error('Failed to check active session', error);
        }
    }

    const startSession = async (strategy: 'BATCH' | 'CLUSTER' | 'WAVE') => {
        if (!selectedWarehouseId) {
            alert('Please select a warehouse first');
            return;
        }

        setLoading(true);
        try {
            const { createPickingSession } = await import('@/lib/api');
            const session = await createPickingSession({
                warehouseId: selectedWarehouseId,
                strategy: strategy.toUpperCase(),
                criteria: strategy === 'WAVE' ? 'product' : 'location'
            });
            setActiveSession(session);
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start picking session. Ensure there are RESERVED orders.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPick = async (task: any) => {
        try {
            const { updatePickingTask } = await import('@/lib/api');
            await updatePickingTask(task.id, {
                pickedQuantity: task.quantity,
                status: 'PICKED'
            });
            // Refresh session to update UI
            checkActiveSession();
        } catch (error) {
            console.error('Failed to confirm pick:', error);
            alert('Failed to confirm pick');
        }
    };

    const handleException = async (task: any) => {
        const reason = prompt('Enter exception reason (e.g., Damaged, Missing):');
        if (!reason) return;

        const qtyStr = prompt(`Enter quantity actually picked (Max ${task.quantity}):`, '0');
        const pickedQty = parseInt(qtyStr || '0');

        if (isNaN(pickedQty) || pickedQty < 0 || pickedQty > task.quantity) {
            alert('Invalid quantity');
            return;
        }

        try {
            const { updatePickingTask } = await import('@/lib/api');
            await updatePickingTask(task.id, {
                pickedQuantity: pickedQty,
                status: pickedQty === 0 ? 'FAILED' : 'PARTIALLY_PICKED',
                exceptionReason: reason
            });
            checkActiveSession();
        } catch (error) {
            console.error('Failed to report exception:', error);
            alert('Failed to report exception');
        }
    };

    const completeSession = async () => {
        if (!activeSession) return;

        // Check if all tasks are handled
        const pendingTasks = activeSession.tasks.filter((t: any) => t.status === 'PENDING');
        if (pendingTasks.length > 0) {
            alert(`Please complete all ${pendingTasks.length} pending tasks first.`);
            return;
        }

        try {
            const { completePickingSession } = await import('@/lib/api');
            await completePickingSession(activeSession.id);
            setActiveSession(null);
            alert('Session completed successfully!');
        } catch (error) {
            console.error('Failed to complete session:', error);
            alert('Failed to complete session');
        }
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

            {!activeSession ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StrategySelectionCard
                        title="Batch Picking"
                        description="Pick multiple orders for the same customer or route together."
                        icon={<Layers className="h-8 w-8 text-blue-600" />}
                        onClick={() => startSession('BATCH')}
                        loading={loading}
                    />
                    <StrategySelectionCard
                        title="Cluster Picking"
                        description="Pick items into specific totes for multiple orders."
                        icon={<Box className="h-8 w-8 text-purple-600" />}
                        onClick={() => startSession('CLUSTER')}
                        loading={loading}
                    />
                    <StrategySelectionCard
                        title="Wave Picking"
                        description="Pick all items of the same type for the entire shift."
                        icon={<Package className="h-8 w-8 text-orange-600" />}
                        onClick={() => startSession('WAVE')}
                        loading={loading}
                    />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Active Session: {activeSession.id.substring(0, 8)}</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                {activeSession.strategy} STRATEGY
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
                        <div className="overflow-hidden border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeSession.tasks.map((task: any) => (
                                        <tr key={task.id} className={task.status === 'PICKED' ? 'bg-green-50' : task.status === 'FAILED' ? 'bg-red-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.product.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.sourceLocation.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.order.id.substring(0, 8)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                {task.status === 'PENDING' ? task.quantity : `${task.pickedQuantity}/${task.quantity}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${task.status === 'PICKED' ? 'bg-green-100 text-green-800' :
                                                        task.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                            task.status === 'PARTIALLY_PICKED' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {task.status === 'PENDING' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleConfirmPick(task)}
                                                            className="text-green-600 hover:text-green-900 font-medium"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => handleException(task)}
                                                            className="text-red-600 hover:text-red-900 font-medium"
                                                        >
                                                            Exception
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
