'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { getPurchaseOrder, fetchPurchaseOrderReceipts, fetchPODocuments, fetchPOInspections, uploadPODocument, submitPOInspection, verifyPOThreeWayMatch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

const TABS = ['Details', 'Receipts', 'Attachments', 'QA Inspection', '3-Way Match'] as const;
type Tab = typeof TABS[number];

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const poId = resolvedParams.id;

    const [po, setPo] = useState<any>(null);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [inspections, setInspections] = useState<any[]>([]);
    const [matchResult, setMatchResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('Details');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [poData, receiptsData, docsData, inspData] = await Promise.all([
                getPurchaseOrder(poId),
                fetchPurchaseOrderReceipts(poId),
                fetchPODocuments(poId).catch(() => []),
                fetchPOInspections(poId).catch(() => []),
            ]);
            setPo(poData);
            setReceipts(receiptsData);
            setDocuments(docsData);
            setInspections(inspData);
        } catch (err: any) {
            setError(err.message || 'Failed to load PO data');
        } finally {
            setLoading(false);
        }
    }, [poId]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) return <div className="p-8 text-gray-500">Loading purchase order...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
    if (!po) return <div className="p-8 text-gray-500">Purchase Order not found.</div>;

    const statusColor: Record<string, string> = {
        DRAFT: 'bg-gray-100 text-gray-700',
        ORDERED: 'bg-blue-100 text-blue-700',
        RECEIVING: 'bg-yellow-100 text-yellow-700',
        RECEIVED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-red-100 text-red-700',
    };

    const matchColor: Record<string, string> = {
        PENDING: 'bg-gray-100 text-gray-700',
        MATCHED: 'bg-green-100 text-green-700',
        DISCREPANCY: 'bg-red-100 text-red-700',
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/purchase-orders" className="text-gray-400 hover:text-gray-600">
                            ← Back
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">PO #{po.poNumber}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[po.status] || 'bg-gray-100'}`}>
                            {po.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${matchColor[po.threeWayMatch] || 'bg-gray-100'}`}>
                            Match: {po.threeWayMatch || 'PENDING'}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Supplier: {po.supplier?.name || 'Unknown'}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/purchase-orders/${poId}/receive`}>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">Receive Goods</Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab}
                        {tab === 'Attachments' && documents.length > 0 && (
                            <span className="ml-1.5 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">{documents.length}</span>
                        )}
                        {tab === 'QA Inspection' && inspections.length > 0 && (
                            <span className="ml-1.5 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-xs">{inspections.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'Details' && <DetailsTab po={po} />}
            {activeTab === 'Receipts' && <ReceiptsTab receipts={receipts} />}
            {activeTab === 'Attachments' && <AttachmentsTab poId={poId} documents={documents} onRefresh={loadData} />}
            {activeTab === 'QA Inspection' && <QaInspectionTab poId={poId} po={po} inspections={inspections} onRefresh={loadData} />}
            {activeTab === '3-Way Match' && <ThreeWayMatchTab poId={poId} matchResult={matchResult} setMatchResult={setMatchResult} />}
        </div>
    );
}

// ===== Details Tab =====
function DetailsTab({ po }: { po: any }) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <Field label="PO Number" value={po.poNumber} />
                <Field label="Order Date" value={po.orderDate ? format(new Date(po.orderDate), 'MMM d, yyyy') : '-'} />
                <Field label="Expected Date" value={po.expectedDate ? format(new Date(po.expectedDate), 'MMM d, yyyy') : '-'} />
                <Field label="ASN Number" value={po.asnNumber || '-'} />
                <Field label="Buyer" value={po.buyerName || '-'} />
                <Field label="Ship To" value={po.shipToAddress || '-'} />
                <Field label="Payment Terms" value={po.paymentTerms || '-'} />
                <Field label="Delivery Terms" value={po.deliveryTerms || '-'} />
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">Line Items</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty Ordered</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {po.items?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm">
                                    <div className="font-medium text-gray-900">{item.product?.name || item.productId}</div>
                                    <div className="text-xs text-gray-500">{item.product?.sku}</div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-600">Rp {item.unitCost?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                    Rp {(item.quantity * item.unitCost)?.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                            <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                                Rp {po.totalAmount?.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {po.notes && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Notes</h3>
                    <p className="text-gray-700">{po.notes}</p>
                </div>
            )}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
        </div>
    );
}

