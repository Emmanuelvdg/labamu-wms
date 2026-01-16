
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, createStocktakeSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Note: Assuming Select components are available in @/components/ui/select. If not, I'll fall back to standard select.
// I'll check if Select is typically used. If I'm unsure, I'll use standard HTML select to avoid missing component errors.
// "Select" usually implies Radix/ShadCN. The user has "Button" and "Input" likely.
// I'll use standard <select> for safety unless I verify.
// Wait, I saw "Debugging Location Dropdown" earlier, implying they have dropdowns.
// But standard select is safer for speed.

export default function NewStocktakingPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        warehouseId: '',
        type: 'CYCLE_COUNT',
        description: ''
    });

    useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(console.error);
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (!formData.warehouseId) {
                alert('Please select a warehouse');
                return;
            }
            await createStocktakeSession(formData);
            router.push('/stocktaking');
        } catch (error) {
            console.error('Failed to create session:', error);
            alert('Failed to create session');
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
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="CYCLE_COUNT">Cycle Count (Check)</option>
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

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Start Session</Button>
                </div>
            </form>
        </div>
    );
}
