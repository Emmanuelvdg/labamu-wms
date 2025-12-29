'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/api';
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCw, Trash2, Layout, Grid as GridIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FunctionalArea {
    id: string;
    name: string;
    areaType: string;
    x: number;  // in meters
    y: number;  // in meters
    width: number;  // in meters
    height: number;  // in meters
    rotation: number;
    color?: string;
    sequence: number;
}

interface SuggestedArea {
    areaType: string;
    name: string;
    color: string;
    sequence: number;
}

interface Warehouse {
    id: string;
    name: string;
    floorPlanShape?: string;
    floorPlanVertices?: string;
    floorPlanWidth?: number;
    floorPlanHeight?: number;
    gridEnabled?: boolean;
    gridSize?: number;
    snapToGrid?: boolean;
}

const AREA_TYPE_LABELS: Record<string, string> = {
    RECEIVING: 'Receiving Dock',
    STAGING: 'Staging Area',
    PUTAWAY_LANE: 'Putaway Lane',
    STORAGE: 'Storage',
    PICKING: 'Picking Zone',
    PACKING: 'Packing Area',
    SHIPPING: 'Shipping Dock',
};

export default function WarehouseFloorPlanPage() {
    const params = useParams();
    const router = useRouter();
    const warehouseId = params.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [areas, setAreas] = useState<FunctionalArea[]>([]);
    const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([]);
    const [selectedArea, setSelectedArea] = useState<FunctionalArea | null>(null);
    const [zoom, setZoom] = useState(1);
    const [resizing, setResizing] = useState<{ areaId: string, handle: string, startX: number, startY: number, originalArea: FunctionalArea } | null>(null);
    const [showDistances, setShowDistances] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        loadData();
    }, [warehouseId]);

    async function loadData() {
        try {
            // Load warehouse with floor plan data
            const warehouseRes = await fetch(`/api/warehouses/${warehouseId}`);
            const warehouseData = await warehouseRes.json();
            setWarehouse(warehouseData);

            // Load existing areas
            const areasRes = await fetch(`${API_URL}/warehouses/${warehouseId}/areas`);
            const areasData = await areasRes.json();
            setAreas(areasData);

            // Load suggested areas
            const suggestedRes = await fetch(`${API_URL}/warehouses/${warehouseId}/areas/suggested`);
            const suggestedData = await suggestedRes.json();
            setSuggestedAreas(suggestedData);
        } catch (err) {
            console.error('Failed to load data:', err);
            toast.error('Failed to load warehouse data');
        }
    }

    const handleDragStart = (e: React.DragEvent, area: FunctionalArea | SuggestedArea, from: 'palette' | 'canvas') => {
        e.dataTransfer.setData('areaData', JSON.stringify(area));
        e.dataTransfer.setData('from', from);
        if (from === 'canvas' && svgRef.current) {
            const rect = (e.target as SVGElement).getBoundingClientRect();
            const svgRect = svgRef.current.getBoundingClientRect();
            e.dataTransfer.setData('offsetX', ((e.clientX - rect.left) / pixelsPerMeter).toString());
            e.dataTransfer.setData('offsetY', ((e.clientY - rect.top) / pixelsPerMeter).toString());
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const areaData = JSON.parse(e.dataTransfer.getData('areaData'));
        const from = e.dataTransfer.getData('from');
        const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
        const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');

        if (!svgRef.current) return;
        const svgRect = svgRef.current.getBoundingClientRect();

        // Convert pixel coordinates to meters
        const xMeters = (e.clientX - svgRect.left) / pixelsPerMeter / zoom - offsetX;
        const yMeters = (e.clientY - svgRect.top) / pixelsPerMeter / zoom - offsetY;

        // Snap to grid in meters
        const gridSize = warehouse?.gridSize || 1;
        const snapEnabled = warehouse?.snapToGrid !== false;
        const snappedX = snapEnabled ? Math.round(xMeters / gridSize) * gridSize : xMeters;
        const snappedY = snapEnabled ? Math.round(yMeters / gridSize) * gridSize : yMeters;

        try {
            if (from === 'palette') {
                // Create new area
                const res = await fetch(`${API_URL}/warehouses/${warehouseId}/areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: areaData.name,
                        areaType: areaData.areaType,
                        x: snappedX,
                        y: snappedY,
                        width: 5,  // Default 5 meters
                        height: 5,  // Default 5 meters
                        rotation: 0,
                        color: areaData.color,
                        sequence: areaData.sequence,
                    })
                });
                const newArea = await res.json();
                setAreas([...areas, newArea]);
                toast.success('Area added to floor plan');
            } else {
                // Update existing area position
                const res = await fetch(`${API_URL}/warehouses/${warehouseId}/areas/${areaData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ x: snappedX, y: snappedY })
                });
                const updated = await res.json();
                setAreas(areas.map(a => a.id === updated.id ? updated : a));
            }
        } catch (err) {
            console.error('Failed to save area:', err);
            toast.error('Failed to save area');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleRotate = async (areaId: string) => {
        const area = areas.find(a => a.id === areaId);
        if (!area) return;

        const newRotation = ((area.rotation || 0) + 90) % 360;
        try {
            const res = await fetch(`${API_URL}/warehouses/${warehouseId}/areas/${areaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotation: newRotation })
            });
            const updated = await res.json();
            setAreas(areas.map(a => a.id === updated.id ? updated : a));
        } catch (err) {
            console.error('Failed to rotate area:', err);
            toast.error('Failed to rotate area');
        }
    };

    const handleDelete = async (areaId: string) => {
        if (!confirm('Are you sure you want to delete this area?')) return;

        try {
            await fetch(`${API_URL}/warehouses/${warehouseId}/areas/${areaId}`, {
                method: 'DELETE'
            });
            setAreas(areas.filter(a => a.id !== areaId));
            setSelectedArea(null);
            toast.success('Area deleted');
        } catch (err) {
            console.error('Failed to delete area:', err);
            toast.error('Failed to delete area');
        }
    };

    const applyLayout = async (layoutType: 'I' | 'U' | 'L') => {
        if (!confirm(`Apply ${layoutType}-shaped layout? This will replace all existing areas.`)) return;

        try {
            // Delete existing areas
            await Promise.all(areas.map(area =>
                fetch(`${API_URL}/warehouses/${warehouseId}/areas/${area.id}`, {
                    method: 'DELETE'
                })
            ));

            // Get layout template
            const res = await fetch(`${API_URL}/warehouses/${warehouseId}/areas/layout/${layoutType}`);
            const template = await res.json();

            // Create areas from template
            const created = await Promise.all(template.areas.map((area: any) =>
                fetch(`${API_URL}/warehouses/${warehouseId}/areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(area)
                }).then(r => r.json())
            ));

            setAreas(created);
            toast.success(`${layoutType}-shaped layout applied!`);
        } catch (err) {
            console.error('Failed to apply layout:', err);
            toast.error('Failed to apply layout');
        }
    };

    const toggleGrid = async () => {
        if (!warehouse) return;
        try {
            const res = await fetch(`${API_URL}/warehouses/${warehouseId}/floor-plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gridEnabled: !warehouse.gridEnabled })
            });
            const updated = await res.json();
            setWarehouse({ ...warehouse, ...updated });
        } catch (err) {
            console.error('Failed to toggle grid:', err);
            toast.error('Failed to update grid settings');
        }
    };

    const toggleSnap = async () => {
        if (!warehouse) return;
        try {
            const res = await fetch(`${API_URL}/warehouses/${warehouseId}/floor-plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapToGrid: !warehouse.snapToGrid })
            });
            const updated = await res.json();
            setWarehouse({ ...warehouse, ...updated });
        } catch (err) {
            console.error('Failed to toggle snap:', err);
            toast.error('Failed to update snap settings');
        }
    };

    const startResize = (e: React.MouseEvent, area: FunctionalArea, handle: string) => {
        e.stopPropagation();
        if (!svgRef.current) return;

        setResizing({
            areaId: area.id,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            originalArea: { ...area }
        });
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizing || !warehouse) return;

        const deltaX = (e.clientX - resizing.startX) / pixelsPerMeter / zoom;
        const deltaY = (e.clientY - resizing.startY) / pixelsPerMeter / zoom;

        let newDims = calculateNewDimensions(resizing.originalArea, resizing.handle, deltaX, deltaY, e.shiftKey);

        // Snap to grid
        const gridSize = warehouse.gridSize || 1;
        if (warehouse.snapToGrid) {
            newDims.x = Math.round(newDims.x / gridSize) * gridSize;
            newDims.y = Math.round(newDims.y / gridSize) * gridSize;
            newDims.width = Math.max(1, Math.round(newDims.width / gridSize) * gridSize);
            newDims.height = Math.max(1, Math.round(newDims.height / gridSize) * gridSize);
        }

        // Update area optimistically
        setAreas(areas.map(a => a.id === resizing.areaId ? { ...a, ...newDims } : a));
    };

    const handleResizeEnd = async () => {
        if (!resizing) return;

        const area = areas.find(a => a.id === resizing.areaId);
        if (area) {
            try {
                await fetch(`${API_URL}/warehouses/${warehouseId}/areas/${area.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        x: area.x,
                        y: area.y,
                        width: area.width,
                        height: area.height
                    })
                });
            } catch (err) {
                console.error('Failed to save resize:', err);
                toast.error('Failed to save area size');
            }
        }

        setResizing(null);
    };

    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [resizing, areas]);

    function calculateNewDimensions(
        area: FunctionalArea,
        handle: string,
        deltaX: number,
        deltaY: number,
        maintainAspectRatio: boolean
    ) {
        let { x, y, width, height } = area;
        const aspectRatio = width / height;

        switch (handle) {
            case 'se': // Southeast (bottom-right)
                width += deltaX;
                height += deltaY;
                if (maintainAspectRatio) {
                    height = width / aspectRatio;
                }
                break;
            case 'nw': // Northwest (top-left)
                x += deltaX;
                y += deltaY;
                width -= deltaX;
                height -= deltaY;
                if (maintainAspectRatio) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        height = width / aspectRatio;
                        y = area.y + area.height - height;
                    } else {
                        width = height * aspectRatio;
                        x = area.x + area.width - width;
                    }
                }
                break;
            case 'ne': // Northeast (top-right)
                y += deltaY;
                width += deltaX;
                height -= deltaY;
                if (maintainAspectRatio) {
                    height = width / aspectRatio;
                    y = area.y + area.height - height;
                }
                break;
            case 'sw': // Southwest (bottom-left)
                x += deltaX;
                width -= deltaX;
                height += deltaY;
                if (maintainAspectRatio) {
                    height = width / aspectRatio;
                }
                break;
            case 'n': // North (top)
                y += deltaY;
                height -= deltaY;
                break;
            case 's': // South (bottom)
                height += deltaY;
                break;
            case 'e': // East (right)
                width += deltaX;
                break;
            case 'w': // West (left)
                x += deltaX;
                width -= deltaX;
                break;
        }

        // Enforce minimum size
        width = Math.max(1, width);
        height = Math.max(1, height);

        return { x, y, width, height };
    }

    function renderResizeHandles(area: FunctionalArea) {
        if (selectedArea?.id !== area.id) return null;

        const handles = [
            { pos: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
            { pos: 'n', cursor: 'n-resize', x: area.width / 2, y: 0 },
            { pos: 'ne', cursor: 'ne-resize', x: area.width, y: 0 },
            { pos: 'e', cursor: 'e-resize', x: area.width, y: area.height / 2 },
            { pos: 'se', cursor: 'se-resize', x: area.width, y: area.height },
            { pos: 's', cursor: 's-resize', x: area.width / 2, y: area.height },
            { pos: 'sw', cursor: 'sw-resize', x: 0, y: area.height },
            { pos: 'w', cursor: 'w-resize', x: 0, y: area.height / 2 },
        ];

        return (
            <g className="resize-handles">
                {handles.map(h => (
                    <circle
                        key={h.pos}
                        cx={h.x * pixelsPerMeter}
                        cy={h.y * pixelsPerMeter}
                        r={5}
                        fill="white"
                        stroke="#2563eb"
                        strokeWidth={2}
                        style={{ cursor: h.cursor }}
                        onMouseDown={(e: any) => startResize(e, area, h.pos)}
                        className="cursor-pointer"
                    />
                ))}
            </g>
        );
    }

    if (!warehouse) {
        return <div className="p-8">Loading floor plan...</div>;
    }

    // Warehouse dimensions in meters
    const width = warehouse.floorPlanWidth || 50;
    const height = warehouse.floorPlanHeight || 30;
    const gridSize = warehouse.gridSize || 1;
    const gridEnabled = warehouse.gridEnabled !== false;

    // Calculate pixels per meter for rendering
    const viewportWidth = 1400;
    const viewportHeight = 700;
    const pixelsPerMeter = Math.min(
        viewportWidth / width,
        viewportHeight / height
    ) * 0.9;

    // Parse warehouse vertices
    let warehouseVertices: Array<{ x: number, y: number }>;
    if (warehouse.floorPlanVertices) {
        try {
            warehouseVertices = JSON.parse(warehouse.floorPlanVertices);
        } catch {
            warehouseVertices = [
                { x: 0, y: 0 },
                { x: width, y: 0 },
                { x: width, y: height },
                { x: 0, y: height }
            ];
        }
    } else {
        warehouseVertices = [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height }
        ];
    }

    // Grid rendering
    const renderGrid = () => {
        if (!gridEnabled) return null;

        const gridLines = [];
        const totalWidth = width * pixelsPerMeter;
        const totalHeight = height * pixelsPerMeter;

        // Vertical lines (every meter)
        for (let x = 0; x <= width; x += gridSize) {
            const px = x * pixelsPerMeter;
            const isMajor = x % 5 === 0;  // Every 5m is major
            gridLines.push(
                <line
                    key={`v-${x}`}
                    x1={px}
                    y1={0}
                    x2={px}
                    y2={totalHeight}
                    stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={isMajor ? 1.5 : 0.5}
                />
            );
        }

        // Horizontal lines (every meter)
        for (let y = 0; y <= height; y += gridSize) {
            const py = y * pixelsPerMeter;
            const isMajor = y % 5 === 0;
            gridLines.push(
                <line
                    key={`h-${y}`}
                    x1={0}
                    y1={py}
                    x2={totalWidth}
                    y2={py}
                    stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={isMajor ? 1.5 : 0.5}
                />
            );
        }

        return <g className="grid-lines">{gridLines}</g>;
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-background">
                <div className="flex items-center space-x-4">
                    <Link href="/inventory/warehouses">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold">{warehouse.name} - Floor Plan</h1>
                        <p className="text-sm text-muted-foreground">
                            {width}m × {height}m | Grid: {gridSize}m
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 mr-4">
                        <Switch checked={gridEnabled} onCheckedChange={toggleGrid} id="grid-toggle" />
                        <Label htmlFor="grid-toggle" className="text-sm">Grid</Label>
                    </div>
                    <div className="flex items-center space-x-2 mr-4">
                        <Switch checked={warehouse.snapToGrid !== false} onCheckedChange={toggleSnap} id="snap-toggle" />
                        <Label htmlFor="snap-toggle" className="text-sm">Snap</Label>
                    </div>
                    <Select onValueChange={(value) => applyLayout(value as 'I' | 'U' | 'L')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Apply Template" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="I">I-Shaped Layout</SelectItem>
                            <SelectItem value="U">U-Shaped Layout</SelectItem>
                            <SelectItem value="L">L-Shaped Layout</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Area Palette */}
                <div className="w-64 border-r bg-muted/10 p-4 overflow-y-auto">
                    <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">Available Areas</h3>
                    <div className="space-y-2">
                        {suggestedAreas.map((area, index) => (
                            <div
                                key={index}
                                draggable
                                onDragStart={(e) => handleDragStart(e, area, 'palette')}
                                className="p-3 bg-card border rounded shadow-sm cursor-move hover:border-primary transition-colors"
                                style={{ borderLeftColor: area.color, borderLeftWidth: '4px' }}
                            >
                                <span className="text-sm font-medium">{area.name}</span>
                                <p className="text-xs text-muted-foreground mt-1">{AREA_TYPE_LABELS[area.areaType]}</p>
                            </div>
                        ))}
                        {suggestedAreas.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No areas available for current warehouse configuration.</p>
                        )}
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-slate-50 overflow-auto p-8">
                    <div className="bg-white border shadow-sm">
                        <svg
                            ref={svgRef}
                            width={width * pixelsPerMeter}
                            height={height * pixelsPerMeter}
                            viewBox={`0 0 ${width * pixelsPerMeter} ${height * pixelsPerMeter}`}
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left'
                            }}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            {/* Grid */}
                            {renderGrid()}

                            {/* Warehouse Boundary */}
                            <polygon
                                points={warehouseVertices.map(v => `${v.x * pixelsPerMeter},${v.y * pixelsPerMeter}`).join(' ')}
                                fill="none"
                                stroke="#000000"
                                strokeWidth={3}
                            />

                            {/* Coordinate Labels */}
                            <text x={5} y={15} fontSize={12} fill="#64748b">0,0</text>
                            <text x={width * pixelsPerMeter - 40} y={15} fontSize={12} fill="#64748b">{width}m</text>
                            <text x={5} y={height * pixelsPerMeter - 5} fontSize={12} fill="#64748b">{height}m</text>

                            {/* Functional Areas */}
                            {areas.map(area => (
                                <g
                                    key={area.id}
                                    transform={`translate(${area.x * pixelsPerMeter}, ${area.y * pixelsPerMeter}) rotate(${area.rotation || 0}, ${area.width * pixelsPerMeter / 2}, ${area.height * pixelsPerMeter / 2})`}
                                    onClick={() => setSelectedArea(area)}
                                    className="cursor-move"
                                    draggable
                                    onDragStart={(e: any) => handleDragStart(e, area, 'canvas')}
                                >
                                    <rect
                                        width={area.width * pixelsPerMeter}
                                        height={area.height * pixelsPerMeter}
                                        fill={area.color || '#3b82f6'}
                                        stroke={selectedArea?.id === area.id ? '#2563eb' : 'none'}
                                        strokeWidth={selectedArea?.id === area.id ? 4 : 0}
                                        rx={4}
                                    />
                                    <text
                                        x={area.width * pixelsPerMeter / 2}
                                        y={area.height * pixelsPerMeter / 2}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="white"
                                        fontSize={14}
                                        fontWeight="bold"
                                    >
                                        {area.name}
                                    </text>
                                    <text
                                        x={area.width * pixelsPerMeter / 2}
                                        y={area.height * pixelsPerMeter / 2 + 16}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize={10}
                                        opacity={0.8}
                                    >
                                        {area.width.toFixed(1)}m × {area.height.toFixed(1)}m
                                    </text>

                                    {/* Control buttons */}
                                    {selectedArea?.id === area.id && (
                                        <g>
                                            <foreignObject
                                                x={area.width * pixelsPerMeter / 2 - 40}
                                                y={-35}
                                                width={80}
                                                height={30}
                                            >
                                                <div className="flex bg-white shadow-lg rounded p-1 space-x-1">
                                                    <button
                                                        className="p-1 hover:bg-slate-100 rounded"
                                                        onClick={(e) => { e.stopPropagation(); handleRotate(area.id); }}
                                                        title="Rotate"
                                                    >
                                                        <RotateCw className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        className="p-1 hover:bg-red-100 rounded text-red-600"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(area.id); }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </foreignObject>
                                        </g>
                                    )}

                                    {/* Resize handles */}
                                    {renderResizeHandles(area)}
                                </g>
                            ))}

                            {areas.length === 0 && (
                                <text
                                    x={width * pixelsPerMeter / 2}
                                    y={height * pixelsPerMeter / 2}
                                    textAnchor="middle"
                                    fill="#94a3b8"
                                    fontSize={16}
                                >
                                    Drag areas from the palette to get started
                                </text>
                            )}
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
