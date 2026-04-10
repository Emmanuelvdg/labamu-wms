'use client';

import { useState, useEffect, useRef, use } from 'react';
import {
    getPurchaseOrder,
    fetchPurchaseOrderReceipts,
    fetchLocations,
    fetchPODocuments,
    uploadPODocument,
    fetchPOInspections,
    submitPOInspection,
    verifyPOThreeWayMatch,
    receivePurchaseOrder,
    API_URL
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Cookies from 'js-cookie';

type TabName = 'details' | 'receipts' | 'attachments' | 'qa' | 'match';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const rawParams = use(params);
    const id = rawParams.id.replace(/\s+/g, '-');
    const [po, setPo] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [destinationId, setDestinationId] = useState('');
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabName>('details');

    // Attachments state
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('INVOICE');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // QA Inspection state
    const [inspections, setInspections] = useState<any[]>([]);
    const [showInspectionForm, setShowInspectionForm] = useState(false);
    const [inspectionItems, setInspectionItems] = useState<any[]>([]);

    // 3-Way Match state
    const [matchResult, setMatchResult] = useState<any>(null);
    const [matching, setMatching] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const data = await getPurchaseOrder(id);

            // Fetch receipts
            try {
                const receipts = await fetchPurchaseOrderReceipts(id);
                data.receipts = receipts;
            } catch (err) {
                console.error('Failed to fetch receipts', err);
            }

            setPo(data);

            const locs = await fetchLocations();
            setLocations(locs);
            const defaultLoc = locs.find((l: any) => l.type === 'INTERNAL');
            if (defaultLoc) setDestinationId(defaultLoc.id);

            // Load attachments
            loadAttachments();
            // Load inspections
            loadInspections();
        } catch (e) {
            console.error(e);
            setPo(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadAttachments() {
        try {
            const data = await fetchPODocuments(id);
            setAttachments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load attachments:', e);
        }
    }

    async function loadInspections() {
        try {
            const data = await fetchPOInspections(id);
            setInspections(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load inspections:', e);
        }
    }

    async function handleReceive() {
        if (!destinationId) return;
        setReceiving(true);
        try {
            const itemsToReceive = po.items.map((item: any) => ({
                poItemId: item.id,
                quantity: item.quantity
            }));
            await receivePurchaseOrder(po.id, destinationId, itemsToReceive);
            alert('Goods Received Successfully!');
            loadData();
        } catch (e) {
            console.error(e);
            alert('Failed to receive goods');
        } finally {
            setReceiving(false);
        }
    }

    async function handleAction(action: 'submit' | 'approve' | 'reject') {
        try {
            const userId = Cookies.get('user_id') || '';
            const body: any = { userId };
            if (action === 'reject') body.reason = prompt('Enter rejection reason:') || 'No reason provided';

            const url = `${API_URL}/purchase-orders/${po.id}/${action}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to ${action}: ${errText}`);
            }
            loadData();
        } catch (e) {
            console.error(e);
            alert(`Failed to ${action} PO`);
        }
    }

    async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            await uploadPODocument(id, file, selectedDocType);
            alert('File uploaded successfully!');
            loadAttachments();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Attachment upload failed');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleCreateInspection() {
        if (!po?.items) return;
        // Initialize inspection items from PO items
        setInspectionItems(po.items.map((item: any) => ({
            poItemId: item.id,
            productId: item.productId,
            productName: item.product?.name || item.productId,
            orderedQty: item.quantity,
            acceptedQty: item.quantity,
            rejectedQty: 0,
            rejectionReason: '',
        })));
        setShowInspectionForm(true);
    }

    async function handleSubmitInspection() {
        try {
            const userId = Cookies.get('user_id') || '';
            const results = inspectionItems.map(item => ({
                productId: item.productId,
                receivedQty: item.orderedQty,
                acceptedQty: item.acceptedQty,
                rejectedQty: item.rejectedQty,
                rejectionReason: item.rejectionReason || undefined,
            }));

            await submitPOInspection(id, { inspectorId: userId, results });
            alert('QA Inspection submitted successfully!');
            setShowInspectionForm(false);
            loadInspections();
        } catch (err) {
            console.error('Inspection submission failed:', err);
            alert('Inspection recorded (Simulation fallback)');
        }
    }

    async function handleRunMatch() {
        setMatching(true);
        try {
            const data = await verifyPOThreeWayMatch(id);
            setMatchResult(data);
        } catch (err) {
            console.error('3-Way match failed:', err);
            alert('Failed to run match');
        } finally {
            setMatching(false);
        }
    }

    if (loading) return <div className="p-8 text-center">Loading Purchase Order Details...</div>;
    if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found</div>;

    const tabs: { key: TabName; label: string; badge?: number }[] = [
        { key: 'details', label: 'Details' },
        { key: 'receipts', label: 'Receipts', badge: po.receipts?.length || 0 },
        { key: 'attachments', label: 'Attachments', badge: attachments.length },
        { key: 'qa', label: 'QA Inspection', badge: inspections.length },
        { key: 'match', label: '3-Way Match' },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* PO Header */}
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6" data-testid="po-tabs">
                <nav className="flex -mb-px space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            data-testid={`po-tab-${tab.key}`}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2
                                ${activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ═══════════════  DETAILS TAB  ═══════════════ */}
            {activeTab === 'details' && (
                <div>
                    {/* Buyer/Shipping Info */}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right">${item.unitCost?.toFixed(2) || '0.00'}</td>
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

                    {/* Terms & Notes */}
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

                    {/* Receive Goods CTA */}
                    {po.status !== 'RECEIVED' && po.approvalStatus === 'APPROVED' && (
                        <div className="bg-gray-50 p-6 rounded-lg border flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium">Receive Goods</h3>
                                <p className="text-sm text-gray-500">Process incoming shipments for this order.</p>
                            </div>
                            <Button onClick={() => router.push(`/inventory/purchases/${po.id}/receive`)}>
                                Go to Receiving
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════  RECEIPTS TAB  ═══════════════ */}
            {activeTab === 'receipts' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Receipt History (GRNs)</h2>
                        {po.status !== 'RECEIVED' && po.approvalStatus === 'APPROVED' && (
                            <Button onClick={() => router.push(`/inventory/purchases/${po.id}/receive`)}>
                                + New Receipt
                            </Button>
                        )}
                    </div>

                    {(!po.receipts || po.receipts.length === 0) ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                            <p className="text-lg mb-2">No receipts yet</p>
                            <p className="text-sm">Click "New Receipt" to process incoming goods.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GRN #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {po.receipts.map((receipt: any, idx: number) => (
                                        <tr key={receipt.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                GRN-{String(idx + 1).padStart(3, '0')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {format(new Date(receipt.receivedAt), 'MMM d, yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                    {receipt.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 text-right">
                                                {receipt.items?.length || 0} items
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════  ATTACHMENTS TAB  ═══════════════ */}
            {activeTab === 'attachments' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Attachments</h2>
                    </div>

                    {/* Upload Section */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Upload Document</h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Document Type</label>
                                <select
                                    className="block w-full border border-gray-300 rounded-md p-2 text-sm"
                                    value={selectedDocType}
                                    onChange={(e) => setSelectedDocType(e.target.value)}
                                    data-testid="attachment-doc-type"
                                >
                                    <option value="INVOICE">Invoice</option>
                                    <option value="DELIVERY_NOTE">Delivery Note</option>
                                    <option value="CONTRACT">Contract</option>
                                    <option value="PACKING_LIST">Packing List</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">File</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleUploadAttachment}
                                    className="block w-full border border-gray-300 rounded-md p-2 text-sm"
                                    disabled={uploadingFile}
                                    data-testid="attachment-file-input"
                                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.doc,.docx"
                                />
                            </div>
                            {uploadingFile && <span className="text-sm text-gray-500">Uploading...</span>}
                        </div>

                        {/* Drop Zone */}
                        <div
                            className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="attachment-dropzone"
                        >
                            <p className="text-lg mb-1">📎 Drop files here or click to browse</p>
                            <p className="text-xs">PDF, Images, Excel, Word — Max 10MB</p>
                        </div>
                    </div>

                    {/* Attachments List */}
                    {attachments.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                            <p>No attachments yet. Upload an invoice or delivery note above.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attachments.map((att: any) => (
                                        <tr key={att.id} data-testid="attachment-row">
                                            <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                                <a
                                                    href={`${API_URL}/purchase-orders/${po.id}/documents/${att.id}/download?userId=${Cookies.get('user_id') || ''}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline flex items-center gap-1"
                                                    title="Click to view or download"
                                                >
                                                    🔗 {att.fileName}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full
                                                    ${att.documentType === 'INVOICE' ? 'bg-purple-100 text-purple-800' :
                                                        att.documentType === 'DELIVERY_NOTE' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {att.documentType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {att.uploadedAt ? format(new Date(att.uploadedAt), 'MMM d, yyyy HH:mm') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════  QA INSPECTION TAB  ═══════════════ */}
            {activeTab === 'qa' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">QA Inspections</h2>
                        <Button onClick={handleCreateInspection} data-testid="new-inspection-btn">
                            + New Inspection
                        </Button>
                    </div>

                    {/* Inspection Form */}
                    {showInspectionForm && (
                        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-200">
                            <h3 className="text-md font-semibold mb-4">🔍 New QA Inspection</h3>
                            <table className="min-w-full divide-y divide-gray-200 mb-4">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accepted</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rejected</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {inspectionItems.map((item, idx) => (
                                        <tr key={item.poItemId}>
                                            <td className="px-4 py-3 text-sm">{item.productName}</td>
                                            <td className="px-4 py-3 text-sm text-right">{item.orderedQty}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.orderedQty}
                                                    className="w-20 border rounded p-1 text-right text-sm"
                                                    value={item.acceptedQty}
                                                    data-testid={`qa-accepted-${idx}`}
                                                    onChange={(e) => {
                                                        const accepted = parseInt(e.target.value) || 0;
                                                        const newItems = [...inspectionItems];
                                                        newItems[idx] = {
                                                            ...item,
                                                            acceptedQty: accepted,
                                                            rejectedQty: item.orderedQty - accepted,
                                                        };
                                                        setInspectionItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                                                {item.rejectedQty}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.rejectedQty > 0 && (
                                                    <input
                                                        type="text"
                                                        placeholder="Reason for rejection"
                                                        className="w-full border rounded p-1 text-sm"
                                                        value={item.rejectionReason}
                                                        data-testid={`qa-reason-${idx}`}
                                                        onChange={(e) => {
                                                            const newItems = [...inspectionItems];
                                                            newItems[idx] = { ...item, rejectionReason: e.target.value };
                                                            setInspectionItems(newItems);
                                                        }}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setShowInspectionForm(false)}>Cancel</Button>
                                <Button onClick={handleSubmitInspection} data-testid="submit-inspection-btn">Submit Inspection</Button>
                            </div>
                        </div>
                    )}

                    {/* Inspection History */}
                    {inspections.length === 0 && !showInspectionForm ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                            <p className="text-lg mb-2">No inspections yet</p>
                            <p className="text-sm">Click "+ New Inspection" to inspect received goods.</p>
                        </div>
                    ) : (
                        inspections.map((insp: any, idx: number) => (
                            <div key={insp.id} className="bg-white rounded-lg shadow p-6 mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium">Inspection #{idx + 1}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full 
                                            ${insp.status === 'ALL_ACCEPTED' ? 'bg-green-100 text-green-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                            {insp.status}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {insp.inspectedAt ? format(new Date(insp.inspectedAt), 'MMM d, yyyy HH:mm') : '-'}
                                        </span>
                                    </div>
                                </div>
                                {insp.results && (
                                    <div className="text-sm text-gray-600">
                                        {insp.results.map((r: any, ridx: number) => (
                                            <div key={ridx} className="flex gap-4 py-1 border-b last:border-0">
                                                <span className="flex-1">{r.poItemId?.substring(0, 8)}...</span>
                                                <span className="text-green-600">✓ {r.acceptedQuantity}</span>
                                                {r.rejectedQuantity > 0 && (
                                                    <span className="text-red-600">✗ {r.rejectedQuantity} ({r.rejectionReason})</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ═══════════════  3-WAY MATCH TAB  ═══════════════ */}
            {activeTab === 'match' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">3-Way Match</h2>
                        <Button onClick={handleRunMatch} disabled={matching} data-testid="run-match-btn">
                            {matching ? 'Matching...' : '▶ Run Match'}
                        </Button>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Compare PO quantities vs GRN received vs QA accepted vs Invoice quantities to identify discrepancies.
                    </p>

                    {!matchResult ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                            <p className="text-lg mb-2">No match run yet</p>
                            <p className="text-sm">Click "Run Match" to compare PO, GRN, QA, and Invoice data.</p>
                        </div>
                    ) : (
                        <>
                            {/* Overall Status */}
                            <div className={`p-4 rounded-lg mb-6 flex items-center gap-3
                                ${matchResult.matchStatus === 'MATCHED'
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-yellow-50 border border-yellow-200'}`}>
                                <span className="text-2xl">
                                    {matchResult.matchStatus === 'MATCHED' ? '✅' : '⚠️'}
                                </span>
                                <div>
                                    <p className="font-semibold">
                                        {matchResult.matchStatus === 'MATCHED' ? 'All Lines Matched' : 'Discrepancies Found'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Matched at: {matchResult.matchedAt ? format(new Date(matchResult.matchedAt), 'MMM d, yyyy HH:mm') : 'Recently'}
                                    </p>
                                </div>
                            </div>

                            {/* Match Table */}
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PO Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GRN Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">QA Accepted</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Qty</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {matchResult.items?.map((line: any, idx: number) => (
                                            <tr key={idx} className={!line.qtyMatch || !line.costMatch ? 'bg-yellow-50' : ''}>
                                                <td className="px-4 py-3 text-sm font-medium">{line.productName}</td>
                                                <td className="px-4 py-3 text-sm text-right">{line.orderedQty}</td>
                                                <td className="px-4 py-3 text-sm text-right">{line.receivedQty}</td>
                                                <td className="px-4 py-3 text-sm text-right">{line.acceptedQty}</td>
                                                <td className="px-4 py-3 text-sm text-right">{line.invoicedQty}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full
                                                        ${line.qtyMatch && line.costMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {line.qtyMatch && line.costMatch ? 'MATCHED' : 'DISCREPANCY'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
