'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Loader2, AlertTriangle } from 'lucide-react';
import { PrintButton } from '@/components/ui/print-button';
import { api } from '@/lib/api';

interface BatchDetail {
    id: string;
    batchNumber: string;
    status: string;
    initialQuantity: number;
    currentQuantity: number;
    reserved: number;
    costPerUnit: number;
    purchaseDate: string;
    expiryDate: string | null;
    vendor: string | null;
    product: { id: string; name: string; sku: string | null; category: string | null };
    location: { id: string; name: string; fullAddress: string | null } | null;
    warehouse: { id: string; name: string };
}

const STATUS_COLOURS: Record<string, string> = {
    ACTIVE:      'bg-green-100 text-green-800',
    QUARANTINE:  'bg-yellow-100 text-yellow-800',
    EXPIRED:     'bg-red-100 text-red-800',
    DEPLETED:    'bg-gray-100 text-gray-600',
};

export default function BatchDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [batch, setBatch] = useState<BatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        api.get(`/inventory/batches/${id}`)
            .then((data) => setBatch(data))
            .catch(() => setError('Batch not found'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                    <span>{error ?? 'Batch not found'}</span>
                </div>
            </div>
        );
    }

    const available = batch.currentQuantity - batch.reserved;
    const statusColour = STATUS_COLOURS[batch.status] ?? 'bg-gray-100 text-gray-600';
    const isExpiringSoon = batch.expiryDate &&
        new Date(batch.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <Link href="/inventory/batches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Lots
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Package className="h-8 w-8 text-gray-700" />
                        {batch.batchNumber}
                    </h1>
                    <p className="text-gray-500 mt-1">{batch.product.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColour}`}>
                        {batch.status}
                    </span>
                    <PrintButton endpoint={`/printing/lot/${batch.id}/pdf`} label="Print Lot Label" />
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Current Qty" value={batch.currentQuantity.toString()} />
                <StatCard label="Available" value={available.toString()} />
                <StatCard label="Reserved" value={batch.reserved.toString()} />
                <StatCard label="Cost / Unit" value={`$${batch.costPerUnit.toFixed(2)}`} />
            </div>

            {/* Detail panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product info */}
                <Panel title="Product">
                    <Row label="SKU" value={batch.product.sku ?? '—'} />
                    <Row label="Category" value={batch.product.category ?? '—'} />
                    <Row
                        label="Product"
                        value={
                            <Link href={`/inventory/${batch.product.id}`} className="text-blue-600 hover:underline">
                                {batch.product.name}
                            </Link>
                        }
                    />
                </Panel>

                {/* Lot details */}
                <Panel title="Lot Details">
                    <Row label="Initial Qty" value={batch.initialQuantity.toString()} />
                    <Row label="Vendor" value={batch.vendor ?? '—'} />
                    <Row label="Purchase Date" value={new Date(batch.purchaseDate).toLocaleDateString()} />
                    <Row
                        label="Expiry Date"
                        value={
                            batch.expiryDate ? (
                                <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                                    {new Date(batch.expiryDate).toLocaleDateString()}
                                    {isExpiringSoon && ' ⚠ Expiring soon'}
                                </span>
                            ) : '—'
                        }
                    />
                </Panel>

                {/* Storage */}
                <Panel title="Storage">
                    <Row label="Warehouse" value={batch.warehouse.name} />
                    <Row
                        label="Location"
                        value={
                            batch.location ? (
                                <Link href={`/inventory/locations/${batch.location.id}`} className="text-blue-600 hover:underline">
                                    {batch.location.name}
                                </Link>
                            ) : '—'
                        }
                    />
                </Panel>

                {/* Barcode preview */}
                <Panel title="Barcode">
                    <div className="flex flex-col items-center gap-3 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`/api/inventory/batches/${batch.id}/barcode`}
                            alt={`Barcode for ${batch.batchNumber}`}
                            className="max-w-xs border border-gray-200 rounded p-2 bg-white"
                        />
                        <p className="text-xs text-gray-400 font-mono">{batch.batchNumber}</p>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{title}</h3>
            <dl className="space-y-2">{children}</dl>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900 font-medium text-right">{value}</dd>
        </div>
    );
}
