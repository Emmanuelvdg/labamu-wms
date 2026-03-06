'use client';

import { useEffect, useState } from 'react';
import { fetchCustomers, createCustomer } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Customer Creation State
    const [showModal, setShowModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [newCustomerLat, setNewCustomerLat] = useState('');
    const [newCustomerLng, setNewCustomerLng] = useState('');
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const data = await fetchCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return;

        // Validate address fields if provided
        if (newCustomerAddress && (!newCustomerLat || !newCustomerLng)) {
            alert('Please provide both latitude and longitude for the address');
            return;
        }

        setCreatingCustomer(true);
        try {
            const customerData: any = { name: newCustomerName };

            // Add address fields if provided
            if (newCustomerAddress && newCustomerLat && newCustomerLng) {
                customerData.address = newCustomerAddress;
                customerData.latitude = parseFloat(newCustomerLat);
                customerData.longitude = parseFloat(newCustomerLng);
            }

            const newCustomer = await createCustomer(customerData);
            // Re-fetch to get aggregate LTV and order counts correctly initialized
            await loadCustomers();
            setShowModal(false);
            setNewCustomerName('');
            setNewCustomerAddress('');
            setNewCustomerLat('');
            setNewCustomerLng('');
        } catch (error) {
            console.error('Failed to create customer:', error);
            alert('Failed to create customer');
        } finally {
            setCreatingCustomer(false);
        }
    };

    if (loading) return <div className="p-8">Loading CRM...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Customers (CRM)</h1>
                <Button onClick={() => setShowModal(true)} data-testid="new-customer-page-btn">
                    + New Customer
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Information</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lifetime Value (LTV)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No customers found.</td></tr>
                        ) : (
                            customers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{c.name}</div>
                                        {c.address && <div className="text-sm text-gray-500 truncate max-w-xs">{c.address}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(c.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs">
                                            {c.totalOrders || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                                        IDR {(c.lifetimeValue || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/customers/${c.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            View Profile
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Customer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">New Customer</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    className="w-full border border-gray-300 p-2 rounded"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address (for Lalamove delivery)
                                </label>
                                <textarea
                                    placeholder="Full delivery address"
                                    className="w-full border border-gray-300 p-2 rounded"
                                    rows={2}
                                    value={newCustomerAddress}
                                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="13.7563"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newCustomerLat}
                                        onChange={(e) => setNewCustomerLat(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="100.5018"
                                        className="w-full border border-gray-300 p-2 rounded"
                                        value={newCustomerLng}
                                        onChange={(e) => setNewCustomerLng(e.target.value)}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                💡 Tip: Get coordinates from Google Maps → Right-click location → Copy coordinates
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={handleCreateCustomer} disabled={creatingCustomer || !newCustomerName.trim()}>
                                {creatingCustomer ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
