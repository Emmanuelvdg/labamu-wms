'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function DeliveryMethodsPage() {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState<any>(null);

    const fetchMethods = async () => {
        try {
            const data = await api.get('/shipping/methods?active=all');
            setMethods(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleEdit = (method: any) => {
        setEditingMethod(method);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingMethod({
            name: '',
            provider: 'FIXED_PRICE',
            fixedPrice: 0,
            active: true,
            rules: []
        });
        setShowModal(true);
    };

    const saveMethod = async (data: any) => {
        try {
            if (data.id) {
                await api.put(`/shipping/methods/${data.id}`, data);
            } else {
                await api.post('/shipping/methods', data);
            }
            setShowModal(false);
            fetchMethods();
        } catch (e) {
            alert('Error saving method');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Delivery Methods</h1>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Create Method
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price / Logic</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {methods.map((method) => (
                                <tr key={method.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(method)}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{method.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{method.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {method.provider === 'FIXED_PRICE'
                                            ? `$${method.fixedPrice.toLocaleString()}`
                                            : method.provider === 'LALAMOVE'
                                                ? <span className="inline-flex items-center gap-1 text-blue-700 font-medium">🚚 Live Quote</span>
                                                : `${method.rules?.length || 0} Rules Defined`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${method.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {method.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(method); }} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && editingMethod && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <DeliveryMethodForm
                        initialData={editingMethod}
                        onSave={saveMethod}
                        onCancel={() => setShowModal(false)}
                    />
                </div>
            )}
        </div>
    );
}

function DeliveryMethodForm({ initialData, onSave, onCancel }: { initialData: any, onSave: (data: any) => void, onCancel: () => void }) {
    const [formData, setFormData] = useState(initialData);

    const addRule = () => {
        setFormData({
            ...formData,
            rules: [
                ...(formData.rules || []),
                { sequence: (formData.rules?.length || 0) + 1, minWeight: null, maxWeight: null, price: 0 }
            ]
        });
    };

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...(formData.rules || [])];
        newRules[index] = { ...newRules[index], [field]: value === '' ? null : parseFloat(value) };
        setFormData({ ...formData, rules: newRules });
    };

    const removeRule = (index: number) => {
        const newRules = [...(formData.rules || [])];
        newRules.splice(index, 1);
        setFormData({ ...formData, rules: newRules });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{formData.id ? 'Edit Method' : 'New Delivery Method'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Provider</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 rounded p-2"
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        >
                            <option value="FIXED_PRICE">Fixed Price</option>
                            <option value="BASED_ON_RULES">Based on Rules</option>
                            <option value="LALAMOVE">Lalamove (Live Quote)</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="rounded text-blue-600"
                        />
                        <span className="text-sm font-medium">Active</span>
                    </label>
                </div>

                {formData.provider === 'FIXED_PRICE' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Fixed Price</label>
                        <input
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full border border-gray-300 rounded p-2"
                            value={formData.fixedPrice}
                            onChange={(e) => setFormData({ ...formData, fixedPrice: parseFloat(e.target.value) })}
                        />
                    </div>
                )}

                {formData.provider === 'BASED_ON_RULES' && (
                    <div className="mb-4 border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-medium">Pricing Rules</h3>
                            <button type="button" onClick={addRule} className="text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add Rule</button>
                        </div>
                        <div className="text-sm text-gray-500 mb-2">Rules are evaluated in order. The first match determines the price.</div>

                        <div className="space-y-2">
                            {formData.rules?.map((rule: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                                    <div className="w-10 text-center font-bold text-gray-400">{idx + 1}</div>
                                    <div className="flex-1 grid grid-cols-4 gap-2">
                                        <input type="number" placeholder="Min Wgt" className="border p-1 rounded text-sm" value={rule.minWeight ?? ''} onChange={(e) => updateRule(idx, 'minWeight', e.target.value)} />
                                        <input type="number" placeholder="Max Wgt" className="border p-1 rounded text-sm" value={rule.maxWeight ?? ''} onChange={(e) => updateRule(idx, 'maxWeight', e.target.value)} />
                                        <input type="number" placeholder="Price" className="border p-1 rounded text-sm font-bold" value={rule.price} onChange={(e) => updateRule(idx, 'price', e.target.value)} />
                                        <button type="button" onClick={() => removeRule(idx)} className="text-red-500 text-xs hover:underline">Remove</button>
                                    </div>
                                </div>
                            ))}
                            {(!formData.rules || formData.rules.length === 0) && <div className="text-gray-400 text-sm italic text-center p-4">No rules defined.</div>}
                        </div>
                    </div>
                )}

                {formData.provider === 'LALAMOVE' && (
                    <div className="mb-4 border-t pt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 font-medium text-blue-900">
                                🚚 Lalamove On-Demand Delivery
                            </div>
                            <p className="text-sm text-blue-800">
                                Pricing is fetched live from Lalamove at the time of dispatch, based on the order's weight and customer delivery address.
                                No fixed price or rules are needed here.
                            </p>
                            <p className="text-sm text-blue-700">
                                Configure your Lalamove API credentials and market settings under{' '}
                                <a href="/settings/lalamove" className="underline font-medium">Settings → Lalamove</a>.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 border-t pt-4 mt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Method</button>
                </div>
            </form>
        </div>
    );
}
