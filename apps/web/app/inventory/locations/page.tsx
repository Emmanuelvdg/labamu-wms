'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchLocationsTree, createLocation } from '@/lib/api';
import { LocationTree } from '@/components/inventory/LocationTree';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function LocationsPage() {
    const { data: locations, mutate } = useSWR('locations-tree', () => fetchLocationsTree());
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '',
        type: 'INTERNAL',
        parentId: 'null', // 'null' string to handle Select value
        removalStrategy: 'FIFO',
        inventoryFrequency: 0
    });

    const handleCreate = async () => {
        try {
            await createLocation({
                ...newLocation,
                parentId: newLocation.parentId === 'null' ? undefined : newLocation.parentId,
            });
            toast.success('Location created');
            setIsCreateOpen(false);
            mutate();
            setNewLocation({ name: '', type: 'INTERNAL', parentId: 'null', removalStrategy: 'FIFO', inventoryFrequency: 0 });
        } catch (error) {
            toast.error('Failed to create location');
        }
    };

    // Helper to flatten tree for parent selection (simplified)
    const flattenLocations = (nodes: any[] = []): any[] => {
        return nodes.reduce((acc, node) => {
            acc.push(node);
            if (node.children) {
                acc.push(...flattenLocations(node.children));
            }
            return acc;
        }, []);
    };

    const flatLocations = locations ? flattenLocations(locations) : [];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Locations</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Location</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Location</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={newLocation.name}
                                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Type</Label>
                                <Select
                                    value={newLocation.type}
                                    onValueChange={(value) => setNewLocation({ ...newLocation, type: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VIEW">View</SelectItem>
                                        <SelectItem value="INTERNAL">Internal</SelectItem>
                                        <SelectItem value="VENDOR">Vendor</SelectItem>
                                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                                        <SelectItem value="INVENTORY_LOSS">Inventory Loss</SelectItem>
                                        <SelectItem value="PRODUCTION">Production</SelectItem>
                                        <SelectItem value="TRANSIT">Transit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="removalStrategy" className="text-right">Removal Strategy</Label>
                                <Select
                                    value={newLocation.removalStrategy}
                                    onValueChange={(value) => setNewLocation({ ...newLocation, removalStrategy: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select strategy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FIFO">FIFO (First In First Out)</SelectItem>
                                        <SelectItem value="LIFO">LIFO (Last In First Out)</SelectItem>
                                        <SelectItem value="FEFO">FEFO (First Expired First Out)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inventoryFrequency" className="text-right">Cycle Count (Days)</Label>
                                <Input
                                    id="inventoryFrequency"
                                    type="number"
                                    value={newLocation.inventoryFrequency}
                                    onChange={(e) => setNewLocation({ ...newLocation, inventoryFrequency: parseInt(e.target.value) || 0 })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="parent" className="text-right">Parent</Label>
                                <Select
                                    value={newLocation.parentId}
                                    onValueChange={(value) => setNewLocation({ ...newLocation, parentId: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select parent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">None (Root)</SelectItem>
                                        {flatLocations.map((loc: any) => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {locations ? (
                <LocationTree locations={locations} />
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
}
