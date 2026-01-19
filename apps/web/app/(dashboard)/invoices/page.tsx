
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInvoices } from '@/lib/api';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

export default function InvoiceListPage() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await fetchInvoices();
            setInvoices(data);
        } catch (err) {
            console.error('Failed to fetch invoices', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Vendor Invoices</h1>
                {hasPermission('INVOICES', 'CREATE') && (
                    <button
                        onClick={() => router.push('/invoices/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        New Invoice
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No invoices found.</td>
                            </tr>
                        ) : (
                            invoices.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{invoice.vendor?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'POSTED' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">${invoice.totalAmount.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
