'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLocationDetails, updateLocation, deleteLocation, fetchLocationInventory, fetchLocations } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { ArrowLeft, Trash2, Printer, Edit2, Package, Layers, Info } from 'lucide-react';
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
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

export default function LocationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [location, setLocation] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [allLocations, setAllLocations] = useState<any[]>([]);
    const [attributeDefinitions, setAttributeDefinitions] = useState<any[]>([]);
    const [utilizationReport, setUtilizationReport] = useState<any>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);

    useEffect(() => {
        if (params.id) {
            loadLocation(params.id as string);
        }
    }, [params.id]);

    const loadAllLocations = async () => {
        try {
            // Need recursive or flat list. Using fetchLocations which returns flat list usually, or tree. 
            // Assuming tree for now based on previous code usage
            const data = await fetchLocations();
            // Flatten if necessary, but assuming api returns list for dropdown
            setAllLocations(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load locations for parent selection", e);
        }
    };

    const loadAttributeDefinitions = async () => {
        try {
            const res = await fetch('http://localhost:3001/inventory/attributes/definitions');
            if (res.ok) {
                const data = await res.json();
                setAttributeDefinitions(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Failed to load attribute definitions", e);
        }
    };

    const loadLocation = async (id: string) => {
        try {
            setLoading(true);
            const [data, invData] = await Promise.all([
                getLocationDetails(id),
                fetchLocationInventory(id)
            ]);

            setLocation(data);
            setInventory(invData);
            loadUtilisation(id);
            buildBreadcrumbs(data);

            // Setup Edit Form
            const customAttributes = Object.entries(data.attributes || {})
                .filter(([key]) => !['color', 'temperature', 'loadBearing', 'supportedPackaging'].includes(key))
                .map(([key, value]) => ({ key, value }));

            setEditForm({
                name: data.name,
                type: data.type,
                structuralType: data.structuralType,
                parentId: data.parentId,
                attributes: data.attributes || {},
                customAttributes: customAttributes,
                zonePriority: data.zonePriority,
                putawaySequence: data.putawaySequence,
            });

        } catch (error) {
            console.error(error);
            toast.error("Failed to load location details");
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

    // Breadcrumb builder - simplistic approach assuming we might have parent info in location
    // Since location.parent is only one level up, for full breadcrumbs we'd need to walk up the tree.
    // For now, we'll try to use what we have, or maybe just show immediate parent.
    // Ideally the API returns the path or we fetch the full tree.
    // Given the screenshot, it shows Locations > Warehouse A > Shelf 1 > Bin 01.
    // Let's rely on location.parent for now.
    const buildBreadcrumbs = (loc: any) => {
        // This is a placeholder. Real implementation needs recursive parent fetching or a 'path' property from API.
        const crumbs = [
            { label: 'Locations', href: '/inventory/locations' },
        ];
        if (loc.parent) {
            crumbs.push({ label: loc.parent.name, href: `/inventory/locations/${loc.parent.id}` });
        }
        crumbs.push({ label: loc.name, href: '#' }); // Current
        setBreadcrumbs(crumbs);
    };

    useEffect(() => {
        if (isEditOpen) {
            loadAllLocations();
            loadAttributeDefinitions();
        }
    }, [isEditOpen]);


    const handleUpdate = async () => {
        try {
            const mergedAttributes = { ...editForm.attributes };
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

    if (loading) return <div className="p-8 flex justify-center text-gray-500">Loading location details...</div>;
    if (!location) return <div className="p-8">Location not found</div>;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* Header / Breadcrumbs / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <nav className="text-sm text-gray-500 flex items-center gap-2">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-2">
                                {i > 0 && <span>&gt;</span>}
                                {i === breadcrumbs.length - 1 ? (
                                    <span className="font-medium text-gray-900">{crumb.label}</span>
                                ) : (
                                    <Link href={crumb.href} className="hover:underline hover:text-blue-600">
                                        {crumb.label}
                                    </Link>
                                )}
                            </span>
                        ))}
                    </nav>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{location.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="uppercase">{location.structuralType || 'Location'}</Badge>
                        <Badge variant="outline" className="uppercase">{location.type}</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <PrintButton endpoint={`/printing/location/${location.id}/pdf`} />
                    <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Edit Location
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {utilizationReport && (
                                <>
                                    {utilizationReport.status === 'EMPTY' && <div className="h-3 w-3 rounded-full bg-green-500" />}
                                    {utilizationReport.status === 'PARTIAL' && <div className="h-3 w-3 rounded-full bg-yellow-500" />}
                                    {utilizationReport.status === 'FULL' && <div className="h-3 w-3 rounded-full bg-red-500" />}
                                    <span className="text-2xl font-bold uppercase">{utilizationReport.status || 'Unknown'}</span>
                                </>
                            )}
                            {!utilizationReport && <span className="text-gray-400">Loading...</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Weight</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {utilizationReport ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold">Weight: {utilizationReport.details.currentWeight.toFixed(1)} <span className="text-sm font-normal text-gray-500">/ {utilizationReport.details.maxWeight || '∞'} kg</span></span>
                                    <span className="text-sm text-gray-500">({utilizationReport.weightUtilisation.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${utilizationReport.weightUtilisation > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                                        style={{ width: `${Math.min(utilizationReport.weightUtilisation, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : <span className="text-gray-400">Loading...</span>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {utilizationReport ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold">Volume: {utilizationReport.details.currentVolume.toFixed(2)} <span className="text-sm font-normal text-gray-500">/ {utilizationReport.details.maxVolume || '∞'} m³</span></span>
                                    <span className="text-sm text-gray-500">({utilizationReport.volumeUtilisation.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${utilizationReport.volumeUtilisation > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                                        style={{ width: `${Math.min(utilizationReport.volumeUtilisation, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : <span className="text-gray-400">Loading...</span>}
                    </CardContent>
                </Card>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Inventory */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Inventory</CardTitle>
                            <CardDescription>Items currently stored in this location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {inventory.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead>Date Added</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inventory.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product?.sku}</TableCell>
                                                <TableCell>{item.product?.name}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                                    No items currently stored in this location.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Attributes & Hierarchy */}
                <div className="space-y-6">

                    {/* Attributes Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Attributes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Zone Priority</div>
                                    <div className="text-lg font-semibold">{location.zonePriority ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Putaway Sequence</div>
                                    <div className="text-lg font-semibold">{location.putawaySequence ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Max Weight</div>
                                    <div className="text-lg font-semibold">{utilizationReport?.details?.maxWeight || '∞'} kg</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Max Pallets</div>
                                    <div className="text-lg font-semibold">{utilizationReport?.details?.maxPallets || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Clearance Height</div>
                                    <div className="text-lg font-semibold">{location.attributes?.clearanceHeight ? `${location.attributes.clearanceHeight} m` : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Type</div>
                                    <div className="text-lg font-semibold capitalize">{location.attributes?.temperature || '-'}</div>
                                </div>
                            </div>

                            {Object.keys(location.attributes || {}).length > 0 && (
                                <>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(location.attributes)
                                            .filter(([k]) => !['clearanceHeight', 'temperature'].includes(k)) // hide checks already shown
                                            .map(([key, value]) => (
                                                <div key={key}>
                                                    <span className="text-gray-500 capitalize">{key}: </span>
                                                    <span className="font-medium text-gray-900">{String(value)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hierarchy Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Hierarchy</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <div className="text-sm font-medium text-gray-500">Parent Location</div>
                                {location.parent ? (
                                    <Link href={`/inventory/locations/${location.parent.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                                        {location.parent.name}
                                    </Link>
                                ) : (
                                    <div className="text-lg font-semibold">Root</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes (Placeholder) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-24 bg-gray-50 rounded border border-dashed flex items-center justify-center text-gray-400">
                                No notes added.
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Hidden Dialogs */}
            <DeleteConfirmationModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={async () => {
                    await deleteLocation(location.id);
                    toast.success('Location deleted');
                    router.push('/inventory/locations');
                }}
                resourceName={location.name}
                resourceType="Location"
                dependencyCheckUrl={`/inventory/locations/${location.id}/dependencies`}
            />

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Location</DialogTitle>
                    </DialogHeader>
                    {/* Reusing the same form logic as before, just wrapped nicely */}
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="structuralType" className="text-right">Structure</Label>
                            <Select
                                value={editForm.structuralType || ''}
                                onValueChange={(value) => {
                                    setEditForm({ ...editForm, structuralType: value, parentId: '' });
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select structure type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ROOM">Room</SelectItem>
                                    <SelectItem value="ROW">Row</SelectItem>
                                    <SelectItem value="BAY">Bay</SelectItem>
                                    <SelectItem value="SHELF">Shelf</SelectItem>
                                    <SelectItem value="POSITION">Position</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                                    {allLocations.filter(loc => loc.id !== location.id).map((loc: any) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name} {loc.structuralType ? `(${loc.structuralType})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* More fields can be added here similar to the original file if needed for full parity */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="zonePriority" className="text-right">Zone Priority</Label>
                            <Input
                                id="zonePriority"
                                type="number"
                                value={editForm.zonePriority || 100}
                                onChange={(e) => setEditForm({ ...editForm, zonePriority: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
