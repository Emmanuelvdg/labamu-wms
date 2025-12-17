'use client';

import { useState, useEffect } from 'react';
import {
    Settings,
    Plus,
    Trash2,
    Save,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { fetchFulfillmentRules, createFulfillmentRule, updateFulfillmentRule, deleteFulfillmentRule, fetchWarehouses } from '@/lib/api';

export default function FulfillmentSettingsPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [strategy, setStrategy] = useState('PRIMARY');
    const [warehouseId, setWarehouseId] = useState('');
    const [priority, setPriority] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [rData, wData] = await Promise.all([
                fetchFulfillmentRules(),
                fetchWarehouses()
            ]);
            setRules(rData);
            setWarehouses(wData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createFulfillmentRule({
                name,
                strategy,
                warehouseId: strategy === 'PRIMARY' ? warehouseId : undefined,
                priority: parseInt(priority.toString()),
                active: true
            });
            setShowCreateModal(false);
            loadData();
            // Reset
            setName('');
            setStrategy('PRIMARY');
            setWarehouseId('');
            setPriority(0);
        } catch (error) {
            alert('Failed to create rule');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await deleteFulfillmentRule(id);
            loadData();
        } catch (error) {
            alert('Failed to delete rule');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Settings className="h-8 w-8 text-blue-600" />
                        Fulfillment Rules
                    </h1>
                    <p className="text-gray-600 mt-1">Configure how orders are allocated to warehouses.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Add Rule
                </button>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule) => (
                            <tr key={rule.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {rule.priority}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {rule.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {rule.strategy}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {rule.strategy === 'PRIMARY' && rule.warehouse ?
                                        `Warehouse: ${rule.warehouse.name}` :
                                        rule.strategy === 'CLOSEST' ? 'Based on Customer Location' :
                                            'Based on Stock Level'
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(rule.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {rules.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No rules configured. Orders will be unallocated unless manually assigned.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">New Fulfillment Rule</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <input
                                    type="number"
                                    value={priority}
                                    onChange={(e) => setPriority(parseInt(e.target.value))}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Lower number = Higher priority</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
                                <select
                                    value={strategy}
                                    onChange={(e) => setStrategy(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="PRIMARY">Primary Warehouse</option>
                                    <option value="CLOSEST">Closest to Customer</option>
                                    <option value="HIGHEST_STOCK">Highest Stock</option>
                                </select>
                            </div>
                            {strategy === 'PRIMARY' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                                    <select
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
