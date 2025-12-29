'use client';
import { useState, useEffect } from 'react';

// Simple dropdown options – in a real app these would be fetched from the API
const warehouses = [
    { id: '', name: 'All Warehouses' },
    { id: '1', name: 'Main Warehouse' },
    { id: '2', name: 'Secondary Warehouse' },
];
const locations = [
    { id: '', name: 'All Locations' },
    { id: 'A', name: 'Aisle A' },
    { id: 'B', name: 'Aisle B' },
];
const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'PUTAWAY', label: 'Putaway' },
    { value: 'PICKING', label: 'Picking' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'LOST', label: 'Lost' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'ADJUSTMENT', label: 'Adjustment' },
];
const products = [
    { id: '', name: 'All Products' },
    { id: 'sku-001', name: 'Product 001' },
    { id: 'sku-002', name: 'Product 002' },
];

export default function InventoryLedgerPage() {
    const [warehouseId, setWarehouseId] = useState('');
    const [locationId, setLocationId] = useState('');
    const [status, setStatus] = useState('');
    const [productId, setProductId] = useState('');
    const [period, setPeriod] = useState('7d');

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLedger();
    }, [warehouseId, locationId, status, productId, period, page, limit]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (warehouseId) params.append('warehouseId', warehouseId);
            if (locationId) params.append('locationId', locationId);
            if (status) params.append('status', status);
            if (productId) params.append('productId', productId);
            if (period) params.append('period', period);
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            const response = await fetch(`/api/reporting/analytics/inventory-ledger?${params}`);
            const result = await response.json();

            if (result.meta) {
                setData(result.data);
                setTotal(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setData(Array.isArray(result) ? result : []);
            }
        } catch (e) {
            console.error('Failed to load ledger', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouseId', warehouseId);
        if (locationId) params.append('locationId', locationId);
        if (status) params.append('status', status);
        if (productId) params.append('productId', productId);
        if (period) params.append('period', period);
        params.append('format', 'csv');
        // Open in new tab to trigger download
        window.open(`/api/reporting/analytics/inventory-ledger?${params}`, '_blank');
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Inventory Ledger</h1>
                <button
                    onClick={handleExport}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium flex items-center gap-2"
                >
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <select
                    className="border rounded p-2"
                    value={warehouseId}
                    onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
                >
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
                <select
                    className="border rounded p-2"
                    value={locationId}
                    onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
                >
                    {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.name}
                        </option>
                    ))}
                </select>
                <select
                    className="border rounded p-2"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                >
                    {statuses.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <select
                    className="border rounded p-2"
                    value={productId}
                    onChange={(e) => { setProductId(e.target.value); setPage(1); }}
                >
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <select
                    className="border rounded p-2"
                    value={period}
                    onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No ledger entries found.</div>
            ) : (
                <>
                    <div className="overflow-x-auto mb-4">
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product SKU</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID(s)</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                    {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th> */}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-sm text-gray-700">{new Date(row.date || row.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700 font-medium">{row.type}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.productSku}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.productName}</td>
                                        <td className={`px-4 py-2 text-sm font-bold ${row.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {row.quantity > 0 ? '+' : ''}{row.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.warehouseName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.locationName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.orderIds?.join(', ')}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{row.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4 border-t pt-4">
                        <div className="text-sm text-gray-500">
                            Showing page {page} of {totalPages} ({total} entries)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
