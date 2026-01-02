'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function OrderShipping({ order, onUpdate }: { order: any, onUpdate: () => void }) {
    const [methods, setMethods] = useState<any[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState(order.deliveryMethodId || '');
    const [loading, setLoading] = useState(false);
    const [calculatedCost, setCalculatedCost] = useState<number | null>(order.shippingCost || null);
    const [lalamoveQuotationId, setLalamoveQuotationId] = useState<string | null>(null);
    const [bookingDelivery, setBookingDelivery] = useState(false);

    useEffect(() => {
        // Fetch active methods
        api.get('/shipping/methods').then(setMethods);
    }, []);

    // Auto-fetch Lalamove quote if already selected
    useEffect(() => {
        if (selectedMethodId && methods.length > 0) {
            const selectedMethod = methods.find(m => m.id === selectedMethodId);
            if (selectedMethod?.provider === 'LALAMOVE' && order.warehouseId && order.id) {
                // Automatically fetch quote for Lalamove
                setLoading(true);
                api.get(`/lalamove/quotation/${order.id}?warehouseId=${order.warehouseId}`)
                    .then((quotation) => {
                        setCalculatedCost(quotation.price ? parseFloat(quotation.price) : 0);
                        setLalamoveQuotationId(quotation.quotationId || null);
                    })
                    .catch((error) => {
                        console.error('Failed to auto-fetch Lalamove quotation:', error);
                        setCalculatedCost(0);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            }
        }
    }, [selectedMethodId, methods, order.warehouseId, order.id]);

    const handleMethodChange = async (methodId: string) => {
        setSelectedMethodId(methodId);
        if (!methodId) {
            setCalculatedCost(0);
            return;
        }

        setLoading(true);
        try {
            const selectedMethod = methods.find(m => m.id === methodId);

            // If Lalamove, fetch real-time quotation
            if (selectedMethod?.provider === 'LALAMOVE') {
                try {
                    const quotation = await api.get(`/lalamove/quotation/${order.id}?warehouseId=${order.warehouseId}`);
                    setCalculatedCost(quotation.price ? parseFloat(quotation.price) : 0);
                    setLalamoveQuotationId(quotation.quotationId || null);
                } catch (error: any) {
                    console.error('Failed to get Lalamove quotation:', error);
                    alert(`Failed to get Lalamove quote: ${error.message || 'Unknown error'}`);
                    setCalculatedCost(0);
                }
            } else {
                // For other methods, calculate using existing logic
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
            }
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

    const bookLalamoveDelivery = async () => {
        if (!lalamoveQuotationId || !order.warehouseId) {
            alert('Missing quotation. Please select Lalamove delivery method first.');
            return;
        }

        setBookingDelivery(true);
        try {
            const result = await api.post(`/lalamove/orders/${order.id}`, {
                warehouseId: order.warehouseId,
                quotationId: lalamoveQuotationId
            });
            alert(`Delivery booked successfully! Order ID: ${result.lalamoveOrderId}`);
            onUpdate();
        } catch (error: any) {
            console.error('Failed to book delivery:', error);
            alert(`Failed to book delivery: ${error.message || 'Unknown error'}`);
        } finally {
            setBookingDelivery(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded shadow mt-4">
            <h3 className="font-bold text-lg mb-4">Shipping & Delivery</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
                    <select
                        className="block w-full border border-gray-300 rounded p-2"
                        value={selectedMethodId}
                        onChange={(e) => handleMethodChange(e.target.value)}
                        disabled={order.status !== 'PENDING' && order.status !== 'DRAFT'}
                    >
                        <option value="">Select a method...</option>
                        {methods.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} ({m.provider === 'FIXED_PRICE' ? 'Fixed' : m.provider === 'LALAMOVE' ? 'On-Demand' : 'Rules'})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedMethodId && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                            <span className="text-sm text-gray-500 block">Estimated Cost</span>
                            <span className="font-bold text-xl">
                                {loading ? '...' : `$${(calculatedCost || 0).toLocaleString()}`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {(order.status === 'PENDING' || order.status === 'DRAFT') && (
                                <button
                                    onClick={applyShipping}
                                    disabled={loading || selectedMethodId === order.deliveryMethodId}
                                    className={`px-4 py-2 rounded ${selectedMethodId === order.deliveryMethodId ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                >
                                    {selectedMethodId === order.deliveryMethodId ? 'Applied' : 'Apply'}
                                </button>
                            )}

                            {/* Book Delivery button for Lalamove */}
                            {selectedMethodId && methods.find(m => m.id === selectedMethodId)?.provider === 'LALAMOVE' && lalamoveQuotationId && (
                                <button
                                    onClick={bookLalamoveDelivery}
                                    disabled={bookingDelivery}
                                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {bookingDelivery ? 'Booking...' : '📦 Book Delivery'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {order.shippingCostInCOGS && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-1 rounded inline-block">
                    Included in COGS (STO/IWT)
                </div>
            )}
        </div>
    );
}
