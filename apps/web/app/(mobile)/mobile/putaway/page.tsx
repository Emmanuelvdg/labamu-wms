'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, getActivePutawaySession, createPutawaySession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PutawayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState<string | null>(null);
    const [session, setSession] = useState<any | null>(null);

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

            const activeSession = await getActivePutawaySession(whId);
            setSession(activeSession);
        } catch (err) {
            // Ignore 404
        } finally {
            setLoading(false);
        }
    }

    async function startSession() {
        if (!warehouseId) return;
        setLoading(true);
        try {
            const newSession = await createPutawaySession(warehouseId);
            setSession(newSession);
        } catch (err: any) {
            toast.error('Failed to start session: ' + err.message);
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (!session) {
        return (
            <div className="p-4 space-y-4">
                <h1 className="text-xl font-bold">Putaway</h1>
                <div className="bg-amber-50 p-4 rounded-lg text-amber-700 text-sm">
                    No active putaway session found. Items in Receiving Area may need processing.
                </div>
                <Button onClick={startSession} className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700">
                    Start Putaway Session
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Putaway Tasks</h1>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            </div>

            <div className="space-y-3">
                {session.tasks && session.tasks.length > 0 ? (
                    session.tasks.map((task: any) => (
                        <Card key={task.id}
                            className={`cursor-pointer border-l-4 ${task.status === 'COMPLETED' ? 'border-green-500 opacity-50' : 'border-emerald-500'}`}
                            onClick={() => router.push(`/mobile/putaway/${task.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between">
                                    <span className="font-bold text-lg">{task.product?.sku}</span>
                                    <span className="font-mono bg-gray-100 px-2 rounded">Qty: {task.quantity}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-2 flex items-center justify-between">
                                    <span>From: {task.fromLocation?.name || 'Receiving'}</span>
                                    <ArrowRight className="w-4 h-4 mx-2" />
                                    <span className="font-bold text-emerald-700">{task.destinationLocation?.shortCode || task.destinationLocation?.name || 'TBD'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        No tasks in this session.
                    </div>
                )}
            </div>
        </div>
    );
}
