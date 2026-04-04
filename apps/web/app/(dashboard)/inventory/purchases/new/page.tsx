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
    const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number; packagingId?: string }[]>([]);
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

    const [packagingOptions, setPackagingOptions] = useState<Record<string, any[]>>({});

    // ... (existing loadData)

    function addItem() {
        setItems([...items, { productId: '', quantity: 1, unitCost: 0, packagingId: undefined }]);
    }

    function updateItem(index: number, field: string, value: any) {
        const newItems = [...items];
        // @ts-ignore
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    }

    async function handleProductChange(index: number, productId: string) {
        // Look up the product to auto-fill unit cost from its averageCost
        const selectedProduct = products.find(p => p.id === productId);
        const autoCost = selectedProduct?.averageCost ?? 0;

        // Combine both updates into a single atomic operation
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            productId,
            unitCost: autoCost,       // Auto-fill from product cost (user can override)
            packagingId: undefined     // Reset packaging when product changes
        };
        setItems(newItems);

        if (productId && !packagingOptions[productId]) {
            // Fetch packaging
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/inventory/products/${productId}/packaging`);
                if (res.ok) {
                    const data = await res.json();
                    setPackagingOptions(prev => ({ ...prev, [productId]: data }));
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    function removeItem(index: number) {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    }

    const [formData, setFormData] = useState({
        poNumber: '',
        orderDate: new Date().toISOString().slice(0, 10),
        buyerName: 'Labamu Inc.', // Default
        buyerAddress: '123 Main St, Tech City',
        buyerContact: 'procurement@labamu.com',
        shipToAddress: 'Warehouse A, 456 Logistics Blvd',
        billToAddress: '123 Main St, Tech City',
        paymentTerms: 'Net 30',
        deliveryTerms: 'FOB Destination',
        notes: '',
        taxAmount: 0,
        shippingCost: 0
    });

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const totalAmount = subtotal + Number(formData.taxAmount) + Number(formData.shippingCost);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!supplierId || items.length === 0) return;

        setLoading(true);
        try {
            await createPurchaseOrder({
                supplierId,
                ...formData,
                orderDate: new Date(formData.orderDate),
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    unitCost: Number(i.unitCost),
                    packagingId: i.packagingId || undefined,
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
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Purchase Order</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Section */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h2 className="text-lg font-semibold border-b pb-2">Order Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number (Optional)</label>
                            <Input
                                placeholder="Auto-generated if empty"
                                value={formData.poNumber}
                                onChange={e => setFormData({ ...formData, poNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                            <Input
                                type="date"
                                value={formData.orderDate}
                                onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
                                required
                            />
                        </div>
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
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Buyer Info</h3>
                            <Input placeholder="Buyer Name" value={formData.buyerName} onChange={e => setFormData({ ...formData, buyerName: e.target.value })} />
                            <Input placeholder="Buyer Address" value={formData.buyerAddress} onChange={e => setFormData({ ...formData, buyerAddress: e.target.value })} />
                            <Input placeholder="Contact Info" value={formData.buyerContact} onChange={e => setFormData({ ...formData, buyerContact: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Shipping & Billing</h3>
                            <Input placeholder="Ship To Address" value={formData.shipToAddress} onChange={e => setFormData({ ...formData, shipToAddress: e.target.value })} />
                            <Input placeholder="Bill To Address" value={formData.billToAddress} onChange={e => setFormData({ ...formData, billToAddress: e.target.value })} />
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h2 className="text-lg font-semibold">Items</h2>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-4 items-end border p-3 rounded flex-wrap bg-gray-50">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-medium text-gray-500">Product</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={item.productId}
                                        onChange={e => handleProductChange(index, e.target.value)}
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-40">
                                    <label className="block text-xs font-medium text-gray-500">Unit</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        // @ts-ignore
                                        value={item.packagingId || ''}
                                        onChange={e => updateItem(index, 'packagingId', e.target.value || undefined)}
                                    >
                                        <option value="">Base Unit</option>
                                        {item.productId && packagingOptions[item.productId]?.map((pkg: any) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.name} ({pkg.quantity} units)
                                            </option>
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
                                <div className="w-24 text-right">
                                    <label className="block text-xs font-medium text-gray-500">Total</label>
                                    <div className="py-2 text-sm font-medium">
                                        ${(item.quantity * item.unitCost).toFixed(2)}
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(index)}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer & Financials */}
                <div className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold border-b pb-2">Terms & Notes</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                            <Input value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                            <Input value={formData.deliveryTerms} onChange={e => setFormData({ ...formData, deliveryTerms: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms & Conditions</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm h-24"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold border-b pb-2">Order Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Tax Amount:</span>
                                <Input
                                    type="number"
                                    className="w-32 text-right h-8"
                                    min="0"
                                    step="0.01"
                                    value={formData.taxAmount}
                                    onChange={e => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Shipping Cost:</span>
                                <Input
                                    type="number"
                                    className="w-32 text-right h-8"
                                    min="0"
                                    step="0.01"
                                    value={formData.shippingCost}
                                    onChange={e => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                <span>Total:</span>
                                <span>${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? 'Creating...' : 'Create Purchase Order'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
