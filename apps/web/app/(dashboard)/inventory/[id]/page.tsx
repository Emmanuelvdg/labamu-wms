'use client';

import { useState, useEffect } from 'react';
import { getProduct, updateProduct, fetchBatches, fetchTransactions, addBatch, fetchWarehouses, fetchAttributeDefinitions, fetchCategories } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PrintButton } from '@/components/ui/print-button';
import { useAuth } from '@/lib/auth';

export default function MaterialDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const { hasPermission } = useAuth();

    const [product, setProduct] = useState<any>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [attributes, setAttributes] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddBatch, setShowAddBatch] = useState(false);
    const [loading, setLoading] = useState(true);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Form State
    const [newBatch, setNewBatch] = useState({
        batchNumber: '',
        quantity: 0,
        costPerUnit: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        vendor: '',
        warehouseId: '',
    });

    useEffect(() => {
        async function load() {
            try {
                const found = await getProduct(id);
                setProduct(found);

                if (found) {
                    const [b, t, w] = await Promise.all([
                        fetchBatches(id),
                        fetchTransactions(id),
                        fetchWarehouses(),
                    ]);
                    setBatches(b);
                    setTransactions(t);
                    setWarehouses(w);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
        fetchAttributeDefinitions().then(setAttributes).catch(console.error);
        fetchCategories().then(setCategories).catch(console.error);
    }, [id]);

    const startEditing = () => {
        setEditData({ ...product });
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setEditData({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await updateProduct(id, editData);
            setProduct({ ...product, ...updated });
            setEditing(false);
            setEditData({});
        } catch (err) {
            console.error('Failed to update product:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addBatch({
                ...newBatch,
                productId: id,
                quantity: product.tracking === 'serial' ? 1 : newBatch.quantity,
                warehouseId: newBatch.warehouseId,
            });
            setShowAddBatch(false);
            const [b, t] = await Promise.all([fetchBatches(id), fetchTransactions(id)]);
            setBatches(b);
            setTransactions(t);
        } catch (err) {
            alert('Failed to add batch');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!product) return <div className="p-8">Product not found</div>;

    // Helper to get display value or edit input
    const field = (label: string, key: string, opts?: { type?: string; options?: { value: string; label: string }[]; readOnly?: boolean; suffix?: string; step?: string }) => {
        const value = editing ? editData[key] : product[key];
        return (
            <div>
                <dt className="text-sm font-medium text-gray-500">{label}</dt>
                {editing && !opts?.readOnly ? (
                    <dd className="mt-1">
                        {opts?.options ? (
                            <select
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                                value={value || ''}
                                onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                            >
                                <option value="">—</option>
                                {opts.options.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-1">
                                <input
                                    type={opts?.type || 'text'}
                                    step={opts?.step}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={value ?? ''}
                                    onChange={(e) => {
                                        let val: any = e.target.value;
                                        if (opts?.type === 'number') val = val === '' ? null : parseFloat(val);
                                        if (opts?.type === 'checkbox') val = (e.target as any).checked;
                                        setEditData({ ...editData, [key]: val });
                                    }}
                                />
                                {opts?.suffix && <span className="text-xs text-gray-400 whitespace-nowrap">{opts.suffix}</span>}
                            </div>
                        )}
                    </dd>
                ) : (
                    <dd className="mt-1 text-sm text-gray-900">
                        {value !== null && value !== undefined && value !== '' ? (
                            <>
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                                {opts?.suffix && <span className="text-xs text-gray-400 ml-1">{opts.suffix}</span>}
                            </>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </dd>
                )}
            </div>
        );
    };

    const statusBadge = (status: string) => {
        const colors = status === 'Active'
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-red-100 text-red-800 border-red-200';
        return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${colors}`}>{status}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1">
                    <Link href="/inventory" className="hover:text-blue-600">Inventory</Link> &gt; {product.name}
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
                    </div>
                    <div className="flex gap-2">
                        <PrintButton endpoint={`/printing/product/${id}/pdf`} label="Print LPN" />
                        <Link href={`/inventory/products/${id}/packaging`}>
                            <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                                Manage Packaging
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['overview', 'batches', 'transactions'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {tab === 'batches' ? 'Stock Batches' : tab === 'transactions' ? 'Stock Transactions' : tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Edit / Save / Cancel Controls */}
                    <div className="flex justify-end gap-2">
                        {editing ? (
                            <>
                                <button
                                    onClick={cancelEditing}
                                    disabled={saving}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            hasPermission('INVENTORY', 'UPDATE') && (
                                <button
                                    onClick={startEditing}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    ✏️ Edit Product
                                </button>
                            )
                        )}
                    </div>

                    {/* Basic Information */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Basic Information</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                            {field('SKU', 'sku', { readOnly: true })}
                            {field('Name', 'name')}
                            {field('Category', 'category', {
                                options: categories.map(c => ({ value: c.name, label: c.name }))
                            })}
                            {field('Type', 'type', {
                                options: [
                                    { value: 'Raw', label: 'Raw' },
                                    { value: 'Semi-finished', label: 'Semi-finished' },
                                    { value: 'Finished', label: 'Finished' },
                                ]
                            })}
                            {field('Unit of Measure', 'unitOfMeasure')}
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    {editing ? (
                                        <select
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                                            value={editData.status || ''}
                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    ) : statusBadge(product.status)}
                                </dd>
                            </div>
                            {field('Tracking', 'tracking', {
                                options: [
                                    { value: 'none', label: 'No Tracking' },
                                    { value: 'lot', label: 'By Lots' },
                                    { value: 'serial', label: 'By Serial Number' },
                                ]
                            })}
                            {field('Description', 'description')}
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Classification</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                            {field('Velocity (ABC)', 'velocity', {
                                options: [
                                    { value: 'A', label: 'A (Fast)' },
                                    { value: 'B', label: 'B (Medium)' },
                                    { value: 'C', label: 'C (Slow)' },
                                ]
                            })}
                            {field('ABC Class', 'abcClass')}
                            {field('Is Stockable', 'isStockable', {
                                options: [
                                    { value: 'true', label: 'Yes' },
                                    { value: 'false', label: 'No' },
                                ]
                            })}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Pricing</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                            {field('Average Cost', 'averageCost', { type: 'number', step: '0.01', suffix: 'IDR' })}
                            {field('Selling Price', 'price', { type: 'number', step: '0.01', suffix: 'IDR' })}
                        </div>
                    </div>

                    {/* Dimensions & Weight */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Dimensions & Weight</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                            {field('Width', 'width', { type: 'number', step: '0.01', suffix: 'cm' })}
                            {field('Height', 'height', { type: 'number', step: '0.01', suffix: 'cm' })}
                            {field('Depth', 'depth', { type: 'number', step: '0.01', suffix: 'cm' })}
                            {field('Weight', 'weight', { type: 'number', step: '0.01', suffix: 'kg' })}
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Storage</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                            {field('Stackable', 'stackable', {
                                options: [
                                    { value: 'true', label: 'Yes' },
                                    { value: 'false', label: 'No' },
                                ]
                            })}
                            {field('Max Stack Height', 'maxStackHeight', { type: 'number' })}
                            {field('Temperature Min', 'temperatureMin', { type: 'number', step: '0.1', suffix: '°C' })}
                            {field('Temperature Max', 'temperatureMax', { type: 'number', step: '0.1', suffix: '°C' })}
                            {field('Preferred Packaging', 'preferredPackaging')}
                        </div>
                    </div>

                    {/* Reorder Settings */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Reorder Settings</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                            {field('Safety Stock', 'safetyStock', { type: 'number' })}
                            {field('Reorder Point', 'reorderPoint', { type: 'number' })}
                            {field('Reorder Quantity', 'reorderQuantity', { type: 'number' })}
                            {field('Max Stock', 'maxStock', { type: 'number' })}
                        </div>
                    </div>

                    {/* Storage Requirement Attributes */}
                    {attributes.length > 0 && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Storage Requirement Attributes</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {attributes.map(attr => {
                                    const linked = product.attributes?.some((a: any) => a.attributeDefinitionId === attr.id);
                                    return (
                                        <label key={attr.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={editing
                                                    ? (editData.attributeIds || []).includes(attr.id)
                                                    : !!linked
                                                }
                                                disabled={!editing}
                                                onChange={(e) => {
                                                    if (!editing) return;
                                                    const ids = editData.attributeIds || product.attributes?.map((a: any) => a.attributeDefinitionId) || [];
                                                    if (e.target.checked) {
                                                        setEditData({ ...editData, attributeIds: [...ids, attr.id] });
                                                    } else {
                                                        setEditData({ ...editData, attributeIds: ids.filter((i: string) => i !== attr.id) });
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <span className={`${linked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                                {attr.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'batches' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-lg font-medium text-gray-900">Stock Batches</h2>
                        <button
                            onClick={() => setShowAddBatch(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            + Add Batch
                        </button>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {batches.map((batch) => (
                                <tr key={batch.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{batch.batchNumber}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{batch.currentQuantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{batch.costPerUnit}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{batch.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Stock Transactions</h2>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(tx.date).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{tx.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{tx.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{tx.referenceId || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Batch Modal */}
            {showAddBatch && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock Batch</h3>
                        <form onSubmit={handleAddBatch}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {product.tracking === 'serial' ? 'Serial Number' : 'Batch Number'}
                                    </label>
                                    <input
                                        type="text"
                                        required={product.tracking === 'serial'}
                                        placeholder={product.tracking === 'serial' ? 'Enter Unique Serial Number' : 'Auto-generated if empty'}
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.batchNumber}
                                        onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        readOnly={product.tracking === 'serial'}
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${product.tracking === 'serial' ? 'bg-gray-100' : ''}`}
                                        value={product.tracking === 'serial' ? 1 : newBatch.quantity}
                                        onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) })}
                                    />
                                    {product.tracking === 'serial' && (
                                        <p className="text-xs text-gray-500 mt-1">Serial tracked items must be added one by one.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cost Per Unit</label>
                                    <input
                                        type="number"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.costPerUnit}
                                        onChange={(e) => setNewBatch({ ...newBatch, costPerUnit: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.purchaseDate}
                                        onChange={(e) => setNewBatch({ ...newBatch, purchaseDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.expiryDate}
                                        onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vendor</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.vendor}
                                        onChange={(e) => setNewBatch({ ...newBatch, vendor: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Storage Location (Warehouse)</label>
                                    <select
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newBatch.warehouseId}
                                        onChange={(e) => setNewBatch({ ...newBatch, warehouseId: e.target.value })}
                                    >
                                        <option value="">Select a warehouse</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBatch(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Save Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
