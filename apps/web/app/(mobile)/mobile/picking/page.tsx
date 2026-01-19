'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, getActivePickingSession, createPickingSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function PickingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState<string | null>(null);
    const [session, setSession] = useState<any | null>(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        try {
            // 1. Get Warehouse (Default to first)
            const warehouses = await fetchWarehouses();
            if (!warehouses || warehouses.length === 0) {
                toast.error('No warehouses found');
                setLoading(false);
                return;
            }
            const whId = warehouses[0].id; // Simple default
            setWarehouseId(whId);

            // 2. Check Active Session
            const activeSession = await getActivePickingSession(whId);
            setSession(activeSession);
        } catch (err) {
            console.error(err);
            // Ignore 404 for session
        } finally {
            setLoading(false);
        }
    }

    async function startSession() {
        if (!warehouseId) return;
        setLoading(true);
        try {
            // Create a simple BATCH session for now
            const newSession = await createPickingSession({
                warehouseId,
                strategy: 'BATCH',
                criteria: 'location',
                maxOrders: 5
            });
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
                <h1 className="text-xl font-bold">Picking</h1>
                <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
                    No active picking session found for default warehouse.
                </div>
                <Button onClick={startSession} className="w-full h-12 text-lg">
                    Start New Session
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Picking Session</h1>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            </div>

            <div className="space-y-3">
                {session.tasks && session.tasks.length > 0 ? (
                    session.tasks.map((task: any) => (
                        <Card key={task.id}
                            className={`cursor-pointer border-l-4 ${task.status === 'COMPLETED' ? 'border-green-500 opacity-50' : 'border-blue-500'}`}
                            onClick={() => router.push(`/mobile/picking/${task.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between">
                                    <span className="font-bold text-lg">{task.location?.shortCode || task.location?.name || 'Unknown Loc'}</span>
                                    <span className="text-gray-500 text-sm">{task.pickedQuantity} / {task.quantity}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1 flex items-center">
                                    <Package className="w-4 h-4 mr-1" />
                                    {task.product?.sku} - {task.product?.name}
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
