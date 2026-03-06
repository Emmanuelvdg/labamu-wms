'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Truck } from 'lucide-react';

export default function OrderShipping({ order, onUpdate }: { order: any, onUpdate: () => void }) {
    const [methods, setMethods] = useState<any[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState(order.deliveryMethodId || '');
    const [loading, setLoading] = useState(false);
    const [calculatedCost, setCalculatedCost] = useState<number | null>(order.shippingCost || null);
    const [lalamoveQuotationId, setLalamoveQuotationId] = useState<string | null>(null);
    const [lalamoveQuoteDetails, setLalamoveQuoteDetails] = useState<any>(null);
    const [bookingDelivery, setBookingDelivery] = useState(false);

    // Shipping Modal State
    const [isShipping, setIsShipping] = useState(false);
    const [carrier, setCarrier] = useState('');
    const [trackingId, setTrackingId] = useState('');

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
                        setLalamoveQuoteDetails(quotation);
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
                    setLalamoveQuoteDetails(quotation);
                } catch (error: any) {
                    console.error('Failed to get Lalamove quotation:', error);
                    alert(`Failed to get Lalamove quote: ${error.message || 'Unknown error'}`);
                    setCalculatedCost(0);
                    setLalamoveQuoteDetails(null);
                }
            } else {
                // Clear Lalamove details when switching away
                setLalamoveQuoteDetails(null);
                setLalamoveQuotationId(null);
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
                quotationId: lalamoveQuotationId,
                stops: lalamoveQuoteDetails?.stops // Include stops with stopIds
            });
            alert(`Delivery booked successfully! Order ID: ${result.lalamoveOrderId}`);
            // Reload order to get updated lalamove booking data
            await onUpdate();
        } catch (error: any) {
            console.error('Failed to book delivery:', error);
            alert(`Failed to book delivery: ${error.message || 'Unknown error'}`);
        } finally {
            setBookingDelivery(false);
        }
    };

    const handleShipOrder = async () => {
        if (!carrier || !trackingId) {
            alert('Please enter Carrier and Tracking ID');
            return;
        }

        setLoading(true);
        try {
            await api.post('/orders/ship', {
                orderId: order.id,
                carrier,
                trackingId
            });
            setIsShipping(false);
            onUpdate();
        } catch (error: any) {
            console.error('Failed to ship order:', error);
            alert(`Failed to ship order: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
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
                        disabled={
                            order.status === 'SHIPPED' ||
                            order.status === 'DELIVERED' ||
                            order.status === 'CANCELLED' ||
                            // Disable if Lalamove delivery is already booked
                            (order.lalamoveOrders && order.lalamoveOrders.length > 0 && order.lalamoveOrders.some((lo: any) => lo.status !== 'CANCELLED'))
                        }
                    >
                        <option value="">Select a method...</option>
                        {methods.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} ({m.provider === 'FIXED_PRICE' ? 'Fixed' : m.provider === 'LALAMOVE' ? 'On-Demand' : 'Rules'})
                            </option>
                        ))}
                    </select>
                    {/* Show locked message if Lalamove delivery is booked */}
                    {order.lalamoveOrders && order.lalamoveOrders.length > 0 && order.lalamoveOrders.some((lo: any) => lo.status !== 'CANCELLED') && (
                        <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Delivery method is locked because a Lalamove delivery has been booked for this order.
                        </div>
                    )}
                </div>

                {selectedMethodId && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                                <span className="text-sm text-gray-500 block">Estimated Cost</span>
                                <span className="font-bold text-xl">
                                    {loading ? '...' : `${lalamoveQuoteDetails?.currency || '$'}${(calculatedCost || 0).toLocaleString()}`}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {/* Show Applied button only if not Lalamove OR if Lalamove but not booked */}
                                {(order.status !== 'SHIPPED' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') &&
                                    !order.lalamoveOrders?.some((lo: any) => lo.status !== 'CANCELLED') && (
                                        <button
                                            onClick={applyShipping}
                                            disabled={loading || selectedMethodId === order.deliveryMethodId}
                                            className={`px-4 py-2 rounded ${selectedMethodId === order.deliveryMethodId ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                        >
                                            {selectedMethodId === order.deliveryMethodId ? 'Applied' : 'Apply'}
                                        </button>
                                    )}

                                {/* Book Delivery button for Lalamove - only show if not booked yet */}
                                {selectedMethodId && methods.find(m => m.id === selectedMethodId)?.provider === 'LALAMOVE' && lalamoveQuotationId &&
                                    !order.lalamoveOrders?.some((lo: any) => lo.status !== 'CANCELLED') && (
                                        <button
                                            onClick={bookLalamoveDelivery}
                                            disabled={bookingDelivery}
                                            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            {bookingDelivery ? 'Booking...' : '📦 Book Delivery'}
                                        </button>
                                    )}

                                {/* Show "Booked" status if Lalamove order exists */}
                                {order.lalamoveOrders?.some((lo: any) => lo.status !== 'CANCELLED') && (
                                    <div className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-medium">
                                        ✓ Booked
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lalamove Quote Details */}
                        {lalamoveQuoteDetails && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">Lalamove Quote Details:</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Service Type:</span>
                                        <span className="font-medium text-gray-900">{lalamoveQuoteDetails.serviceType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Quote expires:</span>
                                        <span className="font-medium text-gray-900">
                                            {lalamoveQuoteDetails.expiresAt ? new Date(lalamoveQuoteDetails.expiresAt).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Shipping Flow for PACKED status (after packing is confirmed) */}
                {order.status === 'PACKED' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Process Shipment</h4>

                        {!isShipping ? (
                            <button
                                onClick={() => setIsShipping(true)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <Truck className="h-5 w-5" />
                                Ship Order
                            </button>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. DHL, FedEx, Local Courier"
                                        value={carrier}
                                        onChange={(e) => setCarrier(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. TRACK-123456789"
                                        value={trackingId}
                                        onChange={(e) => setTrackingId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsShipping(false)}
                                        disabled={loading}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleShipOrder}
                                        disabled={loading}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Confirm Shipment'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {
                order.shippingCostInCOGS && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-1 rounded inline-block">
                        Included in COGS (STO/IWT)
                    </div>
                )
            }
        </div >
    );
}
