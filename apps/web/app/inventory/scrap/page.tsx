'use client';

import { useState, useEffect } from 'react';
import { fetchScrapOrders, createScrapOrder, fetchLocations, fetchProducts } from '../../lib/api';

export default function ScrapOrdersPage() {
    const [scrapOrders, setScrapOrders] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        locationId: '',
        productId: '',
        quantity: 0,
        reason: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [scrapData, locData, prodData] = await Promise.all([
                fetchScrapOrders(),
                fetchLocations(),
                fetchProducts(),
            ]);
            setScrapOrders(scrapData);
            setLocations(flattenLocations(locData));
            setProducts(prodData);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    // Helper to flatten the location hierarchy for the select dropdown
    const flattenLocations = (nodes: any[], depth = 0): any[] => {
        let result: any[] = [];
        for (const node of nodes) {
            result.push({ ...node, depth });
            if (node.children) {
                result = result.concat(flattenLocations(node.children, depth + 1));
            }
        }
        return result;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createScrapOrder(formData);
            setIsModalOpen(false);
            setFormData({ locationId: '', productId: '', quantity: 0, reason: '' });
            loadData(); // Refresh list
        } catch (error) {
            alert('Failed to create scrap order');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Scrap Orders</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    New Scrap Order
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {scrapOrders.map((order) => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {order.product?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {order.location?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                    -{order.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {order.reason}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">New Scrap Order</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Product</label>
                                <select
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                >
                                    <option value="">Select Product</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Source Location</label>
                                <select
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.locationId}
                                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {'-'.repeat(l.depth * 2)} {l.name} ({l.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantity to Scrap</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Reason</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Damaged, Expired"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Create Scrap Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
