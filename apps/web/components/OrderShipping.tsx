'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function OrderShipping({ order, onUpdate }: { order: any, onUpdate: () => void }) {
    const [methods, setMethods] = useState<any[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState(order.deliveryMethodId || '');
    const [loading, setLoading] = useState(false);
    const [calculatedCost, setCalculatedCost] = useState<number | null>(order.shippingCost || null);

    useEffect(() => {
        // Fetch active methods
        api.get('/shipping/methods').then(setMethods);
    }, []);

    const handleMethodChange = async (methodId: string) => {
        setSelectedMethodId(methodId);
        if (!methodId) {
            setCalculatedCost(0);
            return;
        }

        setLoading(true);
        try {
            // Calculate cost logic (simulated for now, or calling backend)
            // Ideally we'd call an endpoint like POST /orders/:id/quote
            // accessible via updateOrder for now or a specific calc route

            // For now, let's just create a calculation via the service we made
            // But we don't have order weight here easily unless we sum items.
            // Let's rely on the update call to finalize it.

            // To show a PREVIEW, we might need a calc endpoint.
            // We added POST /shipping/calculate

            // Calculate total weight/volume roughly
            const items = order.items || [];
            // We assume items have product info embedded if we included it
            // If not, we might need to fetch checks.

            // Simplified:
            const response = await api.post('/shipping/calculate', {
                methodId,
                weight: items.reduce((sum: number, i: any) => sum + (i.product?.weight || 0) * i.quantity, 0),
                volume: items.reduce((sum: number, i: any) => sum + ((i.product?.width || 0) * (i.product?.height || 0) * (i.product?.length || 0) / 1000000) * i.quantity, 0),
                price: 0
            });

            setCalculatedCost(response);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const applyShipping = async () => {
        if (!selectedMethodId) return;
        setLoading(true);
        try {
            await api.put(`/orders/${order.id}`, {
                deliveryMethodId: selectedMethodId,
                // Backend will recalculate cost to be safe
            });
            onUpdate();
        } catch (e) {
            alert('Failed to apply shipping');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded shadow mt-4">
            <h3 className="font-bold text-lg mb-2">Shipping & Delivery</h3>
            <div className="flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Delivery Method</label>
                    <select
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                        value={selectedMethodId}
                        onChange={(e) => handleMethodChange(e.target.value)}
                        disabled={order.status !== 'PENDING' && order.status !== 'DRAFT'}
                    >
                        <option value="">Select a method...</option>
                        {methods.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} ({m.provider === 'FIXED_PRICE' ? 'Fixed' : 'Rules'})
                            </option>
                        ))}
                    </select>
                </div>
                {selectedMethodId && (
                    <div className="mb-2">
                        <span className="text-sm text-gray-500 block">Estimated Cost</span>
                        <span className="font-bold text-xl">
                            {loading ? '...' : `$${(calculatedCost || 0).toLocaleString()}`}
                        </span>
                    </div>
                )}
                <div>
                    {(order.status === 'PENDING' || order.status === 'DRAFT') && (
                        <button
                            onClick={applyShipping}
                            disabled={loading || selectedMethodId === order.deliveryMethodId}
                            className={`px-4 py-2 rounded ${selectedMethodId === order.deliveryMethodId ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {selectedMethodId === order.deliveryMethodId ? 'Applied' : 'Apply'}
                        </button>
                    )}
                </div>
            </div>
            {order.shippingCostInCOGS && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-1 rounded inline-block">
                    Included in COGS (STO/IWT)
                </div>
            )}
        </div>
    );
}
