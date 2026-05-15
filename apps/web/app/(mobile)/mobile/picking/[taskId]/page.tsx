'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, getActivePickingSession, updatePickingTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { validateBarcode } from '@/lib/api';

import * as React from 'react';

export default function PickingTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
    const { taskId } = React.use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState<any | null>(null);
    const [scannedLoc, setScannedLoc] = useState('');
    const [scannedSku, setScannedSku] = useState('');
    const [pickedQty, setPickedQty] = useState(0);

    const [locValid, setLocValid] = useState(false);
    const [skuValid, setSkuValid] = useState(false);

    useEffect(() => {
        loadTask();
    }, []);

    async function loadTask() {
        try {
            const warehouses = await fetchWarehouses();
            if (!warehouses || warehouses.length === 0) throw new Error('No warehouses');
            const whId = warehouses[0].id; // Default

            const session = await getActivePickingSession(whId);
            if (!session) throw new Error('No active session');

            const foundTask = session.tasks.find((t: any) => t.id === taskId);
            if (!foundTask) throw new Error('Task not found in session');

            setTask(foundTask);
            setPickedQty(foundTask.quantity); // Default to full pick
        } catch (err: any) {
            toast.error(err.message);
            router.push('/mobile/picking');
        } finally {
            setLoading(false);
        }
    }

    async function handleLocationScan(barcode: string) {
        setScannedLoc(barcode);
        const targetLoc = task.location?.shortCode || task.location?.name || '';
        if (barcode.trim().toUpperCase() === targetLoc.toUpperCase()) {
            setLocValid(true);
            toast.success('Location confirmed');
        } else {
            setLocValid(false);
            toast.error('Wrong location. Please go to ' + targetLoc);
        }
    }

    async function handleProductScan(barcode: string) {
        setScannedSku(barcode);
        try {
            await validateBarcode(barcode, { type: 'PICK_TASK', referenceId: task.id });
            setSkuValid(true);
            toast.success('Product confirmed');
        } catch (err: any) {
            setSkuValid(false);
            toast.error(err.message || 'Wrong product scanned');
        }
    }

    async function handleSubmit() {
        if (!locValid) {
            toast.error('Invalid Location Scan');
            return;
        }
        if (!skuValid) {
            toast.error('Invalid Product Scan');
            return;
        }

        try {
            await updatePickingTask(task.id, {
                pickedQuantity: Number(pickedQty),
                status: 'COMPLETED'
            });
            toast.success('Task Completed');
            router.push('/mobile/picking');
        } catch (err: any) {
            toast.error('Failed to submit: ' + err.message);
        }
    }

    if (loading || !task) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-tight">{task.product?.name}</h1>
                    <span className="text-sm text-gray-500">{task.product?.sku}</span>
                </div>
            </div>

            {/* Location Step */}
            <Card className={locValid ? 'border-green-500 bg-green-50' : 'border-blue-200'}>
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase text-gray-500">Go To Location</span>
                        {locValid && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="text-2xl font-bold">{task.location?.shortCode || task.location?.name}</div>

                    <div className="mt-4">
                        <BarcodeScanner onScan={handleLocationScan} placeholder="Scan Location Barcode" />
                    </div>
                </CardContent>
            </Card>

            {/* Product Step - Only show/enable if Location valid? Enforcing sequence is good */}
            <Card className={`${skuValid ? 'border-green-500 bg-green-50' : ''} ${!locValid ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase text-gray-500">Verify Product</span>
                        {skuValid && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="mt-4">
                        <BarcodeScanner onScan={handleProductScan} placeholder="Scan Product SKU/Barcode" />
                    </div>
                </CardContent>
            </Card>

            {/* Quantity Step */}
            <Card className={!skuValid ? 'opacity-50 pointer-events-none' : ''}>
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase text-gray-500">Confirm Quantity</span>
                        <span className="text-xl font-bold text-blue-600">Target: {task.quantity}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}>-</Button>
                        <Input
                            type="number"
                            value={pickedQty}
                            onChange={(e) => setPickedQty(Number(e.target.value))}
                            className="text-center text-xl font-bold h-12"
                        />
                        <Button variant="outline" onClick={() => setPickedQty(pickedQty + 1)}>+</Button>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleSubmit}
                className="w-full h-14 text-xl font-bold"
                disabled={!locValid || !skuValid}
            >
                Confirm Pick
            </Button>
        </div>
    );
}
