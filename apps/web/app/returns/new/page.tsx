
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchOrders, fetchOrder, createReturnRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewReturnPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<{ [key: string]: { quantity: number; reason: string } }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        const allOrders = await fetchOrders();
        // Filter for eligible orders (SHIPPED/DELIVERED/COMPLETED Sales Orders)
        // For E2E simplicity, we allow SHIPPED currently
        setOrders(allOrders.filter((o: any) => o.type === 'SALES' && ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(o.status)));
    }

    async function handleOrderSelect(orderId: string) {
        setSelectedOrderId(orderId);
        setLoading(true);
        try {
            const order = await fetchOrder(orderId);
            setSelectedOrder(order);
            setReturnItems({}); // Reset selection
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleQuantityChange = (productId: string, qty: number) => {
        setReturnItems(prev => ({
            ...prev,
            [productId]: { ...prev[productId], quantity: qty }
        }));
    };

    const handleReasonChange = (productId: string, reason: string) => {
        setReturnItems(prev => ({
            ...prev,
            [productId]: { ...prev[productId], reason }
        }));
    };

    const isSelected = (productId: string) => {
        return (returnItems[productId]?.quantity || 0) > 0;
    };

    async function handleSubmit() {
        if (!selectedOrderId) return;

        const itemsToReturn = Object.entries(returnItems)
            .filter(([_, data]) => data.quantity > 0)
            .map(([productId, data]) => ({
                productId,
                quantity: data.quantity,
                returnReason: data.reason || 'No reason provided'
            }));

        if (itemsToReturn.length === 0) {
            alert('Please select at least one item to return');
            return;
        }

        try {
            await createReturnRequest({
                originalOrderId: selectedOrderId,
                items: itemsToReturn
            });
            router.push('/returns');
        } catch (error) {
            console.error('Failed to create return:', error);
            alert('Failed to create return request');
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Create Return Request</h1>

            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="space-y-2">
                    <Label>Select Sales Order</Label>
                    <Select onValueChange={handleOrderSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an order..." />
                        </SelectTrigger>
                        <SelectContent>
                            {orders.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    Order #{o.id.substring(0, 8)} - {o.customer?.name || 'Unknown Customer'} ({o.status})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedOrder && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Order Items</h3>
                        <table className="min-w-full divide-y divide-gray-200 border rounded">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Purchased</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Return Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {selectedOrder.items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 text-sm">{item.product?.name || item.productId}</td>
                                        <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                        <td className="px-4 py-3">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={item.quantity}
                                                className="w-20"
                                                defaultValue={0}
                                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                placeholder="Defective, Wrong size..."
                                                onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSubmit}>Create Return</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
