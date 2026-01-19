'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLocationDetails, updateLocation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/ui/print-button';
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

export default function LocationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [location, setLocation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [allLocations, setAllLocations] = useState<any[]>([]); // Store all locations for filtering
    const [attributeDefinitions, setAttributeDefinitions] = useState<any[]>([]);
    const [utilizationReport, setUtilizationReport] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            loadLocation(params.id as string);
            loadAllLocations();
        }
    }, [params.id]);

    const loadAllLocations = async () => {
        try {
            const { fetchLocations: fetchLocationsApi } = await import('@/lib/api');
            const data = await fetchLocationsApi();
            setAllLocations(flattenLocations(Array.isArray(data) ? data : []));
        } catch (e) {
            console.error("Failed to load locations for parent selection", e);
        }
    };

    const loadAttributeDefinitions = async () => {
        try {
            const res = await fetch('http://localhost:3001/settings/attributes');
            if (res.ok) {
                const data = await res.json();
                setAttributeDefinitions(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to load attribute definitions", e);
        }
    };

    // Helper to flatten tree
    const flattenLocations = (nodes: any[]): any[] => {
        let flat: any[] = [];
        nodes.forEach(node => {
            flat.push(node);
            if (node.children) {
                flat = flat.concat(flattenLocations(node.children));
            }
        });
        return flat;
    };

    const loadLocation = async (id: string) => {
        try {
            const data = await getLocationDetails(id);
            setLocation(data);
            loadUtilisation(id);

            // Convert attributes object to array for editing
            const customAttributes = Object.entries(data.attributes || {})
                .filter(([key]) => !['color', 'temperature', 'loadBearing', 'supportedPackaging'].includes(key)) // Exclude known keys if managed separately
                .map(([key, value]) => ({ key, value }));

            setEditForm({
                name: data.name,
                type: data.type,
                structuralType: data.structuralType,
                parentId: data.parentId,
                attributes: data.attributes || {},
                customAttributes: customAttributes,
                removalStrategy: data.removalStrategy,
                inventoryFrequency: data.inventoryFrequency,
                zonePriority: data.zonePriority,
                putawaySequence: data.putawaySequence,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadUtilisation = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:3001/inventory/locations/${id}/utilisation`);
            if (res.ok) {
                const data = await res.json();
                setUtilizationReport(data);
            }
        } catch (e) {
            console.error("Failed to load utilisation", e);
        }
    };

    // ... useEffect ...

    // We need to fetch locations to populate the parent dropdown
    // Let's add a useEffect for that when edit opens
    useEffect(() => {
        if (isEditOpen) {
            const fetchParents = async () => {
                try {
                    // We need a way to get all locations. 
                    // Let's assume `fetchLocations` returns the tree.
                    const { fetchLocations } = await import('@/lib/api');
                    const tree = await fetchLocations();
                    setAllLocations(flattenLocations(tree));
                } catch (e) {
                    console.error(e);
                }
            };
            fetchParents();
            loadAttributeDefinitions();
        }
    }, [isEditOpen]);

    const getFilteredParents = () => {
        if (!editForm.structuralType) return [];

        const validParents: { [key: string]: string[] } = {
            'POSITION': ['SHELF'],
            'SHELF': ['BAY'],
            'BAY': ['ROW'],
            'ROW': ['ROOM'],
            'ROOM': ['WAREHOUSE'],
        };

        const allowedTypes = validParents[editForm.structuralType];
        if (!allowedTypes) return [];

        return allLocations.filter(loc =>
            allowedTypes.includes(loc.structuralType) &&
            loc.id !== location.id // Prevent self-parenting
        );
    };

    const handleUpdate = async () => {
        try {
            // Merge custom attributes back into attributes object
            const mergedAttributes = { ...editForm.attributes };

            // First remove old custom attributes (simplistic approach: just rebuild from separate UI sections?)
            // A safer way is to trust `editForm.attributes` contains the specific ones (color, etc.)
            // and `editForm.customAttributes` contains the generic ones.

            if (editForm.customAttributes) {
                editForm.customAttributes.forEach((attr: any) => {
                    if (attr.key) mergedAttributes[attr.key] = attr.value;
                });
            }

            await updateLocation(location.id, {
                ...editForm,
                attributes: mergedAttributes
            });
            toast.success('Location updated');
            setIsEditOpen(false);
            loadLocation(location.id);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update location');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!location) return <div className="p-8">Location not found</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Locations
                </Button>
                <div className="flex gap-2">
                    <PrintButton endpoint={`/printing/location/${location.id}/pdf`} />
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Edit Location</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Edit Location</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* Structural Type */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="structuralType" className="text-right">Structure</Label>
                                    <Select
                                        value={editForm.structuralType || ''}
                                        onValueChange={(value) => {
                                            // If type changes, clear parent if it's no longer valid (or just clear it to force re-selection)
                                            // User requested: "mandatory parent definition... based on drop down list"
                                            setEditForm({ ...editForm, structuralType: value, parentId: '' });
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select structure type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Removed WAREHOUSE */}
                                            <SelectItem value="ROOM">Room</SelectItem>
                                            <SelectItem value="ROW">Row</SelectItem>
                                            <SelectItem value="BAY">Bay</SelectItem>
                                            <SelectItem value="SHELF">Shelf</SelectItem>
                                            <SelectItem value="POSITION">Position</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Parent Selection - Dynamic */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="parent" className="text-right">Parent</Label>
                                    <Select
                                        value={editForm.parentId || ''}
                                        onValueChange={(value) => setEditForm({ ...editForm, parentId: value })}
                                        disabled={!editForm.structuralType}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select parent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getFilteredParents().map((loc: any) => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                    {loc.name} {loc.structuralType ? `(${loc.structuralType})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Color Attribute */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="color" className="text-right">Color Code</Label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Input
                                            type="color"
                                            id="color"
                                            value={editForm.attributes?.color || '#000000'}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                attributes: { ...editForm.attributes, color: e.target.value }
                                            })}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <span className="text-sm text-gray-500">{editForm.attributes?.color || 'No color set'}</span>
                                    </div>
                                </div>

                                {/* Attributes based on Structure */}
                                {editForm.structuralType === 'ROOM' && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="temperature" className="text-right">Temperature</Label>
                                        <Select
                                            value={editForm.attributes?.temperature || ''}
                                            onValueChange={(value) => setEditForm({
                                                ...editForm,
                                                attributes: { ...editForm.attributes, temperature: value }
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

                                {editForm.structuralType === 'SHELF' && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="loadBearing" className="text-right">Load Bearing</Label>
                                        <div className="col-span-3 flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="loadBearing"
                                                checked={editForm.attributes?.loadBearing || false}
                                                onChange={(e) => setEditForm({
                                                    ...editForm,
                                                    attributes: { ...editForm.attributes, loadBearing: e.target.checked }
                                                })}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="loadBearing" className="text-sm text-gray-700">Yes</label>
                                        </div>
                                    </div>
                                )}

                                {/* Putaway Optimization - Zone Priority */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="zonePriority" className="text-right">Zone Priority</Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="zonePriority"
                                            type="number"
                                            value={editForm.zonePriority || 100}
                                            onChange={(e) => setEditForm({ ...editForm, zonePriority: parseInt(e.target.value) })}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Lower = Higher Priority (1 = Golden Zone)</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="putawaySequence" className="text-right">Putaway Seq</Label>
                                    <Input
                                        id="putawaySequence"
                                        type="number"
                                        value={editForm.putawaySequence || 0}
                                        onChange={(e) => setEditForm({ ...editForm, putawaySequence: parseInt(e.target.value) })}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* OTHER FIELDS */}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Usage Type</Label>
                                    <Select
                                        value={editForm.type}
                                        onValueChange={(value) => setEditForm({ ...editForm, type: value })}
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

                                {/* Dynamic Attributes from Definitions */}
                                {attributeDefinitions.length > 0 && (
                                    <div className="grid gap-4 border-t pt-4 mt-4">
                                        <Label className="font-semibold">Extended Attributes</Label>
                                        {attributeDefinitions.map((attr) => (
                                            <div key={attr.id} className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor={`attr-${attr.name}`} className="text-right">{attr.name}</Label>
                                                <div className="col-span-3">
                                                    {attr.type === 'BOOLEAN' ? (
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`attr-${attr.name}`}
                                                                checked={editForm.attributes?.[attr.name] === 'true' || editForm.attributes?.[attr.name] === true}
                                                                onChange={(e) => setEditForm({
                                                                    ...editForm,
                                                                    attributes: { ...editForm.attributes, [attr.name]: e.target.checked }
                                                                })}
                                                                className="h-4 w-4 rounded border-gray-300"
                                                            />
                                                            <span className="text-sm text-gray-500">{editForm.attributes?.[attr.name] ? 'Yes' : 'No'}</span>
                                                        </div>
                                                    ) : attr.type === 'SELECT' ? (
                                                        <Select
                                                            value={editForm.attributes?.[attr.name] || ''}
                                                            onValueChange={(val) => setEditForm({
                                                                ...editForm,
                                                                attributes: { ...editForm.attributes, [attr.name]: val }
                                                            })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {attr.options?.split(',').map((opt: string) => (
                                                                    <SelectItem key={opt.trim()} value={opt.trim()}>
                                                                        {opt.trim()}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : attr.type === 'NUMBER' ? (
                                                        <Input
                                                            type="number"
                                                            value={editForm.attributes?.[attr.name] || ''}
                                                            onChange={(e) => setEditForm({
                                                                ...editForm,
                                                                attributes: { ...editForm.attributes, [attr.name]: Number(e.target.value) }
                                                            })}
                                                        />
                                                    ) : (
                                                        <Input
                                                            type="text"
                                                            value={editForm.attributes?.[attr.name] || ''}
                                                            onChange={(e) => setEditForm({
                                                                ...editForm,
                                                                attributes: { ...editForm.attributes, [attr.name]: e.target.value }
                                                            })}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Custom Attributes (Legacy/Ad-hoc) */}
                                <div className="grid grid-cols-4 items-start gap-4 border-t pt-4 mt-4">
                                    <Label className="text-right pt-2">Ad-hoc Attributes</Label>
                                    <div className="col-span-3 space-y-2">
                                        {(editForm.customAttributes || []).map((attr: any, index: number) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    placeholder="Key"
                                                    value={attr.key}
                                                    onChange={(e) => {
                                                        const newAttrs = [...(editForm.customAttributes || [])];
                                                        newAttrs[index].key = e.target.value;
                                                        setEditForm({ ...editForm, customAttributes: newAttrs });
                                                    }}
                                                    className="w-1/2"
                                                />
                                                <Input
                                                    placeholder="Value"
                                                    value={attr.value}
                                                    onChange={(e) => {
                                                        const newAttrs = [...(editForm.customAttributes || [])];
                                                        newAttrs[index].value = e.target.value;
                                                        setEditForm({ ...editForm, customAttributes: newAttrs });
                                                    }}
                                                    className="w-1/2"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => {
                                                        const newAttrs = [...(editForm.customAttributes || [])];
                                                        newAttrs.splice(index, 1);
                                                        setEditForm({ ...editForm, customAttributes: newAttrs });
                                                    }}
                                                >
                                                    x
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const newAttrs = [...(editForm.customAttributes || [])];
                                                newAttrs.push({ key: '', value: '' });
                                                setEditForm({ ...editForm, customAttributes: newAttrs });
                                            }}
                                        >
                                            Add Attribute
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleUpdate}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                    {location.structuralType || 'Flexible'}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                    {location.type}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Capacity & Utilisation */}
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Capacity & Utilisation</h3>
                            {utilizationReport ? (
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Overall Status */}
                                    <div className="flex flex-col items-center justify-center border-r border-gray-100 pr-4">
                                        <span className="text-sm text-gray-500 uppercase tracking-wider mb-2">Status</span>
                                        <span className={`text-2xl font-bold px-3 py-1 rounded ${utilizationReport.status === 'OVERSIZED' ? 'bg-red-100 text-red-800' :
                                            utilizationReport.status === 'FULL' ? 'bg-orange-100 text-orange-800' :
                                                utilizationReport.status === 'PARTIAL' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {utilizationReport.status}
                                        </span>
                                    </div>

                                    {/* Metrics */}
                                    <div className="col-span-2 space-y-4">
                                        {/* Weight */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700">Weight</span>
                                                <span className="text-gray-500">
                                                    {utilizationReport.details.currentWeight.toFixed(1)} / {utilizationReport.details.maxWeight || '∞'} kg
                                                    ({utilizationReport.weightUtilisation.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${utilizationReport.weightUtilisation > 100 ? 'bg-red-600' : utilizationReport.weightUtilisation > 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(utilizationReport.weightUtilisation, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Volume */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700">Volume</span>
                                                <span className="text-gray-500">
                                                    {utilizationReport.details.currentVolume.toFixed(3)} / {utilizationReport.details.maxVolume || '∞'} m³
                                                    ({utilizationReport.volumeUtilisation.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${utilizationReport.volumeUtilisation > 100 ? 'bg-red-600' : utilizationReport.volumeUtilisation > 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(utilizationReport.volumeUtilisation, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Pallets (only if relevant) */}
                                        {utilizationReport.details.maxPallets > 0 && (
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-700">Pallets</span>
                                                    <span className="text-gray-500">
                                                        {utilizationReport.details.currentPallets.toFixed(1)} / {utilizationReport.details.maxPallets}
                                                        ({utilizationReport.palletUtilisation.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div
                                                        className={`h-2.5 rounded-full ${utilizationReport.palletUtilisation > 100 ? 'bg-red-600' : utilizationReport.palletUtilisation > 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(utilizationReport.palletUtilisation, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                                    Loading utilization data...
                                </div>
                            )}
                        </div>

                        {/* Attributes */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Attributes</h3>
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Own Attributes</h4>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                                        {(location.zonePriority !== undefined && location.zonePriority !== null) && (
                                            <div>
                                                <dt className="text-sm text-gray-500">Zone Priority</dt>
                                                <dd className="text-sm font-medium text-gray-900">{location.zonePriority}</dd>
                                            </div>
                                        )}
                                        {(location.putawaySequence !== undefined && location.putawaySequence !== null) && (
                                            <div>
                                                <dt className="text-sm text-gray-500">Putaway Sequence</dt>
                                                <dd className="text-sm font-medium text-gray-900">{location.putawaySequence}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    {Object.keys(location.attributes || {}).length > 0 ? (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {Object.entries(location.attributes).map(([key, value]: any) => (
                                                <div key={key}>
                                                    <dt className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                                                    <dd className="text-sm font-medium text-gray-900">
                                                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    ) : (
                                        Object.keys(location.attributes || {}).length === 0 && !location.zonePriority && (
                                            <p className="text-sm text-gray-400 italic">No specific attributes defined.</p>
                                        )
                                    )}
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-sm font-medium text-blue-600 mb-2">Inherited Attributes</h4>
                                    {Object.keys(location.inheritedAttributes || {}).length > 0 ? (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {Object.entries(location.inheritedAttributes).map(([key, value]: any) => (
                                                <div key={key}>
                                                    <dt className="text-sm text-blue-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                                                    <dd className="text-sm font-medium text-blue-900">
                                                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    ) : (
                                        <p className="text-sm text-blue-400 italic">No inherited attributes.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Hierarchy Info */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Hierarchy</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-sm text-gray-500">Parent Location:</span>
                                        {location.parent ? (
                                            <Link href={`/inventory/locations/${location.parent.id}`} className="ml-2 text-blue-600 hover:underline">
                                                {location.parent.name}
                                            </Link>
                                        ) : (
                                            <span className="ml-2 text-gray-900">None (Root)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
            );
}
