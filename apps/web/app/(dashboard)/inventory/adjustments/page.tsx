'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fetchAdjustments, checkCycleCounts, startCycleCount, updateAdjustment, applyAdjustment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Play } from 'lucide-react';

export default function AdjustmentsPage() {
    const { hasPermission } = useAuth();
    const { data: adjustments, mutate: mutateAdjustments } = useSWR('adjustments', fetchAdjustments);
    const { data: dueLocations, mutate: mutateDue } = useSWR('cycle-counts-due', checkCycleCounts);
    const [counting, setCounting] = useState<Record<string, number>>({});

    const handleStartCount = async (locationId: string) => {
        try {
            await startCycleCount([locationId]);
            toast.success('Cycle count started');
            mutateDue();
            mutateAdjustments();
        } catch (error) {
            toast.error('Failed to start cycle count');
        }
    };

    const handleUpdateCount = (id: string, qty: number) => {
        setCounting(prev => ({ ...prev, [id]: qty }));
    };

    const handleSaveCount = async (adjustment: any) => {
        const qty = counting[adjustment.id];
        if (qty === undefined) return;

        try {
            await updateAdjustment(adjustment.id, { countedQuantity: qty });
            toast.success('Count saved');
            mutateAdjustments();
        } catch (error) {
            toast.error('Failed to save count');
        }
    };

    const handleApply = async (id: string) => {
        try {
            await applyAdjustment(id);
            toast.success('Adjustment applied');
            mutateAdjustments();
        } catch (error) {
            toast.error('Failed to apply adjustment');
        }
    };

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Adjustments</h1>
                    <p className="text-gray-500">Track and manage inventory adjustments and cycle counts</p>
                </div>
                <div className="space-x-4">
                    {hasPermission('INVENTORY', 'ADJUST') && (
                        <Link href="/inventory/adjustments/new">
                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                + New Adjustment
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Due for Cycle Count Section */}
            {dueLocations && dueLocations.length > 0 && (
                <div className="mb-8 p-4 border rounded-lg bg-yellow-50">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-800">Due for Cycle Count</h2>
                    <div className="grid gap-4">
                        {dueLocations.map((loc: any) => (
                            <div key={loc.id} className="flex justify-between items-center bg-white p-3 rounded border">
                                <div>
                                    <div className="font-medium">{loc.name}</div>
                                    <div className="text-sm text-gray-500">
                                        Warehouse: {loc.warehouseView?.name} | Next Due: {new Date(loc.nextInventoryDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => handleStartCount(loc.id)}>
                                    <Play className="mr-2 h-4 w-4" /> Start Count
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Adjustments Table */}
            <div className="bg-white rounded-lg border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium">Product</th>
                            <th className="p-4 font-medium">Location</th>
                            <th className="p-4 font-medium">Batch</th>
                            <th className="p-4 font-medium text-right">Current Qty</th>
                            <th className="p-4 font-medium text-right">Counted Qty</th>
                            <th className="p-4 font-medium text-right">Difference</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustments?.map((adj: any) => (
                            <tr key={adj.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4">{adj.product?.name} <span className="text-gray-400 text-xs">{adj.product?.sku}</span></td>
                                <td className="p-4">{adj.location?.name}</td>
                                <td className="p-4">{adj.batch?.batchNumber || '-'}</td>
                                <td className="p-4 text-right">{adj.currentQuantity}</td>
                                <td className="p-4 text-right">
                                    {adj.status === 'DRAFT' ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <Input
                                                type="number"
                                                className="w-24 text-right h-8"
                                                value={counting[adj.id] !== undefined ? counting[adj.id] : adj.countedQuantity}
                                                onChange={(e) => handleUpdateCount(adj.id, parseFloat(e.target.value))}
                                                onBlur={() => handleSaveCount(adj)}
                                            />
                                        </div>
                                    ) : (
                                        adj.countedQuantity
                                    )}
                                </td>
                                <td className={`p-4 text-right font-medium ${adj.quantity < 0 ? 'text-red-600' : adj.quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs ${adj.status === 'APPLIED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {adj.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {adj.status === 'DRAFT' && (
                                        <Button size="sm" variant="outline" onClick={() => handleApply(adj.id)}>
                                            <Check className="mr-2 h-4 w-4" /> Apply
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!adjustments?.length && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500">No adjustments found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
