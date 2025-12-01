'use client';

import { useEffect, useState } from 'react';
import { createPurchaseOrder, fetchInventory, fetchSuppliers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [prods, sups] = await Promise.all([
                fetchInventory(),
                fetchSuppliers()
            ]);
            setProducts(prods);
            setSuppliers(sups);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    }

    function addItem() {
        setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
    }

    function updateItem(index: number, field: string, value: any) {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    }

    function removeItem(index: number) {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!supplierId || items.length === 0) return;

        setLoading(true);
        try {
            await createPurchaseOrder({
                supplierId,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    unitCost: Number(i.unitCost),
                })),
            });
            router.push('/inventory/purchases');
        } catch (error: any) {
            console.error(error);
            alert(`Failed to create PO: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Purchase Order</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <select
                        className="w-full border rounded-md p-2 text-sm"
                        value={supplierId}
                        onChange={e => setSupplierId(e.target.value)}
                        required
                    >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {suppliers.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                            No suppliers found. Please create a supplier in the database first.
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium">Items</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-4 items-end border p-3 rounded">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500">Product</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={item.productId}
                                        onChange={e => updateItem(index, 'productId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-medium text-gray-500">Qty</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={e => updateItem(index, 'quantity', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs font-medium text-gray-500">Unit Cost</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitCost}
                                        onChange={e => updateItem(index, 'unitCost', e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(index)}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Order'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
