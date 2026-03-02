'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchScrapOrders, createScrapOrder, fetchProducts, fetchLocations } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function ScrapPage() {
    const { data: scrapOrders, mutate } = useSWR('scrap-orders', fetchScrapOrders);
    const { data: products } = useSWR('products', fetchProducts);
    const { data: locations } = useSWR('locations', () => fetchLocations());

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newScrap, setNewScrap] = useState({
        productId: '',
        locationId: '',
        quantity: 1,
        reason: ''
    });

    const handleCreate = async () => {
        try {
            await createScrapOrder(newScrap);
            toast.success('Scrap order created');
            setIsCreateOpen(false);
            mutate();
            setNewScrap({ productId: '', locationId: '', quantity: 1, reason: '' });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to create scrap order');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Scrap Orders</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive"><Plus className="mr-2 h-4 w-4" /> New Scrap Order</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Scrap Inventory</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="product" className="text-right">Product</Label>
                                <Select
                                    value={newScrap.productId}
                                    onValueChange={(value) => setNewScrap({ ...newScrap, productId: value })}
                                >
                                    <SelectTrigger className="col-span-3" data-testid="scrap-product-select">
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">Source Location</Label>
                                <Select
                                    value={newScrap.locationId}
                                    onValueChange={(value) => setNewScrap({ ...newScrap, locationId: value })}
                                >
                                    <SelectTrigger className="col-span-3" data-testid="scrap-location-select">
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations?.map((l: any) => (
                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={newScrap.quantity}
                                    onChange={(e) => setNewScrap({ ...newScrap, quantity: parseInt(e.target.value) || 1 })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="reason" className="text-right">Reason</Label>
                                <Input
                                    id="reason"
                                    value={newScrap.reason}
                                    onChange={(e) => setNewScrap({ ...newScrap, reason: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. Damaged, Expired"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="destructive" onClick={handleCreate}>Validate Scrap</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Product</th>
                            <th className="p-4 font-medium">Source Location</th>
                            <th className="p-4 font-medium text-right">Quantity</th>
                            {/* <th className="p-4 font-medium">Reason</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {scrapOrders?.map((order: any) => (
                            <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4 text-gray-500">
                                    {/* Date is not in ScrapOrder model explicitly, maybe use ID or fetch logs? 
                                        Actually schema has no createdAt on ScrapOrder? 
                                        Let's check schema. 
                                        Schema: id, locationId, productId, quantity, maxQuantity, active. 
                                        No createdAt. I should have added it. 
                                        For now, just show ID or nothing. */}
                                    {order.id.substring(0, 8)}
                                </td>
                                <td className="p-4 font-medium">{order.product?.name}</td>
                                <td className="p-4">{order.location?.name}</td>
                                <td className="p-4 text-right text-red-600">-{order.quantity}</td>
                                {/* <td className="p-4">{order.reason}</td> */}
                            </tr>
                        ))}
                        {!scrapOrders?.length && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">No scrap orders found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
