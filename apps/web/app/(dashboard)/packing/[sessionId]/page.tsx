'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    fetchPackingSession,
    scanPackingItem,
    createPackingParcel,
    removePackingParcel,
    completePackingSession,
} from '@/lib/api';
import {
    Package,
    ScanBarcode,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
    ArrowLeft,
    Scale,
    Ruler,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PackingWorkspacePage() {
    const { sessionId } = useParams();
    const router = useRouter();
    const scanInputRef = useRef<HTMLInputElement>(null);

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [scanValue, setScanValue] = useState('');
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanError, setScanError] = useState('');

    // New parcel form
    const [showParcelForm, setShowParcelForm] = useState(false);
    const [parcelItems, setParcelItems] = useState<{ productId: string; productName: string; sku: string; quantity: number; maxQty: number }[]>([]);
    const [parcelWeight, setParcelWeight] = useState('');
    const [parcelLength, setParcelLength] = useState('');
    const [parcelWidth, setParcelWidth] = useState('');
    const [parcelHeight, setParcelHeight] = useState('');
    const [parcelTracking, setParcelTracking] = useState('');
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    async function loadSession() {
        setLoading(true);
        try {
            const data = await fetchPackingSession(sessionId as string);
            setSession(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load packing session');
        } finally {
            setLoading(false);
        }
    }

    async function handleScan() {
        if (!scanValue.trim()) return;
        setScanError('');
        setScanResult(null);

        try {
            const result = await scanPackingItem(sessionId as string, scanValue.trim());
            setScanResult(result);
            toast.success(`✅ ${result.product.name} verified (${result.remaining} remaining)`);

            // Auto-add to parcel items
            const existingIdx = parcelItems.findIndex(pi => pi.productId === result.product.id);
            if (existingIdx >= 0) {
                const updated = [...parcelItems];
                if (updated[existingIdx].quantity < result.remaining + updated[existingIdx].quantity) {
                    // result.remaining is relative to what's already in the database
                    // we need to check if we can add more
                    if (updated[existingIdx].quantity < result.remaining + updated[existingIdx].quantity) {
                        updated[existingIdx].quantity += 1;
                        setParcelItems(updated);
                    }
                }
            } else {
                setParcelItems([
                    ...parcelItems,
                    {
                        productId: result.product.id,
                        productName: result.product.name,
                        sku: result.product.sku,
                        quantity: 1,
                        maxQty: result.remaining,
                    },
                ]);
            }
            if (!showParcelForm) {
                setShowParcelForm(true);
            }
        } catch (err: any) {
            setScanError(err.message || 'Scan failed');
            toast.error(err.message || 'Scan failed');
        }

        setScanValue('');
        scanInputRef.current?.focus();
    }

    function openNewParcel() {
        setShowParcelForm(true);
        // Pre-fill with all unpacked items
        if (session?.progress) {
            const unpacked = session.progress
                .filter((p: any) => p.remaining > 0)
                .map((p: any) => ({
                    productId: p.productId,
                    productName: p.productName,
                    sku: p.productSku,
                    quantity: p.remaining,
                    maxQty: p.remaining,
                }));
            setParcelItems(unpacked);
        }
    }

    async function handleCreateParcel() {
        if (parcelItems.length === 0) {
            toast.error('Add at least one item to the parcel');
            return;
        }

        try {
            await createPackingParcel(sessionId as string, {
                weight: parcelWeight ? parseFloat(parcelWeight) : undefined,
                length: parcelLength ? parseFloat(parcelLength) : undefined,
                width: parcelWidth ? parseFloat(parcelWidth) : undefined,
                height: parcelHeight ? parseFloat(parcelHeight) : undefined,
                trackingNumber: parcelTracking || undefined,
                items: parcelItems.map(pi => ({
                    productId: pi.productId,
                    quantity: pi.quantity,
                })),
            });

            toast.success('Parcel created');
            setShowParcelForm(false);
            setParcelItems([]);
            setParcelWeight('');
            setParcelLength('');
            setParcelWidth('');
            setParcelHeight('');
            setParcelTracking('');
            loadSession();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create parcel');
        }
    }

    async function handleRemoveParcel(parcelId: string) {
        try {
            await removePackingParcel(parcelId);
            toast.success('Parcel removed');
            loadSession();
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove parcel');
        }
    }

    async function handleComplete() {
        setCompleting(true);
        try {
            await completePackingSession(sessionId as string);
            toast.success('✅ Packing complete! Order moved to PACKED.');
            router.push('/packing');
        } catch (err: any) {
            toast.error(err.message || 'Cannot complete packing');
        } finally {
            setCompleting(false);
        }
    }

    if (loading) return <div className="p-8">Loading packing session...</div>;
    if (!session) return <div className="p-8">Session not found</div>;

    const stagedItemsMap = parcelItems.reduce((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    const totalPackedCommitted = session?.progress?.reduce((s: number, p: any) => s + p.packedQty, 0) || 0;
    const totalStaged = parcelItems.reduce((s, p) => s + p.quantity, 0);
    const totalPacked = totalPackedCommitted + totalStaged;
    const totalOrdered = session?.progress?.reduce((s: number, p: any) => s + p.orderedQty, 0) || 0;
    const totalRemaining = totalOrdered - totalPacked;

    const isCompleted = session.status === 'COMPLETED';
    const allPacked = totalRemaining === 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/packing')} className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Packing Workspace
                            </h1>
                            <p className="text-sm text-gray-500">
                                Order #{session.order.id.substring(0, 8).toUpperCase()}
                                {session.order.customer && ` – ${session.order.customer.name}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${isCompleted
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                                }`}
                        >
                            {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Scan & Items Checklist */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Scanner Input */}
                    {!isCompleted && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <ScanBarcode className="h-5 w-5" />
                                Scan Item
                            </h2>
                            <div className="flex gap-3">
                                <input
                                    ref={scanInputRef}
                                    type="text"
                                    value={scanValue}
                                    onChange={e => setScanValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                                    placeholder="Scan barcode or enter SKU..."
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                                <button
                                    onClick={handleScan}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    Verify
                                </button>
                            </div>
                            {scanResult && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800">
                                        <strong>{scanResult.product.name}</strong> ({scanResult.product.sku}) – {scanResult.remaining} remaining to pack
                                    </span>
                                </div>
                            )}
                            {scanError && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <span className="text-red-800">{scanError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Items Progress */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                        <div className="space-y-3">
                            {session.progress.map((item: any) => (
                                <div
                                    key={item.productId}
                                    className={`flex items-center justify-between p-4 rounded-lg border ${item.remaining === 0
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.remaining === 0 ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                        )}
                                        <div>
                                            <div className="font-medium text-gray-900">{item.productName}</div>
                                            <div className="text-sm text-gray-500">{item.productSku}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium">
                                            {item.packedQty + (stagedItemsMap[item.productId] || 0)} / {item.orderedQty}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.remaining - (stagedItemsMap[item.productId] || 0) > 0
                                                ? `${item.remaining - (stagedItemsMap[item.productId] || 0)} remaining`
                                                : 'Staged for parcel'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Parcels */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Parcels ({session.parcels.length})</h2>
                            {!isCompleted && !showParcelForm && (
                                <button
                                    onClick={openNewParcel}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Parcel
                                </button>
                            )}
                        </div>

                        {/* Existing parcels */}
                        {session.parcels.map((parcel: any, i: number) => (
                            <div key={parcel.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-gray-900">
                                        📦 Parcel {i + 1}
                                        {parcel.trackingNumber && (
                                            <span className="ml-2 text-sm text-gray-500">({parcel.trackingNumber})</span>
                                        )}
                                    </h3>
                                    {!isCompleted && (
                                        <button
                                            onClick={() => handleRemoveParcel(parcel.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Remove parcel"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                                    {parcel.weight && (
                                        <span className="flex items-center gap-1">
                                            <Scale className="h-3.5 w-3.5" /> {parcel.weight} kg
                                        </span>
                                    )}
                                    {parcel.length && parcel.width && parcel.height && (
                                        <span className="flex items-center gap-1">
                                            <Ruler className="h-3.5 w-3.5" /> {parcel.length}×{parcel.width}×{parcel.height} cm
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {parcel.items.map((item: any) => (
                                        <div key={item.id} className="text-sm text-gray-700 flex justify-between">
                                            <span>{item.product.name} ({item.product.sku})</span>
                                            <span className="font-medium">×{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {session.parcels.length === 0 && !showParcelForm && (
                            <p className="text-gray-500 text-sm">No parcels created yet. Scan items and create parcels to pack the order.</p>
                        )}

                        {/* New parcel form */}
                        {showParcelForm && (
                            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                                <h3 className="font-medium text-gray-900 mb-3">New Parcel</h3>

                                {/* Items in this parcel */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                                    {parcelItems.map((pi, idx) => (
                                        <div key={pi.productId} className="flex items-center gap-3 mb-2">
                                            <span className="flex-1 text-sm">{pi.productName} ({pi.sku})</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={pi.maxQty}
                                                value={pi.quantity}
                                                onChange={e => {
                                                    const updated = [...parcelItems];
                                                    updated[idx].quantity = Math.min(parseInt(e.target.value) || 1, pi.maxQty);
                                                    setParcelItems(updated);
                                                }}
                                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                                            />
                                            <button
                                                onClick={() => setParcelItems(parcelItems.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Dimensions */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Weight (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={parcelWeight}
                                            onChange={e => setParcelWeight(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Length (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={parcelLength}
                                            onChange={e => setParcelLength(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Width (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={parcelWidth}
                                            onChange={e => setParcelWidth(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Height (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={parcelHeight}
                                            onChange={e => setParcelHeight(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Tracking */}
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-600 mb-1">Tracking Number (optional)</label>
                                    <input
                                        type="text"
                                        value={parcelTracking}
                                        onChange={e => setParcelTracking(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        placeholder="e.g., TRACK-12345"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateParcel}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        Create Parcel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowParcelForm(false);
                                            setParcelItems([]);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Summary & Actions */}
                <div className="space-y-6">
                    {/* Session Summary */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total items</span>
                                <span className="font-medium">
                                    {totalOrdered} units
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Packed</span>
                                <span className="font-medium text-green-600">
                                    {totalPacked} units
                                    {totalStaged > 0 && (
                                        <span className="ml-1 text-xs text-blue-600 font-normal">
                                            (+{totalStaged} staged)
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Remaining</span>
                                <span className={`font-medium ${allPacked ? 'text-green-600' : 'text-orange-600'}`}>
                                    {totalRemaining} units
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Parcels created</span>
                                <span className="font-medium">{session.parcels.length}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="pt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${(totalPacked / Math.max(totalOrdered, 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Complete Packing */}
                    {!isCompleted && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Complete Packing</h2>
                            {allPacked ? (
                                <>
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                                        <div className="flex items-center gap-2 text-green-800">
                                            <CheckCircle2 className="h-5 w-5" />
                                            All items have been packed!
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleComplete}
                                        disabled={completing}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
                                    >
                                        {completing ? 'Completing...' : '✅ Confirm Packing Complete'}
                                    </button>
                                </>
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <AlertTriangle className="h-5 w-5" />
                                        Items still need to be packed before completing.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isCompleted && (
                        <div className="bg-green-50 rounded-lg border border-green-200 p-6 text-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                            <h3 className="font-medium text-green-800">Packing Complete</h3>
                            <p className="text-sm text-green-700 mt-1">
                                Order has been moved to PACKED status.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
