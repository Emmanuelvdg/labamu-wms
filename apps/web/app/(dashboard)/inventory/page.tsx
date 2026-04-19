'use client';

import { useState, useEffect } from 'react';
import { fetchInventory, createProduct, fetchWarehouses, fetchAttributeDefinitions, fetchCategories } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { PackageSearch } from 'lucide-react';

export default function InventoryPage() {
    const { hasPermission } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [attributes, setAttributes] = useState<any[]>([]); // Phase 4: Dynamic attributes
    const [categories, setCategories] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        classification: '',
        warehouseId: ''
    });

    // Client-side status tab + numeric column filters
    const [statusTab, setStatusTab] = useState('ALL');
    const [colFilters, setColFilters] = useState({ onHandMin: '', freeMin: '' });

    // New Product Form State
    const [newProduct, setNewProduct] = useState({
        sku: '',
        name: '',
        category: '',
        velocity: 'A',
        type: 'Raw',
        unitOfMeasure: 'Piece',
        averageCost: 0,
        status: 'Active',
        tracking: 'none',
        attributeIds: [] as string[] // Phase 4: Use attribute IDs
    });

    useEffect(() => {
        load();
        loadWarehouses();
        fetchAttributeDefinitions().then(setAttributes).catch(console.error); // Phase 4: Fetch attributes
        fetchCategories().then(setCategories).catch(console.error);
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
                velocity: 'A',
                type: 'Raw',
                unitOfMeasure: 'Piece',
                averageCost: 0,
                status: 'Active',
                tracking: 'none',
                attributeIds: [] // Phase 4: Reset attribute IDs
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

    const invStatusCount = (s: string) => s === 'ALL' ? products.length : products.filter(p => p.status === s).length;
    const filteredProducts = products.filter(p => {
        if (statusTab !== 'ALL' && p.status !== statusTab) return false;
        if (colFilters.onHandMin && (p.onHand || 0) < parseInt(colFilters.onHandMin)) return false;
        if (colFilters.freeMin && (p.free || 0) < parseInt(colFilters.freeMin)) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-gray-500">Manage your inventory items and stock levels</p>
                </div>
                <div className="space-x-4">
                    {hasPermission('INVENTORY', 'CREATE') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            data-testid="new-item-btn"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            + New Item
                        </button>
                    )}
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
                    {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {categories.length === 0 && <option value="" disabled>No categories defined</option>}
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

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {[{ label: 'All', value: 'ALL' }, { label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            statusTab === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            statusTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {invStatusCount(tab.value)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-b-lg shadow overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">On Hand</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider">Inc.</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-orange-600 uppercase tracking-wider">Out.</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-green-600 uppercase tracking-wider">Free</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Name / SKU..." value={filters.search}
                                    onChange={e => handleFilterChange('search', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                    <option value="">All Categories</option>
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={filters.classification} onChange={e => handleFilterChange('classification', e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                    <option value="">All Classes</option>
                                    <option value="A">Class A</option>
                                    <option value="B">Class B</option>
                                    <option value="C">Class C</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="≥ On Hand" value={colFilters.onHandMin}
                                    onChange={e => setColFilters(prev => ({ ...prev, onHandMin: e.target.value }))}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5"></th>
                            <th className="px-2 py-1.5"></th>
                            <th className="px-2 py-1.5">
                                <input type="number" placeholder="≥ Free" value={colFilters.freeMin}
                                    onChange={e => setColFilters(prev => ({ ...prev, freeMin: e.target.value }))}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab} onChange={e => setStatusTab(e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                    <option value="ALL">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <button
                                    onClick={() => { setColFilters({ onHandMin: '', freeMin: '' }); setStatusTab('ALL'); }}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="bg-blue-50 p-4 rounded-full">
                                            <PackageSearch className="h-8 w-8 text-blue-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No inventory items found</h3>
                                        <p className="text-sm text-gray-500 max-w-sm">Get started by creating your first product or adjusting your filters.</p>
                                        {hasPermission('INVENTORY', 'CREATE') && (
                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="mt-4 bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                            >
                                                + Create New Item
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mr-3">
                                                <span className="text-xs font-bold">{product.sku.substring(0, 2)}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                <div className="text-sm text-gray-500">{product.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                                    <td className="px-6 py-4">
                                        {product.velocity && (
                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${product.velocity === 'A' ? 'bg-green-100 text-green-800' :
                                                    product.velocity === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                Class {product.velocity}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-medium text-gray-900">{product.onHand || 0}</div>
                                        <div className="text-xs text-gray-400">{product.unitOfMeasure}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-blue-600 font-medium">
                                        {product.incoming > 0 ? `+${product.incoming}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-orange-600 font-medium">
                                        {product.outgoing > 0 ? `-${product.outgoing}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-green-600 font-bold">
                                        {product.free || 0}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${product.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <Link href={`/inventory/${product.id}`} className="text-blue-600 hover:text-blue-900 font-semibold bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            View
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
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
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
                                        <select
                                            required
                                            data-testid="product-category-input"
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newProduct.category}
                                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
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
                                </div>

                                {/* Cost and Price Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Cost (IDR)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            placeholder="0.00"
                                            value={newProduct.averageCost || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, averageCost: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Average cost per unit</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Price (IDR)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            placeholder="0.00"
                                            value={(newProduct as any).price || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 } as any)}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Selling price per unit</p>
                                    </div>
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
                                        <label className="block text-sm font-medium text-gray-700">Velocity (ABC)</label>
                                        <select
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                            value={newProduct.velocity}
                                            onChange={(e) => setNewProduct({ ...newProduct, velocity: e.target.value })}
                                        >
                                            <option value="A">A (Fast)</option>
                                            <option value="B">B (Medium)</option>
                                            <option value="C">C (Slow)</option>
                                        </select>
                                    </div>
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

                                {/* Storage Requirements - Phase 4: Dynamic Attributes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Storage Requirements</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto">
                                        {attributes.map(attr => (
                                            <label key={attr.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={newProduct.attributeIds.includes(attr.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewProduct({ ...newProduct, attributeIds: [...newProduct.attributeIds, attr.id] });
                                                        } else {
                                                            setNewProduct({ ...newProduct, attributeIds: newProduct.attributeIds.filter(id => id !== attr.id) });
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-blue-600"
                                                />
                                                <span className="text-gray-700">{attr.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {attributes.length === 0 && (
                                        <p className="text-xs text-gray-500 mt-1">Loading attributes...</p>
                                    )}
                                </div>

                                {/* Packaging & Dimensions */}
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-bold text-gray-900 mb-2">Packaging & Dimensions</h4>

                                    {/* Unit Dimensions */}
                                    <div className="grid grid-cols-4 gap-2 mb-4 bg-gray-50 p-2 rounded">
                                        <div className="col-span-4 text-xs font-semibold text-gray-500 mb-1">Base Unit Dimensions</div>
                                        <div>
                                            <label className="text-xs text-gray-500">Width (cm)</label>
                                            <input type="number" className="w-full border rounded px-1" value={(newProduct as any).width || ''} onChange={e => setNewProduct({ ...newProduct, width: e.target.value } as any)} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Height (cm)</label>
                                            <input type="number" className="w-full border rounded px-1" value={(newProduct as any).height || ''} onChange={e => setNewProduct({ ...newProduct, height: e.target.value } as any)} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Depth (cm)</label>
                                            <input type="number" className="w-full border rounded px-1" value={(newProduct as any).depth || ''} onChange={e => setNewProduct({ ...newProduct, depth: e.target.value } as any)} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Weight (kg)</label>
                                            <input type="number" step="0.01" className="w-full border rounded px-1" value={(newProduct as any).weight || ''} onChange={e => setNewProduct({ ...newProduct, weight: e.target.value } as any)} />
                                        </div>
                                    </div>

                                    {/* Tabs or List for Packaging */}
                                    <div className="space-y-3">
                                        {['INDIVIDUAL', 'BOX', 'PALLET'].map((type) => {
                                            const pkgIndex = ((newProduct as any).packaging || []).findIndex((p: any) => p.unitType === type);
                                            const isEnabled = pkgIndex !== -1;
                                            const pkg = isEnabled ? (newProduct as any).packaging[pkgIndex] : { unitType: type, quantity: 1, length: 0, width: 0, height: 0, weight: 0 };

                                            const toggleType = (checked: boolean) => {
                                                const currentList = (newProduct as any).packaging || [];
                                                if (checked) {
                                                    // Add with defaults
                                                    setNewProduct({ ...newProduct, packaging: [...currentList, { unitType: type, quantity: 1, length: 0, width: 0, height: 0, weight: 0 }] } as any);
                                                } else {
                                                    // Remove
                                                    setNewProduct({ ...newProduct, packaging: currentList.filter((p: any) => p.unitType !== type) } as any);
                                                }
                                            };

                                            const updatePkg = (field: string, val: any) => {
                                                const currentList = (newProduct as any).packaging || [];
                                                const updatedList = currentList.map((p: any) => p.unitType === type ? { ...p, [field]: parseFloat(val) || 0 } : p);
                                                setNewProduct({ ...newProduct, packaging: updatedList } as any);
                                            };

                                            // Calculate Container Capacity
                                            const vol = (pkg.length || 1) * (pkg.width || 1) * (pkg.height || 1);
                                            const cap20 = Math.floor((589 * 235 * 239) / (vol || 1));
                                            const cap40 = Math.floor((1203 * 235 * 239) / (vol || 1));

                                            return (
                                                <div key={type} className={`border rounded p-3 text-xs ${isEnabled ? 'bg-gray-50' : 'bg-white dashed border-gray-300'}`}>
                                                    <div className="font-semibold mb-1 flex justify-between items-center">
                                                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                checked={isEnabled}
                                                                onChange={(e) => toggleType(e.target.checked)}
                                                            />
                                                            <span>{type === 'INDIVIDUAL' ? 'Individual Unit' : type === 'BOX' ? 'Box / Case' : 'Pallet'}</span>
                                                        </label>
                                                        {isEnabled && vol > 1 && <span className="text-gray-500 font-normal">20ft: {cap20.toLocaleString()} | 40ft: {cap40.toLocaleString()}</span>}
                                                    </div>

                                                    {isEnabled && (
                                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                                            <div>
                                                                <label>Qty (Units)</label>
                                                                <input type="number" className="w-full border p-1 rounded" placeholder="1" value={pkg.quantity} onChange={e => updatePkg('quantity', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <label>L (cm)</label>
                                                                <input type="number" className="w-full border p-1 rounded" placeholder="0" value={pkg.length} onChange={e => updatePkg('length', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <label>W (cm)</label>
                                                                <input type="number" className="w-full border p-1 rounded" placeholder="0" value={pkg.width} onChange={e => updatePkg('width', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <label>H (cm)</label>
                                                                <input type="number" className="w-full border p-1 rounded" placeholder="0" value={pkg.height} onChange={e => updatePkg('height', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <label>Wgt (kg)</label>
                                                                <input type="number" step="0.01" className="w-full border p-1 rounded" placeholder="0" value={pkg.weight} onChange={e => updatePkg('weight', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
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
