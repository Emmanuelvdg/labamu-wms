
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchWarehouses, fetchProducts, createTransferRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Plus, Trash } from 'lucide-react';

export default function NewTransferPage() {
    const router = useRouter();
    const { data: warehouses } = useSWR('warehouses', fetchWarehouses);
    const { data: products } = useSWR('products', fetchProducts);

    const [formData, setFormData] = useState({
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        items: [{ productId: '', quantity: 1 }]
    });

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: '', quantity: 1 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        try {
            if (!formData.sourceWarehouseId || !formData.destinationWarehouseId) {
                toast.error('Please select source and destination warehouses');
                return;
            }
            if (formData.sourceWarehouseId === formData.destinationWarehouseId) {
                toast.error('Source and destination must be different');
                return;
            }

            await createTransferRequest({
                sourceWarehouseId: formData.sourceWarehouseId,
                destinationWarehouseId: formData.destinationWarehouseId,
                items: formData.items
            });

            toast.success('Transfer request created');
            router.push('/inventory/transfers');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create transfer');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">New Stock Transfer</h1>

            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Source Warehouse</Label>
                        <Select
                            value={formData.sourceWarehouseId}
                            onValueChange={(val) => setFormData({ ...formData, sourceWarehouseId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Destination Warehouse</Label>
                        <Select
                            value={formData.destinationWarehouseId}
                            onValueChange={(val) => setFormData({ ...formData, destinationWarehouseId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Destination" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Items</h3>
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </div>

                    {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-4 items-end border p-4 rounded-md bg-gray-50">
                            <div className="flex-1 space-y-2">
                                <Label>Product</Label>
                                <Select
                                    value={item.productId}
                                    onValueChange={(val) => handleItemChange(index, 'productId', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-32 space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                                />
                            </div>
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                disabled={formData.items.length === 1}
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Transfer</Button>
                </div>
            </div>
        </div>
    );
}
