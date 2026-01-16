
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchStocktakeSession, reconcileStocktakeSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ReconcilePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reconciling, setReconciling] = useState(false);

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

    async function handleReconcile() {
        if (!confirm('This will update system inventory to match counted quantities for ALL mismatched items. Include variances?')) return;

        setReconciling(true);
        try {
            await reconcileStocktakeSession(id);
            alert('Reconciliation Complete!');
            router.push('/stocktaking');
        } catch (error) {
            console.error('Failed to reconcile:', error);
            alert('Reconciliation Failed');
            setReconciling(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!session) return <div className="p-8">Session not found</div>;

    // Filter for variances
    const variances = session.tasks.filter((t: any) =>
        t.countedQuantity !== null && t.countedQuantity !== t.systemQuantity
    );

    const isCompleted = session.status === 'COMPLETED';

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Reconciliation: {session.description}</h1>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold">Discrepancy Report</h2>
                        <p className="text-gray-500">
                            Found {variances.length} items with variances out of {session.tasks.length} total tasks.
                        </p>
                    </div>
                    {!isCompleted && variances.length > 0 && (
                        <Button onClick={handleReconcile} disabled={reconciling} variant="destructive">
                            {reconciling ? 'Processing...' : 'Approve & Adjust Inventory'}
                        </Button>
                    )}
                    {isCompleted && (
                        <span className="text-green-600 font-bold border px-3 py-1 rounded">Session Completed</span>
                    )}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counted</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Variance</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {variances.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No variances found. Perfect match!
                                </td>
                            </tr>
                        ) : (
                            variances.map((task: any) => {
                                const diff = (task.countedQuantity || 0) - task.systemQuantity;
                                return (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{task.location?.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{task.product?.sku}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{task.systemQuantity}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{task.countedQuantity}</td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {diff > 0 ? `+${diff}` : diff}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">All Tasks (Debug)</h3>
                <details>
                    <summary className="cursor-pointer text-blue-600">Show all {session.tasks.length} tasks</summary>
                    <div className="mt-4 bg-gray-50 p-4 rounded text-sm text-gray-600">
                        {session.tasks.map((t: any) => (
                            <div key={t.id} className="grid grid-cols-4 gap-4 border-b py-2">
                                <span>{t.location?.name}</span>
                                <span>{t.product?.sku}</span>
                                <span>Exp: {t.systemQuantity} / Act: {t.countedQuantity}</span>
                                <span>{t.status}</span>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </div>
    );
}
