'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, getActivePutawaySession, updatePutawayTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, MapPin, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/BarcodeScanner';

import * as React from 'react';

export default function PutawayTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
    const { taskId } = React.use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState<any | null>(null);
    const [scannedLoc, setScannedLoc] = useState('');
    const [putawayQty, setPutawayQty] = useState(0);
    const [locValid, setLocValid] = useState(false);

    const [validating, setValidating] = useState(false);

    useEffect(() => {
        loadTask();
    }, []);

    async function loadTask() {
        try {
            const warehouses = await fetchWarehouses();
            if (!warehouses || warehouses.length === 0) throw new Error('No warehouses');
            const whId = warehouses[0].id;

            const session = await getActivePutawaySession(whId);
            if (!session) throw new Error('No active session');

            const foundTask = session.tasks.find((t: any) => t.id === taskId);
            if (!foundTask) throw new Error('Task not found in session');

            setTask(foundTask);
            setPutawayQty(foundTask.quantity);
        } catch (err: any) {
            toast.error(err.message);
            router.push('/mobile/putaway');
        } finally {
            setLoading(false);
        }
    }

    async function handleScan(barcode: string) {
        setScannedLoc(barcode);
        setValidating(true);
        try {
            // Validate the scanned barcode against the PUTAWAY context
            await import('@/lib/api').then(m => m.validateBarcode(barcode, { type: 'PUTAWAY' }));
            
            // Check if it matches our target location (optional extra check, but the API verified it's a valid location)
            const targetLoc = task.destinationLocation?.shortCode || task.destinationLocation?.name || '';
            // If they scan a valid location but it's different from the target, we allow it but maybe warn? For now, if it's a valid location, we allow it.
            setLocValid(true);
            toast.success('Location Validated');
        } catch (err: any) {
            setLocValid(false);
            toast.error(err.message || 'Invalid Location Barcode');
        } finally {
            setValidating(false);
        }
    }

    async function handleSubmit() {
        if (!locValid) {
            toast.error('Please scan a valid location first');
            return;
        }

        try {
            await updatePutawayTask(task.id, {
                putawayQuantity: Number(putawayQty),
                status: 'COMPLETED'
            });
            toast.success('Putaway Completed');
            router.push('/mobile/putaway');
        } catch (err: any) {
            toast.error('Failed to submit: ' + err.message);
        }
    }

    if (loading || !task) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center space-x-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-tight">Putaway Item</h1>
                    <span className="text-sm text-gray-500">{task.product?.sku}</span>
                </div>
            </div>

            <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 space-y-2">
                    <span className="text-xs uppercase font-bold text-gray-500">Pick From</span>
                    <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span className="text-lg font-medium">{task.fromLocation?.name || 'Receiving'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className={locValid ? 'border-green-500 bg-green-50' : 'border-emerald-200'}>
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase text-gray-500">Deposit At</span>
                        {locValid && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="text-2xl font-bold text-emerald-800">{task.destinationLocation?.shortCode || task.destinationLocation?.name}</div>

                    <div className="mt-4">
                        {validating ? (
                            <div className="flex items-center space-x-2 text-emerald-600">
                                <Loader2 className="animate-spin w-5 h-5" />
                                <span>Validating...</span>
                            </div>
                        ) : (
                            <BarcodeScanner onScan={handleScan} placeholder="Scan Target Location" />
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase text-gray-500">Confirm Quantity</span>
                        <span className="text-xl font-bold text-gray-800">Total: {task.quantity}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" onClick={() => setPutawayQty(Math.max(0, putawayQty - 1))}>-</Button>
                        <Input
                            type="number"
                            value={putawayQty}
                            onChange={(e) => setPutawayQty(Number(e.target.value))}
                            className="text-center text-xl font-bold h-12"
                        />
                        <Button variant="outline" onClick={() => setPutawayQty(putawayQty + 1)}>+</Button>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleSubmit}
                className="w-full h-14 text-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                disabled={!locValid}
            >
                Confirm Putaway
            </Button>
        </div>
    );
}
