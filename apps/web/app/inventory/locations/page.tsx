'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchLocationsTree, createLocation } from '@/lib/api';
import { LocationTree } from '@/components/inventory/LocationTree';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
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
        parentId: '', // Must select a parent
        structuralType: '', // WAREHOUSE, ROOM, ROW, BAY, SHELF, POSITION
        attributes: {} as any,
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
            setNewLocation({
                name: '',
                type: 'INTERNAL',
                parentId: 'null',
                structuralType: '',
                attributes: {},
                removalStrategy: 'FIFO',
                inventoryFrequency: 0
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to create location');
        }
    };

    // Helper to flatten tree for parent selection
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

    // Filter parents based on structural type
    const getFilteredParents = () => {
        if (!newLocation.structuralType) return flatLocations;

        const validParents: { [key: string]: string[] } = {
            'POSITION': ['SHELF'],
            'SHELF': ['BAY'],
            'BAY': ['ROW'],
            'ROW': ['ROOM'],
            'ROOM': ['WAREHOUSE'],
            'WAREHOUSE': [] // Top level
        };

        const requiredParentTypes = validParents[newLocation.structuralType];
        if (!requiredParentTypes) return flatLocations; // Fallback

        if (requiredParentTypes.length === 0) return []; // Should be root

        return flatLocations.filter((loc: any) => requiredParentTypes.includes(loc.structuralType));
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Locations</h1>
                <div className="flex space-x-2">
                    <Link href="/inventory/locations/floor-plan">
                        <Button variant="outline">
                            Manage Floor Plan
                        </Button>
                    </Link>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> New Location</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create Location</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={newLocation.name}
                                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* Structural Type */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="structuralType" className="text-right">Structure</Label>
                                    <Select
                                        value={newLocation.structuralType}
                                        onValueChange={(value) => setNewLocation({ ...newLocation, structuralType: value, parentId: 'null' })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select structure type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* WAREHOUSE removed to enforce restriction */}
                                            <SelectItem value="ROOM">Room</SelectItem>
                                            <SelectItem value="ROW">Row</SelectItem>
                                            <SelectItem value="BAY">Bay</SelectItem>
                                            <SelectItem value="SHELF">Shelf</SelectItem>
                                            <SelectItem value="POSITION">Position</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Attributes based on Structure */}
                                {newLocation.structuralType === 'ROOM' && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="temperature" className="text-right">Temperature</Label>
                                        <Select
                                            value={newLocation.attributes.temperature || ''}
                                            onValueChange={(value) => setNewLocation({
                                                ...newLocation,
                                                attributes: { ...newLocation.attributes, temperature: value }
                                            })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select temperature" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Unrefrigerated">Unrefrigerated</SelectItem>
                                                <SelectItem value="Climate Controlled">Climate Controlled</SelectItem>
                                                <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {newLocation.structuralType === 'SHELF' && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="loadBearing" className="text-right">Load Bearing</Label>
                                        <div className="col-span-3 flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="loadBearing"
                                                checked={newLocation.attributes.loadBearing || false}
                                                onChange={(e) => setNewLocation({
                                                    ...newLocation,
                                                    attributes: { ...newLocation.attributes, loadBearing: e.target.checked }
                                                })}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="loadBearing" className="text-sm text-gray-700">Yes</label>
                                        </div>
                                    </div>
                                )}

                                {/* Parent Selection */}
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
                                            {/* Root option removed */}
                                            {getFilteredParents().map((loc: any) => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                    {loc.name} {loc.structuralType ? `(${loc.structuralType})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Other Fields */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Usage Type</Label>
                                    <Select
                                        value={newLocation.type}
                                        onValueChange={(value) => setNewLocation({ ...newLocation, type: value })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select usage type" />
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
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {locations ? (
                <LocationTree locations={locations} />
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
}
