'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getAlternativeLocations, handleDamagedInventory, handleQuantityMismatch } from '@/lib/putaway-api';

interface ExceptionModalProps {
    isOpen: boolean;
    task: any;
    warehouseId: string;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export default function ExceptionModal({
    isOpen,
    task,
    warehouseId,
    onClose,
    onSubmit
}: ExceptionModalProps) {
    const [exceptionType, setExceptionType] = useState('LOCATION_FULL');
    const [reason, setReason] = useState('');
    const [damagedQty, setDamagedQty] = useState('0');
    const [goodQty, setGoodQty] = useState('0');
    const [actualQty, setActualQty] = useState('0');
    const [alternativeLocationId, setAlternativeLocationId] = useState('');
    const [alternativeLocations, setAlternativeLocations] = useState<any[]>([]);
    const [requiresSupervisorReview, setRequiresSupervisorReview] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && task) {
            // Reset form
            setExceptionType('LOCATION_FULL');
            setReason('');
            setDamagedQty('0');
            setGoodQty(task.quantity.toString());
            setActualQty(task.quantity.toString());
            setAlternativeLocationId('');
            setRequiresSupervisorReview(false);

            // Load alternative locations for LOCATION_FULL scenario
            if (exceptionType === 'LOCATION_FULL') {
                loadAlternativeLocations();
            }
        }
    }, [isOpen, task]);

    useEffect(() => {
        if (exceptionType === 'LOCATION_FULL' && task) {
            loadAlternativeLocations();
        }
    }, [exceptionType]);

    const loadAlternativeLocations = async () => {
        if (!task || !warehouseId) return;
        try {
            const locations = await getAlternativeLocations(task.id, warehouseId);
            setAlternativeLocations(locations);
            if (locations.length > 0) {
                setAlternativeLocationId(locations[0].id);
            }
        } catch (error) {
            console.error('Failed to load alternative locations:', error);
        }
    };

    const handleSubmit = async () => {
        if (!task) return;

        setLoading(true);
        try {
            let result;

            switch (exceptionType) {
                case 'LOCATION_FULL':
                    if (!alternativeLocationId) {
                        alert('Please select an alternative location');
                        return;
                    }
                    result = {
                        taskId: task.id,
                        data: {
                            status: 'IN_PROGRESS',
                            exceptionType: 'LOCATION_FULL',
                            exceptionReason: 'Recommended location full, redirected to alternative',
                            alternativeLocationId
                        }
                    };
                    break;

                case 'DAMAGED':
                    const damaged = parseInt(damagedQty);
                    const good = parseInt(goodQty);
                    if (damaged + good !== task.quantity) {
                        alert(`Total must equal ${task.quantity}. Damaged (${damaged}) + Good (${good}) = ${damaged + good}`);
                        return;
                    }
                    await handleDamagedInventory(task.id, { damagedQty: damaged, goodQty: good });
                    onClose();
                    onSubmit({ taskId: task.id }); // Trigger refresh
                    return;

                case 'SHORT_RECEIPT':
                case 'OVERAGE':
                    const actual = parseInt(actualQty);
                    if (!reason.trim()) {
                        alert('Please provide a reason for the quantity mismatch');
                        return;
                    }
                    await handleQuantityMismatch(task.id, {
                        expectedQty: task.quantity,
                        actualQty: actual,
                        reason: reason.trim()
                    });
                    onClose();
                    onSubmit({ taskId: task.id }); // Trigger refresh
                    return;

                case 'WRONG_PRODUCT':
                    result = {
                        taskId: task.id,
                        data: {
                            status: 'BLOCKED',
                            exceptionType: 'WRONG_PRODUCT',
                            exceptionReason: reason.trim() || 'Wrong product received',
                            requiresSupervisorReview: true
                        }
                    };
                    break;

                case 'OTHER':
                    if (!reason.trim()) {
                        alert('Please describe the issue');
                        return;
                    }
                    result = {
                        taskId: task.id,
                        data: {
                            status: requiresSupervisorReview ? 'BLOCKED' : 'IN_PROGRESS',
                            exceptionType: 'OTHER',
                            exceptionReason: reason.trim(),
                            requiresSupervisorReview
                        }
                    };
                    break;

                default:
                    alert('Invalid exception type');
                    return;
            }

            onSubmit(result);
            onClose();
        } catch (error: any) {
            console.error('Exception handling failed:', error);
            alert(error.message || 'Failed to process exception');
        } finally {
            setLoading(false);
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

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Report Exception</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Product:</span>
                            <span className="ml-2 font-medium text-gray-900">{task.product.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">SKU:</span>
                            <span className="ml-2 font-medium text-gray-900">{task.product.sku}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Expected Quantity:</span>
                            <span className="ml-2 font-medium text-gray-900">{task.quantity}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Destination:</span>
                            <span className="ml-2 font-medium text-gray-900">{task.destinationLocation.name}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Exception Type *</label>
                        <div className="space-y-2">
                            {[
                                { value: 'LOCATION_FULL', label: 'Location is full/occupied' },
                                { value: 'DAMAGED', label: 'Product damaged' },
                                { value: 'SHORT_RECEIPT', label: 'Missing inventory (quantity short)' },
                                { value: 'OVERAGE', label: 'Extra inventory (quantity over)' },
                                { value: 'WRONG_PRODUCT', label: 'Wrong product received' },
                                { value: 'OTHER', label: 'Other issue' }
                            ].map((option) => (
                                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="exceptionType"
                                        value={option.value}
                                        checked={exceptionType === option.value}
                                        onChange={(e) => setExceptionType(e.target.value)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic form fields based on exception type */}
                    {exceptionType === 'LOCATION_FULL' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alternative Location *
                            </label>
                            {alternativeLocations.length > 0 ? (
                                <select
                                    value={alternativeLocationId}
                                    onChange={(e) => setAlternativeLocationId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {alternativeLocations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name} - {getLocationBreadcrumb(loc)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">
                                    No alternative locations available with sufficient capacity
                                </div>
                            )}
                        </div>
                    )}

                    {exceptionType === 'DAMAGED' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Damaged Quantity *
                                </label>
                                <input
                                    type="number"
                                    value={damagedQty}
                                    onChange={(e) => {
                                        const damaged = parseInt(e.target.value) || 0;
                                        setDamagedQty(e.target.value);
                                        setGoodQty((task.quantity - damaged).toString());
                                    }}
                                    min="0"
                                    max={task.quantity}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Good Quantity (to put away)
                                </label>
                                <input
                                    type="number"
                                    value={goodQty}
                                    onChange={(e) => {
                                        const good = parseInt(e.target.value) || 0;
                                        setGoodQty(e.target.value);
                                        setDamagedQty((task.quantity - good).toString());
                                    }}
                                    min="0"
                                    max={task.quantity}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                                Total must equal {task.quantity}. Current: {parseInt(damagedQty) + parseInt(goodQty)}
                            </div>
                        </>
                    )}

                    {(exceptionType === 'SHORT_RECEIPT' || exceptionType === 'OVERAGE') && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Actual Quantity Received *
                                </label>
                                <input
                                    type="number"
                                    value={actualQty}
                                    onChange={(e) => setActualQty(e.target.value)}
                                    min="0"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                                <div className="mt-1 text-sm text-gray-600">
                                    Expected: {task.quantity}, Difference: {parseInt(actualQty) - task.quantity}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason for Discrepancy *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., Supplier short-shipped, Extra units found in carton"
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </>
                    )}

                    {(exceptionType === 'WRONG_PRODUCT' || exceptionType === 'OTHER') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Describe the Issue *
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Provide detailed description of the issue..."
                                rows={4}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    )}

                    {exceptionType === 'OTHER' && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={requiresSupervisorReview}
                                    onChange={(e) => setRequiresSupervisorReview(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Requires supervisor review</span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? 'Processing...' : 'Submit Exception'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
