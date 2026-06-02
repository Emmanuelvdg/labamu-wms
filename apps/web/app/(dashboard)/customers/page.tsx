'use client';

import { useEffect, useState } from 'react';
import { fetchCustomers, createCustomer } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchX, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;
const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);

    // Column filter state
    const [colFilters, setColFilters] = useState({
        name: '',
        registered: '',
        minOrders: '',
        minLtv: '',
    });

    // Customer Creation State
    const [showModal, setShowModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [newCustomerLat, setNewCustomerLat] = useState('');
    const [newCustomerLng, setNewCustomerLng] = useState('');
    const [creatingCustomer, setCreatingCustomer] = useState(false);

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async () => {
        try {
            const data = await fetchCustomers();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return;

        if (newCustomerAddress && (!newCustomerLat || !newCustomerLng)) {
            alert('Please provide both latitude and longitude for the address');
            return;
        }

        setCreatingCustomer(true);
        try {
            const customerData: any = { name: newCustomerName };
            if (newCustomerAddress && newCustomerLat && newCustomerLng) {
                customerData.address = newCustomerAddress;
                customerData.latitude = parseFloat(newCustomerLat);
                customerData.longitude = parseFloat(newCustomerLng);
            }
            await createCustomer(customerData);
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

    const setCF = (key: string, val: string) => { setPage(0); setColFilters(prev => ({ ...prev, [key]: val })); };
    const clearColFilters = () => { setPage(0); setColFilters({ name: '', registered: '', minOrders: '', minLtv: '' }); };

    const filtered = customers.filter(c => {
        const nameStr = `${c.name || ''} ${c.address || ''}`.toLowerCase();
        if (colFilters.name && !nameStr.includes(colFilters.name.toLowerCase())) return false;
        if (colFilters.registered) {
            const regStr = new Date(c.createdAt).toLocaleDateString();
            if (!regStr.toLowerCase().includes(colFilters.registered.toLowerCase())) return false;
        }
        if (colFilters.minOrders && (c.totalOrders || 0) < parseInt(colFilters.minOrders)) return false;
        if (colFilters.minLtv && (c.lifetimeValue || 0) < parseFloat(colFilters.minLtv)) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const from = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, filtered.length);

    if (loading) return <div className="p-8">Loading CRM...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers (CRM)</h1>
                    <p className="text-sm text-gray-500">Manage customer profiles and lifetime value</p>
                </div>
                <Button onClick={() => setShowModal(true)} data-testid="new-customer-page-btn">
                    + New Customer
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Information</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Lifetime Value (LTV)</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Name / address..." value={colFilters.name}
                                    onChange={e => setCF('name', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Registered..." value={colFilters.registered}
                                    onChange={e => setCF('registered', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="≥ Orders" value={colFilters.minOrders}
                                    onChange={e => setCF('minOrders', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="≥ LTV" value={colFilters.minLtv}
                                    onChange={e => setCF('minLtv', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <button onClick={clearColFilters}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No customers found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters</p>
                                        <button onClick={clearColFilters}
                                            className="mt-2 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors text-sm">
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paged.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
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

            <div className="flex items-center justify-between px-6 py-3 border border-gray-200 border-t-0 bg-gray-50 rounded-b-lg">
                <p className="text-sm text-gray-500">
                    {filtered.length === 0 ? 'No customers' : `Showing ${from}–${to} of ${filtered.length} customers`}
                </p>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Previous page">
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <span className="text-sm text-gray-700">Page {page + 1} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Next page">
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
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
