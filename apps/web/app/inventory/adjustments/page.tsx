'use client';

import { useState, useEffect } from 'react';
import { fetchAdjustments, createAdjustment, applyAdjustment, updateAdjustment, fetchLocations, fetchInventory, fetchBatches } from '../../../lib/api';

export default function InventoryAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [products, setProducts] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        locationId: '',
        productId: '',
        batchId: '',
        countedQuantity: 0,
        currentQuantity: 0,
        reason: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [adjData, locData, prodData] = await Promise.all([
                fetchAdjustments(),
                fetchLocations(),
                fetchInventory() // This fetches products
            ]);
            setAdjustments(adjData);
            setLocations(locData);
            setProducts(prodData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleProductChange(productId: string) {
        setFormData({ ...formData, productId, batchId: '' });
        // Fetch batches for this product
        if (productId) {
            const batchData = await fetchBatches(productId);
            setBatches(batchData);
        } else {
            setBatches([]);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await createAdjustment(formData);
            setShowCreate(false);
            setFormData({
                locationId: '',
                productId: '',
                batchId: '',
                countedQuantity: 0,
                currentQuantity: 0,
                reason: '',
            });
            loadData();
        } catch (error) {
            alert('Failed to create adjustment');
        }
    }

    async function handleApply(id: string) {
        if (!confirm('Are you sure you want to apply this adjustment? This will update stock levels.')) return;
        try {
            await applyAdjustment(id);
            loadData();
        } catch (error) {
            alert('Failed to apply adjustment');
        }
    }

    async function handleSetToZero(id: string) {
        try {
            await updateAdjustment(id, { countedQuantity: 0 });
            loadData();
        } catch (error) {
            alert('Failed to update adjustment');
        }
    }

    async function handleRelocate(id: string) {
        const newLocationId = prompt('Enter new Location ID:');
        if (!newLocationId) return;
        try {
            await updateAdjustment(id, { locationId: newLocationId });
            loadData();
        } catch (error) {
            alert('Failed to relocate adjustment. Ensure Location ID is valid.');
        }
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Adjustments</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    New Adjustment
                </button>
            </div>

            {showCreate && (
                <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4">Create Adjustment</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.locationId}
                                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                required
                            >
                                <option value="">Select Location</option>
                                {locations.map((loc: any) => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.productId}
                                onChange={(e) => handleProductChange(e.target.value)}
                                required
                            >
                                <option value="">Select Product</option>
                                {products.map((prod: any) => (
                                    <option key={prod.id} value={prod.id}>{prod.name} ({prod.sku})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Batch (Optional)</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.batchId}
                                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                            >
                                <option value="">No Batch / Aggregate</option>
                                {batches.map((batch: any) => (
                                    <option key={batch.id} value={batch.id}>{batch.batchNumber} (Qty: {batch.currentQuantity})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Quantity (Snapshot)</label>
                            <input
                                type="number"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.currentQuantity}
                                onChange={(e) => setFormData({ ...formData, currentQuantity: parseInt(e.target.value) })}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter what the system thinks (or 0 if unknown)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Counted Quantity</label>
                            <input
                                type="number"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.countedQuantity}
                                onChange={(e) => setFormData({ ...formData, countedQuantity: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reason</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Create Draft
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Counted</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Diff</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {adjustments.map((adj: any) => (
                            <tr key={adj.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(adj.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{adj.location?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{adj.product?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{adj.batch?.batchNumber || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{adj.currentQuantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{adj.countedQuantity}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${adj.quantity > 0 ? 'text-green-600' : adj.quantity < 0 ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                    {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${adj.status === 'APPLIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {adj.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {adj.status !== 'APPLIED' && (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleSetToZero(adj.id)}
                                                className="text-orange-600 hover:text-orange-900"
                                                title="Set Counted Quantity to 0"
                                            >
                                                Zero
                                            </button>
                                            <button
                                                onClick={() => handleRelocate(adj.id)}
                                                className="text-purple-600 hover:text-purple-900"
                                                title="Change Location"
                                            >
                                                Relocate
                                            </button>
                                            <button
                                                onClick={() => handleApply(adj.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
