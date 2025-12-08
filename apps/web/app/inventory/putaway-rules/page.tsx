'use client';

import { useState, useEffect } from 'react';
import { fetchPutawayRules, createPutawayRule, fetchLocationsTree, fetchProducts } from '../../../lib/api';
import { LocationSelector } from '@/components/inventory/LocationSelector';

export default function PutawayRulesPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [locationsTree, setLocationsTree] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newRule, setNewRule] = useState({
        productId: '',
        categoryId: '',
        locationId: '',
        sourceLocationId: '',
        priority: 10,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [rulesData, locationsData, productsData] = await Promise.all([
                fetchPutawayRules(),
                fetchLocationsTree(), // Fetch tree structure
                fetchProducts(),
            ]);
            setRules(rulesData);
            setLocationsTree(locationsData);
            setProducts(productsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPutawayRule({
                ...newRule,
                priority: parseInt(newRule.priority.toString()),
                productId: newRule.productId || undefined,
                categoryId: newRule.categoryId || undefined,
                sourceLocationId: newRule.sourceLocationId || undefined,
            });
            setShowModal(false);
            setNewRule({ productId: '', categoryId: '', locationId: '', sourceLocationId: '', priority: 10 });
            loadData();
        } catch (error) {
            alert('Failed to create rule');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Putaway Rules</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + Add Rule
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product / Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When Arriving At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule) => (
                            <tr key={rule.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {rule.product ? rule.product.name : (rule.categoryId ? `Category: ${rule.categoryId}` : 'All Products')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {rule.sourceLocation ? rule.sourceLocation.name : 'Any Location'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {rule.location?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {rule.priority}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {rule.active ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Putaway Rule</h3>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Product (Optional)</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.productId}
                                        onChange={(e) => setNewRule({ ...newRule, productId: e.target.value })}
                                    >
                                        <option value="">-- Select Product --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Category (Optional)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.categoryId}
                                        onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
                                        placeholder="e.g. Electronics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">When Arriving At (Optional)</label>
                                    <LocationSelector
                                        locations={locationsTree}
                                        value={newRule.sourceLocationId}
                                        onChange={(id) => setNewRule({ ...newRule, sourceLocationId: id })}
                                        placeholder="Select Source Location"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
                                    <LocationSelector
                                        locations={locationsTree}
                                        value={newRule.locationId}
                                        onChange={(id) => setNewRule({ ...newRule, locationId: id })}
                                        placeholder="Select Destination Location"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                                    <input
                                        type="number"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.priority}
                                        onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Create Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
