
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, createStocktakeSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function NewStocktakingPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loadingScope, setLoadingScope] = useState(false);

    const [formData, setFormData] = useState({
        warehouseId: '',
        type: 'CYCLE_COUNT',
        description: '',
    });
    const [scopeLocationIds, setScopeLocationIds] = useState<string[]>([]);
    const [scopeProductIds, setScopeProductIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const showScope = formData.type === 'CYCLE_COUNT' || formData.type === 'SPOT_CHECK';

    useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(console.error);
    }, []);

    useEffect(() => {
        if (!formData.warehouseId || !showScope) {
            setLocations([]);
            setScopeLocationIds([]);
            setScopeProductIds([]);
            return;
        }
        setLoadingScope(true);
        Promise.all([
            fetch(`/api/inventory/locations?warehouseId=${formData.warehouseId}`).then(r => r.json()),
            fetch(`/api/inventory/products`).then(r => r.json()),
        ])
            .then(([locs, prods]) => {
                setLocations(Array.isArray(locs) ? locs.filter((l: any) => l.structuralType && l.structuralType !== 'WAREHOUSE') : []);
                setProducts(Array.isArray(prods) ? prods : []);
            })
            .catch(console.error)
            .finally(() => setLoadingScope(false));
    }, [formData.warehouseId, showScope]);

    const toggleId = (list: string[], setList: (v: string[]) => void, id: string) => {
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.warehouseId) {
            toast.error('Please select a warehouse');
            return;
        }
        setSubmitting(true);
        try {
            await createStocktakeSession({
                ...formData,
                scopeLocationIds: scopeLocationIds.length ? scopeLocationIds : undefined,
                scopeProductIds: scopeProductIds.length ? scopeProductIds : undefined,
            });
            router.push('/stocktaking');
        } catch (error) {
            console.error('Failed to create session:', error);
            toast.error('Failed to create session');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Start New Stocktake</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                    <select
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    >
                        <option value="">Select Warehouse...</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                        value={formData.type}
                        onChange={(e) => {
                            setFormData({ ...formData, type: e.target.value });
                            setScopeLocationIds([]);
                            setScopeProductIds([]);
                        }}
                    >
                        <option value="CYCLE_COUNT">Cycle Count</option>
                        <option value="FULL">Full Stocktake</option>
                        <option value="SPOT_CHECK">Spot Check</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g. Weekly Cycle Count for Zone A"
                    />
                </div>

                {/* Scope selectors — only for CYCLE_COUNT and SPOT_CHECK */}
                {showScope && formData.warehouseId && (
                    <div className="border border-blue-100 rounded-lg p-4 space-y-4 bg-blue-50/40">
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Scope — Locations
                                <span className="text-xs font-normal text-gray-400 ml-2">(leave empty to include all)</span>
                            </p>
                            {loadingScope ? (
                                <p className="text-xs text-gray-400">Loading locations…</p>
                            ) : locations.length === 0 ? (
                                <p className="text-xs text-gray-400">No sub-locations found for this warehouse.</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white divide-y divide-gray-100">
                                    {locations.map(loc => (
                                        <label key={loc.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={scopeLocationIds.includes(loc.id)}
                                                onChange={() => toggleId(scopeLocationIds, setScopeLocationIds, loc.id)}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <span className="text-gray-500 text-xs w-16 shrink-0">{loc.structuralType}</span>
                                            <span>{loc.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {scopeLocationIds.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1">{scopeLocationIds.length} location(s) selected</p>
                            )}
                        </div>

                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Scope — Products
                                <span className="text-xs font-normal text-gray-400 ml-2">(leave empty to include all)</span>
                            </p>
                            {loadingScope ? (
                                <p className="text-xs text-gray-400">Loading products…</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white divide-y divide-gray-100">
                                    {products.map((p: any) => (
                                        <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={scopeProductIds.includes(p.id)}
                                                onChange={() => toggleId(scopeProductIds, setScopeProductIds, p.id)}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <span className="text-gray-500 text-xs w-24 shrink-0">{p.sku}</span>
                                            <span>{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {scopeProductIds.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1">{scopeProductIds.length} product(s) selected</p>
                            )}
                        </div>
                    </div>
                )}

                {showScope && !formData.warehouseId && (
                    <p className="text-xs text-gray-400 italic">Select a warehouse to configure scope filters.</p>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating…' : 'Start Session'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
