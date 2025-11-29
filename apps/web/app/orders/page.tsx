'use client';

import { useState, useEffect } from 'react';
import { createOrder, fetchOrders, createShipment } from '@/lib/api';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
    const [status, setStatus] = useState('');
    const [shippingOrder, setShippingOrder] = useState<any>(null); // Order being shipped
    const [shipmentData, setShipmentData] = useState({ carrier: '', trackingId: '' });

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        const data = await fetchOrders();
        setOrders(data);
    }

    const addItem = () => {
        setItems([...items, { productId: '', quantity: 1 }]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createOrder({
                customerId,
                priority: 'NORMAL',
                items: items.map(i => ({ ...i, quantity: Number(i.quantity) })),
            });
            setStatus('Order created successfully!');
            setCustomerId('');
            setItems([{ productId: '', quantity: 1 }]);
            loadOrders(); // Refresh list
        } catch (err) {
            setStatus('Failed to create order');
        }
    };

    const handleShip = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createShipment({
                orderId: shippingOrder.id,
                carrier: shipmentData.carrier,
                trackingId: shipmentData.trackingId,
            });
            setShippingOrder(null);
            setShipmentData({ carrier: '', trackingId: '' });
            loadOrders();
        } catch (err) {
            alert('Failed to create shipment');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Order Form */}
                <div className="bg-white p-6 rounded-lg shadow h-fit">
                    <h2 className="text-xl font-semibold mb-4">Create New Order</h2>
                    {status && (
                        <div className={`p-4 mb-4 rounded ${status.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {status}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                            <input
                                type="text"
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-4 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Product ID"
                                        value={item.productId}
                                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        min="1"
                                        required
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm text-indigo-600 hover:text-indigo-500"
                            >
                                + Add Item
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Create Order
                        </button>
                    </form>
                </div>

                {/* Order List */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No orders found</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id.slice(0, 8)}...</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'RESERVED' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {order.items?.length || 0} items
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {order.status === 'RESERVED' && (
                                                    <button
                                                        onClick={() => setShippingOrder(order)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Ship
                                                    </button>
                                                )}
                                                {order.status === 'SHIPPED' && order.shipment && (
                                                    <span className="text-xs text-gray-500">
                                                        {order.shipment.carrier} - {order.shipment.trackingId}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Ship Modal */}
            {shippingOrder && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Ship Order {shippingOrder.id.slice(0, 8)}</h3>
                        <form onSubmit={handleShip}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Carrier</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={shipmentData.carrier}
                                        onChange={(e) => setShipmentData({ ...shipmentData, carrier: e.target.value })}
                                    >
                                        <option value="">Select Carrier</option>
                                        <option value="JNE">JNE</option>
                                        <option value="SiCepat">SiCepat</option>
                                        <option value="GoSend">GoSend</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tracking ID</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={shipmentData.trackingId}
                                        onChange={(e) => setShipmentData({ ...shipmentData, trackingId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShippingOrder(null)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Confirm Shipment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
