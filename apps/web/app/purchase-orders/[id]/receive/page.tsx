
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchOrder, receivePurchaseOrder, fetchPurchaseOrderReceipts } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ReceivePurchaseOrderPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [po, setPo] = useState<any>(null);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
    const [destinationLocationId, setDestinationLocationId] = useState('');

    useEffect(() => {
        loadData();
    }, [params.id]);

    async function loadData() {
        try {
            const [poData, receiptsData] = await Promise.all([
                fetchOrder(params.id), // Assuming fetchOrder handles POs too or we need fetchPurchaseOrder
                fetchPurchaseOrderReceipts(params.id)
            ]);
            setPo(poData);
            setReceipts(receiptsData);

            // Initialize receive quantities to 0
            const initialQuantities: Record<string, number> = {};
            poData.items.forEach((item: any) => {
                initialQuantities[item.productId] = 0;
            });
            setReceiveQuantities(initialQuantities);

        } catch (err) {
            console.error('Failed to load PO data', err);
        } finally {
            setLoading(false);
        }
    }

    const handleQuantityChange = (productId: string, value: string) => {
        const qty = parseInt(value) || 0;
        setReceiveQuantities(prev => ({
            ...prev,
            [productId]: qty
        }));
    };

    const calculateRemaining = (item: any) => {
        // This logic depends on how the backend returns data. 
        // If backend returns 'receivedQuantity' on the item, use that.
        // Otherwise, sum up from receipts.
        // For now, assuming item.receivedQuantity is updated by backend.
        return item.quantity - (item.receivedQuantity || 0);
    };

    const handleSubmit = async () => {
        if (!destinationLocationId) {
            alert('Please select a destination location.');
            return;
        }

        const itemsToReceive = Object.entries(receiveQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => ({
                productId,
                quantity: qty,
                locationId: destinationLocationId
            }));

        if (itemsToReceive.length === 0) {
            alert('Please enter at least one quantity to receive.');
            return;
        }

        try {
            await receivePurchaseOrder(params.id, itemsToReceive);
            alert('Receipt processed successfully!');
            router.push(`/inventory/purchases/${params.id}`);
        } catch (err) {
            console.error('Failed to receive items', err);
            alert('Failed to process receipt.');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!po) return <div className="p-8">Purchase Order not found</div>;

    // TODO: Fetch locations for dropdown
    // For MVP, maybe hardcode or fetch warehouses/locations. 
    // Let's assume user knows location ID or we fetch it.
    // Ideally we should fetch locations here.

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-6">Receive Purchase Order #{po.orderNumber}</h1>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination Location ID</label>
                    <input
                        type="text"
                        value={destinationLocationId}
                        onChange={(e) => setDestinationLocationId(e.target.value)}
                        className="border rounded px-3 py-2 w-full max-w-xs"
                        placeholder="e.g., LOC-001"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the ID of the location where items will be stored.</p>
                </div>

                <table className="min-w-full divide-y divide-gray-200 mb-6">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receive Now</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {po.items.map((item: any) => {
                            const remaining = calculateRemaining(item);
                            return (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{item.product?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.receivedQuantity || 0}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{remaining}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            min="0"
                                            max={remaining}
                                            className="border rounded px-2 py-1 w-24"
                                            value={receiveQuantities[item.productId] || 0}
                                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Confirm Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}
