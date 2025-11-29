'use client';

import { useState, useEffect } from 'react';
import { createTransfer, fetchLocations, fetchProducts } from '@/lib/api';

export default function TransfersPage() {
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [transfer, setTransfer] = useState({
        productId: '',
        sourceLocationId: '',
        destinationLocationId: '',
        quantity: 1,
        reason: '',
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const [locs, prods] = await Promise.all([
                fetchLocations(),
                fetchProducts()
            ]);
            setLocations(Array.isArray(locs) ? locs : [locs]);
            setProducts(prods);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (transfer.sourceLocationId === transfer.destinationLocationId) {
            alert('Source and Destination cannot be the same');
            return;
        }
        try {
            await createTransfer({
                ...transfer,
                quantity: Number(transfer.quantity),
            });
            alert('Transfer Successful');
            setTransfer({
                productId: '',
                sourceLocationId: '',
                destinationLocationId: '',
                quantity: 1,
                reason: '',
            });
        } catch (err) {
            alert('Failed to create transfer: ' + (err as any).message);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Internal Transfer</h1>
                <p className="text-gray-500 mb-8">Move stock between internal locations.</p>

                <form onSubmit={handleTransfer} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <select
                            required
                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                            value={transfer.productId}
                            onChange={(e) => setTransfer({ ...transfer, productId: e.target.value })}
                        >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Source Location</label>
                            <select
                                required
                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                value={transfer.sourceLocationId}
                                onChange={(e) => setTransfer({ ...transfer, sourceLocationId: e.target.value })}
                            >
                                <option value="">Select Source</option>
                                {/* Flatten locations if needed, simplified here */}
                                {locations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Destination Location</label>
                            <select
                                required
                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                value={transfer.destinationLocationId}
                                onChange={(e) => setTransfer({ ...transfer, destinationLocationId: e.target.value })}
                            >
                                <option value="">Select Destination</option>
                                {locations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            required
                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                            value={transfer.quantity}
                            onChange={(e) => setTransfer({ ...transfer, quantity: Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                            placeholder="e.g., Replenishment"
                            value={transfer.reason}
                            onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Confirm Transfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
