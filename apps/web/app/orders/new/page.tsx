'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInventory, createOrder, fetchCustomers, createCustomer } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function NewOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Customer Creation State
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        priority: 'NORMAL',
        expectedDate: '',
        items: [{ productId: '', quantity: 1 }]
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [prods, custs] = await Promise.all([
                    fetchInventory(),
                    fetchCustomers()
                ]);
                setProducts(prods || []);
                setCustomers(custs || []);
            } catch (error) {
                console.error('Failed to load data:', error);
                alert('Failed to load data');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return;
        setCreatingCustomer(true);
        try {
            const newCustomer = await createCustomer({ name: newCustomerName });
            setCustomers([newCustomer, ...customers]);
            setFormData({ ...formData, customerId: newCustomer.id });
            setShowCustomerModal(false);
            setNewCustomerName('');
        } catch (error) {
            console.error('Failed to create customer:', error);
            alert('Failed to create customer');
        } finally {
            setCreatingCustomer(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createOrder({
                ...formData,
                expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined
            });
            alert('Order created successfully');
            router.push('/orders');
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Sales Order</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <div className="flex gap-2">
                        <select
                            className="w-full border border-gray-300 rounded-md p-2"
                            value={formData.customerId}
                            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            required
                        >
                            <option value="">Select Customer</option>
                            {customers.map((cust) => (
                                <option key={cust.id} value={cust.id}>
                                    {cust.name}
                                </option>
                            ))}
                        </select>
                        <Button type="button" variant="outline" onClick={() => setShowCustomerModal(true)}>
                            + New
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            className="w-full border border-gray-300 rounded-md p-2"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                        <input
                            type="date"
                            className="w-full border border-gray-300 rounded-md p-2"
                            value={formData.expectedDate}
                            onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Items</label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                            + Add Item
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="flex gap-4 items-end border p-3 rounded-md">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Product</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={item.productId}
                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((prod) => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.name} ({prod.sku})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                        min="1"
                                        required
                                    />
                                </div>
                                {formData.items.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-red-500"
                                        onClick={() => handleRemoveItem(index)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Order'}
                    </Button>
                </div>
            </form>

            {/* Customer Creation Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h2 className="text-lg font-bold mb-4">Create New Customer</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-md p-2"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="Enter customer name"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCustomer} disabled={creatingCustomer || !newCustomerName.trim()}>
                                {creatingCustomer ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
