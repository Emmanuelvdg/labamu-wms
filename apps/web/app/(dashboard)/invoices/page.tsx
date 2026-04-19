'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInvoices } from '@/lib/api';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { SearchX } from 'lucide-react';

const INVOICE_TABS = [
    { label: 'All', value: 'ALL' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Posted', value: 'POSTED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

export default function InvoiceListPage() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('ALL');
    const [colFilters, setColFilters] = useState({
        invoiceNumber: '',
        vendor: '',
        date: '',
        dueDate: '',
        status: '',
        total: '',
    });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const data = await fetchInvoices();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch invoices', err);
        } finally {
            setLoading(false);
        }
    }

    const setCF = (key: string, val: string) =>
        setColFilters(prev => ({ ...prev, [key]: val }));

    const clearColFilters = () =>
        setColFilters({ invoiceNumber: '', vendor: '', date: '', dueDate: '', status: '', total: '' });

    const getCount = (status: string) => {
        if (status === 'ALL') return invoices.length;
        return invoices.filter(i => i.status === status).length;
    };

    const filtered = invoices.filter(inv => {
        if (statusTab !== 'ALL' && inv.status !== statusTab) return false;
        if (colFilters.invoiceNumber && !(inv.invoiceNumber || '').toLowerCase().includes(colFilters.invoiceNumber.toLowerCase())) return false;
        if (colFilters.vendor && !(inv.vendor?.name || '').toLowerCase().includes(colFilters.vendor.toLowerCase())) return false;
        const dateStr = inv.issueDate ? format(new Date(inv.issueDate), 'MMM d, yyyy') : '';
        if (colFilters.date && !dateStr.toLowerCase().includes(colFilters.date.toLowerCase())) return false;
        const dueDateStr = inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '';
        if (colFilters.dueDate && !dueDateStr.toLowerCase().includes(colFilters.dueDate.toLowerCase())) return false;
        if (colFilters.status && (inv.status || '').toLowerCase() !== colFilters.status.toLowerCase()) return false;
        const total = (inv.totalAmount || 0).toString();
        if (colFilters.total && !total.includes(colFilters.total)) return false;
        return true;
    });

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vendor Invoices</h1>
                    <p className="text-sm text-gray-500">Manage and track vendor billing</p>
                </div>
                {hasPermission('INVOICES', 'CREATE') && (
                    <button
                        onClick={() => router.push('/invoices/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        + New Invoice
                    </button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {INVOICE_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
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
            <div className="bg-white rounded-b-lg shadow overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Invoice #..." value={colFilters.invoiceNumber}
                                    onChange={e => setCF('invoiceNumber', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Vendor..." value={colFilters.vendor}
                                    onChange={e => setCF('vendor', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={colFilters.date}
                                    onChange={e => setCF('date', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Due date..." value={colFilters.dueDate}
                                    onChange={e => setCF('dueDate', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab === 'ALL' ? colFilters.status : statusTab}
                                    onChange={e => { const v = e.target.value; setStatusTab(v || 'ALL'); setCF('status', ''); }}
                                    className={inputCls}>
                                    <option value="">All</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="POSTED">Posted</option>
                                    <option value="PAID">Paid</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                    <input type="text" placeholder="Total..." value={colFilters.total}
                                        onChange={e => setCF('total', e.target.value)} className={inputCls} />
                                    <button onClick={() => { setStatusTab('ALL'); clearColFilters(); }}
                                        className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors" title="Clear all filters">
                                        ✕
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
                                        <p className="text-sm text-gray-500">Try adjusting your filters</p>
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
                            filtered.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{invoice.vendor?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'POSTED' ? 'bg-blue-100 text-blue-800' :
                                            invoice.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                                        ${invoice.totalAmount.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && (
                <p className="mt-3 text-xs text-gray-500">
                    Showing {filtered.length} of {invoices.length} invoices
                </p>
            )}
        </div>
    );
}
