
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fetchSuppliers, fetchPurchaseOrders, createInvoice, fetchOrder } from '@/lib/api';

export default function NewInvoicePage() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        vendorId: '',
        invoiceNumber: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        purchaseOrderId: '',
        currencyCode: 'IDR',
        items: [] as any[]
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [suppliersData, posData, currRes] = await Promise.all([
                fetchSuppliers(),
                fetchPurchaseOrders(),
                fetch('/api/currencies').then(r => r.ok ? r.json() : []).catch(() => []),
            ]);
            setSuppliers(suppliersData);
            setPurchaseOrders(posData.filter((po: any) => po.status !== 'CANCELLED'));
            if (Array.isArray(currRes) && currRes.length > 0) {
                setCurrencies(currRes);
                const base = currRes.find((c: any) => c.isBase);
                if (base) setFormData(prev => ({ ...prev, currencyCode: base.code }));
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    }

    const handlePOChange = async (poId: string) => {
        setFormData(prev => ({ ...prev, purchaseOrderId: poId }));
        if (!poId) return;

        try {
            // Fetch full PO details to get items
            const po = await fetchOrder(poId);
            if (po) {
                // Auto-populate vendor if not set
                if (!formData.vendorId) {
                    setFormData(prev => ({ ...prev, vendorId: po.supplierId }));
                }

                // Populate items from PO
                const items = po.items.map((item: any) => ({
                    description: item.product?.name || 'Item',
                    quantity: item.quantity, // Default to ordered qty
                    unitPrice: item.unitCost,
                    productId: item.productId,
                    poItemId: item.id
                }));

                setFormData(prev => ({ ...prev, items }));
            }
        } catch (err) {
            console.error('Failed to fetch PO details', err);
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0 }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = async () => {
        if (!formData.vendorId || !formData.invoiceNumber) {
            alert('Please fill in required fields');
            return;
        }

        try {
            await createInvoice({
                ...formData,
                totalAmount: calculateTotal()
            });
            alert('Invoice created successfully');
            router.push('/invoices');
        } catch (err) {
            console.error('Failed to create invoice', err);
            alert('Failed to create invoice');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow my-8">
            <h1 className="text-2xl font-bold mb-6">New Vendor Invoice</h1>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <select
                        className="w-full border rounded p-2"
                        value={formData.vendorId}
                        onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                    >
                        <option value="">Select Vendor</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Purchase Order</label>
                    <select
                        className="w-full border rounded p-2"
                        value={formData.purchaseOrderId}
                        onChange={e => handlePOChange(e.target.value)}
                    >
                        <option value="">None</option>
                        {purchaseOrders
                            .filter(po => !formData.vendorId || po.supplierId === formData.vendorId)
                            .map(po => (
                                <option key={po.id} value={po.id}>
                                    {po.poNumber} ({format(new Date(po.orderDate), 'MMM d')})
                                </option>
                            ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                        type="text"
                        className="w-full border rounded p-2"
                        value={formData.invoiceNumber}
                        onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        placeholder="e.g. INV-2023-001"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                        <input
                            type="date"
                            className="w-full border rounded p-2"
                            value={formData.issueDate}
                            onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                            type="date"
                            className="w-full border rounded p-2"
                            value={formData.dueDate}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>
                </div>
                {currencies.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select
                            className="w-full border rounded p-2"
                            value={formData.currencyCode}
                            onChange={e => setFormData({ ...formData, currencyCode: e.target.value })}
                        >
                            {currencies.map((c: any) => (
                                <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <h3 className="text-lg font-medium mb-4">Invoice Items</h3>
            <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                        <tr key={index}>
                            <td className="px-4 py-2">
                                <input
                                    type="text"
                                    className="w-full border rounded p-1"
                                    value={item.description}
                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    className="w-full border rounded p-1 text-right"
                                    value={item.quantity}
                                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    className="w-full border rounded p-1 text-right"
                                    value={item.unitPrice}
                                    onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                                />
                            </td>
                            <td className="px-4 py-2 text-right">
                                {formData.currencyCode} {(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-center">
                                <button onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800">&times;</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-bold">Total Amount:</td>
                        <td className="px-4 py-2 text-right font-bold">{formData.currencyCode} {calculateTotal().toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <div className="flex justify-between">
                <button onClick={addItem} className="text-blue-600 hover:text-blue-800 text-sm">+ Add Item</button>
                <div className="space-x-4">
                    <button onClick={() => router.back()} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Invoice</button>
                </div>
            </div>
        </div>
    );
}
