'use client';

import { useState, useEffect } from 'react';
import {
    Package,
    ArrowRightLeft,
    CheckCircle2,
    Building,
    Plus,
    X,
    AlertTriangle,
    Clock,
    Truck
} from 'lucide-react';

import { fetchWarehouses, fetchProducts } from '@/lib/api';
import {
    fetchTransfers,
    createTransferRequest,
    approveTransfer,
    type Transfer,
    type CreateTransferRequest
} from '@/lib/transfer-api';

export default function TransferOperationsPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
    const [transferItems, setTransferItems] = useState<Array<{ productId: string; quantity: number }>>([
        { productId: '', quantity: 1 }
    ]);
    const [notes, setNotes] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [transfersData, warehousesData, productsData] = await Promise.all([
                fetchTransfers(),
                fetchWarehouses(),
                fetchProducts()
            ]);
            setTransfers(transfersData);
            setWarehouses(warehousesData);
            setProducts(productsData);
        } catch (err: any) {
            console.error('Failed to load data', err);
            setError(err.message || 'Failed to load transfer data');
        } finally {
            setLoading(false);
        }
    }

    const handleAddItem = () => {
        setTransferItems([...transferItems, { productId: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (transferItems.length > 1) {
            setTransferItems(transferItems.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
        const newItems = [...transferItems];
        if (field === 'productId') {
            newItems[index].productId = value as string;
        } else {
            newItems[index].quantity = Number(value);
        }
        setTransferItems(newItems);
    };

    const handleCreateTransfer = async () => {
        // Validation
        if (!sourceWarehouseId || !destinationWarehouseId) {
            alert('Please select both source and destination warehouses');
            return;
        }

        if (sourceWarehouseId === destinationWarehouseId) {
            alert('Source and destination warehouses must be different');
            return;
        }

        const validItems = transferItems.filter(item => item.productId && item.quantity > 0);
        if (validItems.length === 0) {
            alert('Please add at least one product with a valid quantity');
            return;
        }

        try {
            setCreating(true);
            const requestData: CreateTransferRequest = {
                sourceWarehouseId,
                destinationWarehouseId,
                items: validItems,
                notes: notes || undefined
            };

            await createTransferRequest(requestData);

            // Reset form
            setShowCreateModal(false);
            setSourceWarehouseId('');
            setDestinationWarehouseId('');
            setTransferItems([{ productId: '', quantity: 1 }]);
            setNotes('');

            // Reload transfers
            await loadData();
        } catch (err: any) {
            console.error('Failed to create transfer:', err);
            alert(err.message || 'Failed to create transfer');
        } finally {
            setCreating(false);
        }
    };

    const handleApprove = async (transferId: string) => {
        if (!confirm('Are you sure you want to approve this transfer?')) {
            return;
        }

        try {
            // Using a default approver ID for now
            await approveTransfer(transferId, 'admin_001');
            await loadData();
        } catch (err: any) {
            console.error('Failed to approve transfer:', err);
            alert(err.message || 'Failed to approve transfer');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-800';
            case 'APPROVED': return 'bg-blue-100 text-blue-800';
            case 'IN_TRANSIT': return 'bg-yellow-100 text-yellow-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock className="h-4 w-4" />;
            case 'APPROVED': return <CheckCircle2 className="h-4 w-4" />;
            case 'IN_TRANSIT': return <Truck className="h-4 w-4" />;
            case 'COMPLETED': return <CheckCircle2 className="h-4 w-4" />;
            case 'CANCELLED': return <X className="h-4 w-4" />;
            default: return <AlertTriangle className="h-4 w-4" />;
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="text-gray-600">Loading transfer operations...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Operations</h1>
                    <p className="text-gray-600">Manage internal stock transfers between warehouses</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Transfer
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Transfer ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Destination
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Initiated
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transfers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No transfers found. Create your first transfer to get started.
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                #{transfer.id.substring(0, 8)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(transfer.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-900">
                                                    {transfer.sourceWarehouse?.name || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm text-gray-900">
                                                    {transfer.destinationWarehouse?.name || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {transfer.items?.length || 0} product(s)
                                            </div>
                                            {transfer.items?.slice(0, 2).map((item: any, idx: number) => (
                                                <div key={idx} className="text-xs text-gray-500">
                                                    {item.product?.name}: {item.quantity}
                                                </div>
                                            ))}
                                            {transfer.items?.length > 2 && (
                                                <div className="text-xs text-gray-400">
                                                    +{transfer.items.length - 2} more
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                                                {getStatusIcon(transfer.status)}
                                                {transfer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {transfer.initiator?.name || 'System'}
                                            </div>
                                            {transfer.approver && (
                                                <div className="text-xs text-gray-500">
                                                    Approved by: {transfer.approver.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {transfer.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApprove(transfer.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Approve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Transfer Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Create New Transfer</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Source Warehouse */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Source Warehouse *
                                </label>
                                <select
                                    value={sourceWarehouseId}
                                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select source warehouse</option>
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Destination Warehouse */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Destination Warehouse *
                                </label>
                                <select
                                    value={destinationWarehouseId}
                                    onChange={(e) => setDestinationWarehouseId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                >
                                    <option value="">Select destination warehouse</option>
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Transfer Items */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Products *
                                </label>
                                <div className="space-y-3">
                                    {transferItems.map((item, index) => (
                                        <div key={index} className="flex gap-3 items-start">
                                            <select
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                                            >
                                                <option value="">Select product</option>
                                                {products.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name} ({product.sku})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="w-24 border border-gray-300 rounded-md px-3 py-2"
                                                placeholder="Qty"
                                            />
                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={transferItems.length === 1}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddItem}
                                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Another Product
                                </button>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Add any relevant notes about this transfer..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={creating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTransfer}
                                disabled={creating}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                            >
                                <Package className="h-5 w-5" />
                                {creating ? 'Creating...' : 'Create Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
