
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchaseOrder, receivePurchaseOrder, fetchPurchaseOrderReceipts, fetchLocations } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import useSWR from 'swr';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ReceivePurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const unwrappedParams = use(params);
    // Sanitize ID by replacing any spaces with hyphens (e.g. from copy-pasting URL)
    const id = unwrappedParams.id.replace(/\s+/g, '-');
    const [po, setPo] = useState<any>(null);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
    const [destinationLocationId, setDestinationLocationId] = useState('');
    const [quantitiesInitialized, setQuantitiesInitialized] = useState(false);

    const { data: locations } = useSWR('locations', () => fetchLocations());

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [poData, receiptsData, locationsData] = await Promise.all([
                getPurchaseOrder(id),
                fetchPurchaseOrderReceipts(id),
                fetchLocations()
            ]);
            setPo(poData);
            setReceipts(receiptsData);

            // Initialize receive quantities to 0 only on first load (prevents StrictMode double-invoke from resetting user edits)
            setQuantitiesInitialized(prev => {
                if (!prev) {
                    const initialQuantities: Record<string, number> = {};
                    poData.items.forEach((item: any) => {
                        initialQuantities[item.productId] = 0;
                    });
                    setReceiveQuantities(initialQuantities);
                    return true;
                }
                return prev;
            });

            // Auto-select a receiving location if possible
            const receivingLoc = locationsData?.find((l: any) =>
                l.name.toLowerCase().includes('receiving') ||
                l.name.toLowerCase().includes('dock') ||
                l.name.toLowerCase().includes('input')
            );
            if (receivingLoc) {
                setDestinationLocationId(receivingLoc.id);
            }

        } catch (err) {
            console.error('Failed to load PO data', err);
            toast.error('Failed to load PO data');
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
        const received = item.receivedQuantity || 0;
        return Math.max(0, item.quantity - received);
    };

    const handleReceiveAll = () => {
        const allQuantities: Record<string, number> = {};
        po.items.forEach((item: any) => {
            allQuantities[item.productId] = calculateRemaining(item);
        });
        setReceiveQuantities(allQuantities);
    };

    const handleSubmit = async () => {
        if (!destinationLocationId) {
            alert('Please select a destination location.');
            return;
        }

        const itemsToReceive = Object.entries(receiveQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => {
                // Find the PO item to get its ID
                const poItem = po.items.find((item: any) => item.productId === productId);
                return {
                    poItemId: poItem?.id || productId, // Use poItem.id if available
                    quantity: qty
                };
            });

        if (itemsToReceive.length === 0) {
            alert('Please enter at least one quantity to receive.');
            return;
        }

        try {
            await receivePurchaseOrder(id, destinationLocationId, itemsToReceive);
            toast.success('Receipt processed successfully!');
            router.push(`/inventory/purchases/${id}`);
        } catch (err) {
            console.error('Failed to receive items', err);
            toast.error('Failed to process receipt.');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!po) return <div className="p-8 text-center">Purchase Order not found</div>;
    if (po.approvalStatus !== 'APPROVED') {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Purchase Order Not Approved</h1>
                <p className="text-gray-600 mb-6">This PO is currently in "{po.approvalStatus || 'DRAFT'}" status. Goods can only be received once the PO has been fully approved.</p>
                <Button onClick={() => router.push(`/inventory/purchases/${id}`)}>
                    Return to Order Details
                </Button>
            </div>
        );
    }

    // TODO: Fetch locations for dropdown
    // For MVP, maybe hardcode or fetch warehouses/locations. 
    // Let's assume user knows location ID or we fetch it.
    // Ideally we should fetch locations here.

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-6">Receive Purchase Order #{po.poNumber}</h1>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Destination Location</label>
                        <Select
                            value={destinationLocationId}
                            onValueChange={setDestinationLocationId}
                        >
                            <SelectTrigger className="w-full" data-testid="receiving-location-select">
                                <SelectValue placeholder="Select receiving location" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations?.map((loc: any) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name} {loc.code ? `(${loc.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Select the dock or receiving area.</p>
                    </div>
                    <div className="flex items-end pb-1">
                        <Button variant="outline" onClick={handleReceiveAll} className="w-full">
                            Receive All Quantities
                        </Button>
                    </div>
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
                    <Button
                        variant="default"
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="confirm-receipt-btn"
                    >
                        Confirm Receipt
                    </Button>
                </div>
            </div>
        </div>
    );
}
