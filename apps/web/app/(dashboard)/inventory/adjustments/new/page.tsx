'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInventory, fetchLocations, createAdjustment } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function NewAdjustmentPage() {
    const router = useRouter();
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        locationId: '',
        productId: '',
        countedQuantity: 0,
        currentQuantity: 0, // This should ideally be fetched based on location+product
        reason: 'Manual Adjustment',
        status: 'APPLIED' // Auto-apply for now
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [locs, prods] = await Promise.all([
                    fetchLocations(),
                    fetchInventory()
                ]);
                setLocations(locs);
                setProducts(prods);
            } catch (error) {
                console.error('Failed to load data:', error);
                alert('Failed to load locations or products');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createAdjustment(formData);
            alert('Adjustment created successfully');
            router.push('/inventory'); // Redirect to inventory dashboard
        } catch (error) {
            console.error('Failed to create adjustment:', error);
            alert('Failed to create adjustment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Inventory Adjustment</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.locationId}
                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                        required
                    >
                        <option value="">Select Location</option>
                        {locations.filter(loc => loc.type === 'INTERNAL').map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.type})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                        required
                    >
                        <option value="">Select Product</option>
                        {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                                {prod.name} ({prod.sku})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Quantity (Delta, + for Increase, - for Decrease)</label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.countedQuantity}
                        onChange={(e) => setFormData({ ...formData, countedQuantity: Number(e.target.value) })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        required
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Adjustment'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
