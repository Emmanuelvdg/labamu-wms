'use client';

import { useState, useEffect } from 'react';
import { fetchWarehouses, createWarehouse, fetchLocations, createLocation, moveLocation, deleteWarehouse, updateWarehouse } from '@/lib/api';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

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
        status: 'Enabled',
        location: { address: '', city: '', state: '', postalCode: '', country: '', phone: '' },
        length: 0,
        width: 0,
        height: 0,
        maxWeight: 0,
        incomingSteps: '1_step',
        outgoingSteps: '1_step',
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

    const handleEditWarehouse = (warehouse: any) => {
        setEditingId(warehouse.id);
        setNewWarehouse({
            name: warehouse.name,
            type: warehouse.type,
            status: warehouse.status || 'Enabled',
            location: {
                address: warehouse.address || warehouse.location?.address || '',
                city: warehouse.city || warehouse.location?.city || '',
                state: warehouse.state || warehouse.location?.state || '',
                postalCode: warehouse.postalCode || warehouse.location?.postalCode || '',
                country: warehouse.country || warehouse.location?.country || '',
                phone: warehouse.phone || warehouse.location?.phone || '',
            },
            length: warehouse.length || 0,
            width: warehouse.width || 0,
            height: warehouse.height || 0,
            maxWeight: warehouse.maxWeight || 0,
            incomingSteps: warehouse.incomingSteps || '1_step',
            outgoingSteps: warehouse.outgoingSteps || '1_step',
        });
        setShowCreateModal(true);
    };

    const handleSaveWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const warehouseData = {
                ...newWarehouse,
                ...newWarehouse.location,
                length: Number(newWarehouse.length),
                width: Number(newWarehouse.width),
                height: Number(newWarehouse.height),
                maxWeight: Number(newWarehouse.maxWeight),
            };

            if (editingId) {
                await updateWarehouse(editingId, warehouseData);
                toast.success('Warehouse updated successfully');
            } else {
                await createWarehouse(warehouseData);
                toast.success('Warehouse created successfully');
            }

            setShowCreateModal(false);
            setEditingId(null);
            load();
            setNewWarehouse({
                name: '',
                type: 'Distribution Center',
                status: 'Enabled',
                location: { address: '', city: '', state: '', postalCode: '', country: '', phone: '' },
                length: 0,
                width: 0,
                height: 0,
                maxWeight: 0,
                incomingSteps: '1_step',
                outgoingSteps: '1_step',
            });
        } catch (err) {
            console.error(err);
            toast.error(editingId ? 'Failed to update warehouse' : 'Failed to create warehouse');
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

    const handleDeleteWarehouse = async (id: string) => {
        if (!confirm('Are you sure you want to delete this warehouse?')) return;
        try {
            await deleteWarehouse(id);
            toast.success('Warehouse deleted successfully');
            load();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete warehouse');
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
                    onClick={() => {
                        setEditingId(null);
                        setNewWarehouse({
                            name: '',
                            type: 'Distribution Center',
                            status: 'Enabled',
                            location: { address: '', city: '', state: '', postalCode: '', country: '', phone: '' },
                            length: 0,
                            width: 0,
                            height: 0,
                            maxWeight: 0,
                            incomingSteps: '1_step',
                            outgoingSteps: '1_step',
                        });
                        setShowCreateModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + Add Warehouse
                </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Warehouse ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Warehouse Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Dimension <span className="normal-case font-normal">(L x W x H)</span>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Load-Bearing Capacity (Kg)
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created At
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Updated At
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {warehouses.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                    No warehouses found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            warehouses.map((warehouse) => (
                                <tr key={warehouse.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {warehouse.shortName || warehouse.id.substring(0, 8).toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {warehouse.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${warehouse.status === 'Disabled' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                                            {warehouse.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(warehouse.length && warehouse.width && warehouse.height) ? (
                                            <span>{warehouse.length}m x {warehouse.width}m x {warehouse.height}m</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {warehouse.maxWeight ? warehouse.maxWeight.toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {warehouse.createdAt ? format(new Date(warehouse.createdAt), 'dd-MM-yyyy HH:mm') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {warehouse.updatedAt ? format(new Date(warehouse.updatedAt), 'dd-MM-yyyy HH:mm') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEditWarehouse(warehouse)}
                                                className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                                                title="Edit Warehouse"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWarehouse(warehouse.id)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                                                title="Delete Warehouse"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Warehouse Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Edit Warehouse' : 'Add New Warehouse'}</h3>
                        <form onSubmit={handleSaveWarehouse}>
                            {/* ... (Warehouse Form Fields) ... */}
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                                {/* General Section */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">General Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
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
                                            <label className="block text-sm font-medium text-gray-700">Status</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.status}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, status: e.target.value })}
                                            >
                                                <option>Enabled</option>
                                                <option>Disabled</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Dimensions & Capacity */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Dimensions & Capacity</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Length (m)</label>
                                            <input
                                                type="number"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.length}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, length: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Width (m)</label>
                                            <input
                                                type="number"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.width}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, width: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Height (m)</label>
                                            <input
                                                type="number"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.height}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, height: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-sm font-medium text-gray-700">Max Weight Capacity (kg)</label>
                                            <input
                                                type="number"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.maxWeight}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, maxWeight: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Operations Configuration */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Operations Configuration</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Inbound Steps</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.incomingSteps}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, incomingSteps: e.target.value })}
                                            >
                                                <option value="1_step">1 Step – Direct Receipt (Receive → Stock)</option>
                                                <option value="2_steps">2 Steps – Input + Stock (Receive → Input → Stock)</option>
                                                <option value="3_steps">3 Steps – Input + QC + Stock (Receive → Input → QC → Stock)</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">How goods move from receiving to storage</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Outbound Steps</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.outgoingSteps}
                                                onChange={(e) => setNewWarehouse({ ...newWarehouse, outgoingSteps: e.target.value })}
                                            >
                                                <option value="1_step">1 Step – Direct Ship (Stock → Ship)</option>
                                                <option value="2_steps">2 Steps – Pick + Ship (Stock → Output → Ship)</option>
                                                <option value="3_steps">3 Steps – Pick + Pack + Ship (Stock → Pick → Pack → Ship)</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">How goods move from storage to shipping</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Location Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
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
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">State</label>
                                            <input
                                                type="text"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.location.state}
                                                onChange={(e) => setNewWarehouse({
                                                    ...newWarehouse,
                                                    location: { ...newWarehouse.location, state: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                                            <input
                                                type="text"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.location.postalCode}
                                                onChange={(e) => setNewWarehouse({
                                                    ...newWarehouse,
                                                    location: { ...newWarehouse.location, postalCode: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Country</label>
                                            <input
                                                type="text"
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={newWarehouse.location.country}
                                                onChange={(e) => setNewWarehouse({
                                                    ...newWarehouse,
                                                    location: { ...newWarehouse.location, country: e.target.value }
                                                })}
                                            />
                                        </div>
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
                                    {editingId ? 'Update Warehouse' : 'Create Warehouse'}
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
