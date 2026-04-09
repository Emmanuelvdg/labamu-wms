'use client';

import { useState, useEffect } from 'react';
import {
    Package,
    MapPin,
    CheckCircle2,
    ArrowRight,
    Building,
    AlertTriangle
} from 'lucide-react';

// Import from both API files
import { fetchWarehouses } from '@/lib/api';
import {
    createPutawaySession,
    getActivePutawaySession,
    updatePutawayTask,
    completePutawaySession
} from '@/lib/putaway-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExceptionModal from './exception-modal';

export default function PutawayPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [exceptionModal, setExceptionModal] = useState<{ isOpen: boolean; task: any | null }>({ isOpen: false, task: null });

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
            console.log('[Putaway] Loading warehouses...');
            const data = await fetchWarehouses();
            console.log('[Putaway] Warehouses loaded:', data);
            setWarehouses(data);
            if (data.length > 0) {
                console.log('[Putaway] Setting selected warehouse to:', data[0].id);
                setSelectedWarehouseId(data[0].id);
            } else {
                console.warn('[Putaway] No warehouses found!');
            }
        } catch (err) {
            console.error('Failed to load warehouses', err);
        }
    }

    async function checkActiveSession() {
        if (!selectedWarehouseId) {
            console.log('[Putaway] No warehouse selected, skipping session check');
            return;
        }

        try {
            const session = await getActivePutawaySession(selectedWarehouseId);
            setActiveSession(session);
        } catch (error: any) {
            if (!error?.message?.includes('No active session found')) {
                console.error('Failed to check active session', error);
            }
            setActiveSession(null);
        }
    }

    const startSession = async () => {
        if (!selectedWarehouseId) {
            alert('Please select a warehouse first');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const session = await createPutawaySession({
                warehouseId: selectedWarehouseId
            });
            setActiveSession(session);
        } catch (error: any) {
            console.error('Failed to start session:', error);

            // Extract detailed error information from response
            const errorData = error.response?.data || error;
            setError(errorData);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = async (task: any) => {
        try {
            await updatePutawayTask(task.id, {
                status: 'IN_PROGRESS'
            });
            checkActiveSession();
        } catch (error) {
            console.error('Failed to start task:', error);
            alert('Failed to start task');
        }
    };

    const handleConfirmPutaway = async (task: any) => {
        try {
            await updatePutawayTask(task.id, {
                putawayQuantity: task.quantity,
                status: 'COMPLETED'
            });
            checkActiveSession();
        } catch (error) {
            console.error('Failed to confirm putaway:', error);
            alert('Failed to confirm putaway');
        }
    };

    const handleException = (task: any) => {
        setExceptionModal({ isOpen: true, task });
    };

    const handleExceptionSubmit = async (exceptionData: any) => {
        try {
            await updatePutawayTask(exceptionData.taskId, exceptionData.data);
            setExceptionModal({ isOpen: false, task: null });
            checkActiveSession();
        } catch (error) {
            console.error('Failed to handle exception:', error);
            alert('Failed to process exception');
        }
    };

    const handleCompleteSession = async () => {
        try {
            await completePutawaySession(activeSession.id);
            setActiveSession(null);
        } catch (error) {
            console.error('Failed to complete session:', error);
            alert('Failed to complete session');
        }
    };

    const getLocationBreadcrumb = (location: any): string => {
        const parts = [];
        let current = location;
        while (current) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.join(' → ');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'BLOCKED': return 'bg-red-100 text-red-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Putaway Operations</h1>
                <p className="text-gray-600">Store incoming inventory in optimal warehouse locations</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-900 mb-2">
                                {error.message || 'Error Starting Putaway Session'}
                            </h3>

                            {error.details && (
                                <div className="mb-4">
                                    <p className="text-sm text-red-800 mb-2">{error.details.explanation}</p>
                                    {error.details.warehouseName && (
                                        <p className="text-sm text-red-700">
                                            <strong>Warehouse:</strong> {error.details.warehouseName}
                                        </p>
                                    )}
                                    {error.details.receivingLocationsFound !== undefined && (
                                        <p className="text-sm text-red-700">
                                            <strong>Receiving Locations Found:</strong> {error.details.receivingLocationsFound}
                                        </p>
                                    )}
                                </div>
                            )}

                            {error.remediation && (
                                <div className="bg-white rounded-md p-4 border border-red-100">
                                    <h4 className="font-semibold text-red-900 mb-2">How to Fix:</h4>
                                    {error.remediation.quickFix && (
                                        <p className="text-sm text-red-800 mb-3 font-medium">
                                            ✓ {error.remediation.quickFix}
                                        </p>
                                    )}
                                    {error.remediation.steps && (
                                        <ol className="list-decimal list-inside space-y-1 text-sm text-red-800">
                                            {error.remediation.steps.map((step: string, idx: number) => (
                                                <li key={idx}>{step.replace(/^\d+\.\s*/, '')}</li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => setError(null)}
                                className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!activeSession ? (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Warehouse
                        </label>
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                            <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="Select a warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((wh) => (
                                    <SelectItem key={wh.id} value={wh.id}>
                                        {wh.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <button
                        onClick={startSession}
                        disabled={loading || !selectedWarehouseId}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                        <Package className="h-5 w-5" />
                        {loading ? 'Starting...' : 'Start Putaway Session'}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Building className="h-6 w-6 text-blue-600" />
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Active Putaway Session</h2>
                                    <p className="text-sm text-gray-600">
                                        {activeSession.tasks.filter((t: any) => t.status === 'COMPLETED').length} of {activeSession.tasks.length} tasks completed
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleCompleteSession}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete Session
                                </button>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeSession.status)}`}>
                                    {activeSession.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left">
                                        <th className="pb-3 text-sm font-semibold text-gray-700">Product</th>
                                        <th className="pb-3 text-sm font-semibold text-gray-700">From</th>
                                        <th className="pb-3 text-sm font-semibold text-gray-700">To</th>
                                        <th className="pb-3 text-sm font-semibold text-gray-700 text-center">Qty</th>
                                        <th className="pb-3 text-sm font-semibold text-gray-700">Status</th>
                                        <th className="pb-3 text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSession.tasks.map((task: any) => (
                                        <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{task.product.name}</div>
                                                        <div className="text-sm text-gray-500">{task.product.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="h-4 w-4 text-gray-400" />
                                                    <span>{task.sourceLocation.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-2 font-medium text-blue-600">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{task.destinationLocation.name}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {getLocationBreadcrumb(task.destinationLocation)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className="font-semibold text-gray-900">{task.quantity}</span>
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                {task.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleStartTask(task)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                        Start
                                                    </button>
                                                )}
                                                {task.status === 'IN_PROGRESS' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleConfirmPutaway(task)}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => handleException(task)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Exception
                                                        </button>
                                                    </div>
                                                )}
                                                {task.status === 'COMPLETED' && (
                                                    <span className="text-green-600 flex items-center gap-1 text-sm">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Done
                                                    </span>
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
                warehouseId={selectedWarehouseId}
                onClose={() => setExceptionModal({ isOpen: false, task: null })}
                onSubmit={handleExceptionSubmit}
            />
        </div>
    );
}
