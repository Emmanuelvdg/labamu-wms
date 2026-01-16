
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
// Note: In Next 13 app dir, useParams is correct. 'useRouter' from/navigation.
import { fetchStocktakeSession, generateStocktakeTasks, submitStocktakeCount } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CountPage() {
    const { id } = useParams() as { id: string }; // Type assertion for safety
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [id]);

    async function load() {
        try {
            const data = await fetchStocktakeSession(id);
            setSession(data);
        } catch (error) {
            console.error('Failed to load session:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate() {
        if (!confirm('This will snapshot current system inventory. Continue?')) return;
        setLoading(true);
        try {
            await generateStocktakeTasks(id);
            await load(); // Reload to see tasks
        } catch (error) {
            console.error('Failed to generate:', error);
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!session) return <div className="p-8">Session not found</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Counting: {session.description || session.id.substring(0, 8)}</h1>
                <div className="space-x-2">
                    {/* Refresh Button */}
                    <Button variant="outline" onClick={load}>Refresh</Button>
                </div>
            </div>

            {session.tasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="mb-4 text-gray-600">No tasks generated yet.</p>
                    <Button onClick={handleGenerate}>Generate Count Tasks</Button>
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counted Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {session.tasks.map((task: any) => (
                                <CountRow key={task.id} task={task} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function CountRow({ task }: { task: any }) {
    const [countedQty, setCountedQty] = useState<string>(task.countedQuantity !== null ? String(task.countedQuantity) : '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    async function handleSave() {
        if (countedQty === '') return;
        setSaving(true);
        try {
            await submitStocktakeCount(task.id, parseInt(countedQty), 'current-user');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save count');
        } finally {
            setSaving(false);
        }
    }

    const isCounted = task.status === 'COUNTED' || task.status === 'VERIFIED';
    // However, local state might differ if we just saved but didn't reload parent.
    // We rely on local 'saved' or user input.

    return (
        <tr className={saved ? 'bg-green-50' : ''}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.location?.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="font-medium">{task.product?.sku}</div>
                <div className="text-xs">{task.product?.name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {/* For BLIND counts, we might hide this. Assuming open count for now. */}
                {task.systemQuantity}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <Input
                    type="number"
                    className="w-24"
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || countedQty === ''}
                    variant={saved ? "outline" : "default"}
                    className={saved ? "text-green-600 border-green-600" : ""}
                >
                    {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                </Button>
            </td>
        </tr>
    );
}
