'use client';

import { useEffect, useState } from 'react';
import { fetchPurchaseOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { SearchX, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 50;

const PO_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Ordered', value: 'ORDERED' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('ALL');
    const [page, setPage] = useState(0);
    const [colFilters, setColFilters] = useState({
        poId: '',
        supplier: '',
        date: '',
        approvalStatus: '',
        totalQty: '',
        totalAmount: '',
    });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const data = await fetchPurchaseOrders();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const setCF = (key: string, val: string) => {
        setPage(0);
        setColFilters(prev => ({ ...prev, [key]: val }));
    };

    const clearColFilters = () => {
        setPage(0);
        setColFilters({ poId: '', supplier: '', date: '', approvalStatus: '', totalQty: '', totalAmount: '' });
    };

    const getCount = (status: string) => {
        if (status === 'ALL') return orders.length;
        return orders.filter(o => o.status === status).length;
    };

    const filtered = orders.filter(po => {
        if (statusTab !== 'ALL' && po.status !== statusTab) return false;
        const id = (po.poNumber || po.id.substring(0, 8).toUpperCase()).toLowerCase();
        if (colFilters.poId && !id.includes(colFilters.poId.toLowerCase())) return false;
        const supplier = (po.supplier?.name || '').toLowerCase();
        if (colFilters.supplier && !supplier.includes(colFilters.supplier.toLowerCase())) return false;
        const dateStr = po.createdAt ? format(new Date(po.createdAt), 'MMM d, yyyy') : '';
        if (colFilters.date && !dateStr.toLowerCase().includes(colFilters.date.toLowerCase())) return false;
        const approval = (po.approvalStatus || 'DRAFT').toLowerCase();
        if (colFilters.approvalStatus && approval !== colFilters.approvalStatus.toLowerCase()) return false;
        const qty = (po.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0).toString();
        if (colFilters.totalQty && !qty.includes(colFilters.totalQty)) return false;
        const amt = (po.totalAmount || 0).toString();
        if (colFilters.totalAmount && !amt.includes(colFilters.totalAmount)) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const from = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, filtered.length);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-sm text-gray-500">Manage supplier purchase orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.open('/api/purchase-orders?format=xlsx', '_blank')}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <Link href="/inventory/purchases/new">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">+ Create Purchase Order</Button>
                    </Link>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {PO_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setStatusTab(tab.value); setPage(0); }}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            statusTab === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            statusTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {getCount(tab.value)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Number</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="PO #..." value={colFilters.poId}
                                    onChange={e => setCF('poId', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Supplier..." value={colFilters.supplier}
                                    onChange={e => setCF('supplier', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={colFilters.date}
                                    onChange={e => setCF('date', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={colFilters.approvalStatus} onChange={e => setCF('approvalStatus', e.target.value)} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending_approval">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab === 'ALL' ? '' : statusTab} onChange={e => setStatusTab(e.target.value || 'ALL')} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Qty..." value={colFilters.totalQty}
                                    onChange={e => setCF('totalQty', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Amount..." value={colFilters.totalAmount}
                                    onChange={e => setCF('totalAmount', e.target.value)} className={inputCls} />
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
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No purchase orders found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters or create a new purchase order</p>
                                        <button
                                            onClick={() => { setStatusTab('ALL'); clearColFilters(); }}
                                            className="mt-2 text-blue-600 font-medium hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors text-sm"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paged.map(po => (
                                <tr
                                    key={po.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/inventory/purchases/${po.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                        {po.poNumber || po.id.substring(0, 8).toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {po.supplier?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(po.createdAt), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            po.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            po.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            po.approvalStatus === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {po.approvalStatus || 'DRAFT'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                                            po.status === 'ORDERED' ? 'bg-blue-100 text-blue-800' :
                                            po.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                        {po.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(po.totalAmount || 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                                        <Link
                                            href={`/inventory/purchases/${po.id}`}
                                            className="text-blue-600 hover:text-blue-900 font-semibold bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination bar */}
            {!loading && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <p className="text-sm text-gray-500">
                        {filtered.length === 0 ? 'No purchase orders' : `Showing ${from}–${to} of ${filtered.length} purchase orders`}
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
            )}
        </div>
    );
}