// ===== Receipts Tab =====
function ReceiptsTab({ receipts }: { receipts: any[] }) {
    if (receipts.length === 0) return <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">No receipts yet. Use "Receive Goods" to create a GRN.</div>;

    return (
        <div className="space-y-4">
            {receipts.map((receipt: any) => (
                <div key={receipt.id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-semibold text-gray-900">GRN: {receipt.grnNumber || receipt.id.substring(0, 8)}</h3>
                            <p className="text-sm text-gray-500">Received: {format(new Date(receipt.receivedAt), 'MMM d, yyyy HH:mm')}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${receipt.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {receipt.status}
                        </span>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items?.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name || item.productId}</td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {receipt.notes && <p className="mt-3 text-sm text-gray-500 italic">{receipt.notes}</p>}
                </div>
            ))}
        </div>
    );
}

// ===== Attachments Tab =====
function AttachmentsTab({ poId, documents, onRefresh }: { poId: string; documents: any[]; onRefresh: () => void }) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [docType, setDocType] = useState('INVOICE');

    const handleUpload = async (file: File) => {
        try {
            setUploading(true);
            await uploadPODocument(poId, file, docType);
            onRefresh();
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const docTypeColors: Record<string, string> = {
        INVOICE: 'bg-blue-100 text-blue-700',
        DELIVERY_NOTE: 'bg-green-100 text-green-700',
        QA_CERT: 'bg-purple-100 text-purple-700',
        PHOTO: 'bg-yellow-100 text-yellow-700',
        OTHER: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm font-medium text-gray-700">Document Type:</label>
                    <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    >
                        <option value="INVOICE">Invoice</option>
                        <option value="DELIVERY_NOTE">Delivery Note</option>
                        <option value="QA_CERT">QA Certificate</option>
                        <option value="PHOTO">Photo</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                    {uploading ? (
                        <p className="text-blue-600 font-medium">Uploading...</p>
                    ) : (
                        <>
                            <p className="text-gray-600 font-medium">Drag & drop a file here, or click to browse</p>
                            <p className="text-gray-400 text-sm mt-1">PDF, Images, or Documents (max 10MB)</p>
                        </>
                    )}
                </div>
            </div>

            {/* Document List */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b"><h3 className="font-semibold text-gray-800">Attached Documents ({documents.length})</h3></div>
                {documents.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No documents attached yet.</div>
                ) : (
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
                            {documents.map((doc: any) => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.fileName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${docTypeColors[doc.documentType] || 'bg-gray-100'}`}>
                                            {doc.documentType.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(doc.uploadedAt), 'MMM d, yyyy HH:mm')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ===== QA Inspection Tab =====
function QaInspectionTab({ poId, po, inspections, onRefresh }: { poId: string; po: any; inspections: any[]; onRefresh: () => void }) {
    const [showForm, setShowForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const openForm = () => {
        // Pre-populate from PO items
        setResults(po.items?.map((item: any) => ({
            productId: item.productId,
            productName: item.product?.name || item.productId,
            receivedQty: item.quantity,
            acceptedQty: item.quantity,
            rejectedQty: 0,
            rejectionReason: '',
        })) || []);
        setShowForm(true);
    };

    const handleQtyChange = (index: number, field: 'acceptedQty' | 'rejectedQty', value: number) => {
        setResults(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            // Auto-calculate the other
            if (field === 'acceptedQty') {
                updated[index].rejectedQty = updated[index].receivedQty - value;
            } else {
                updated[index].acceptedQty = updated[index].receivedQty - value;
            }
            return updated;
        });
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            await submitPOInspection(poId, {
                notes,
                results: results.map(r => ({
                    productId: r.productId,
                    receivedQty: r.receivedQty,
                    acceptedQty: r.acceptedQty,
                    rejectedQty: r.rejectedQty,
                    rejectionReason: r.rejectionReason || undefined,
                })),
            });
            setShowForm(false);
            onRefresh();
        } catch (err: any) {
            alert(`Inspection failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const inspStatusColor: Record<string, string> = {
        PASSED: 'bg-green-100 text-green-700',
        FAILED: 'bg-red-100 text-red-700',
        PARTIAL: 'bg-yellow-100 text-yellow-700',
        PENDING: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">QA Inspections</h3>
                <Button onClick={openForm} className="bg-purple-600 hover:bg-purple-700 text-white">
                    + New Inspection
                </Button>
            </div>

            {/* Inspection Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Record QA Inspection Results</h4>
                    <table className="min-w-full divide-y divide-gray-200 mb-4">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Received</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Accepted</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rejected</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, idx) => (
                                <tr key={r.productId} className="border-b">
                                    <td className="px-4 py-3 text-sm text-gray-900">{r.productName}</td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-700">{r.receivedQty}</td>
                                    <td className="px-4 py-3 text-right">
                                        <input
                                            type="number"
                                            min={0}
                                            max={r.receivedQty}
                                            value={r.acceptedQty}
                                            onChange={(e) => handleQtyChange(idx, 'acceptedQty', parseInt(e.target.value) || 0)}
                                            className="w-20 border rounded px-2 py-1 text-right text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <input
                                            type="number"
                                            min={0}
                                            max={r.receivedQty}
                                            value={r.rejectedQty}
                                            onChange={(e) => handleQtyChange(idx, 'rejectedQty', parseInt(e.target.value) || 0)}
                                            className="w-20 border rounded px-2 py-1 text-right text-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={r.rejectionReason}
                                            onChange={(e) => {
                                                const updated = [...results];
                                                updated[idx].rejectionReason = e.target.value;
                                                setResults(updated);
                                            }}
                                            className="border rounded px-2 py-1 text-sm w-full"
                                        >
                                            <option value="">None</option>
                                            <option value="Breakage">Breakage</option>
                                            <option value="Damaged">Damaged</option>
                                            <option value="Expired">Expired</option>
                                            <option value="Wrong Item">Wrong Item</option>
                                            <option value="Quality Issue">Quality Issue</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            placeholder="Optional inspection notes..."
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {submitting ? 'Submitting...' : 'Submit Inspection'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Past Inspections */}
            {inspections.length === 0 && !showForm ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">No QA inspections recorded yet.</div>
            ) : (
                inspections.map((insp: any) => (
                    <div key={insp.id} className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${inspStatusColor[insp.status] || 'bg-gray-100'}`}>
                                    {insp.status}
                                </span>
                                <span className="ml-3 text-sm text-gray-500">{format(new Date(insp.createdAt), 'MMM d, yyyy HH:mm')}</span>
                            </div>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Received</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Accepted</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rejected</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insp.results?.map((r: any) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2 text-sm text-gray-900">{r.product?.name || r.productId}</td>
                                        <td className="px-4 py-2 text-right text-sm">{r.receivedQty}</td>
                                        <td className="px-4 py-2 text-right text-sm text-green-700 font-medium">{r.acceptedQty}</td>
                                        <td className="px-4 py-2 text-right text-sm text-red-700 font-medium">{r.rejectedQty}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{r.rejectionReason || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {insp.notes && <p className="mt-3 text-sm text-gray-500 italic">{insp.notes}</p>}
                    </div>
                ))
            )}
        </div>
    );
}

// ===== 3-Way Match Tab =====
function ThreeWayMatchTab({ poId, matchResult, setMatchResult }: { poId: string; matchResult: any; setMatchResult: (r: any) => void }) {
    const [loading, setLoading] = useState(false);

    const runMatch = async () => {
        try {
            setLoading(true);
            const result = await verifyPOThreeWayMatch(poId);
            setMatchResult(result);
        } catch (err: any) {
            alert(`Match failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">3-Way Match (PO vs GRN vs Invoice)</h3>
                <Button onClick={runMatch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? 'Verifying...' : 'Run 3-Way Match'}
                </Button>
            </div>

            {!matchResult ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
                    Click "Run 3-Way Match" to compare PO, GRN, and Invoice quantities.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className={`rounded-lg p-4 text-center font-semibold text-lg ${matchResult.matchStatus === 'MATCHED'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {matchResult.matchStatus === 'MATCHED' ? '✅ All items match — ready for payment approval' : '⚠️ Discrepancy detected — review items below'}
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PO Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">GRN Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">QA Accepted</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Total</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {matchResult.items?.map((item: any) => (
                                    <tr key={item.productId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                                        <td className="px-6 py-4 text-right text-sm">{item.orderedQty}</td>
                                        <td className={`px-6 py-4 text-right text-sm font-medium ${item.orderedQty !== item.receivedQty ? 'text-red-600' : 'text-green-600'}`}>
                                            {item.receivedQty}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">{item.acceptedQty}</td>
                                        <td className="px-6 py-4 text-right text-sm">{item.invoicedQty || '-'}</td>
                                        <td className="px-6 py-4 text-right text-sm">Rp {item.expectedCost?.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-right text-sm font-medium ${!item.costMatch ? 'text-red-600' : ''}`}>
                                            {item.invoiceTotal ? `Rp ${item.invoiceTotal?.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.qtyMatch && item.costMatch
                                                ? <span className="text-green-600 font-bold">✓</span>
                                                : <span className="text-red-600 font-bold">✗</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
