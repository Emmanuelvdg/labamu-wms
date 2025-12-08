'use client';

import { useState, useEffect } from 'react';
import { fetchInventory, fetchBatches, fetchTransactions, addBatch, fetchWarehouses } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function MaterialDetailsPage() {
    const params = useParams();
    const id = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddBatch, setShowAddBatch] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newBatch, setNewBatch] = useState({
        batchNumber: '',
        quantity: 0,
        costPerUnit: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        vendor: '',
        warehouseId: '', // Ideally fetched from warehouses
    });

    useEffect(() => {
        async function load() {
            try {
                const products = await fetchInventory();
                const found = products.find((p: any) => p.id === id);
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
    }, [id]);

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addBatch({
                ...newBatch,
                productId: id,
                quantity: product.tracking === 'serial' ? 1 : newBatch.quantity,
                // Mock warehouse ID for now if not selected, or use first available
                warehouseId: newBatch.warehouseId || 'default-warehouse-id',
            });
            setShowAddBatch(false);
            // Refresh
            const [b, t] = await Promise.all([fetchBatches(id), fetchTransactions(id)]);
            setBatches(b);
            setTransactions(t);
        } catch (err) {
            alert('Failed to add batch');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!product) return <div className="p-8">Product not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1">Materials &gt; {product.name}</div>
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                    <Link href={`/inventory/products/${id}/packaging`}>
                        <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                            Manage Packaging
                        </button>
                    </Link>
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

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Material Details</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">SKU</dt>
                            <dd className="mt-1 text-sm text-gray-900">{product.sku}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Category</dt>
                            <dd className="mt-1 text-sm text-gray-900">{product.category}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Type</dt>
                            <dd className="mt-1 text-sm text-gray-900">{product.type || '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {product.status}
                                </span>
                            </dd>
                        </div>
                    </div>
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
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
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
