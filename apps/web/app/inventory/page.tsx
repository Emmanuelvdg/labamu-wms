'use client';

import { useState, useEffect } from 'react';
import { fetchInventory, createProduct, fetchWarehouses } from '@/lib/api';
import Link from 'next/link';

export default function InventoryPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        classification: '',
        warehouseId: ''
    });

    // New Product Form State
    const [newProduct, setNewProduct] = useState({
        sku: '',
        name: '',
        category: '',
        classification: 'A',
        type: 'Raw',
        unitOfMeasure: 'Piece',
        averageCost: 0,
        status: 'Active',
        tracking: 'none'
    });

    useEffect(() => {
        load();
        loadWarehouses();
    }, []);

    // Debounce search or just load on effect?
    // For simplicity, let's load when filters change, but maybe debounce search input.
    // Or just add a "Search" button or "Apply Filters".
    // Let's use useEffect on filters with a small debounce for search if possible, or just simple effect.
    useEffect(() => {
        const timer = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters]);

    async function load() {
        setLoading(true);
        try {
            const data = await fetchInventory(filters);
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadWarehouses() {
        try {
            const data = await fetchWarehouses();
            setWarehouses(data);
        } catch (err) {
            console.error('Failed to load warehouses', err);
        }
    }

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Creating product:', newProduct);
        try {
            const res = await createProduct(newProduct);
            console.log('Product created:', res);
            setShowCreateModal(false); // Close immediately
            await load(); // Refresh list and wait
            // Reset form
            setNewProduct({
                sku: '',
                name: '',
                category: '',
                classification: 'A',
                type: 'Raw',
                unitOfMeasure: 'Piece',
                averageCost: 0,
                status: 'Active',
                tracking: 'none'
            });
            alert('Product Created Successfully'); // Add feedback
        } catch (err) {
            console.error('Failed to create product:', err);
            alert('Failed to create product');
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            category: '',
            classification: '',
            warehouseId: ''
        });
    };

    if (loading && products.length === 0) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-gray-500">Manage your inventory items and stock levels</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        data-testid="new-item-btn"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        + New Item
                    </button>
                    <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                        Upload
                    </button>
                    <Link href="/settings">
                        <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                            Settings
                        </button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Search inventory by Name or SKU"
                    className="flex-1 border rounded-lg px-4 py-2 min-w-[200px]"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <select
                    className="border rounded-lg px-4 py-2"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <option value="">All Categories</option>
                    {/* Ideally populate dynamically, but for now hardcode common ones or fetch distinct */}
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Raw Material">Raw Material</option>
                </select>
                <select
                    className="border rounded-lg px-4 py-2"
                    value={filters.classification}
                    onChange={(e) => handleFilterChange('classification', e.target.value)}
                >
                    <option value="">All Classifications</option>
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                </select>
                <select
                    className="border rounded-lg px-4 py-2"
                    value={filters.warehouseId}
                    onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
                >
                    <option value="">All Warehouses</option>
                    {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <button
                    onClick={resetFilters}
                    className="text-red-600 font-medium px-4 py-2 hover:bg-red-50 rounded-lg"
                >
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ABC Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                    No inventory items found. Click "+ New Item" to add one.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                        <div className="text-sm text-gray-500">{product.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {product.classification || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{product.type || 'Raw'}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">0.00 {product.unitOfMeasure || 'Unit'}</div>
                                        <div className="text-xs text-gray-500">Total</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">IDR {product.averageCost || 0}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <Link href={`/inventory/${product.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            →
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Product Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Inventory Item</h3>
                        <form onSubmit={handleCreateProduct}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                                    <input
                                        type="text"
                                        required
                                        data-testid="product-sku-input"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newProduct.sku}
                                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        data-testid="product-name-input"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Category</label>
                                    <input
                                        type="text"
                                        required
                                        data-testid="product-category-input"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newProduct.category}
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newProduct.type}
                                            onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}
                                        >
                                            <option value="Raw">Raw</option>
                                            <option value="Semi-finished">Semi-finished</option>
                                            <option value="Finished">Finished</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ABC Class</label>
                                        <select
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newProduct.classification}
                                            onChange={(e) => setNewProduct({ ...newProduct, classification: e.target.value })}
                                        >
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newProduct.unitOfMeasure}
                                        onChange={(e) => setNewProduct({ ...newProduct, unitOfMeasure: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tracking</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={newProduct.tracking}
                                        onChange={(e) => setNewProduct({ ...newProduct, tracking: e.target.value })}
                                    >
                                        <option value="none">No Tracking</option>
                                        <option value="lot">By Lots</option>
                                        <option value="serial">By Unique Serial Number</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    data-testid="create-product-submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Create Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
