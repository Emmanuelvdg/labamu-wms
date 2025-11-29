'use client';

import { useState, useEffect } from 'react';
import { fetchWithRetry, createTransfer } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Helper to fetch transit items
async function fetchTransitItems() {
    return fetchWithRetry('http://localhost:3001/inventory/transit');
}

// Helper to fetch locations for destination selection
async function fetchLocations() {
    return fetchWithRetry('http://localhost:3001/inventory/locations');
}

export default function TransitOperationsPage() {
    const [transitItems, setTransitItems] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [destinationId, setDestinationId] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [items, locs] = await Promise.all([
                fetchTransitItems(),
                fetchLocations()
            ]);
            setTransitItems(items);
            setLocations(locs);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load transit data');
        } finally {
            setLoading(false);
        }
    }

    async function handleReceive() {
        if (!selectedItem || !destinationId) return;

        try {
            await createTransfer({
                productId: selectedItem.productId,
                sourceLocationId: selectedItem.locationId,
                destinationLocationId: destinationId,
                quantity: selectedItem.currentQuantity,
                reason: 'Received from Transit',
            });
            toast.success('Items received successfully');
            setOpen(false);
            setSelectedItem(null);
            setDestinationId('');
            loadData();
        } catch (err) {
            toast.error('Failed to receive items');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transit Operations</h1>
                    <p className="text-gray-500">Receive items currently in transit.</p>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Items in Transit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Batch / Serial</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Current Location</TableHead>
                                    <TableHead>Sent Date</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transitItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No items currently in transit.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transitItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product.name}</TableCell>
                                            <TableCell>{item.batchNumber}</TableCell>
                                            <TableCell>{item.currentQuantity}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    {item.location.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'MMM d, yyyy') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog open={open && selectedItem?.id === item.id} onOpenChange={(isOpen) => {
                                                    setOpen(isOpen);
                                                    if (isOpen) setSelectedItem(item);
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline">
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Receive
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Receive Items</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-gray-500">Product:</span>
                                                                    <p className="font-medium">{item.product.name}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500">Quantity:</span>
                                                                    <p className="font-medium">{item.currentQuantity}</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label>Destination Location</Label>
                                                                <select
                                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    value={destinationId}
                                                                    onChange={(e) => setDestinationId(e.target.value)}
                                                                >
                                                                    <option value="">Select a location...</option>
                                                                    {locations
                                                                        .filter(l => l.type === 'INTERNAL') // Only show internal locations
                                                                        .map((loc) => (
                                                                            <option key={loc.id} value={loc.id}>
                                                                                {loc.name}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            </div>

                                                            <Button
                                                                className="w-full"
                                                                onClick={handleReceive}
                                                                disabled={!destinationId}
                                                            >
                                                                Confirm Receipt
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
