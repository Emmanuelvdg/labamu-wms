
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchOrder, receiveReturn } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function ReceiveReturnPage() {
    const router = useRouter();
    const params = useParams();
    const [rma, setRma] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [conditions, setConditions] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (params.id) loadRma(params.id as string);
    }, [params.id]);

    async function loadRma(id: string) {
        try {
            const data = await fetchOrder(id);
            setRma(data);

            // Initialize conditions
            const initialConditions: any = {};
            data.items.forEach((item: any) => {
                initialConditions[item.productId] = 'SELLABLE';
            });
            setConditions(initialConditions);
        } catch (error) {
            console.error('Failed to load RMA:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleConditionChange = (productId: string, condition: string) => {
        setConditions(prev => ({
            ...prev,
            [productId]: condition
        }));
    };

    async function handleSubmit() {
        if (!rma) return;

        // Prepare payload: map items to received quantities & conditions
        // Assuming receiving FULL quantity for simplicity in this UI
        // In reality, might split lines (e.g. 1 Damaged, 1 Sellable).
        // For MVP: We process line-by-line as defined in ReturnsService. 
        // But UI here is simple: 1 item row -> 1 condition. 
        // If user returns 2 items and 1 is damaged, 1 is sellable, our backend supports it, 
        // but this simple UI assumes entire line has same condition.
        // Limitation: If >1 qty per line, this UI forces same condition. 
        // TODO: Support split receiving later.

        const itemsToReceive = rma.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            condition: conditions[item.productId] || 'SELLABLE'
        }));

        try {
            await receiveReturn(rma.id, { items: itemsToReceive });
            router.push('/returns');
        } catch (error) {
            console.error('Failed to process return:', error);
            alert('Failed to process return');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!rma) return <div className="p-8">Return not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Process Return: {rma.id.substring(0, 8)}</h1>
                <Badge variant={rma.status === 'COMPLETED' ? 'default' : 'secondary'}>{rma.status}</Badge>
            </div>

            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Original Order:</span>
                        <span className="ml-2 font-medium">{rma.parentOrderId?.substring(0, 8)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 font-medium">{new Date(rma.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-4">Items to Receive</h3>
                    <div className="space-y-4">
                        {rma.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                <div>
                                    <p className="font-medium">{item.product?.name || item.productId}</p>
                                    <p className="text-sm text-gray-500">Reason: {item.returnReason}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-sm">
                                        <span className="text-gray-500 block">Quantity</span>
                                        <span className="font-medium text-lg">{item.quantity}</span>
                                    </div>
                                    <div className="w-48">
                                        <span className="text-xs text-gray-500 mb-1 block">Condition</span>
                                        <Select
                                            value={conditions[item.productId]}
                                            onValueChange={(val) => handleConditionChange(item.productId, val)}
                                            disabled={rma.status === 'COMPLETED'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SELLABLE">Sellable (Restock)</SelectItem>
                                                <SelectItem value="DAMAGED">Damaged (Quarantine)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {rma.status !== 'COMPLETED' && (
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSubmit} size="lg">Confirm Receipt & Update Inventory</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
