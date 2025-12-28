'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, TestTube } from 'lucide-react';

const STRATEGIES = [
    { value: 'FIXED', label: 'Fixed Location', icon: '📍', description: 'Always send to a specific location' },
    { value: 'ZONE_PRIORITY', label: 'Zone Priority', icon: '🎯', description: 'Select zones within priority range' },
    { value: 'CLOSEST', label: 'Closest', icon: '📏', description: 'Minimize travel distance' },
    { value: 'LEAST_OCCUPIED', label: 'Least Occupied', icon: '⚖️', description: 'Balance utilization across locations' },
    { value: 'BALANCED', label: 'Balanced', icon: '🎲', description: 'Random distribution to avoid hotspots' },
];

const PACKAGING_SIZES = ['INDIVIDUAL', 'BOX', 'PALLET'];
const STORAGE_ATTRIBUTES = [
    'refrigerated',
    'climate_controlled',
    'hazmat_certified',
    'fragile',
    'heavy_duty',
    'ground_floor',
    'dry',
    'frozen',
];

export default function EditPutawayRulePage() {
    const router = useRouter();
    const params = useParams();
    const ruleId = params?.id as string;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 100,
        active: true,
        warehouseId: '',

        productId: '',
        categoryId: '',
        velocityClass: '',
        abcClass: '',
        requiredAttributes: [] as string[],
        temperatureMin: '',
        temperatureMax: '',
        minPackagingSize: '',
        maxPackagingSize: '',
        minWeight: '',
        maxWeight: '',
        sourceLocationId: '',

        strategy: 'ZONE_PRIORITY',
        destinationLocationId: '',
        preferredZonePriorityMin: '',
        preferredZonePriorityMax: '',
    });

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [ruleId]);

    async function fetchData() {
        try {
            const [whResponse, prodResponse, locResponse, ruleResponse] = await Promise.all([
                fetch('/api/inventory/warehouses', { headers: { 'x-user-id': localStorage.getItem('userId') || '' } }),
                fetch('/api/inventory/products', { headers: { 'x-user-id': localStorage.getItem('userId') || '' } }),
                fetch('/api/inventory/locations', { headers: { 'x-user-id': localStorage.getItem('userId') || '' } }),
                fetch('/api/inventory/putaway-rules', { headers: { 'x-user-id': localStorage.getItem('userId') || '' } }),
            ]);

            const warehouses = await whResponse.json();
            const products = await prodResponse.json();
            const locations = await locResponse.json();
            const rules = await ruleResponse.json();

            setWarehouses(warehouses);
            setProducts(products);
            setLocations(locations);

            // Find the rule to edit
            const rule = rules.find((r: any) => r.id === ruleId);
            if (rule) {
                setFormData({
                    name: rule.name || '',
                    description: rule.description || '',
                    priority: rule.priority || 100,
                    active: rule.active !== false,
                    warehouseId: rule.warehouseId || '',
                    productId: rule.productId || '',
                    categoryId: rule.categoryId || '',
                    velocityClass: rule.velocityClass || '',
                    abcClass: rule.abcClass || '',
                    requiredAttributes: rule.requiredAttributes ? JSON.parse(rule.requiredAttributes) : [],
                    temperatureMin: rule.temperatureMin?.toString() || '',
                    temperatureMax: rule.temperatureMax?.toString() || '',
                    minPackagingSize: rule.minPackagingSize || '',
                    maxPackagingSize: rule.maxPackagingSize || '',
                    minWeight: rule.minWeight?.toString() || '',
                    maxWeight: rule.maxWeight?.toString() || '',
                    sourceLocationId: rule.sourceLocationId || '',
                    strategy: rule.strategy || 'ZONE_PRIORITY',
                    destinationLocationId: rule.destinationLocationId || '',
                    preferredZonePriorityMin: rule.preferredZonePriorityMin?.toString() || '',
                    preferredZonePriorityMax: rule.preferredZonePriorityMax?.toString() || '',
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                ...formData,
                requiredAttributes: formData.requiredAttributes.length > 0
                    ? JSON.stringify(formData.requiredAttributes)
                    : null,
                temperatureMin: formData.temperatureMin ? parseFloat(formData.temperatureMin) : null,
                temperatureMax: formData.temperatureMax ? parseFloat(formData.temperatureMax) : null,
                minWeight: formData.minWeight ? parseFloat(formData.minWeight) : null,
                maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : null,
                preferredZonePriorityMin: formData.preferredZonePriorityMin ? parseInt(formData.preferredZonePriorityMin) : null,
                preferredZonePriorityMax: formData.preferredZonePriorityMax ? parseInt(formData.preferredZonePriorityMax) : null,
                productId: formData.productId || null,
                categoryId: formData.categoryId || null,
                velocityClass: formData.velocityClass || null,
                abcClass: formData.abcClass || null,
                sourceLocationId: formData.sourceLocationId || null,
                destinationLocationId: formData.destinationLocationId || null,
                warehouseId: formData.warehouseId || null,
            };

            const response = await fetch(`/api/inventory/putaway-rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('userId') || '',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                router.push('/inventory/putaway-rules');
            } else {
                alert('Failed to update rule');
            }
        } catch (error) {
            console.error('Error updating rule:', error);
            alert('Error updating rule');
        } finally {
            setSaving(false);
        }
    }

    function toggleAttribute(attr: string) {
        setFormData(prev => ({
            ...prev,
            requiredAttributes: prev.requiredAttributes.includes(attr)
                ? prev.requiredAttributes.filter(a => a !== attr)
                : [...prev.requiredAttributes, attr]
        }));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading rule...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to Rules
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Edit Putaway Rule</h1>
                <p className="mt-2 text-gray-600">Update automated location selection logic</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rule Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Priority <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Scope</label>
                                <select
                                    value={formData.warehouseId}
                                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Active (rule will be evaluated)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Matching Criteria - Same as create page, truncated for brevity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Matching Criteria</h2>
                    <div className="space-y-4">
                        {/* Product/Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Specific Product</label>
                                <select
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any Product</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product Category</label>
                                <input
                                    type="text"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Velocity/ABC */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Velocity Class</label>
                                <select
                                    value={formData.velocityClass}
                                    onChange={(e) => setFormData({ ...formData, velocityClass: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any</option>
                                    <option value="A">A (Fast-moving)</option>
                                    <option value="B">B (Medium)</option>
                                    <option value="C">C (Slow-moving)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ABC Classification</label>
                                <select
                                    value={formData.abcClass}
                                    onChange={(e) => setFormData({ ...formData, abcClass: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any</option>
                                    <option value="A">A (High value)</option>
                                    <option value="B">B (Medium value)</option>
                                    <option value="C">C (Low value)</option>
                                </select>
                            </div>
                        </div>

                        {/* Storage Attributes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Requirements</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {STORAGE_ATTRIBUTES.map(attr => (
                                    <label key={attr} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiredAttributes.includes(attr)}
                                            onChange={() => toggleAttribute(attr)}
                                            className="rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="text-sm text-gray-700">{attr}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Destination Strategy */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Destination Strategy</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Selection Strategy <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {STRATEGIES.map(strategy => (
                                    <label
                                        key={strategy.value}
                                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.strategy === strategy.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="strategy"
                                            value={strategy.value}
                                            checked={formData.strategy === strategy.value}
                                            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{strategy.icon}</span>
                                                <span className="font-medium text-gray-900">{strategy.label}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Strategy-Specific Fields */}
                        {formData.strategy === 'FIXED' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Destination Location <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required={formData.strategy === 'FIXED'}
                                    value={formData.destinationLocationId}
                                    onChange={(e) => setFormData({ ...formData, destinationLocationId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select location...</option>
                                    {locations.filter(l => l.type === 'INTERNAL').map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {formData.strategy === 'ZONE_PRIORITY' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Zone Priority</label>
                                    <input
                                        type="number"
                                        value={formData.preferredZonePriorityMin}
                                        onChange={(e) => setFormData({ ...formData, preferredZonePriorityMin: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Zone Priority</label>
                                    <input
                                        type="number"
                                        value={formData.preferredZonePriorityMax}
                                        onChange={(e) => setFormData({ ...formData, preferredZonePriorityMax: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 justify-end">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
