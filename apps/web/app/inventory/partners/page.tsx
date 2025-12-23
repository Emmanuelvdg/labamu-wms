'use client';

import { useState, useEffect } from 'react';
import { fetchWarehouses, createWarehouse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PartnerLocationsPage() {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'MANUFACTURING', // MANUFACTURING, RETAIL
        address: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchWarehouses();
            // Filter only Partner types
            const partners = data.filter((w: any) => ['MANUFACTURING', 'RETAIL'].includes(w.type));
            setLocations(partners);
        } catch (error) {
            console.error('Failed to load partners:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createWarehouse({
                ...formData,
                location: JSON.stringify({ lat: 0, lng: 0 }) // Default location
            });
            setShowModal(false);
            setFormData({ name: '', type: 'MANUFACTURING', address: '' });
            load();
        } catch (error) {
            console.error(error);
            alert('Failed to create partner location');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Partner Locations</h1>
                    <p className="text-gray-500">Manage external Manufacturing Plants and Retail Outlets</p>
                </div>
                <Button onClick={() => setShowModal(true)}>+ Register Location</Button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {locations.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    No partner locations registered.
                                </td>
                            </tr>
                        ) : (
                            locations.map((loc) => (
                                <tr key={loc.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{loc.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                            ${loc.type === 'MANUFACTURING' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {loc.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{loc.address || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {/* Placeholder for stock checking feature */}
                                        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/inventory?warehouseId=${loc.id}`}>
                                            View Stock
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">Register Partner Location</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="MANUFACTURING">Manufacturing Plant</option>
                                    <option value="RETAIL">Retail Outlet</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Registering...' : 'Register'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
