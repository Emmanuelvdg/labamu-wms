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
    const { data: attributesData } = useSWR('http://localhost:3001/settings/attributes', (url) => fetch(url).then(res => res.json()));
    const attributeDefinitions = Array.isArray(attributesData) ? attributesData : [];
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '',
        type: 'INTERNAL',
        parentId: '', // Must select a parent
        structuralType: '', // WAREHOUSE, ROOM, ROW, BAY, SHELF, POSITION
        attributes: {} as any,
        removalStrategy: 'FIFO',
        inventoryFrequency: 0,
        // Phase 8
        code: '',
        innerLength: 0,
        innerWidth: 0,
        innerHeight: 0,
        maxWeightKg: 0
    });

    const handleCreate = async () => {
        try {
            await createLocation({
                ...newLocation,
                parentId: (newLocation.parentId === 'null' || newLocation.parentId === '') ? undefined : newLocation.parentId,
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
                inventoryFrequency: 0,
                code: '',
                innerLength: 0,
                innerWidth: 0,
                innerHeight: 0,
                maxWeightKg: 0
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
            'ROOM': ['WAREHOUSE'],
            'ZONE': ['WAREHOUSE'],
            'AISLE': ['ROOM', 'ZONE', 'WAREHOUSE'],
            'ROW': ['AISLE', 'ROOM', 'ZONE', 'WAREHOUSE'],
            'BAY': ['ROW', 'AISLE', 'ROOM', 'ZONE'],
            'SHELF': ['BAY', 'ROW', 'ROOM', 'ZONE'],
            'POSITION': ['SHELF', 'BAY', 'ROW'],
            'BIN': ['SHELF', 'BAY', 'ROW', 'POSITION'],
            'WAREHOUSE': []
        };

        const requiredParentTypes = validParents[newLocation.structuralType];
        if (!requiredParentTypes) return flatLocations; // Fallback

        if (requiredParentTypes.length === 0) return []; // Should be root

        return flatLocations.filter((loc: any) => {
            if (requiredParentTypes.includes(loc.structuralType)) return true;
            // Allow if parent has no structural type (legacy warehouse) AND we are looking for a WAREHOUSE parent
            if (!loc.structuralType && requiredParentTypes.includes('WAREHOUSE')) return true;
            return false;
        });
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
                            <Button data-testid="create-location-btn"><Plus className="mr-2 h-4 w-4" /> New Location</Button>
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
                                        data-testid="location-name-input"
                                    />
                                </div>

                                {/* Code (Phase 8) */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right">Code (Optional)</Label>
                                    <Input
                                        id="code"
                                        placeholder="Auto-generated if empty"
                                        value={newLocation.code}
                                        onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value })}
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
                                        <SelectTrigger className="col-span-3" data-testid="location-structure-select">
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
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Dimensions (mm)</Label>
                                    <div className="col-span-3 flex space-x-2">
                                        <Input
                                            placeholder="L"
                                            type="number"
                                            value={newLocation.innerLength || ''}
                                            onChange={(e) => setNewLocation({ ...newLocation, innerLength: parseFloat(e.target.value) })}
                                        />
                                        <Input
                                            placeholder="W"
                                            type="number"
                                            value={newLocation.innerWidth || ''}
                                            onChange={(e) => setNewLocation({ ...newLocation, innerWidth: parseFloat(e.target.value) })}
                                        />
                                        <Input
                                            placeholder="H"
                                            type="number"
                                            value={newLocation.innerHeight || ''}
                                            onChange={(e) => setNewLocation({ ...newLocation, innerHeight: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Max Weight (kg)</Label>
                                    <Input
                                        className="col-span-3"
                                        type="number"
                                        value={newLocation.maxWeightKg || ''}
                                        onChange={(e) => setNewLocation({ ...newLocation, maxWeightKg: parseFloat(e.target.value) })}
                                    />
                                </div>

                                {/* Attributes based on Structure - REMOVED HARDCODED FIELDS to use Dynamic Attributes */}

                                {/* Supported Packaging */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="supportedPackaging" className="text-right">Supported Pkg</Label>
                                    <Input
                                        id="supportedPackaging"
                                        placeholder="e.g. PALLET, BOX"
                                        value={newLocation.attributes.supportedPackaging ? JSON.parse(newLocation.attributes.supportedPackaging).join(', ') : ''}
                                        onChange={(e) => setNewLocation({
                                            ...newLocation,
                                            attributes: {
                                                ...newLocation.attributes,
                                                supportedPackaging: JSON.stringify(e.target.value.split(',').map(s => s.trim()))
                                            }
                                        })}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* Dynamic Attributes */}
                                {attributeDefinitions?.map((attr: any) => (
                                    <div key={attr.id} className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor={`attr-${attr.id}`} className="text-right">{attr.name}</Label>
                                        {attr.type === 'SELECT' ? (
                                            <Select
                                                value={newLocation.attributes[attr.name] || ''}
                                                onValueChange={(value) => setNewLocation({
                                                    ...newLocation,
                                                    attributes: { ...newLocation.attributes, [attr.name]: value }
                                                })}
                                            >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder={`Select ${attr.name}`} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {attr.options?.split(',').map((opt: string) => (
                                                        <SelectItem key={opt.trim()} value={opt.trim()}>{opt.trim()}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : attr.type === 'BOOLEAN' ? (
                                            <div className="col-span-3 flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`attr-${attr.id}`}
                                                    checked={newLocation.attributes[attr.name] || false}
                                                    onChange={(e) => setNewLocation({
                                                        ...newLocation,
                                                        attributes: { ...newLocation.attributes, [attr.name]: e.target.checked }
                                                    })}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor={`attr-${attr.id}`} className="text-sm text-gray-700">Yes</label>
                                            </div>
                                        ) : (
                                            <Input
                                                id={`attr-${attr.id}`}
                                                type={attr.type === 'NUMBER' ? 'number' : 'text'}
                                                value={newLocation.attributes[attr.name] || ''}
                                                onChange={(e) => setNewLocation({
                                                    ...newLocation,
                                                    attributes: { ...newLocation.attributes, [attr.name]: attr.type === 'NUMBER' ? parseFloat(e.target.value) : e.target.value }
                                                })}
                                                className="col-span-3"
                                            />
                                        )}
                                    </div>
                                ))}

                                {/* Generic Attributes (JSON) */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="genericAttributes" className="text-right">Other Attributes (JSON)</Label>
                                    <Input
                                        id="genericAttributes"
                                        placeholder='JSON: {"refrigerated": true}'
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setNewLocation({ ...newLocation, attributes: { ...newLocation.attributes, ...parsed } });
                                            } catch (err) {
                                                // Ignore invalid JSON while typing
                                            }
                                        }}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* Parent Selection */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="parent" className="text-right">Parent</Label>
                                    <Select
                                        value={newLocation.parentId}
                                        onValueChange={(value) => setNewLocation({ ...newLocation, parentId: value })}
                                    >
                                        <SelectTrigger className="col-span-3" data-testid="location-parent-select">
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
                                <Button onClick={handleCreate} data-testid="create-location-submit-btn">Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {
                locations ? (
                    <LocationTree locations={locations} />
                ) : (
                    <div>Loading...</div>
                )
            }
        </div >
    );
}
