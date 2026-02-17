'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
    attributes?: {
        color?: string;
        _dynamic?: { name: string; type: string; value: any }[];
        [key: string]: any
    };
    dynamicAttributes?: any[]; // For type safety if passed directly, though usually mapped to attributes
}

interface AttributeDefinition {
    id: string;
    name: string;
    type: string;
    options?: string;
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

    // Attribute Filtering
    const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([]);
    const [selectedAttributeFilter, setSelectedAttributeFilter] = useState<string>('none');

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
                .filter(l => l.structuralType === 'BAY' || l.structuralType === 'ROW' || l.structuralType === 'BIN');

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

            // Fetch Attribute Definitions
            const attrRes = await fetch(`${API_URL}/inventory/attributes/definitions`);
            if (attrRes.ok) {
                const attrs = await attrRes.json();
                setAttributeDefinitions(attrs);
            }
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

    const [showHeatmap, setShowHeatmap] = useState(false);
    const [heatmapMetric, setHeatmapMetric] = useState<'UTILISATION' | 'VELOCITY' | 'CONGESTION'>('UTILISATION');
    const [utilizationData, setUtilizationData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (showHeatmap && mappedBays.length > 0) {
            loadBatchUtilisation();
        }
    }, [showHeatmap, mappedBays, heatmapMetric]);

    const loadBatchUtilisation = async () => {
        try {
            const ids = mappedBays.map(b => b.id);
            const res = await fetch(`${API_URL}/inventory/locations/utilisation-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationIds: ids, metric: heatmapMetric })
            });
            if (res.ok) {
                const data = await res.json();
                setUtilizationData(data);
            }
        } catch (err) {
            console.error("Failed to load heatmap data", err);
        }
    };

    const getBayColor = (bay: Location) => {
        // Priority 1: Heatmap
        if (showHeatmap) {
            const util = utilizationData[bay.id];
            if (!util) return '#94a3b8'; // Grey if no data

            switch (heatmapMetric) {
                case 'UTILISATION':
                    switch (util.status) {
                        case 'EMPTY': return '#10b981'; // Green
                        case 'PARTIAL': return '#f59e0b'; // Amber
                        case 'FULL': return '#ef4444'; // Red
                        case 'OVERSIZED': return '#7f1d1d'; // Dark Red
                        default: return '#94a3b8';
                    }
                case 'VELOCITY':
                    // Velocity Score 0-100. Heatmap from Blue (Cold) to Red (Hot)
                    const v = util.velocityScore || 0;
                    if (v < 20) return '#3b82f6'; // Blue (Low)
                    if (v < 50) return '#22c55e'; // Green (Medium)
                    if (v < 80) return '#f59e0b'; // Orange (High)
                    return '#ef4444'; // Red (Very High)
                case 'CONGESTION':
                    // Congestion Score 0-100.
                    const c = util.congestionScore || 0;
                    if (c === 0) return '#10b981'; // Green (Clear)
                    if (c < 50) return '#f59e0b'; // Orange (Busy)
                    return '#ef4444'; // Red (Congested)
                default: return '#94a3b8';
            }
        }

        // Priority 2: Attribute Filter
        if (selectedAttributeFilter !== 'none') {
            const attrValue = bay.attributes?.[selectedAttributeFilter];
            if (attrValue) {
                // If it's a boolean attribute and true, show as distinct color
                if (attrValue === 'true' || attrValue === true) return '#ec4899'; // Pink

                // If it's a select/text attribute, maybe hash the string to a color?
                // For now, let's just highlight it.
                return '#8b5cf6'; // Violet
            } else {
                return '#e2e8f0'; // Dimmed/Grey out non-matching
            }
        }

        // Priority 3: Default / Custom Color
        return bay.attributes?.color || '#2563eb';
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

                        <Select value={selectedAttributeFilter} onValueChange={setSelectedAttributeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter Attribute" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Filter</SelectItem>
                                {attributeDefinitions.map(attr => (
                                    <SelectItem key={attr.id} value={attr.name}>{attr.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Heatmap Controls */}
                    <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
                        <Button
                            variant={showHeatmap ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={showHeatmap ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                        >
                            {showHeatmap ? "On" : "Off"}
                        </Button>
                        <Select value={heatmapMetric} onValueChange={(v: any) => setHeatmapMetric(v)} disabled={!showHeatmap}>
                            <SelectTrigger className="w-[140px] h-8 border-none bg-transparent focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTILISATION">Utilisation</SelectItem>
                                <SelectItem value="VELOCITY">Velocity</SelectItem>
                                <SelectItem value="CONGESTION">Congestion</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

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
                                className="absolute text-white rounded shadow-md cursor-move flex items-center justify-center group transition-colors duration-300"
                                style={{
                                    left: bay.x,
                                    top: bay.y,
                                    width: bay.width || 50,
                                    height: bay.height || 50,
                                    transform: `rotate(${bay.rotation || 0}deg)`,
                                    backgroundColor: getBayColor(bay)
                                }}
                                title={`${bay.name} ${showHeatmap && utilizationData[bay.id] ? `(${utilizationData[bay.id].status})` : ''}`}
                            >
                                <span className="text-xs font-bold pointer-events-none select-none">{bay.name}</span>

                                {/* Attribute Badges */}
                                <div className="flex flex-wrap gap-1 justify-center mt-1 px-1">
                                    {(bay.attributes && Object.entries(bay.attributes).map(([key, value]) => {
                                        if (key === 'color' || key === '_dynamic') return null;
                                        // Only show if value is true/truthy and not a complex object (unless it's our mapped dynamic)
                                        if (value === 'true' || value === true) {
                                            return (
                                                <Badge key={key} variant="secondary" className="text-[8px] h-3 px-1 py-0 pointer-events-none">
                                                    {key.substring(0, 3).toUpperCase()}
                                                </Badge>
                                            );
                                        }
                                        return null;
                                    }))}
                                </div>

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

            {/* Legend Overlay */}
            {showHeatmap && (
                <div className="absolute bottom-6 right-6 z-10 bg-white/90 backdrop-blur border p-3 rounded shadow-lg text-xs">
                    <h4 className="font-bold mb-2 uppercase tracking-wider text-muted-foreground">{heatmapMetric} Legend</h4>
                    <div className="space-y-1.5">
                        {heatmapMetric === 'UTILISATION' && (
                            <>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#10b981] mr-2" /> Empty</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#f59e0b] mr-2" /> Partial</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#ef4444] mr-2" /> Full</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#7f1d1d] mr-2" /> Oversized</div>
                            </>
                        )}
                        {heatmapMetric === 'VELOCITY' && (
                            <>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#3b82f6] mr-2" /> Low (&lt;20%)</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#22c55e] mr-2" /> Medium (&lt;50%)</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#f59e0b] mr-2" /> High (&lt;80%)</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#ef4444] mr-2" /> Very High</div>
                            </>
                        )}
                        {heatmapMetric === 'CONGESTION' && (
                            <>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#10b981] mr-2" /> Clear</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#f59e0b] mr-2" /> Busy</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#ef4444] mr-2" /> Congested</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
