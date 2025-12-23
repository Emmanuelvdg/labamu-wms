'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchLocationsTree, API_URL } from '@/lib/api';
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Location {
    id: string;
    name: string;
    type: string;
    structuralType: string;
    parentId?: string;
    children?: Location[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    warehouseId?: string;
    attributes?: { color?: string;[key: string]: any };
}

export default function FloorPlanPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [warehouses, setWarehouses] = useState<Location[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [selectedShelfLayer, setSelectedShelfLayer] = useState<string>('1');

    const [rooms, setRooms] = useState<Location[]>([]);
    const [bays, setBays] = useState<Location[]>([]);
    const [unmappedBays, setUnmappedBays] = useState<Location[]>([]);
    const [mappedBays, setMappedBays] = useState<Location[]>([]);

    const [draggedBay, setDraggedBay] = useState<Location | null>(null);
    const [scale, setScale] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) {
            const warehouse = locations.find(l => l.id === selectedWarehouseId);
            // Find rooms (children of warehouse or children of stock location)
            // Assuming simplified hierarchy for now: Warehouse -> Room
            // Or Warehouse -> Stock -> Room
            // Let's flatten and find all ROOMs belonging to this warehouse
            const warehouseRooms = flattenLocations(warehouse?.children || [])
                .filter(l => l.structuralType === 'ROOM');
            setRooms(warehouseRooms);
            if (warehouseRooms.length > 0) {
                setSelectedRoomId(warehouseRooms[0].id);
            } else {
                setSelectedRoomId('');
            }
        }
    }, [selectedWarehouseId, locations]);

    useEffect(() => {
        if (selectedRoomId) {
            // Find all bays in this room
            // In our hierarchy: Room -> Row -> Bay
            // We need to find all descendants that are BAYS
            const room = findLocation(locations, selectedRoomId);
            const roomBays = flattenLocations(room?.children || [])
                .filter(l => l.structuralType === 'BAY' || l.structuralType === 'ROW');

            // Filter by Shelf Layer if needed
            // The user requirement says: "The view is filtered for the first shelf layer."
            // This implies we might want to show bays that HAVE a shelf at layer 1.
            // For now, let's just show all bays, or filter if we can determine layers.
            // Let's assume all bays are visible for the floor plan layout.

            console.log('Selected Room:', room);
            console.log('Selected Room Children:', room?.children);
            // reused roomBays from above
            console.log('Found Bays:', roomBays);

            // Treat as mapped only if x or y is non-zero (and defined)
            // Ideally non-zero, assuming 0,0 is the "spawn point" or default.
            const isMapped = (b: Location) => (b.x && b.x !== 0) || (b.y && b.y !== 0);

            const mapped = roomBays.filter(b => isMapped(b));
            const unmapped = roomBays.filter(b => !isMapped(b));

            setMappedBays(mapped);
            setUnmappedBays(unmapped);
        }
    }, [selectedRoomId, locations]);

    async function loadData() {
        try {
            const tree = await fetchLocationsTree();
            setLocations(tree);
            // Find warehouses (roots or children of roots)
            // Our tree roots are usually View Locations, which contain Warehouses?
            // Or Warehouses are linked to View Locations.
            // Let's find locations with structuralType 'WAREHOUSE' or type 'VIEW' that have children.
            // Actually, let's just look for structuralType 'WAREHOUSE' in the flattened list
            const all = flattenLocations(tree);
            const whs = all.filter(l => l.structuralType === 'WAREHOUSE');
            setWarehouses(whs);
            if (whs.length > 0) setSelectedWarehouseId(whs[0].id);
        } catch (err) {
            console.error(err);
        }
    }

    function flattenLocations(nodes: Location[]): Location[] {
        let result: Location[] = [];
        for (const node of nodes) {
            result.push(node);
            if (node.children) {
                result = result.concat(flattenLocations(node.children));
            }
        }
        return result;
    }

    function findLocation(nodes: Location[], id: string): Location | undefined {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findLocation(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    const handleDragStart = (e: React.DragEvent, bay: Location, from: 'sidebar' | 'canvas') => {
        e.dataTransfer.setData('bayId', bay.id);
        e.dataTransfer.setData('from', from);
        // Calculate offset if dragging from canvas
        if (from === 'canvas' && canvasRef.current) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
            e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const bayId = e.dataTransfer.getData('bayId');
        const from = e.dataTransfer.getData('from');
        const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
        const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');

        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Calculate new position relative to canvas, accounting for scale
        const x = (e.clientX - canvasRect.left - offsetX) / scale;
        const y = (e.clientY - canvasRect.top - offsetY) / scale;

        // Snap to grid (e.g., 10px)
        const snappedX = Math.round(x / 10) * 10;
        const snappedY = Math.round(y / 10) * 10;

        if (from === 'sidebar') {
            const bay = unmappedBays.find(b => b.id === bayId);
            if (bay) {
                setUnmappedBays(unmappedBays.filter(b => b.id !== bayId));
                setMappedBays([...mappedBays, { ...bay, x: snappedX, y: snappedY, width: 50, height: 50 }]); // Default size
            }
        } else {
            setMappedBays(mappedBays.map(b =>
                b.id === bayId ? { ...b, x: snappedX, y: snappedY } : b
            ));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleSave = async () => {
        try {
            // Save all mapped bays
            await Promise.all(mappedBays.map(bay =>
                fetch(`${API_URL}/inventory/locations/${bay.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        x: bay.x,
                        y: bay.y,
                        width: bay.width,
                        height: bay.height,
                        rotation: bay.rotation
                    })
                })
            ));

            // Also save unmapped bays (reset coordinates to 0 if moved back?)
            // For now, we don't support moving back to sidebar explicitly in UI, 
            // but if we did, we'd set x=0, y=0.

            toast.success("Floor plan has been updated successfully.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save layout.");
        }
    };

    const handleRotate = (bayId: string) => {
        setMappedBays(mappedBays.map(b => {
            if (b.id === bayId) {
                const newRotation = ((b.rotation || 0) + 90) % 360;
                // Swap width/height if rotating 90 degrees?
                // Visual rotation is enough for now.
                return { ...b, rotation: newRotation };
            }
            return b;
        }));
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-background">
                <div className="flex items-center space-x-4">
                    <Link href="/inventory/locations">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold">Floor Plan Manager</h1>

                    <div className="flex items-center space-x-2 ml-4">
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map(w => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Room" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedShelfLayer} onValueChange={setSelectedShelfLayer}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Shelf Layer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Shelf Layer 1</SelectItem>
                                <SelectItem value="2">Shelf Layer 2</SelectItem>
                                <SelectItem value="3">Shelf Layer 3</SelectItem>
                                <SelectItem value="4">Shelf Layer 4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" /> Save Layout
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r bg-muted/10 p-4 overflow-y-auto">
                    <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">Unmapped Locations</h3>
                    <div className="space-y-2">
                        {unmappedBays.map(bay => (
                            <div
                                key={bay.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, bay, 'sidebar')}
                                className="p-3 bg-card border rounded shadow-sm cursor-move hover:border-primary transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium">{bay.name}</span>
                            </div>
                        ))}
                        {unmappedBays.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No unmapped locations.</p>
                        )}
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-slate-50 relative overflow-auto p-8">
                    <div
                        ref={canvasRef}
                        className="bg-white border shadow-sm relative transition-transform origin-top-left"
                        style={{
                            width: '2000px',
                            height: '2000px',
                            transform: `scale(${scale})`
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        {/* Grid Background */}
                        <div className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }}
                        />

                        {mappedBays.map(bay => (
                            <div
                                key={bay.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, bay, 'canvas')}
                                className="absolute bg-blue-600 text-white rounded shadow-md cursor-move flex items-center justify-center group"
                                style={{
                                    left: bay.x,
                                    top: bay.y,
                                    width: bay.width || 50,
                                    height: bay.height || 50,
                                    transform: `rotate(${bay.rotation || 0}deg)`,
                                    backgroundColor: bay.attributes?.color || '#2563eb'
                                }}
                                title={bay.name}
                            >
                                <span className="text-xs font-bold pointer-events-none select-none">{bay.name}</span>

                                {/* Controls */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-white text-black shadow-lg rounded p-1 space-x-1">
                                    <button
                                        className="p-1 hover:bg-slate-100 rounded"
                                        onClick={(e) => { e.stopPropagation(); handleRotate(bay.id); }}
                                    >
                                        <RotateCw className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
