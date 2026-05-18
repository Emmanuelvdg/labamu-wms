'use client';

import { useState, useEffect, useRef } from 'react';
import {
    ClipboardList,
    CheckCircle2,
    ArrowRight,
    Building,
    Printer,
    Wifi,
} from 'lucide-react';

import { fetchWarehouses } from '@/lib/api';
import ExceptionModal from './exception-modal';
import { toast } from 'sonner';

const WAVELESS_POLL_INTERVAL_MS = 8000;

export default function PickingPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [exceptionModal, setExceptionModal] = useState<{ isOpen: boolean; task: any | null }>({ isOpen: false, task: null });
    const [exceptionReason, setExceptionReason] = useState('');
    const [exceptionQuantity, setExceptionQuantity] = useState('0');

    // Strategy UI Settings
    const [strategy, setStrategy] = useState<'SINGLE' | 'BATCH' | 'CLUSTER' | 'WAVE' | 'WAVELESS' | 'ZONE'>('SINGLE');
    const [criteria, setCriteria] = useState<string>('Destination');
    const [maxOrders, setMaxOrders] = useState<number>(10);
    const [waveSize, setWaveSize] = useState<number>(20);
    const [waveReleaseCadenceMinutes, setWaveReleaseCadenceMinutes] = useState<number>(30);
    const [resequencing, setResequencing] = useState(false);
    const [newTaskCount, setNewTaskCount] = useState(0);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastTaskCountRef = useRef<number>(0);

    useEffect(() => {
        loadWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) {
            checkActiveSession();
        }
    }, [selectedWarehouseId]);

    // Waveless auto-polling: refresh task list every 8 s while a WAVELESS session is active
    useEffect(() => {
        const isWaveless = activeSession?.strategy === 'WAVELESS' && activeSession?.status === 'IN_PROGRESS';

        if (!isWaveless) {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            lastTaskCountRef.current = 0;
            setNewTaskCount(0);
            return;
        }

        const poll = async () => {
            try {
                const { pollWavelessTasks } = await import('@/lib/api');
                const tasks = await pollWavelessTasks(activeSession.id);
                const incoming = Array.isArray(tasks) ? tasks.length : 0;
                const prev = lastTaskCountRef.current;
                if (prev > 0 && incoming > prev) {
                    const added = incoming - prev;
                    setNewTaskCount(added);
                    toast.info(`${added} new task${added > 1 ? 's' : ''} added to the waveless queue`);
                }
                lastTaskCountRef.current = incoming;
                // Refresh the full session so the task table stays current
                await checkActiveSession();
            } catch {
                // silent — don't spam errors on poll failures
            }
        };

        lastTaskCountRef.current = (activeSession.tasks ?? []).filter((t: any) => t.status === 'PENDING').length;
        pollIntervalRef.current = setInterval(poll, WAVELESS_POLL_INTERVAL_MS);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSession?.id, activeSession?.strategy, activeSession?.status]);

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
        } catch (error: any) {
            if (!error?.message?.includes('No active session found')) {
                console.error('Failed to check active session', error);
            }
        }
    }

    const startSession = async () => {
        if (!selectedWarehouseId) {
            alert('Please select a warehouse first');
            return;
        }

        setLoading(true);
        try {
            const { createPickingSession } = await import('@/lib/api');
            const session = await createPickingSession({
                warehouseId: selectedWarehouseId,
                strategy,
                criteria: (strategy === 'WAVELESS' || strategy === 'ZONE') ? undefined : criteria,
                maxOrders: strategy === 'WAVELESS' ? undefined : (strategy === 'WAVE' ? waveSize : maxOrders),
                waveSize: strategy === 'WAVE' ? waveSize : undefined,
                waveReleaseCadenceMinutes: strategy === 'WAVE' ? waveReleaseCadenceMinutes : undefined,
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

    const handleException = (task: any) => {
        setExceptionModal({ isOpen: true, task });
        setExceptionReason('');
        setExceptionQuantity('0');
    };

    const submitException = async () => {
        const task = exceptionModal.task;
        if (!task || !exceptionReason.trim()) {
            alert('Please enter an exception reason');
            return;
        }

        const pickedQty = parseInt(exceptionQuantity);
        if (isNaN(pickedQty) || pickedQty < 0 || pickedQty > task.quantity) {
            alert(`Invalid quantity. Must be between 0 and ${task.quantity}`);
            return;
        }

        try {
            const { updatePickingTask } = await import('@/lib/api');
            await updatePickingTask(task.id, {
                pickedQuantity: pickedQty,
                status: pickedQty === 0 ? 'FAILED' : 'PARTIALLY_PICKED',
                exceptionReason: exceptionReason.trim()
            });
            setExceptionModal({ isOpen: false, task: null });
            checkActiveSession();
        } catch (error) {
            console.error('Failed to report exception:', error);
            alert('Failed to report exception');
        }
    };

    const completeSession = async () => {
        if (!activeSession) return;

        // Check if all tasks are handled
        const pendingTasks = (activeSession.tasks || []).filter((t: any) => t.status === 'PENDING');
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

    const handleResequence = async () => {
        if (!activeSession) return;
        setResequencing(true);
        try {
            const { reoptimisePickingSession } = await import('@/lib/api');
            await reoptimisePickingSession(activeSession.id);
            await checkActiveSession();
        } catch (error) {
            console.error('Failed to re-sequence:', error);
            alert('Failed to re-sequence tasks');
        } finally {
            setResequencing(false);
        }
    };

    const printPicklist = async () => {
        if (!activeSession) return;
        try {
            const { downloadPicklistPdf } = await import('@/lib/api');
            const blob = await downloadPicklistPdf(activeSession.id);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error) {
            console.error('Failed to download picklist', error);
            alert('Failed to download picking list PDF');
        }
    };

    // Helper: Build location breadcrumb path
    const getLocationPath = (location: any): string[] => {
        const path: string[] = [];
        let current = location;

        while (current) {
            path.unshift(current.name);
            current = current.parent;
        }

        return path;
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
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center">
                    <div className="bg-blue-50 p-6 rounded-full mb-6">
                        <ClipboardList className="h-12 w-12 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Picking Session</h2>

                    <div className="w-full max-w-sm text-left mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
                        <select
                            value={strategy}
                            onChange={(e: any) => setStrategy(e.target.value)}
                            className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="SINGLE">Single Order</option>
                            <option value="BATCH">Batch Picking</option>
                            <option value="CLUSTER">Cluster Picking</option>
                            <option value="WAVE">Wave Picking</option>
                            <option value="WAVELESS">Waveless (Continuous Flow)</option>
                            <option value="ZONE">Zone Picking</option>
                        </select>
                        {{
                            SINGLE:   <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">Pick one order at a time. Best for low volumes or urgent single-order fulfilment.</p>,
                            BATCH:    <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">Group multiple orders in one walk. Reduces travel time when orders share similar pick locations.</p>,
                            CLUSTER:  <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">Assign 2–4 orders to a single picker with labelled totes. Good for small-parcel e-commerce.</p>,
                            WAVE:     <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">Release a batch of orders on a schedule or by order count. Aligns picking with packing and shipping cut-offs.</p>,
                            WAVELESS: <p className="mt-2 text-xs text-blue-50 border border-blue-100 rounded p-2 text-blue-700">Continuous flow — tasks are assigned in real time as orders are reserved. No manual grouping needed. The task list refreshes automatically every 8 s.</p>,
                            ZONE:     <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">Tasks are sorted by warehouse zone so pickers work through one zone at a time, minimising cross-aisle travel.</p>,
                        }[strategy]}
                        {(strategy === 'BATCH' || strategy === 'CLUSTER') && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grouping Criteria</label>
                                <select
                                    value={criteria}
                                    onChange={(e) => setCriteria(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="Destination">Destination</option>
                                    <option value="Product Type">Product Type</option>
                                    <option value="Shipping Cut-off">Shipping Cut-off</option>
                                </select>
                            </div>
                        )}
                        {strategy === 'WAVE' && (
                            <div className="mt-4 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Wave Size (orders per wave)</label>
                                    <input
                                        type="number"
                                        min="1" max="200"
                                        value={waveSize}
                                        onChange={(e) => setWaveSize(parseInt(e.target.value) || 1)}
                                        className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Release Cadence (minutes between waves)</label>
                                    <input
                                        type="number"
                                        min="1" max="1440"
                                        value={waveReleaseCadenceMinutes}
                                        onChange={(e) => setWaveReleaseCadenceMinutes(parseInt(e.target.value) || 1)}
                                        className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        {(strategy === 'SINGLE' || strategy === 'BATCH' || strategy === 'CLUSTER' || strategy === 'ZONE') && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders Limit</label>
                                <input
                                    type="number"
                                    min="1" max="100"
                                    value={maxOrders}
                                    onChange={(e) => setMaxOrders(parseInt(e.target.value) || 1)}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        )}
                        {strategy === 'WAVELESS' && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm">
                                <b>Waveless Mode:</b> Tasks will be continuously assigned from a live queue as orders are reserved. Grouping controls are disabled.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => startSession()}
                        disabled={loading || !selectedWarehouseId}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        {loading ? (
                            <>
                                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Starting Session...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="h-6 w-6" />
                                Start Picking Session
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Active Session: {activeSession.id.substring(0, 8)}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {activeSession.strategy} STRATEGY
                                </span>
                                {activeSession.strategy === 'WAVELESS' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <Wifi className="h-3 w-3" /> Live
                                        {newTaskCount > 0 && (
                                            <span className="ml-1 bg-green-600 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">
                                                +{newTaskCount}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleResequence}
                                disabled={resequencing}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                                title="Re-optimise task order by location zone"
                            >
                                {resequencing
                                    ? <div className="h-4 w-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                                    : <ArrowRight className="h-4 w-4" />}
                                Re-sequence
                            </button>
                            <button
                                onClick={printPicklist}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Printer className="h-4 w-4" />
                                Print Picklist
                            </button>
                            <button
                                onClick={completeSession}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Complete Session
                            </button>
                        </div>
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
                                    {activeSession.tasks?.map((task: any) => (
                                        <tr key={task.id} className={
                                            task.status === 'PICKED' ? 'bg-green-50' :
                                                task.status === 'FAILED' ? 'bg-red-50' :
                                                    (task.status === 'IN_PROGRESS' || task.status === 'COMPLETED') ? 'bg-blue-50' :
                                                        task.status === 'PICKED' ? 'bg-green-50' : ''
                                        }>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.product.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {(() => {
                                                    const path = getLocationPath(task.sourceLocation);
                                                    if (path.length === 1) {
                                                        // No hierarchy, just show name
                                                        return <span className="font-medium text-gray-900">{path[0]}</span>;
                                                    }

                                                    return (
                                                        <div className="flex flex-col">
                                                            {/* Breadcrumb trail */}
                                                            <div className="text-xs text-gray-400 mb-1">
                                                                {path.slice(0, -1).join(' → ')}
                                                            </div>
                                                            {/* Final location (emphasized) */}
                                                            <div className="font-medium text-gray-900">
                                                                {path[path.length - 1]}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.order.id.substring(0, 8)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                                {task.status === 'PENDING' ? task.quantity : `${task.pickedQuantity}/${task.quantity}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${(task.status === 'PICKED' || task.status === 'COMPLETED') ? 'bg-green-100 text-green-800' :
                                                        task.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                            task.status === 'PARTIALLY_PICKED' ? 'bg-yellow-100 text-yellow-800' :
                                                                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
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

            <ExceptionModal
                isOpen={exceptionModal.isOpen}
                task={exceptionModal.task}
                exceptionReason={exceptionReason}
                exceptionQuantity={exceptionQuantity}
                onReasonChange={setExceptionReason}
                onQuantityChange={setExceptionQuantity}
                onSubmit={submitException}
                onClose={() => setExceptionModal({ isOpen: false, task: null })}
            />
        </div>
    );
}


