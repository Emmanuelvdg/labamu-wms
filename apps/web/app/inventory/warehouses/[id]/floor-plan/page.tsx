'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_URL } from '@/lib/api';
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCw, Trash2, Layout } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FunctionalArea {
    id: string;
    name: string;
    areaType: string;
    x: number;
    y: number;
    width: number;
    height: number;
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

    const [areas, setAreas] = useState<FunctionalArea[]>([]);
    const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([]);
    const [selectedArea, setSelectedArea] = useState<FunctionalArea | null>(null);
    const [scale, setScale] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [warehouseId]);

    async function loadData() {
        try {
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
            toast.error('Failed to load warehouse areas');
        }
    }

    const handleDragStart = (e: React.DragEvent, area: FunctionalArea | SuggestedArea, from: 'palette' | 'canvas') => {
        e.dataTransfer.setData('areaData', JSON.stringify(area));
        e.dataTransfer.setData('from', from);
        if (from === 'canvas' && canvasRef.current) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
            e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const areaData = JSON.parse(e.dataTransfer.getData('areaData'));
        const from = e.dataTransfer.getData('from');
        const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
        const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');

        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();

        const x = (e.clientX - canvasRect.left - offsetX) / scale;
        const y = (e.clientY - canvasRect.top - offsetY) / scale;

        const snappedX = Math.round(x / 10) * 10;
        const snappedY = Math.round(y / 10) * 10;

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
                        width: 200,
                        height: 150,
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
                    <h1 className="text-xl font-semibold">Warehouse Floor Plan</h1>
                </div>
                <div className="flex items-center space-x-2">
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
                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
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
                <div className="flex-1 bg-slate-50 relative overflow-auto p-8">
                    <div
                        ref={canvasRef}
                        className="bg-white border shadow-sm relative transition-transform origin-top-left"
                        style={{
                            width: '2000px',
                            height: '1500px',
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

                        {/* Areas */}
                        {areas.map(area => (
                            <div
                                key={area.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, area, 'canvas')}
                                onClick={() => setSelectedArea(area)}
                                className={`absolute text-white rounded shadow-md cursor-move flex items-center justify-center group ${selectedArea?.id === area.id ? 'ring-4 ring-blue-500' : ''
                                    }`}
                                style={{
                                    left: area.x,
                                    top: area.y,
                                    width: area.width,
                                    height: area.height,
                                    transform: `rotate(${area.rotation || 0}deg)`,
                                    backgroundColor: area.color
                                }}
                                title={area.name}
                            >
                                <div className="text-center px-2">
                                    <span className="text-xs font-bold pointer-events-none select-none block">{area.name}</span>
                                    <span className="text-[10px] opacity-75 pointer-events-none select-none block">{AREA_TYPE_LABELS[area.areaType]}</span>
                                </div>

                                {/* Controls */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-white text-black shadow-lg rounded p-1 space-x-1">
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
                            </div>
                        ))}

                        {areas.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Layout className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No areas defined yet</p>
                                    <p className="text-sm mt-2">Drag areas from the palette to get started</p>
                                    <p className="text-sm">or apply a layout template</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
