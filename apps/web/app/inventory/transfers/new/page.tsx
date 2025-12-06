'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInventory, fetchLocations, createTransfer } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function NewTransferPage() {
    const router = useRouter();
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        productId: '',
        sourceLocationId: '',
        destinationLocationId: '',
        quantity: 0,
        reason: 'Internal Transfer'
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
            await createTransfer(formData);
            alert('Transfer created successfully');
            router.push('/inventory'); // Redirect to inventory dashboard
        } catch (error) {
            console.error('Failed to create transfer:', error);
            alert('Failed to create transfer');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Internal Transfer</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Location</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.sourceLocationId}
                        onChange={(e) => setFormData({ ...formData, sourceLocationId: e.target.value })}
                        required
                    >
                        <option value="">Select Source Location</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.type})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.destinationLocationId}
                        onChange={(e) => setFormData({ ...formData, destinationLocationId: e.target.value })}
                        required
                    >
                        <option value="">Select Destination Location</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.type})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
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
                        {submitting ? 'Creating...' : 'Create Transfer'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
