'use client';

import { useState, useEffect } from 'react';
import { fetchPackages, createPackage, fetchLocations } from '@/lib/api';

export default function PackagesPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [newPackage, setNewPackage] = useState({
        name: '',
        type: 'Box',
        locationId: '',
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const [pkgs, locs] = await Promise.all([
                fetchPackages(),
                fetchLocations() // Assuming this fetches a flat list or we need to flatten it
            ]);
            setPackages(pkgs);
            // Flatten locations if needed, for now assuming we can just pick from root
            // In a real app, we'd want a proper location picker
            setLocations(Array.isArray(locs) ? locs : [locs]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPackage({
                ...newPackage,
                name: newPackage.name || `PKG-${Date.now()}`, // Auto-generate if empty
                locationId: newPackage.locationId || undefined,
            });
            setShowCreateModal(false);
            setNewPackage({ name: '', type: 'Box', locationId: '' });
            load();
        } catch (err) {
            alert('Failed to create package');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Packages (LPNs)</h1>
                    <p className="text-gray-500">Manage physical containers and pallets</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + New Package
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LPN / Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contents</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {packages.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                    No packages found.
                                </td>
                            </tr>
                        ) : (
                            packages.map((pkg) => (
                                <tr key={pkg.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{pkg.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{pkg.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{pkg.location?.name || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {pkg.batches?.length > 0 ? (
                                            <ul className="list-disc list-inside">
                                                {pkg.batches.map((b: any) => (
                                                    <li key={b.id}>
                                                        {b.product.name} ({b.currentQuantity})
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-gray-400 italic">Empty</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Package Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Package</h3>
                        <form onSubmit={handleCreatePackage}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Package Name / LPN</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        placeholder="Leave empty to auto-generate"
                                        value={newPackage.name}
                                        onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newPackage.type}
                                        onChange={(e) => setNewPackage({ ...newPackage, type: e.target.value })}
                                    >
                                        <option value="Box">Box</option>
                                        <option value="Pallet">Pallet</option>
                                        <option value="Bin">Bin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Initial Location (Optional)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        placeholder="Location ID"
                                        value={newPackage.locationId}
                                        onChange={(e) => setNewPackage({ ...newPackage, locationId: e.target.value })}
                                    />
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
                                    Create Package
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
