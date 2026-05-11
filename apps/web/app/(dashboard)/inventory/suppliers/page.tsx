"use client"

import { useState, useEffect, useMemo } from 'react';
import { fetchSuppliers, createSupplier } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { SearchX } from 'lucide-react';

const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contactInfo: '' };

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [colFilters, setColFilters] = useState({ name: '', email: '', phone: '', minOrders: '' });

    const [showModal, setShowModal] = useState(false);
    const [newSupplier, setNewSupplier] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            setSuppliers(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newSupplier.name.trim()) return;
        setCreating(true);
        try {
            await createSupplier(newSupplier);
            toast.success('Supplier created successfully');
            setShowModal(false);
            setNewSupplier(EMPTY_FORM);
            loadSuppliers();
        } catch {
            toast.error('Failed to create supplier');
        } finally {
            setCreating(false);
        }
    };

    const setCF = (key: string, val: string) =>
        setColFilters(prev => ({ ...prev, [key]: val }));

    const clearColFilters = () =>
        setColFilters({ name: '', email: '', phone: '', minOrders: '' });

    const filtered = useMemo(() => suppliers.filter(s => {
        if (colFilters.name && !s.name?.toLowerCase().includes(colFilters.name.toLowerCase())) return false;
        if (colFilters.email && !s.email?.toLowerCase().includes(colFilters.email.toLowerCase())) return false;
        if (colFilters.phone && !s.phone?.toLowerCase().includes(colFilters.phone.toLowerCase())) return false;
        if (colFilters.minOrders && (s._count?.purchaseOrders ?? 0) < parseInt(colFilters.minOrders)) return false;
        return true;
    }), [suppliers, colFilters]);

    if (loading) return <div className="p-8">Loading suppliers...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-sm text-gray-500">Manage vendor contacts and purchase history</p>
                </div>
                <Button onClick={() => setShowModal(true)} data-testid="add-supplier-btn">
                    + Add Supplier
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column filter row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Search name..." value={colFilters.name}
                                    onChange={e => setCF('name', e.target.value)} className={inputCls}
                                    data-testid="supplier-search" />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Search email..." value={colFilters.email}
                                    onChange={e => setCF('email', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Search phone..." value={colFilters.phone}
                                    onChange={e => setCF('phone', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="≥ Orders" value={colFilters.minOrders}
                                    onChange={e => setCF('minOrders', e.target.value)} className={inputCls} />
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
                                        <h3 className="text-lg font-medium text-gray-900">No suppliers found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters</p>
                                        <button onClick={clearColFilters}
                                            className="mt-2 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors text-sm">
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link href={`/inventory/suppliers/${s.id}`}
                                            className="font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                                            {s.name}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{s.email || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{s.phone || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs">
                                            {s._count?.purchaseOrders || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <Link href={`/inventory/suppliers/${s.id}`}
                                            className="text-indigo-600 hover:text-indigo-900">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-xs text-gray-500">
                Showing {filtered.length} of {suppliers.length} suppliers
            </p>

            {/* Create modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">Add New Supplier</h2>
                        <div className="space-y-4">
                            {(['name', 'email', 'phone', 'address'] as const).map(key => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                        {key}{key === 'name' ? ' *' : ''}
                                    </label>
                                    <input
                                        type={key === 'email' ? 'email' : 'text'}
                                        className="w-full border border-gray-300 p-2 rounded text-sm"
                                        value={newSupplier[key]}
                                        onChange={e => setNewSupplier(prev => ({ ...prev, [key]: e.target.value }))}
                                        data-testid={key === 'name' ? 'supplier-name-input' : undefined}
                                        autoFocus={key === 'name'}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => { setShowModal(false); setNewSupplier(EMPTY_FORM); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={creating || !newSupplier.name.trim()}
                                data-testid="create-supplier-submit">
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
