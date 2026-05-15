'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchaseOrder, validateBarcode, receivePurchaseOrder } from '@/lib/api';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, PackageSearch, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MobileScanReceivePage() {
    const router = useRouter();
    const [poId, setPoId] = useState('');
    const [po, setPo] = useState<any>(null);
    const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});
    const [destinationLocId, setDestinationLocId] = useState<string>(''); // Simplified for demo, could be scanned
    
    // Step 1: Handle PO Scan
    async function handlePoScan(barcode: string) {
        try {
            // Assume barcode is the PO ID or PO Number.
            const data = await getPurchaseOrder(barcode);
            if (!data) throw new Error("PO not found");
            if (data.status !== 'CONFIRMED' && data.status !== 'PARTIALLY_RECEIVED') {
                throw new Error(`PO is ${data.status}. Cannot receive.`);
            }
            setPo(data);
            setPoId(data.id);
            toast.success('PO Loaded');
        } catch (err: any) {
            toast.error(err.message || 'Failed to load PO');
        }
    }

    // Step 2: Handle Item Scan
    async function handleItemScan(barcode: string) {
        if (!po) return;
        try {
            const res = await validateBarcode(barcode, { type: 'RECEIVE_PO', referenceId: po.id });
            const item = res.poItem;
            if (!item) throw new Error("Invalid item for this PO");

            setReceivedItems(prev => {
                const current = prev[item.id] || 0;
                // prevent over-receiving
                if (current >= item.quantity) {
                    toast.warning("Already fully received this item");
                    return prev;
                }
                toast.success(`Scanned ${res.entity.name || res.entity.sku}`);
                return { ...prev, [item.id]: current + 1 };
            });
        } catch (err: any) {
            toast.error(err.message || 'Invalid item scan');
        }
    }

    async function handleConfirm() {
        if (!po) return;
        // Construct payload
        const itemsToReceive = Object.entries(receivedItems)
            .filter(([_, qty]) => qty > 0)
            .map(([poItemId, quantity]) => ({ poItemId, quantity }));

        if (itemsToReceive.length === 0) {
            toast.error("No items received");
            return;
        }

        try {
            // Hardcoding destination for demo, in reality should prompt or use user's current location/dock
            const dockLoc = "cm0testloc123"; // fallback placeholder
            await receivePurchaseOrder(po.id, destinationLocId || dockLoc, itemsToReceive);
            toast.success("Receipt confirmed!");
            router.push('/mobile/dashboard');
        } catch (err: any) {
            toast.error('Failed to confirm receipt: ' + err.message);
        }
    }

    if (!po) {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="font-bold text-lg leading-tight">Receive PO</h1>
                </div>
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                        <PackageSearch className="w-12 h-12 text-gray-400" />
                        <h2 className="text-xl font-semibold">Scan PO Barcode</h2>
                        <p className="text-sm text-gray-500 text-center">Scan the barcode on the purchase order document to begin receiving.</p>
                        <div className="w-full mt-4">
                            <BarcodeScanner onScan={handlePoScan} placeholder="Scan or type PO ID" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="flex items-center space-x-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => setPo(null)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-tight">PO {po.poNumber || po.id.slice(-6)}</h1>
                    <span className="text-sm text-gray-500">{po.supplier?.name}</span>
                </div>
            </div>

            <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-emerald-800">Scan Items to Receive</h3>
                    <BarcodeScanner onScan={handleItemScan} placeholder="Scan Item Barcode" />
                </CardContent>
            </Card>

            <div className="space-y-3 mt-4">
                <h3 className="font-semibold text-gray-700">Expected Items</h3>
                {po.items.map((item: any) => {
                    const rQty = receivedItems[item.id] || 0;
                    const isComplete = rQty >= item.quantity;
                    return (
                        <Card key={item.id} className={isComplete ? "bg-green-50 border-green-200 opacity-70" : ""}>
                            <CardContent className="p-3 flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{item.product?.name}</div>
                                    <div className="text-xs text-gray-500">{item.product?.sku}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold">
                                        <span className={isComplete ? "text-green-600" : "text-emerald-600"}>{rQty}</span> 
                                        <span className="text-gray-400"> / {item.quantity}</span>
                                    </div>
                                    {isComplete && <CheckCircle className="w-4 h-4 text-green-500 inline ml-1" />}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <Button onClick={handleConfirm} className="w-full h-14 text-lg font-bold">
                    <Save className="w-5 h-5 mr-2" />
                    Confirm Receipt
                </Button>
            </div>
        </div>
    );
}
