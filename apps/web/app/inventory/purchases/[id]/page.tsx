'use client';

import { useEffect, useState } from 'react';
import { fetchPurchaseOrders, receivePurchaseOrder, fetchLocations } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [po, setPo] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [destinationId, setDestinationId] = useState('');
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);

    useEffect(() => {
        loadData();
    }, [params.id]);

    async function loadData() {
        try {
            const orders = await fetchPurchaseOrders(); // Ideally fetch single PO endpoint
            const found = orders.find((o: any) => o.id === params.id);
            setPo(found);

            const locs = await fetchLocations();
            setLocations(locs);
            // Default to first internal location
            const defaultLoc = locs.find((l: any) => l.type === 'INTERNAL');
            if (defaultLoc) setDestinationId(defaultLoc.id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleReceive() {
        if (!destinationId) return;
        setReceiving(true);
        try {
            await receivePurchaseOrder(po.id, destinationId);
            alert('Goods Received Successfully!');
            loadData(); // Reload to show status update
        } catch (e) {
            console.error(e);
            alert('Failed to receive goods');
        } finally {
            setReceiving(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!po) return <div className="p-8">Purchase Order not found</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">PO: {po.id.substring(0, 8).toUpperCase()}</h1>
                    <p className="text-gray-500">Supplier: {po.supplier?.name}</p>
                    <p className="text-gray-500">Date: {format(new Date(po.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
                        ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                            po.status === 'ORDERED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'}`}>
                        {po.status}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {po.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{item.product?.name || item.productId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">{item.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">${item.unitCost.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">${(item.quantity * item.unitCost).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {po.status !== 'RECEIVED' && (
                <div className="bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Receive Goods</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
                            <select
                                className="w-full border rounded p-2"
                                value={destinationId}
                                onChange={e => setDestinationId(e.target.value)}
                            >
                                {locations.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleReceive} disabled={receiving}>
                            {receiving ? 'Receiving...' : 'Receive Products'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
