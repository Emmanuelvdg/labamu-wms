'use client';

import { useEffect, useState, use } from 'react';
import { getCustomer, updateCustomer, deleteCustomer } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;
    const router = useRouter();

    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCustomer();
    }, [id]);

    const loadCustomer = async () => {
        try {
            const data = await getCustomer(id);
            if (data) {
                setCustomer(data);
                setEditData({
                    name: data.name || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    city: data.city || '',
                    country: data.country || '',
                    state: data.state || '',
                    postalCode: data.postalCode || '',
                });
            }
        } catch (error) {
            console.error('Failed to load customer:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (customer) {
            setEditData({
                name: customer.name || '',
                address: customer.address || '',
                phone: customer.phone || '',
                city: customer.city || '',
                country: customer.country || '',
                state: customer.state || '',
                postalCode: customer.postalCode || '',
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCustomer(id, editData);
            setIsEditing(false);
            await loadCustomer();
        } catch (error) {
            console.error('Failed to update customer:', error);
            alert('Failed to update customer data.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteCustomer(id);
            router.push('/customers');
        } catch (error) {
            console.error('Failed to delete customer:', error);
            alert('Failed to delete customer.');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading CRM Profile...</div>;
    if (!customer) return <div className="p-8 text-center text-gray-500 font-medium">Customer not found.</div>;

    const averageOrderValue = customer.totalOrders > 0
        ? customer.lifetimeValue / customer.totalOrders
        : 0;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6 flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
                    <p className="text-gray-500 mt-1">Customer Profile & Order History</p>
                </div>
                <div className="flex gap-3">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={handleEdit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
                            >
                                Delete
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                    <Link href="/customers" className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
                        Back to List
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-gray-900">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 md:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Information
                    </h2>

                    {!isEditing ? (
                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                            <div className="col-span-2">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company / Name</span>
                                <span className="text-lg font-medium">{customer.name}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1 text-gray-900">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</span>
                                <span className="text-sm leading-relaxed">{customer.address || '-'}</span>
                                <div className="mt-1 text-sm">
                                    {[customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ')}
                                    {customer.country && <div>{customer.country}</div>}
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Phone</span>
                                <span className="text-sm font-medium text-blue-600">{customer.phone || 'No phone set'}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customer ID</span>
                                <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border overflow-hidden truncate block mt-1" title={customer.id}>
                                    {customer.id}
                                </span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Member Since</span>
                                <span className="text-sm flex items-center mt-1">
                                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(customer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name / Company</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address</label>
                                    <textarea
                                        rows={2}
                                        value={editData.address || ''}
                                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                                    <input
                                        type="text"
                                        value={editData.city || ''}
                                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State / Province</label>
                                    <input
                                        type="text"
                                        value={editData.state || ''}
                                        onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postal Code</label>
                                    <input
                                        type="text"
                                        value={editData.postalCode || ''}
                                        onChange={(e) => setEditData({ ...editData, postalCode: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={editData.country || ''}
                                        onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={editData.phone || ''}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* KPI Metrics */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center space-y-8">
                    <div className="text-center">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Lifetime Value (LTV)</span>
                        <div className="text-4xl font-extrabold text-blue-600">
                            IDR {customer.lifetimeValue.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-8">
                        <div className="text-center">
                            <span className="block text-3xl font-bold text-gray-800">{customer.totalOrders}</span>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Total Orders</span>
                        </div>
                        <div className="text-center border-l border-gray-100">
                            <span className="block text-xl font-bold text-gray-800">
                                {averageOrderValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Avg Ticket</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h2 className="text-lg font-semibold text-gray-800 text-gray-900">Sales Order History</h2>
                    </div>
                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">
                        {customer.orders.length} Orders
                    </span>
                </div>
                <div className="overflow-x-auto text-gray-900">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items Summary</th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {customer.orders.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No historical orders found for this profile.</td></tr>
                            ) : (
                                customer.orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors cursor-default">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 font-mono tracking-tight">
                                            <Link href={`/orders/${order.id}`}>
                                                #{order.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                                            <div className="truncate font-medium">
                                                {order.items.map((it: any) => it.product?.name).join(', ') || 'Service/Non-inventory'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">{order.items.length} unique line items</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2.5 py-1 inline-flex text-[10px] leading-tight font-bold rounded-full uppercase tracking-tighter
                                                ${order.status === 'SHIPPED' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                    order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                        order.status === 'DRAFT' ? 'bg-gray-50 text-gray-700 border border-gray-100' :
                                                            'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            IDR {(order.totalAmount || 0).toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
