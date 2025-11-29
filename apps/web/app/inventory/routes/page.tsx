'use client';

import { useState, useEffect } from 'react';
import { fetchRoutes, createRoute, createRule, fetchLocations } from '@/lib/api';

export default function RoutesPage() {
    const [routes, setRoutes] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
    const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    const [newRoute, setNewRoute] = useState({ name: '', description: '' });
    const [newRule, setNewRule] = useState({
        action: 'PULL',
        sourceLocationId: '',
        destinationLocationId: '',
        sequence: 0,
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const [rts, locs] = await Promise.all([
                fetchRoutes(),
                fetchLocations(),
            ]);
            setRoutes(rts);
            setLocations(Array.isArray(locs) ? locs : [locs]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateRoute = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRoute(newRoute);
            setShowCreateRouteModal(false);
            setNewRoute({ name: '', description: '' });
            load();
        } catch (err) {
            alert('Failed to create route');
        }
    };

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRouteId) return;
        try {
            await createRule(selectedRouteId, {
                ...newRule,
                sourceLocationId: newRule.sourceLocationId || undefined,
                destinationLocationId: newRule.destinationLocationId || undefined,
                sequence: Number(newRule.sequence),
            });
            setShowCreateRuleModal(false);
            setNewRule({ action: 'PULL', sourceLocationId: '', destinationLocationId: '', sequence: 0 });
            load();
        } catch (err) {
            alert('Failed to create rule');
        }
    };

    const openRuleModal = (routeId: string) => {
        setSelectedRouteId(routeId);
        setShowCreateRuleModal(true);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
                    <p className="text-gray-500">Define product movement paths</p>
                </div>
                <button
                    onClick={() => setShowCreateRouteModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + New Route
                </button>
            </div>

            <div className="space-y-6">
                {routes.map((route) => (
                    <div key={route.id} className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{route.name}</h3>
                                <p className="text-sm text-gray-500">{route.description}</p>
                            </div>
                            <button
                                onClick={() => openRuleModal(route.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                + Add Rule
                            </button>
                        </div>

                        {route.rules && route.rules.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seq</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {route.rules.map((rule: any) => (
                                        <tr key={rule.id}>
                                            <td className="px-4 py-2 text-sm text-gray-900">{rule.sequence}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{rule.action}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{rule.sourceLocation?.name || '-'}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{rule.destinationLocation?.name || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No rules defined.</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Route Modal */}
            {showCreateRouteModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Route</h3>
                        <form onSubmit={handleCreateRoute}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRoute.name}
                                        onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRoute.description}
                                        onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRouteModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Create Route
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Rule Modal */}
            {showCreateRuleModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Rule to Route</h3>
                        <form onSubmit={handleCreateRule}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Action</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.action}
                                        onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                                    >
                                        <option value="PULL">PULL (Replenish)</option>
                                        <option value="PUSH">PUSH (Move to)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Source Location</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        placeholder="Location ID"
                                        value={newRule.sourceLocationId}
                                        onChange={(e) => setNewRule({ ...newRule, sourceLocationId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Destination Location</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        placeholder="Location ID"
                                        value={newRule.destinationLocationId}
                                        onChange={(e) => setNewRule({ ...newRule, destinationLocationId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sequence</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newRule.sequence}
                                        onChange={(e) => setNewRule({ ...newRule, sequence: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRuleModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Add Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
