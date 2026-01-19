'use client';

import { useState, useEffect } from 'react';
import { fetchReorderingRules, createReorderingRule, checkReorderingRules, fetchLocations, fetchProducts } from '@/lib/api';

export default function ReorderingRulesPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [newRule, setNewRule] = useState({
        productId: '',
        locationId: '',
        minQuantity: 10,
        maxQuantity: 100,
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const [r, l, p] = await Promise.all([
                fetchReorderingRules(),
                fetchLocations(),
                fetchProducts(),
            ]);
            setRules(r);
            setLocations(Array.isArray(l) ? l : [l]);
            setProducts(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createReorderingRule({
                ...newRule,
                minQuantity: Number(newRule.minQuantity),
                maxQuantity: Number(newRule.maxQuantity),
            });
            setShowCreateModal(false);
            setNewRule({ productId: '', locationId: '', minQuantity: 10, maxQuantity: 100 });
            load();
        } catch (err) {
            alert('Failed to create rule');
        }
    };

    const handleCheck = async () => {
        try {
            const result = await checkReorderingRules();
            setSuggestions(result);
        } catch (err) {
            alert('Failed to check rules');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reordering Rules</h1>
                    <p className="text-gray-500">Automate stock replenishment</p>
                </div>
                <div className="space-x-3">
                    <button
                        onClick={handleCheck}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                        Run Scheduler
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        + New Rule
                    </button>
                </div>
            </div>

            {/* Suggestions Alert */}
            {suggestions.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {/* Icon */}
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-medium">Replenishment Needed:</span> Found {suggestions.length} items below minimum stock.
                            </p>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {suggestions.map((s: any) => (
                                        <li key={s.ruleId}>
                                            {s.product.name} at {s.location.name}: Current {s.currentQuantity} (Min {s.minQuantity}). Order {s.suggestedOrder} units.
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Qty</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule) => (
                            <tr key={rule.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.product?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.location?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.minQuantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.maxQuantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Reordering Rule</h3>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Product</label>
                                    <select
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.productId}
                                        onChange={(e) => setNewRule({ ...newRule, productId: e.target.value })}
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <select
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.locationId}
                                        onChange={(e) => setNewRule({ ...newRule, locationId: e.target.value })}
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map((l) => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Min Quantity</label>
                                        <input
                                            type="number"
                                            required
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newRule.minQuantity}
                                            onChange={(e) => setNewRule({ ...newRule, minQuantity: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Max Quantity</label>
                                        <input
                                            type="number"
                                            required
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newRule.maxQuantity}
                                            onChange={(e) => setNewRule({ ...newRule, maxQuantity: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
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
