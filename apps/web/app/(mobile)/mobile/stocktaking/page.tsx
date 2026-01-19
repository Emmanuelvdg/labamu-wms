'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, fetchStocktakeSessions, createStocktakeSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function StocktakingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        try {
            const warehouses = await fetchWarehouses();
            if (!warehouses || warehouses.length === 0) {
                toast.error('No warehouses found');
                setLoading(false);
                return;
            }
            const whId = warehouses[0].id;
            setWarehouseId(whId);

            const data = await fetchStocktakeSessions(whId);
            // Filter out reconciled sessions if we want only active ones?
            // Or show all. Let's show IN_PROGRESS or CREATED.
            const active = data.filter((s: any) => s.status !== 'Reconciled'); // Capitalization might vary
            setSessions(active);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function createSession() {
        if (!warehouseId) return;
        try {
            const newSession = await createStocktakeSession({
                warehouseId,
                type: 'Cycle Count', // Default
                description: 'Mobile Ad-hoc Count'
            });
            toast.success('Session Created');
            router.push(`/mobile/stocktaking/${newSession.id}`);
        } catch (err: any) {
            toast.error('Failed to create session: ' + err.message);
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Stocktaking</h1>
                <Button size="sm" onClick={createSession}>
                    <Plus className="w-4 h-4 mr-1" /> New
                </Button>
            </div>

            <div className="space-y-3">
                {sessions.length > 0 ? (
                    sessions.map((session: any) => (
                        <Card key={session.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => router.push(`/mobile/stocktaking/${session.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between">
                                    <span className="font-bold">{session.description || 'Stocktake'}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${session.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                                        {session.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Type: {session.type}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        No active stocktaking sessions.
                    </div>
                )}
            </div>
        </div>
    );
}
