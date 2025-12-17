'use client';

import { useEffect, useState, use } from 'react';
import { fetchPurchaseOrders, receivePurchaseOrder, fetchLocations } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [po, setPo] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [destinationId, setDestinationId] = useState('');
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            // Fetch single PO directly
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/purchase-orders/${id}`;
            console.log(`Fetching PO from: ${url}`);
            const res = await fetch(url);
            console.log(`PO Fetch Status: ${res.status}`);
            if (!res.ok) throw new Error('Failed to fetch PO');
            const data = await res.json();
            setPo(data);

            const locs = await fetchLocations();
            setLocations(locs);
            // Default to first internal location
            const defaultLoc = locs.find((l: any) => l.type === 'INTERNAL');
            if (defaultLoc) setDestinationId(defaultLoc.id);
        } catch (e) {
            console.error(e);
            setPo(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleReceive() {
        if (!destinationId) return;
        setReceiving(true);
        try {
            await receivePurchaseOrder(po.id, destinationId);
            alert('Goods Received Successfully!');
            loadData(); // Reload to show status update
        } catch (e) {
            console.error(e);
            alert('Failed to receive goods');
        } finally {
            setReceiving(false);
        }
    }

    async function handleAction(action: 'submit' | 'approve' | 'reject') {
        try {
            const body: any = { userId: 'user-123' }; // Mock User ID
            if (action === 'reject') body.reason = prompt('Enter rejection reason:') || 'No reason provided';

            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/purchase-orders/${po.id}/${action}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to perform action');

            loadData();
        } catch (e) {
            console.error(e);
            alert(`Failed to ${action} PO`);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!po) return <div className="p-8">Purchase Order not found</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">PO: {po.poNumber || po.id.substring(0, 8).toUpperCase()}</h1>
                    <p className="text-gray-500">Supplier: {po.supplier?.name}</p>
                    <p className="text-gray-500">Order Date: {format(new Date(po.orderDate || po.createdAt), 'MMM d, yyyy')}</p>
                    {po.expectedDate && <p className="text-gray-500">Expected: {format(new Date(po.expectedDate), 'MMM d, yyyy')}</p>}
                </div>
                <div className="text-right space-y-2">
                    <div className="space-x-2">
                        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
                            ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                                po.status === 'ORDERED' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                            {po.status}
                        </span>
                        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
                            ${po.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                po.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    po.approvalStatus === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'}`}>
                            {po.approvalStatus || 'DRAFT'}
                        </span>
                    </div>

                    {/* Approval Actions */}
                    <div className="space-x-2">
                        {(!po.approvalStatus || po.approvalStatus === 'DRAFT' || po.approvalStatus === 'REJECTED') && (
                            <Button size="sm" onClick={() => handleAction('submit')}>Submit for Approval</Button>
                        )}
                        {po.approvalStatus === 'PENDING_APPROVAL' && (
                            <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction('approve')}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleAction('reject')}>Reject</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Buyer Info</h3>
                    <p className="font-medium">{po.buyerName || 'N/A'}</p>
                    <p className="whitespace-pre-line text-sm text-gray-600">{po.buyerAddress}</p>
                    <p className="text-sm text-gray-600 mt-1">{po.buyerContact}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Shipping & Billing</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Ship To:</p>
                            <p className="text-sm whitespace-pre-line">{po.shipToAddress || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Bill To:</p>
                            <p className="text-sm whitespace-pre-line">{po.billToAddress || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {po.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name || item.productId}</div>
                                    {item.packaging && (
                                        <div className="text-xs text-gray-500">
                                            {item.packaging.name} ({item.packaging.quantity} units)
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">{item.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">${item.unitCost.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">${(item.quantity * item.unitCost).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-gray-500">Subtotal</td>
                            <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                                ${(po.items.reduce((sum: number, i: any) => sum + (i.quantity * i.unitCost), 0)).toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-gray-500">Tax</td>
                            <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">${(po.taxAmount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan={3} className="px-6 py-2 text-right text-sm font-medium text-gray-500">Shipping</td>
                            <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">${(po.shippingCost || 0).toFixed(2)}</td>
                        </tr>
                        <tr className="border-t border-gray-200">
                            <td colSpan={3} className="px-6 py-3 text-right text-base font-bold text-gray-900">Total</td>
                            <td className="px-6 py-3 text-right text-base font-bold text-gray-900">${(po.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Footer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Terms</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Payment:</span> {po.paymentTerms || 'N/A'}</p>
                        <p><span className="text-gray-500">Delivery:</span> {po.deliveryTerms || 'N/A'}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{po.notes || 'None'}</p>
                </div>
            </div>

            {po.status !== 'RECEIVED' && (
                <div className="bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Receive Goods</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
                            <select
                                className="w-full border rounded p-2"
                                value={destinationId}
                                onChange={e => setDestinationId(e.target.value)}
                            >
                                {locations.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleReceive} disabled={receiving}>
                            {receiving ? 'Receiving...' : 'Receive Products'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
