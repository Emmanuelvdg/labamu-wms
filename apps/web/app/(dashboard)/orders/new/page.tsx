'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProducts, createOrder, fetchCustomers, createCustomer, fetchWarehouses, fetchWithRetry } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function NewOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Customer Creation State
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [newCustomerLat, setNewCustomerLat] = useState('');
    const [newCustomerLng, setNewCustomerLng] = useState('');
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        priority: 'NORMAL',
        expectedDate: '',
        items: [{ productId: '', quantity: 1 }],
        type: 'SALES', // SALES, TRANSFER
        warehouseId: '', // Optional for Sales (Source), Required for Transfer (Source)
        destinationWarehouseId: '', // Required for Transfer
        deliveryMethodId: '' // NEW: Delivery method selection
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [prods, custs, whs, methods] = await Promise.all([
                    fetchProducts(),
                    fetchCustomers(),
                    fetchWarehouses(),
                    fetchWithRetry('/api/shipping/delivery-methods') // Need to fetch delivery methods, matching E2E test plan (shipping/delivery-methods)
                ]);
                setProducts(prods || []);
                setCustomers(custs || []);
                setWarehouses(whs || []);
                setDeliveryMethods(methods || []);
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

        // Validate address fields if provided
        if (newCustomerAddress && (!newCustomerLat || !newCustomerLng)) {
            alert('Please provide both latitude and longitude for the address');
            return;
        }

        setCreatingCustomer(true);
        try {
            const customerData: any = { name: newCustomerName };

            // Add address fields if provided
            if (newCustomerAddress && newCustomerLat && newCustomerLng) {
                customerData.address = newCustomerAddress;
                customerData.latitude = parseFloat(newCustomerLat);
                customerData.longitude = parseFloat(newCustomerLng);
            }

            const newCustomer = await createCustomer(customerData);
            setCustomers([newCustomer, ...customers]);
            setFormData({ ...formData, customerId: newCustomer.id });
            setShowCustomerModal(false);
            setNewCustomerName('');
            setNewCustomerAddress('');
            setNewCustomerLat('');
            setNewCustomerLng('');
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
            const orderData = {
                ...formData,
                expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
                // Clear customerId/warehouseId based on type
                customerId: formData.type === 'SALES' ? formData.customerId : undefined,
                warehouseId: formData.type === 'TRANSFER' ? formData.warehouseId : formData.warehouseId || undefined, // Source for transfer, optional for sales
                destinationWarehouseId: formData.type === 'TRANSFER' ? formData.destinationWarehouseId : undefined,
            };

            await createOrder(orderData);
            alert('Order created successfully');
            router.push('/orders');
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Order Totals
    const orderTotals = useMemo(() => {
        let subtotal = 0;
        let shippingCost = 0;

        // Calculate subtotal from items (product price × quantity)
        formData.items.forEach(item => {
            if (item.productId) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.price != null) {
                    subtotal += (product.price || 0) * item.quantity;
                }
            }
        });

        // Get shipping cost from selected delivery method
        if (formData.deliveryMethodId) {
            const selectedMethod = deliveryMethods.find(m => m.id === formData.deliveryMethodId);
            if (selectedMethod && selectedMethod.fixedPrice) {
                shippingCost = selectedMethod.fixedPrice;
            }
        }

        const grandTotal = subtotal + shippingCost;

        return { subtotal, shippingCost, grandTotal };
    }, [formData.items, formData.deliveryMethodId, products, deliveryMethods]);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Create New Order</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow rounded-lg">

                {/* Order Type Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="SALES"
                                checked={formData.type === 'SALES'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value, warehouseId: '', destinationWarehouseId: '' })}
                                className="h-4 w-4 text-theme-600 focus:ring-theme-500"
                            />
                            <span>Sales Order</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="TRANSFER"
                                checked={formData.type === 'TRANSFER'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value, customerId: '' })}
                                className="h-4 w-4 text-theme-600 focus:ring-theme-500"
                            />
                            <span>Internal Transfer (IWT)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="STO"
                                checked={formData.type === 'STO'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value, customerId: '' })}
                                className="h-4 w-4 text-theme-600 focus:ring-theme-500"
                            />
                            <span>Stock Transfer (STO)</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Customer Selection for Sales */}
                    {formData.type === 'SALES' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Customer</label>
                            <div className="flex gap-2 mt-1">
                                <select
                                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                    required={formData.type === 'SALES'}
                                    data-testid="order-customer-select"
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <Button type="button" variant="outline" onClick={() => setShowCustomerModal(true)} data-testid="new-customer-btn">
                                    + New
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Warehouse Selection for Transfers (IWT & STO) */}
                    {(formData.type === 'TRANSFER' || formData.type === 'STO') && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {formData.type === 'STO' ? 'From (Factory/DC)' : 'Source Warehouse (From)'}
                                </label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                    required
                                    data-testid="order-source-warehouse-select"
                                >
                                    <option value="">Select Source</option>
                                    {warehouses
                                        .filter(w => {
                                            if (formData.type === 'STO') return ['MANUFACTURING', 'DISTRIBUTION', 'WAREHOUSE'].includes(w.type); // Factories or DCs can be source
                                            if (formData.type === 'TRANSFER') return ['DISTRIBUTION', 'WAREHOUSE'].includes(w.type); // IWT Source is DC
                                            return true;
                                        })
                                        .map((w) => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {formData.type === 'STO' ? 'To (DC/Retail)' : 'Destination Warehouse (To)'}
                                </label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.destinationWarehouseId}
                                    onChange={(e) => setFormData({ ...formData, destinationWarehouseId: e.target.value })}
                                    required
                                    data-testid="order-destination-warehouse-select"
                                >
                                    <option value="">Select Destination</option>
                                    {warehouses
                                        .filter(w => w.id !== formData.warehouseId)
                                        .filter(w => {
                                            if (formData.type === 'STO') return ['RETAIL', 'DISTRIBUTION', 'WAREHOUSE'].includes(w.type); // Retail or DC can be dest
                                            if (formData.type === 'TRANSFER') return ['DISTRIBUTION', 'WAREHOUSE'].includes(w.type); // IWT Dest is DC
                                            return true;
                                        })
                                        .map((w) => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                                        ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            data-testid="order-priority-select"
                        >
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.expectedDate}
                            onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                            data-testid="order-expected-date-input"
                        />
                    </div>

                    {/* Delivery Method Selection - NEW */}
                    {formData.type === 'SALES' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Delivery Method</label>
                            <select
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={formData.deliveryMethodId}
                                onChange={(e) => setFormData({ ...formData, deliveryMethodId: e.target.value })}
                                required={formData.type === 'SALES'}
                                data-testid="order-delivery-method-select"
                            >
                                <option value="">Select Delivery Method</option>
                                {deliveryMethods.map((dm) => (
                                    <option key={dm.id} value={dm.id}>
                                        {dm.name} - {dm.provider === 'LALAMOVE' ? 'Contact for quotation' : `IDR ${dm.fixedPrice?.toLocaleString() || 0}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Optional Source Warehouse for Sales Orders (Manual Override) */}
                    {formData.type === 'SALES' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Warehouse (Optional Override)</label>
                            <select
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={formData.warehouseId}
                                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                data-testid="order-sales-warehouse-override-select"
                            >
                                <option value="">Auto-Assign</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                    {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-4 mb-4 items-end border p-3 rounded-md">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Product</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={item.productId}
                                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                    required
                                    data-testid={`order-item-product-select-${index}`}
                                >
                                    <option value="">Select Product</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                                    required
                                    data-testid={`order-item-quantity-input-${index}`}
                                />
                            </div>
                            {formData.items.length > 1 && (
                                <Button type="button" variant="destructive" onClick={() => handleRemoveItem(index)}>Remove</Button>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={handleAddItem} data-testid="add-order-item-btn">+ Add Item</Button>
                </div>

                {/* Order Total Summary - NEW */}
                {formData.type === 'SALES' && formData.items.some(item => item.productId) && (
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">IDR {orderTotals.subtotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {formData.deliveryMethodId && orderTotals.shippingCost > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Shipping Cost:</span>
                                    <span className="font-medium">IDR {orderTotals.shippingCost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-300 pt-2 mt-2"></div>
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-gray-900">Grand Total:</span>
                                <span className="text-theme-600">IDR {orderTotals.grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={submitting} data-testid="submit-order-btn">
                        {submitting ? 'Creating...' :
                            formData.type === 'TRANSFER' ? 'Create IWT' :
                                formData.type === 'STO' ? 'Create STO' :
                                    'Create Sales Order'}
                    </Button>
                </div>
            </form>

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">New Customer</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    className="w-full border border-gray-300 p-2 rounded"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address (for Lalamove delivery)
                                </label>
                                <textarea
                                    placeholder="Full delivery address"
                                    className="w-full border border-gray-300 p-2 rounded"
                                    rows={2}
                                    value={newCustomerAddress}
                                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="13.7563"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newCustomerLat}
                                        onChange={(e) => setNewCustomerLat(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="100.5018"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newCustomerLng}
                                        onChange={(e) => setNewCustomerLng(e.target.value)}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                💡 Tip: Get coordinates from Google Maps → Right-click location → Copy coordinates
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
                            <Button type="button" onClick={handleCreateCustomer} disabled={creatingCustomer || newCustomerName.trim().length === 0}>
                                {creatingCustomer ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
