'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, TestTube } from 'lucide-react';
import { fetchAttributeDefinitions, fetchCategories } from '@/lib/api';

const STRATEGIES = [
    { value: 'FIXED', label: 'Fixed Location', icon: '📍', description: 'Always send to a specific location' },
    { value: 'ZONE_PRIORITY', label: 'Zone Priority', icon: '🎯', description: 'Select zones within priority range' },
    { value: 'CLOSEST', label: 'Closest', icon: '📏', description: 'Minimize travel distance' },
    { value: 'LEAST_OCCUPIED', label: 'Least Occupied', icon: '⚖️', description: 'Balance utilization across locations' },
    { value: 'BALANCED', label: 'Balanced', icon: '🎲', description: 'Random distribution to avoid hotspots' },
];

const PACKAGING_SIZES = ['INDIVIDUAL', 'BOX', 'PALLET'];

function NewPutawayRuleForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const duplicateId = searchParams?.get('duplicate');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 100,
        active: true,
        warehouseId: '',

        // Matching Criteria
        productId: '',
        categoryId: '',
        velocityClass: '',
        abcClass: '',
        requiredAttributeIds: [] as string[], // Phase 4: Use attribute IDs
        minPackagingSize: '',
        maxPackagingSize: '',
        minWeight: '',
        maxWeight: '',
        sourceLocationId: '',

        // Destination Strategy
        strategy: 'ZONE_PRIORITY',
        destinationLocationId: '',
        preferredZonePriorityMin: '',
        preferredZonePriorityMax: '',
    });

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [attributes, setAttributes] = useState<any[]>([]); // Phase 4: Dynamic attributes
    const [loading, setLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        fetchData();
        fetchAttributeDefinitions()
            .then(data => setAttributes(Array.isArray(data) ? data : []))
            .catch(() => setAttributes([])); // Gracefully handle errors — show no attributes
        if (duplicateId) {
            duplicateRule(duplicateId);
        }
    }, [duplicateId]);

    async function fetchData() {
        try {
            const userId = localStorage.getItem('userId') || '';
            const headers: Record<string, string> = { 'x-user-id': userId };
            const [whResponse, prodResponse, locResponse] = await Promise.all([
                fetch('/api/inventory/warehouses', { headers }),
                fetch('/api/inventory/products', { headers }),
                fetch('/api/inventory/locations', { headers }),
            ]);

            const whData = await whResponse.json();
            const prodData = await prodResponse.json();
            const locData = await locResponse.json();
            const catData = await fetchCategories();

            setWarehouses(Array.isArray(whData) ? whData : []);
            setProducts(Array.isArray(prodData) ? prodData : []);
            setLocations(Array.isArray(locData) ? locData : []);
            setCategories(Array.isArray(catData) ? catData : []);
            setDataLoaded(true);
        } catch (error) {
            console.error('Error fetching data:', error);
            setDataLoaded(true); // Mark as loaded even on error so UI isn't stuck
        }
    }

    async function duplicateRule(ruleId: string) {
        try {
            const response = await fetch(`/api/inventory/putaway-rules`, {
                headers: { 'x-user-id': localStorage.getItem('userId') || '' },
            });
            const rules = await response.json();
            const rule = rules.find((r: any) => r.id === ruleId);

            if (rule) {
                setFormData({
                    ...rule,
                    name: `${rule.name} (Copy)`,
                    requiredAttributeIds: rule.requiredAttributes?.map((ra: any) => ra.attributeDefinitionId) || [],
                });
            }
        } catch (error) {
            console.error('Error duplicating rule:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                requiredAttributeIds: formData.requiredAttributeIds, // Phase 4: Send attribute IDs
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

            const response = await fetch('/api/inventory/putaway-rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('userId') || '',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                router.push('/inventory/putaway-rules');
            } else {
                alert('Failed to create rule');
            }
        } catch (error) {
            console.error('Error creating rule:', error);
            alert('Error creating rule');
        } finally {
            setLoading(false);
        }
    }

    function toggleAttributeId(attrId: string) {
        setFormData(prev => ({
            ...prev,
            requiredAttributeIds: prev.requiredAttributeIds.includes(attrId)
                ? prev.requiredAttributeIds.filter(id => id !== attrId)
                : [...prev.requiredAttributeIds, attrId]
        }));
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to Rules
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Create Putaway Rule</h1>
                <p className="mt-2 text-gray-600">Define automated location selection logic</p>
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
                                placeholder="e.g., Fast-Moving Items to Golden Zone"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Explain when and why this rule applies..."
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
                                <p className="mt-1 text-xs text-gray-500">Higher priority rules are checked first</p>
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

                {/* Matching Criteria */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Matching Criteria</h2>
                    <p className="text-sm text-gray-600 mb-4">Define which products this rule applies to</p>

                    <div className="space-y-4">
                        {/* Product Matching */}
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
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

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

                        {/* Storage Requirements - Phase 4: Dynamic Attributes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Requirements</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {attributes.map(attr => (
                                    <label key={attr.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiredAttributeIds.includes(attr.id)}
                                            onChange={() => toggleAttributeId(attr.id)}
                                            className="rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="text-sm text-gray-700">{attr.name}</span>
                                    </label>
                                ))}
                            </div>
                            {attributes.length === 0 && (
                                <p className="text-sm text-gray-500 mt-2">No storage attributes defined</p>
                            )}
                        </div>

                        {/* Packaging & Weight */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Min Packaging Size</label>
                                <select
                                    value={formData.minPackagingSize}
                                    onChange={(e) => setFormData({ ...formData, minPackagingSize: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any</option>
                                    {PACKAGING_SIZES.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Max Packaging Size</label>
                                <select
                                    value={formData.maxPackagingSize}
                                    onChange={(e) => setFormData({ ...formData, maxPackagingSize: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Any</option>
                                    {PACKAGING_SIZES.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Min Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.minWeight}
                                    onChange={(e) => setFormData({ ...formData, minWeight: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Max Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.maxWeight}
                                    onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 1000"
                                />
                            </div>
                        </div>

                        {/* Source Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Source Location</label>
                            <select
                                value={formData.sourceLocationId}
                                onChange={(e) => setFormData({ ...formData, sourceLocationId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Any Source</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Apply rule only when items come from this location</p>
                        </div>
                    </div>
                </div>

                {/* Destination Strategy */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Destination Strategy</h2>
                    <p className="text-sm text-gray-600 mb-4">How should the system select a location?</p>

                    <div className="space-y-4">
                        {/* Strategy Selection */}
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
                                    required
                                    value={formData.destinationLocationId}
                                    onChange={(e) => setFormData({ ...formData, destinationLocationId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
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
                                        placeholder="e.g., 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Zone Priority</label>
                                    <input
                                        type="number"
                                        value={formData.preferredZonePriorityMax}
                                        onChange={(e) => setFormData({ ...formData, preferredZonePriorityMax: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 20"
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
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Create Rule
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function NewPutawayRulePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
            <NewPutawayRuleForm />
        </Suspense>
    );
}
