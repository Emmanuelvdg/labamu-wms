'use client';

import { useState, useEffect } from 'react';
import { fetchWarehouses, createWarehouse, fetchLocations, createLocation, moveLocation } from '@/lib/api';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Location Management State
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveTarget, setMoveTarget] = useState({ locationId: '', newParentId: '' });
    const [newLocation, setNewLocation] = useState({
        name: '',
        type: 'INTERNAL',
        parentId: '',
        removalStrategy: 'FIFO',
    });

    // New Warehouse Form State
    const [newWarehouse, setNewWarehouse] = useState({
        name: '',
        type: 'Distribution Center',
        location: { address: '', city: '' },
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchWarehouses();
            setWarehouses(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createWarehouse(newWarehouse);
            setShowCreateModal(false);
            load();
            setNewWarehouse({
                name: '',
                type: 'Distribution Center',
                location: { address: '', city: '' },
            });
        } catch (err) {
            alert('Failed to create warehouse');
        }
    };

    const openLocationModal = async (warehouse: any) => {
        setSelectedWarehouse(warehouse);
        setShowLocationModal(true);
        await loadLocations(warehouse.id);
    };

    const loadLocations = async (warehouseId: string) => {
        try {
            const data = await fetchLocations(warehouseId);
            // If data is a single root view location, wrap it in array or use children
            setLocations(Array.isArray(data) ? data : [data]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createLocation({
                ...newLocation,
                warehouseId: selectedWarehouse.id,
                parentId: newLocation.parentId || undefined,
                removalStrategy: newLocation.removalStrategy || undefined,
            });
            setNewLocation({ name: '', type: 'INTERNAL', parentId: '', removalStrategy: 'FIFO' });
            await loadLocations(selectedWarehouse.id);
        } catch (err) {
            alert('Failed to create location');
        }
    };

    const handleMoveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!moveTarget.locationId) return;
        try {
            await moveLocation(moveTarget.locationId, moveTarget.newParentId || null);
            setShowMoveModal(false);
            setMoveTarget({ locationId: '', newParentId: '' });
            await loadLocations(selectedWarehouse.id);
        } catch (err) {
            alert('Failed to move location');
        }
    };

    // Recursive component for Location Tree
    const LocationNode = ({ node, level = 0 }: { node: any, level?: number }) => {
        if (!node) return null;
        return (
            <div className="ml-4 border-l pl-4 border-gray-200">
                <div className="flex items-center justify-between py-2 group">
                    <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${node.type === 'VIEW' ? 'bg-blue-400' :
                            node.type === 'INTERNAL' ? 'bg-green-500' : 'bg-gray-400'
                            }`}></span>
                        <span className="font-medium text-gray-900">{node.name}</span>
                        <span className="ml-2 text-xs text-gray-500 uppercase">[{node.type}]</span>
                        {node.removalStrategy && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1 rounded">
                                {node.removalStrategy}
                            </span>
                        )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                        <button
                            onClick={() => setNewLocation({ ...newLocation, parentId: node.id })}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            + Add Child
                        </button>
                        <button
                            onClick={() => {
                                setMoveTarget({ locationId: node.id, newParentId: node.parentId || '' });
                                setShowMoveModal(true);
                            }}
                            className="text-xs text-gray-600 hover:underline"
                        >
                            Move
                        </button>
                    </div>
                </div>
                {node.children && node.children.map((child: any) => (
                    <LocationNode key={child.id} node={child} level={level + 1} />
                ))}
            </div>
        );
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* ... (Header and Warehouse List remains same) ... */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
                    <p className="text-gray-500">Manage your storage locations and fulfillment centers</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + Add Warehouse
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{warehouse.name}</h3>
                                <p className="text-sm text-gray-500">{warehouse.type}</p>
                            </div>
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Active</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                            <p>{warehouse.location?.address || 'No address'}</p>
                            <p>{warehouse.location?.city || 'No city'}</p>
                        </div>
                        <div className="border-t pt-4 flex justify-between text-sm">
                            <span className="text-gray-500">ID: {warehouse.id.substring(0, 8)}...</span>
                            <button
                                onClick={() => openLocationModal(warehouse)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                Manage Locations
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Warehouse Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Warehouse</h3>
                        <form onSubmit={handleCreateWarehouse}>
                            {/* ... (Warehouse Form Fields) ... */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newWarehouse.name}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newWarehouse.type}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, type: e.target.value })}
                                    >
                                        <option>Distribution Center</option>
                                        <option>Retail Store</option>
                                        <option>Drop Shipping Point</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newWarehouse.location.address}
                                        onChange={(e) => setNewWarehouse({
                                            ...newWarehouse,
                                            location: { ...newWarehouse.location, address: e.target.value }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newWarehouse.location.city}
                                        onChange={(e) => setNewWarehouse({
                                            ...newWarehouse,
                                            location: { ...newWarehouse.location, city: e.target.value }
                                        })}
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
                                    Create Warehouse
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Location Management Modal */}
            {showLocationModal && selectedWarehouse && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Locations: {selectedWarehouse.name}</h3>
                            <button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Hierarchy View */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="font-medium text-gray-700 mb-3">Location Hierarchy</h4>
                                {locations.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No locations found. Create a root location.</p>
                                ) : (
                                    locations.map(loc => <LocationNode key={loc.id} node={loc} />)
                                )}
                            </div>

                            {/* Add Location Form */}
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-gray-700 mb-3">Add Location</h4>
                                <form onSubmit={handleCreateLocation}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newLocation.name}
                                                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                                placeholder="e.g. Zone A, Shelf 1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Type</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newLocation.type}
                                                onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value })}
                                            >
                                                <option value="VIEW">View (Folder)</option>
                                                <option value="INTERNAL">Internal Location</option>
                                                <option value="VENDOR">Vendor Location</option>
                                                <option value="CUSTOMER">Customer Location</option>
                                                <option value="INVENTORY_LOSS">Inventory Loss</option>
                                                <option value="PRODUCTION">Production</option>
                                                <option value="TRANSIT">Transit</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Removal Strategy</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newLocation.removalStrategy}
                                                onChange={(e) => setNewLocation({ ...newLocation, removalStrategy: e.target.value })}
                                            >
                                                <option value="FIFO">FIFO (First In First Out)</option>
                                                <option value="LIFO">LIFO (Last In First Out)</option>
                                                <option value="FEFO">FEFO (First Expiry First Out)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Parent ID (Optional)</label>
                                            <input
                                                type="text"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 bg-gray-100"
                                                value={newLocation.parentId}
                                                readOnly
                                                placeholder="Select from hierarchy"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Click "+ Add Child" in the hierarchy to set parent.</p>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            Create Location
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Location Modal */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Move Location</h3>
                        <form onSubmit={handleMoveLocation}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">New Parent ID</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                    value={moveTarget.newParentId}
                                    onChange={(e) => setMoveTarget({ ...moveTarget, newParentId: e.target.value })}
                                    placeholder="Enter Parent ID or leave empty for root"
                                />
                                <p className="text-xs text-gray-500 mt-1">Enter the ID of the new parent location.</p>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowMoveModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Move
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
