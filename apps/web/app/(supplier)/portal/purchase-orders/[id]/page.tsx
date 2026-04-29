'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SupplierPODetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/supplier-portal/purchase-orders/${id}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setPo)
            .catch(() => router.push('/portal/dashboard'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p className="text-gray-500">Loading…</p>;
    if (!po) return null;

    return (
        <div>
            <button onClick={() => router.back()} className="text-sm text-blue-600 hover:text-blue-800 mb-4">← Back</button>
            <div className="bg-white border rounded-lg p-6 mb-6">
                <h1 className="text-xl font-bold text-gray-900 mb-4">PO {po.poNumber}</h1>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">Status</span><p className="font-medium">{po.status}</p></div>
                    <div><span className="text-gray-500">Order Date</span><p className="font-medium">{new Date(po.orderDate).toLocaleDateString()}</p></div>
                    <div><span className="text-gray-500">Expected</span><p className="font-medium">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</p></div>
                </div>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
                <h2 className="text-base font-semibold px-6 py-4 border-b">Line Items</h2>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Product', 'SKU', 'Qty Ordered', 'Unit Cost'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {po.items?.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-4 py-3 font-medium">{item.product?.name ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-gray-600">{item.product?.sku ?? '—'}</td>
                                <td className="px-4 py-3">{item.quantity}</td>
                                <td className="px-4 py-3">{item.unitCost?.toLocaleString() ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
