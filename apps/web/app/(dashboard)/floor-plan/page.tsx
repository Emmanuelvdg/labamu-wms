'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_URL } from '@/lib/api';
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCw, Trash2, Layers, Eye, EyeOff, Upload, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ImportLocationsModal } from './ImportLocationsModal';
import Link from 'next/link';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { snapToGrid } from './lib/geometryUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FloorPlanSidebar } from './FloorPlanSidebar';

// LAYER 1: Functional Areas
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

// LAYER 2: Storage Zones (Rooms, Aisles)
interface StorageZone {
    id: string;
    name: string;
    type: string;
    structuralType: 'ROOM' | 'AISLE' | 'ROW' | 'BAY' | 'BIN' | 'SHELF' | 'POSITION' | string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    color?: string;
    parentId?: string;
}

// LAYER 3: Storage Bins
interface StorageBin {
    id: string;
    name: string;
    code: string;
    locationPath: string;
    type?: string;
    structuralType?: 'BAY' | 'SHELF' | 'POSITION' | 'BIN';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color?: string;
    parentId?: string;

    // Capacity
    maxWeight: number;
    maxVolume: number;
    maxItems: number;

    // Current Usage
    currentWeight: number;
    currentVolume: number;
    currentItems: number;

    // Utilization Percentages
    weightUtilization: number;
    volumeUtilization: number;
    itemUtilization: number;
    overallUtilization: number;

    // Stock Items
    stockItems: Array<{
        productCode: string;
        productName: string;
        quantity: number;
        weight: number;
        volume: number;
    }>;
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
    viewLocationId?: string; // Added field
}

interface SuggestedArea {
    areaType: string;
    name: string;
    color: string;
    sequence: number;
}

// Layer visibility configuration
interface LayerConfig {
    functionalAreas: boolean;
    zones: boolean;
    bins: boolean;
}

// Generic Palette Item
interface GenericPaletteItem {
    type: 'ROOM' | 'ROW' | 'BAY' | 'BIN';
    name: string;
    color: string;
    width: number;
    height: number;
}

const GENERIC_ITEMS: GenericPaletteItem[] = [
    { type: 'ROOM', name: 'New Room', color: '#6366f1', width: 10, height: 8 },
    { type: 'ROW', name: 'New Row', color: '#3b82f6', width: 2, height: 10 },
    { type: 'BAY', name: 'New Bay', color: '#10b981', width: 2, height: 1 },
    { type: 'BIN', name: 'New Bin', color: '#9ca3af', width: 0.8, height: 0.5 },
];

const AREA_TYPE_LABELS: Record<string, string> = {
    RECEIVING: 'Receiving Dock',
    STAGING: 'Staging Area',
    PUTAWAY_LANE: 'Putaway Lane',
    STORAGE: 'Storage',
    PICKING: 'Picking Zone',
    PACKING: 'Packing Area',
    SHIPPING: 'Shipping Dock',
};

export default function UnifiedFloorPlanPage() {
    const searchParams = useSearchParams();
    const initialWarehouseId = searchParams.get('warehouseId');

    // Helper: read user ID from cookie (set by auth)
    const getUserId = () => Cookies.get('user_id') || '';

    // Data state
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId || '');
    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);

    // Layer data
    const [functionalAreas, setFunctionalAreas] = useState<FunctionalArea[]>([]);
    const [zones, setZones] = useState<StorageZone[]>([]);
    const [bins, setBins] = useState<StorageBin[]>([]);
    const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([]);

    // Layer visibility
    const [layerConfig, setLayerConfig] = useState<LayerConfig>({
        functionalAreas: true,
        zones: true,
        bins: false, // Load on-demand
    });

    // View state
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [resizing, setResizing] = useState<{
        elementId: string;
        elementType: 'area' | 'zone' | 'bin';
        handle: string;
        startX: number;
        startY: number;
        originalElement: any;
    } | null>(null);

    const [dragState, setDragState] = useState<{
        elementId: string;
        elementType: 'area' | 'zone' | 'bin';
        initialX: number;
        initialY: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);

    // New Element Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pendingCreate, setPendingCreate] = useState<{
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [newElementName, setNewElementName] = useState('');
    const [locationOptions, setLocationOptions] = useState<StorageZone[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [rootLocationId, setRootLocationId] = useState<string>('');

    // Heatmap state
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [heatmapMetric, setHeatmapMetric] = useState<'UTILISATION' | 'VELOCITY' | 'CONGESTION'>('UTILISATION');
    const [utilizationData, setUtilizationData] = useState<Record<string, any>>({});

    // Attribute filter state
    const [attributeDefinitions, setAttributeDefinitions] = useState<{ id: string; name: string; type: string }[]>([]);
    const [selectedAttributeFilter, setSelectedAttributeFilter] = useState<string>('none');

    // Import modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Load warehouses on mount
    useEffect(() => {
        loadWarehouses();
    }, []);

    // Helper to determine valid parent types
    const getParentTypes = (type: string) => {
        switch (type) {
            case 'ROOM': return ['WAREHOUSE'];
            case 'ROW': return ['ROOM', 'ZONE', 'AISLE', 'WAREHOUSE'];
            case 'BAY': return ['ROW', 'AISLE', 'ROOM', 'ZONE'];
            case 'BIN': return ['BAY', 'SHELF', 'POSITION', 'ROW'];
            default: return ['WAREHOUSE'];
        }
    };

    // Fetch location options when create modal opens
    useEffect(() => {
        if (isCreateModalOpen && pendingCreate && warehouse) {
            fetchLocationOptions(pendingCreate.type);
        } else {
            setLocationOptions([]);
            // Don't clear selectedLocationId here if it was pre-set by drop
        }
    }, [isCreateModalOpen, pendingCreate, warehouse]);

    const fetchLocationOptions = async (structuralType: string) => {
        try {
            const res = await fetch(`/api/inventory/locations?warehouseId=${warehouse?.id}`);
            if (!res.ok) throw new Error('Failed to fetch locations');
            const allLocations = await res.json();

            const parentTypes = getParentTypes(structuralType);
            const filtered = allLocations.filter((loc: any) => parentTypes.includes(loc.structuralType));

            setLocationOptions(filtered);
        } catch (err) {
            console.error('Failed to fetch location options:', err);
            setLocationOptions([]);
        }
    };

    // Load warehouse data when selection changes
    useEffect(() => {
        if (selectedWarehouseId) {
            loadWarehouseData(selectedWarehouseId);
        }
    }, [selectedWarehouseId]);

    async function loadWarehouses() {
        try {
            const res = await fetch('/api/warehouses');
            const data = await res.json();
            setWarehouses(data);
            if (data.length > 0 && !selectedWarehouseId) {
                setSelectedWarehouseId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load warehouses:', err);
            toast.error('Failed to load warehouses');
        }
    }

    async function loadWarehouseData(warehouseId: string) {
        try {
            // Load warehouse config
            const warehouseRes = await fetch(`/api/warehouses/${warehouseId}`);
            const warehouseData = await warehouseRes.json();
            setWarehouse(warehouseData);

            // LAYER 1: Load functional areas
            const areasRes = await fetch(`/api/warehouses/${warehouseId}/areas`);
            const areasData = await areasRes.json();
            setFunctionalAreas(Array.isArray(areasData) ? areasData : []);

            // Load suggested areas
            const suggestedRes = await fetch(`/api/warehouses/${warehouseId}/areas/suggested`);
            const suggestedData = await suggestedRes.json();
            setSuggestedAreas(Array.isArray(suggestedData) ? suggestedData : []);

            // LAYER 2: Load zones (rooms, aisles, rows)
            const zonesRes = await fetch(`/api/warehouses/${warehouseId}/zones`);
            const zonesData = await zonesRes.json();
            setZones(Array.isArray(zonesData) ? zonesData : []);

            // LAYER 3: Bins loaded on-demand when layer enabled
            if (layerConfig.bins) {
                loadBins(warehouseId);
            }

            // Load root location for creation parenting
            try {
                const rootRes = await fetch(`/api/inventory/locations?warehouseId=${warehouseId}&structuralType=WAREHOUSE`);
                if (rootRes.ok) {
                    const rootData = await rootRes.json();
                    if (Array.isArray(rootData) && rootData.length > 0) {
                        setRootLocationId(rootData[0].id);
                    }
                }
            } catch (e) {
                console.error('Failed to load root location:', e);
            }
        } catch (err) {
            console.error('Failed to load warehouse data:', err);
            toast.error('Failed to load warehouse data');
        }
    }

    async function loadBins(warehouseId: string) {
        try {
            const res = await fetch(`/api/warehouses/${warehouseId}/bins/utilization`);
            if (res.ok) {
                const data = await res.json();
                setBins(Array.isArray(data) ? data : []);
                console.log(`Loaded ${data.length} bins with utilization data`);
            } else {
                console.error('Failed to load bins:', res.status);
                setBins([]);
            }
        } catch (err) {
            console.error('Failed to load bins:', err);
            setBins([]);
        }
    }

    // Toggle layer visibility
    const toggleLayer = (layer: keyof LayerConfig) => {
        setLayerConfig(prev => ({
            ...prev,
            [layer]: !prev[layer]
        }));

        // Load bins if enabling that layer
        if (layer === 'bins' && !layerConfig.bins && selectedWarehouseId) {
            loadBins(selectedWarehouseId);
        }
    }

    // Load attribute definitions on mount
    useEffect(() => {
        fetch(`${API_URL}/inventory/attributes/definitions`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setAttributeDefinitions(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, []);

    // Reload heatmap when toggled, metric changes, or bins load
    useEffect(() => {
        if (showHeatmap && bins.length > 0 && selectedWarehouseId) {
            const ids = bins.map(b => b.id);
            fetch(`${API_URL}/inventory/locations/utilisation-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationIds: ids, metric: heatmapMetric })
            })
                .then(r => r.ok ? r.json() : {})
                .then(data => setUtilizationData(data))
                .catch(err => console.error('Failed to load heatmap data', err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showHeatmap, heatmapMetric]);

    const applyLayout = async (layoutType: 'I' | 'U' | 'L') => {
        if (!selectedWarehouseId) return;
        if (!confirm(`Apply ${layoutType}-shaped layout? This will replace all existing functional areas.`)) return;
        try {
            await Promise.all(functionalAreas.map(area =>
                fetch(`/api/warehouses/${selectedWarehouseId}/areas/${area.id}`, { method: 'DELETE' })
            ));
            const res = await fetch(`/api/warehouses/${selectedWarehouseId}/areas/layout/${layoutType}`);
            const template = await res.json();
            const created = await Promise.all((template.areas || []).map((area: any) =>
                fetch(`/api/warehouses/${selectedWarehouseId}/areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(area)
                }).then(r => r.json())
            ));
            setFunctionalAreas(created);
            toast.success(`${layoutType}-shaped layout applied!`);
        } catch (err) {
            console.error('Failed to apply layout:', err);
            toast.error('Failed to apply layout');
        }
    };

    const handleExport = async () => {
        if (!selectedWarehouseId) return;
        try {
            const res = await fetch(`${API_URL}/inventory/locations/export?warehouseId=${selectedWarehouseId}`);
            if (res.ok) {
                const csv = await res.text();
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `locations-export-${selectedWarehouseId}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                toast.error('Export failed');
            }
        } catch (e) {
            console.error(e);
            toast.error('Export error');
        }
    };

    const getBinColor = (bin: StorageBin) => {
        if (showHeatmap) {
            const util = utilizationData[bin.id];
            if (!util) return '#94a3b8';
            switch (heatmapMetric) {
                case 'UTILISATION':
                    switch (util.status) {
                        case 'EMPTY': return '#10b981';
                        case 'PARTIAL': return '#f59e0b';
                        case 'FULL': return '#ef4444';
                        case 'OVERSIZED': return '#7f1d1d';
                        default: return '#94a3b8';
                    }
                case 'VELOCITY': {
                    const v = util.velocityScore || 0;
                    if (v < 20) return '#3b82f6';
                    if (v < 50) return '#22c55e';
                    if (v < 80) return '#f59e0b';
                    return '#ef4444';
                }
                case 'CONGESTION': {
                    const c = util.congestionScore || 0;
                    if (c === 0) return '#10b981';
                    if (c < 50) return '#f59e0b';
                    return '#ef4444';
                }
                default: return '#94a3b8';
            }
        }
        if (selectedAttributeFilter !== 'none') {
            const attrValue = (bin as any).attributes?.[selectedAttributeFilter];
            if (attrValue) return (attrValue === 'true' || attrValue === true) ? '#ec4899' : '#8b5cf6';
            return '#e2e8f0';
        }
        return getUtilizationColor(bin.overallUtilization);
    };


    // Global event listeners for drag
    useEffect(() => {
        if (!dragState) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!svgRef.current || !warehouse) return;

            const svgRect = svgRef.current.getBoundingClientRect();
            const pixelsPerMeter = calculatePixelsPerMeter();

            let newX = (e.clientX - svgRect.left) / pixelsPerMeter / zoom - dragState.offsetX;
            let newY = (e.clientY - svgRect.top) / pixelsPerMeter / zoom - dragState.offsetY;

            // Snap to grid
            if (warehouse.snapToGrid !== false) {
                const gridSize = warehouse.gridSize || 1;
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }

            // Limit to positive coordinates (optional)
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);

            // Update local state based on element type
            if (dragState.elementType === 'area') {
                setFunctionalAreas(prev => prev.map(el =>
                    el.id === dragState.elementId ? { ...el, x: newX, y: newY } : el
                ));
            } else if (dragState.elementType === 'zone') {
                setZones(prev => prev.map(el =>
                    el.id === dragState.elementId ? { ...el, x: newX, y: newY } : el
                ));
            } else if (dragState.elementType === 'bin') {
                setBins(prev => prev.map(el =>
                    el.id === dragState.elementId ? { ...el, x: newX, y: newY } : el
                ));
            }
        };

        const handleGlobalMouseUp = async () => {
            const { elementId, elementType } = dragState;
            let finalElement: any;

            if (elementType === 'area') finalElement = functionalAreas.find(el => el.id === elementId);
            else if (elementType === 'zone') finalElement = zones.find(el => el.id === elementId);
            else if (elementType === 'bin') finalElement = bins.find(el => el.id === elementId);

            if (finalElement) {
                try {
                    if (elementType === 'zone' || elementType === 'bin') {
                        await fetch(`/api/locations/${elementId}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-user-id': getUserId(),
                            },
                            body: JSON.stringify({ x: finalElement.x, y: finalElement.y })
                        });
                        console.log('Location updated:', elementId);
                        toast.success('Position updated');
                    } else if (elementType === 'area') {
                        // For areas, maybe different API? Or skip for now updates
                        // We will add it later if needed. For now just visual move.
                        // Actually, let's try updating it if it's a location?
                        // FunctionalArea might be WarehouseFunctionalArea.
                    }
                } catch (err) {
                    console.error('Failed to save position', err);
                    toast.error('Failed to save position');
                }
            }
            setDragState(null);
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [dragState, warehouse, zoom, functionalAreas, zones, bins]);

    const handleElementMouseDown = (e: React.MouseEvent, element: any, type: 'area' | 'zone' | 'bin') => {
        e.stopPropagation();
        if (e.button !== 0) return; // Left click only

        setSelectedElementId(element.id);

        if (!svgRef.current) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const pixelsPerMeter = calculatePixelsPerMeter();

        const clickX = (e.clientX - svgRect.left) / pixelsPerMeter / zoom;
        const clickY = (e.clientY - svgRect.top) / pixelsPerMeter / zoom;

        setDragState({
            elementId: element.id,
            elementType: type,
            initialX: element.x,
            initialY: element.y,
            offsetX: clickX - element.x,
            offsetY: clickY - element.y
        });
    };

    const handleDragStart = (e: React.DragEvent, element: any, from: 'palette' | 'canvas', layer: 'areas' | 'zones' | 'bins') => {
        e.dataTransfer.setData('elementData', JSON.stringify(element));
        e.dataTransfer.setData('from', from);
        e.dataTransfer.setData('layer', layer);

        if (from === 'canvas' && svgRef.current) {
            const rect = (e.target as SVGElement).getBoundingClientRect();
            const svgRect = svgRef.current.getBoundingClientRect();
            const pixelsPerMeter = calculatePixelsPerMeter();
            e.dataTransfer.setData('offsetX', ((e.clientX - rect.left) / pixelsPerMeter).toString());
            e.dataTransfer.setData('offsetY', ((e.clientY - rect.top) / pixelsPerMeter).toString());
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const elementData = JSON.parse(e.dataTransfer.getData('elementData'));
        const from = e.dataTransfer.getData('from');
        const layer = e.dataTransfer.getData('layer');
        const offsetX = parseFloat(e.dataTransfer.getData('offsetX') || '0');
        const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');

        if (!svgRef.current || !warehouse) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const pixelsPerMeter = calculatePixelsPerMeter();

        // Convert pixel coordinates to meters
        const xMeters = (e.clientX - svgRect.left) / pixelsPerMeter / zoom - offsetX;
        const yMeters = (e.clientY - svgRect.top) / pixelsPerMeter / zoom - offsetY;

        // Snap to grid
        const gridSize = warehouse.gridSize || 1;
        const snapEnabled = warehouse.snapToGrid !== false;
        const snappedX = snapToGrid(xMeters, gridSize, snapEnabled);
        const snappedY = snapToGrid(yMeters, gridSize, snapEnabled);

        try {
            if (from === 'palette' && layer === 'areas') {
                // Create new functional area
                const res = await fetch(`/api/warehouses/${selectedWarehouseId}/areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: elementData.name,
                        areaType: elementData.areaType,
                        x: snappedX,
                        y: snappedY,
                        width: 5,
                        height: 5,
                        rotation: 0,
                        color: elementData.color,
                        sequence: elementData.sequence,
                    })
                });
                const newArea = await res.json();
                setFunctionalAreas([...functionalAreas, newArea]);
                toast.success('Area added to floor plan');
            } else if (from === 'palette' && layer === 'generic') {
                // Determine potential parent based on drop location
                let detectedParentId = '';
                if (elementData.type === 'ROOM') {
                    detectedParentId = rootLocationId;
                } else {
                    // Find zones that contain this point
                    const candidates = zones.filter(z =>
                        snappedX >= (z.x || 0) && snappedX <= (z.x || 0) + (z.width || 0) &&
                        snappedY >= (z.y || 0) && snappedY <= (z.y || 0) + (z.height || 0)
                    ).sort((a, b) => ((a.width || 0) * (a.height || 0)) - ((b.width || 0) * (b.height || 0)));

                    if (candidates.length > 0) detectedParentId = candidates[0].id;
                }

                // Open modal to name and confirm creation
                setPendingCreate({
                    type: elementData.type,
                    x: snappedX,
                    y: snappedY,
                    width: elementData.width,
                    height: elementData.height
                });

                // Pre-fill name based on type
                const count = zones.filter(z => z.structuralType === elementData.type).length + 1;
                setNewElementName(`${elementData.name} ${count}`);

                setSelectedLocationId(detectedParentId);
                setIsCreateModalOpen(true);
            } else if (from === 'canvas') {
                // Update existing element position
                if (layer === 'areas') {
                    const res = await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${elementData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ x: snappedX, y: snappedY })
                    });
                    const updated = await res.json();
                    setFunctionalAreas(functionalAreas.map(a => a.id === updated.id ? updated : a));
                }
                // TODO: Handle zones and bins updates
            }
        } catch (err) {
            console.error('Failed to save element:', err);
            toast.error('Failed to save element');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleCreateConfirm = async () => {
        if (!pendingCreate || !warehouse) return;

        // Ensure parent is selected for non-WAREHOUSE/ROOM types if root not found
        // But for MVP, if no parent selected, it might try to create as root (which fails backend validation for child types)

        try {
            const res = await fetch('/api/inventory/locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': getUserId(),
                },
                body: JSON.stringify({
                    name: newElementName,
                    structuralType: pendingCreate.type,
                    parentId: selectedLocationId || undefined, // Send undefined if empty
                    warehouseId: selectedWarehouseId,
                    x: pendingCreate.x,
                    y: pendingCreate.y,
                    width: pendingCreate.width,
                    height: pendingCreate.height
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.details || err.message || 'Failed to create location');
            }

            const newLocation = await res.json();

            // Refresh the relevant layer data
            if (pendingCreate.type === 'ROOM' || pendingCreate.type === 'ROW' || pendingCreate.type === 'AISLE' || pendingCreate.type === 'BAY') {
                // Add to zones
                setZones([...zones, { ...newLocation, structuralType: pendingCreate.type }]);
            } else if (pendingCreate.type === 'BIN' || pendingCreate.type === 'SHELF' || pendingCreate.type === 'POSITION') {
                // Auto-enable the Bins layer
                setLayerConfig(prev => ({ ...prev, bins: true }));
                loadBins(selectedWarehouseId);
            }

            toast.success(`${pendingCreate.type} created successfully`);
            setIsCreateModalOpen(false);
            setPendingCreate(null);
            setSelectedLocationId('');
            setNewElementName('');
        } catch (err: any) {
            console.error('Failed to create element:', err);
            toast.error(err.message || 'Failed to create element');
        }
    };

    const handleRotate = async (elementId: string, layer: 'areas' | 'zones' | 'bins') => {
        if (layer === 'areas') {
            const area = functionalAreas.find(a => a.id === elementId);
            if (!area) return;

            const newRotation = ((area.rotation || 0) + 90) % 360;
            try {
                const res = await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${elementId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rotation: newRotation })
                });
                const updated = await res.json();
                setFunctionalAreas(functionalAreas.map(a => a.id === updated.id ? updated : a));
            } catch (err) {
                console.error('Failed to rotate:', err);
                toast.error('Failed to rotate element');
            }
        }
        // TODO: Handle zones and bins rotation
    };

    const handleDelete = async (elementId: string, layer: 'areas' | 'zones' | 'bins') => {
        if (!confirm('Are you sure you want to delete this element?')) return;

        try {
            let res: Response;
            if (layer === 'areas') {
                res = await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${elementId}`, {
                    method: 'DELETE'
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.details || err.error || 'Failed to delete area');
                }
                setFunctionalAreas(functionalAreas.filter(a => a.id !== elementId));
            } else if (layer === 'zones' || layer === 'bins') {
                res = await fetch(`/api/locations/${elementId}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': getUserId() },
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    const msg = err.message || err.error || 'Failed to delete location';
                    throw new Error(msg);
                }
                if (layer === 'zones') {
                    setZones(zones.filter(z => z.id !== elementId));
                } else {
                    setBins(bins.filter(b => b.id !== elementId));
                }
            }
            setSelectedElementId(null);
            toast.success('Element deleted');
        } catch (err: any) {
            console.error('Failed to delete:', err);
            toast.error(err.message || 'Failed to delete element');
        }
    };

    const startResize = (e: React.MouseEvent, element: any, handle: string, type: 'area' | 'zone' | 'bin') => {
        e.stopPropagation();
        setResizing({
            elementId: element.id,
            elementType: type,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            originalElement: { ...element }
        });
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizing || !warehouse) return;

        const pixelsPerMeter = calculatePixelsPerMeter();
        const deltaX = (e.clientX - resizing.startX) / pixelsPerMeter / zoom;
        const deltaY = (e.clientY - resizing.startY) / pixelsPerMeter / zoom;

        let newDims = calculateNewDimensions(resizing.originalElement, resizing.handle, deltaX, deltaY, e.shiftKey);

        // Snap to grid
        const gridSize = warehouse.gridSize || 1;
        if (warehouse.snapToGrid) {
            newDims.x = snapToGrid(newDims.x, gridSize, true);
            newDims.y = snapToGrid(newDims.y, gridSize, true);
            newDims.width = Math.max(1, snapToGrid(newDims.width, gridSize, true));
            newDims.height = Math.max(1, snapToGrid(newDims.height, gridSize, true));
        }

        // Update optimistically
        if (resizing.elementType === 'area') {
            setFunctionalAreas(functionalAreas.map(a =>
                a.id === resizing.elementId ? { ...a, ...newDims } : a
            ));
        } else if (resizing.elementType === 'zone') {
            setZones(zones.map(z =>
                z.id === resizing.elementId ? { ...z, ...newDims } : z
            ));
        } else if (resizing.elementType === 'bin') {
            setBins(bins.map(b =>
                b.id === resizing.elementId ? { ...b, ...newDims } : b
            ));
        }
    };

    const handleResizeEnd = async () => {
        if (!resizing) return;

        try {
            if (resizing.elementType === 'area') {
                const area = functionalAreas.find(a => a.id === resizing.elementId);
                if (area) {
                    await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${area.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            x: area.x,
                            y: area.y,
                            width: area.width,
                            height: area.height
                        })
                    });
                }
            } else if (resizing.elementType === 'zone' || resizing.elementType === 'bin') {
                const collection = resizing.elementType === 'zone' ? zones : bins;
                const item = collection.find(i => i.id === resizing.elementId);
                if (item) {
                    await fetch(`/api/locations/${item.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            x: item.x,
                            y: item.y,
                            width: item.width,
                            height: item.height
                        })
                    });
                }
            }
        } catch (err) {
            console.error('Failed to save resize:', err);
            toast.error('Failed to save resize');
        }

        setResizing(null);
    };

    const handleUpdateElement = async (id: string, updates: any) => {
        if (!warehouse) return;

        // Determine type based on ID presence in arrays
        const isArea = functionalAreas.find(a => a.id === id);
        const isZone = zones.find(z => z.id === id);
        const isBin = bins.find(b => b.id === id);

        try {
            if (isArea) {
                // Update local state immediately for responsiveness
                setFunctionalAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));

                // Save to backend
                await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
            } else if (isZone || isBin) {
                if (isZone) setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
                if (isBin) setBins(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

                await fetch(`/api/locations/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
                    body: JSON.stringify(updates)
                });
            }
        } catch (err) {
            console.error('Failed to update element:', err);
            toast.error('Failed to update element');
        }
    };

    const handleDeleteElement = async (id: string) => {
        if (!warehouse) return;

        const isArea = functionalAreas.find(a => a.id === id);
        const isZone = zones.find(z => z.id === id);
        const isBin = bins.find(b => b.id === id);

        try {
            if (isArea) {
                await fetch(`/api/warehouses/${selectedWarehouseId}/areas/${id}`, {
                    method: 'DELETE'
                });
                setFunctionalAreas(prev => prev.filter(a => a.id !== id));
            } else if (isZone || isBin) {
                await fetch(`/api/locations/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': getUserId() }
                });
                if (isZone) setZones(prev => prev.filter(z => z.id !== id));
                if (isBin) setBins(prev => prev.filter(b => b.id !== id));
            }
            setSelectedElementId(null);
            toast.success('Element deleted');
        } catch (err) {
            console.error('Failed to delete element:', err);
            toast.error('Failed to delete element');
        }
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
    }, [resizing, functionalAreas]);

    function calculateNewDimensions(
        element: any,
        handle: string,
        deltaX: number,
        deltaY: number,
        maintainAspectRatio: boolean
    ) {
        let { x, y, width, height } = element;
        const aspectRatio = width / height;

        switch (handle) {
            case 'se':
                width += deltaX;
                height += deltaY;
                if (maintainAspectRatio) height = width / aspectRatio;
                break;
            case 'nw':
                x += deltaX;
                y += deltaY;
                width -= deltaX;
                height -= deltaY;
                if (maintainAspectRatio) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        height = width / aspectRatio;
                        y = element.y + element.height - height;
                    } else {
                        width = height * aspectRatio;
                        x = element.x + element.width - width;
                    }
                }
                break;
            case 'ne':
                y += deltaY;
                width += deltaX;
                height -= deltaY;
                if (maintainAspectRatio) {
                    height = width / aspectRatio;
                    y = element.y + element.height - height;
                }
                break;
            case 'sw':
                x += deltaX;
                width -= deltaX;
                height += deltaY;
                if (maintainAspectRatio) height = width / aspectRatio;
                break;
            case 'n':
                y += deltaY;
                height -= deltaY;
                break;
            case 's':
                height += deltaY;
                break;
            case 'e':
                width += deltaX;
                break;
            case 'w':
                x += deltaX;
                width -= deltaX;
                break;
        }

        width = Math.max(1, width);
        height = Math.max(1, height);

        return { x, y, width, height };
    }

    function renderSelectionControls(element: any, type: 'area' | 'zone' | 'bin') {
        if (selectedElementId !== element.id) return null;

        const pixelsPerMeter = calculatePixelsPerMeter();
        const handles = [
            { pos: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
            { pos: 'n', cursor: 'n-resize', x: element.width / 2, y: 0 },
            { pos: 'ne', cursor: 'ne-resize', x: element.width, y: 0 },
            { pos: 'e', cursor: 'e-resize', x: element.width, y: element.height / 2 },
            { pos: 'se', cursor: 'se-resize', x: element.width, y: element.height },
            { pos: 's', cursor: 's-resize', x: element.width / 2, y: element.height },
            { pos: 'sw', cursor: 'sw-resize', x: 0, y: element.height },
            { pos: 'w', cursor: 'w-resize', x: 0, y: element.height / 2 },
        ];

        return (
            <g className="selection-controls">
                {/* Selection Outline */}
                <rect
                    x={0}
                    y={0}
                    width={element.width * pixelsPerMeter}
                    height={element.height * pixelsPerMeter}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                />

                {/* Resize Handles */}
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
                        onMouseDown={(e: any) => startResize(e, element, h.pos, type)}
                        className="cursor-pointer"
                    />
                ))}

                {/* Toolbar (Rotate/Delete) */}
                <foreignObject
                    x={element.width * pixelsPerMeter / 2 - 30}
                    y={-40}
                    width={60}
                    height={30}
                    style={{ overflow: 'visible' }}
                >
                    <div className="flex gap-1 justify-center bg-white shadow-sm border rounded p-1">
                        <button
                            className="p-1 hover:bg-slate-100 rounded"
                            onClick={(e) => { e.stopPropagation(); handleRotate(element.id, type as any); }}
                            title="Rotate"
                        >
                            <RotateCw className="h-3 w-3" />
                        </button>
                        <button
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDelete(element.id, type as any); }}
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                </foreignObject>
            </g>
        );
    }

    function calculatePixelsPerMeter(): number {
        if (!warehouse) return 20;
        const width = warehouse.floorPlanWidth || 50;
        const height = warehouse.floorPlanHeight || 30;
        const viewportWidth = 1400;
        const viewportHeight = 700;
        return Math.min(viewportWidth / width, viewportHeight / height) * 0.9;
    }

    // Get color based on utilization percentage
    const getUtilizationColor = (utilization: number) => {
        if (utilization <= 25) return '#10b981'; // Green - Low
        if (utilization <= 50) return '#f59e0b'; // Yellow - Medium
        if (utilization <= 75) return '#f97316'; // Orange - High
        return '#ef4444'; // Red - Critical
    };

    const toggleGrid = async () => {
        if (!warehouse) return;
        const newGridEnabled = !warehouse.gridEnabled;

        // Use warehouse.id with fallback to selectedWarehouseId
        const warehouseId = warehouse.id || selectedWarehouseId;
        if (!warehouseId) {
            console.error('No warehouse ID available');
            return;
        }

        try {
            const res = await fetch(`/api/warehouses/${warehouseId}/floor-plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gridEnabled: newGridEnabled })
            });

            if (!res.ok) {
                throw new Error('Failed to update grid settings');
            }

            const updated = await res.json();
            setWarehouse(prev => prev ? { ...prev, gridEnabled: updated.gridEnabled } : null);
        } catch (err) {
            console.error('Failed to toggle grid:', err);
            toast.error('Failed to update grid settings');
        }
    };

    const toggleSnap = async () => {
        if (!warehouse) return;
        const newSnapToGrid = !warehouse.snapToGrid;

        // Use warehouse.id with fallback to selectedWarehouseId
        const warehouseId = warehouse.id || selectedWarehouseId;
        if (!warehouseId) {
            console.error('No warehouse ID available');
            return;
        }

        try {
            const res = await fetch(`/api/warehouses/${warehouseId}/floor-plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapToGrid: newSnapToGrid })
            });

            if (!res.ok) {
                throw new Error('Failed to update snap settings');
            }

            const updated = await res.json();
            setWarehouse(prev => prev ? { ...prev, snapToGrid: updated.snapToGrid } : null);
        } catch (err) {
            console.error('Failed to toggle snap:', err);
            toast.error('Failed to update snap settings');
        }
    };

    const renderGrid = () => {
        if (!warehouse || !warehouse.gridEnabled) return null;

        const width = warehouse.floorPlanWidth || 50;
        const height = warehouse.floorPlanHeight || 30;
        const gridSize = warehouse.gridSize || 1;
        const pixelsPerMeter = calculatePixelsPerMeter();

        const gridLines = [];
        const totalWidth = width * pixelsPerMeter;
        const totalHeight = height * pixelsPerMeter;

        for (let x = 0; x <= width; x += gridSize) {
            const px = x * pixelsPerMeter;
            const isMajor = x % 5 === 0;
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

    if (!warehouse) {
        return <div className="p-8">Loading floor plan...</div>;
    }

    const width = warehouse.floorPlanWidth || 50;
    const height = warehouse.floorPlanHeight || 30;
    const gridSize = warehouse.gridSize || 1;
    const pixelsPerMeter = calculatePixelsPerMeter();

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

    const selectedElement =
        functionalAreas.find(a => a.id === selectedElementId) ||
        zones.find(z => z.id === selectedElementId) ||
        bins.find(b => b.id === selectedElementId);

    const selectedElementType =
        functionalAreas.find(a => a.id === selectedElementId) ? 'area' :
            zones.find(z => z.id === selectedElementId) ? 'zone' : 'bin';

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
                        <h1 className="text-xl font-semibold">Unified Floor Plan</h1>
                        <p className="text-sm text-muted-foreground">
                            {warehouse.name} • {width}m × {height}m • Grid: {gridSize}m
                        </p>
                    </div>

                    {/* Warehouse Selector */}
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
                </div>

                <div className="flex items-center space-x-2">
                    {/* Layer Toggles */}
                    <div className="flex items-center space-x-2 mr-4 px-3 py-1 bg-muted rounded-lg">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <button
                            onClick={() => toggleLayer('functionalAreas')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${layerConfig.functionalAreas ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted-foreground/10'
                                }`}
                        >
                            {layerConfig.functionalAreas ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            <span>Areas</span>
                        </button>
                        <button
                            onClick={() => toggleLayer('zones')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${layerConfig.zones ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted-foreground/10'
                                }`}
                        >
                            {layerConfig.zones ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            <span>Zones</span>
                        </button>
                        <button
                            onClick={() => toggleLayer('bins')}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${layerConfig.bins ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted-foreground/10'
                                }`}
                        >
                            {layerConfig.bins ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            <span>Bins</span>
                        </button>
                    </div>

                    <div className="h-6 w-px bg-border mx-2" />

                    <div className="flex items-center space-x-2 mr-4">
                        <Switch checked={warehouse.gridEnabled !== false} onCheckedChange={toggleGrid} id="grid-toggle" />
                        <Label htmlFor="grid-toggle" className="text-sm">Grid</Label>
                    </div>
                    <div className="flex items-center space-x-2 mr-4">
                        <Switch checked={warehouse.snapToGrid !== false} onCheckedChange={toggleSnap} id="snap-toggle" />
                        <Label htmlFor="snap-toggle" className="text-sm">Snap</Label>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Layout Templates */}
                    <Select onValueChange={(value) => applyLayout(value as 'I' | 'U' | 'L')}>
                        <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Apply Template" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="I">I-Shaped Layout</SelectItem>
                            <SelectItem value="U">U-Shaped Layout</SelectItem>
                            <SelectItem value="L">L-Shaped Layout</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-border" />

                    {/* Heatmap */}
                    <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
                        <Button
                            variant={showHeatmap ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={showHeatmap ? 'bg-purple-600 hover:bg-purple-700 text-white h-7 px-2 text-xs' : 'h-7 px-2 text-xs'}
                        >
                            {showHeatmap ? 'Heatmap On' : 'Heatmap'}
                        </Button>
                        {showHeatmap && (
                            <Select value={heatmapMetric} onValueChange={(v: any) => setHeatmapMetric(v)}>
                                <SelectTrigger className="w-[110px] h-7 border-none bg-transparent focus:ring-0 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTILISATION">Utilisation</SelectItem>
                                    <SelectItem value="VELOCITY">Velocity</SelectItem>
                                    <SelectItem value="CONGESTION">Congestion</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Attribute Filter */}
                    <Select value={selectedAttributeFilter} onValueChange={setSelectedAttributeFilter}>
                        <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Filter Attr." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Filter</SelectItem>
                            {attributeDefinitions.map(attr => (
                                <SelectItem key={attr.id} value={attr.name}>{attr.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-border" />

                    {/* Import / Export */}
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setIsImportModalOpen(true)} disabled={!selectedWarehouseId}>
                        <Upload className="h-3 w-3 mr-1" /> Import
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={handleExport} disabled={!selectedWarehouseId}>
                        <Download className="h-3 w-3 mr-1" /> Export
                    </Button>

                    <div className="h-6 w-px bg-border" />

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
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar - Elements Palette */}
                <div className="w-64 border-r bg-muted/10 p-4 overflow-y-auto">
                    <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                        Available Elements
                    </h3>

                    {/* Functional Areas */}
                    {layerConfig.functionalAreas && (
                        <div className="mb-6">
                            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Functional Areas</h4>
                            <div className="space-y-2">
                                {suggestedAreas.map((area, index) => (
                                    <div
                                        key={index}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, area, 'palette', 'areas')}
                                        className="p-3 bg-card border rounded shadow-sm cursor-move hover:border-primary transition-colors"
                                        style={{ borderLeftColor: area.color, borderLeftWidth: '4px' }}
                                    >
                                        <span className="text-sm font-medium">{area.name}</span>
                                        <p className="text-xs text-muted-foreground mt-1">{AREA_TYPE_LABELS[area.areaType]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Zones and Bins Palette */}
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Zones & Bins</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {GENERIC_ITEMS.map((item, index) => (
                                <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('elementData', JSON.stringify(item));
                                        e.dataTransfer.setData('from', 'palette');
                                        e.dataTransfer.setData('layer', 'generic');
                                    }}
                                    className="p-3 bg-card border rounded shadow-sm cursor-move hover:border-primary transition-colors flex flex-col items-center text-center"
                                    style={{ borderTopColor: item.color, borderTopWidth: '4px' }}
                                >
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">{item.width}m x {item.height}m</span>
                                </div>
                            ))}
                        </div>
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
                            onClick={() => setSelectedElementId(null)}
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
                            <text x={width * pixelsPerMeter - 40} y={15} fontSize={12} fill="#64748b">{`${width}m`}</text>
                            <text x={5} y={height * pixelsPerMeter - 5} fontSize={12} fill="#64748b">{`${height}m`}</text>

                            {/* LAYER 1: Functional Areas */}
                            {layerConfig.functionalAreas && functionalAreas.map(area => (
                                <g
                                    key={area.id}
                                    transform={`translate(${area.x * pixelsPerMeter}, ${area.y * pixelsPerMeter}) rotate(${area.rotation || 0}, ${area.width * pixelsPerMeter / 2}, ${area.height * pixelsPerMeter / 2})`}
                                    onClick={() => setSelectedElementId(area.id)}
                                    className="cursor-move"
                                    onMouseDown={(e: any) => handleElementMouseDown(e, area, 'area')}
                                >
                                    <rect
                                        width={area.width * pixelsPerMeter}
                                        height={area.height * pixelsPerMeter}
                                        fill={area.color || '#3b82f6'}
                                        stroke={selectedElementId === area.id ? '#2563eb' : 'none'}
                                        strokeWidth={selectedElementId === area.id ? 4 : 0}
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

                                    {/* Selection Controls */}
                                    {renderSelectionControls(area, 'area')}
                                </g>
                            ))}

                            {/* LAYER 2: Zones */}
                            {layerConfig.zones && zones.filter(z => z.structuralType !== 'BIN' && z.structuralType !== 'SHELF' && z.structuralType !== 'POSITION').map(zone => (
                                <g
                                    key={zone.id}
                                    transform={`translate(${(zone.x || 0) * pixelsPerMeter}, ${(zone.y || 0) * pixelsPerMeter}) rotate(${zone.rotation || 0})`}
                                    onClick={(e) => { e.stopPropagation(); setSelectedElementId(zone.id); }}
                                    className="cursor-move"
                                    onMouseDown={(e: any) => handleElementMouseDown(e, zone, 'zone')}
                                >
                                    <rect
                                        width={(zone.width || 1) * pixelsPerMeter}
                                        height={(zone.height || 1) * pixelsPerMeter}
                                        fill={zone.color || '#e2e8f0'}
                                        fillOpacity={0.5}
                                        stroke="#94a3b8"
                                        strokeWidth={1}
                                    />
                                    <text
                                        x={((zone.width || 1) * pixelsPerMeter) / 2}
                                        y={((zone.height || 1) * pixelsPerMeter) / 2}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={12}
                                        fill="#475569"
                                        pointerEvents="none"
                                    >
                                        {zone.name}
                                    </text>
                                    {renderSelectionControls(zone, 'zone')}
                                </g>
                            ))}

                            {/* LAYER 3: Bins */}
                            {layerConfig.bins && bins.map(bin => (
                                <g key={bin.id}>
                                    <rect
                                        x={bin.x * pixelsPerMeter}
                                        y={bin.y * pixelsPerMeter}
                                        width={bin.width * pixelsPerMeter}
                                        height={bin.height * pixelsPerMeter}
                                        fill={getBinColor(bin)}
                                        fillOpacity={0.7}
                                        stroke="#374151"
                                        strokeWidth={1}
                                        onMouseDown={(e) => handleElementMouseDown(e, bin, 'bin')}
                                        style={{ cursor: dragState?.elementId === bin.id ? 'grabbing' : 'grab' }}
                                        data-bin-id={bin.id}
                                    />
                                    <text
                                        x={(bin.x + bin.width / 2) * pixelsPerMeter}
                                        y={(bin.y + bin.height / 2) * pixelsPerMeter}
                                        textAnchor="middle"
                                        fill="#fff"
                                        fontSize={10}
                                        fontWeight="bold"
                                        pointerEvents="none"
                                    >
                                        {Math.round(bin.overallUtilization)}%
                                    </text>
                                    {renderSelectionControls(bin, 'bin')}
                                </g>
                            ))}

                            {functionalAreas.length === 0 && (
                                <text
                                    x={width * pixelsPerMeter / 2}
                                    y={height * pixelsPerMeter / 2}
                                    textAnchor="middle"
                                    fill="#94a3b8"
                                    fontSize={16}
                                >
                                    Drag elements from the palette to get started
                                </text>
                            )}
                        </svg>
                    </div>
                </div>
                {selectedElement && (
                    <FloorPlanSidebar
                        element={selectedElement}
                        elementType={selectedElementType as 'area' | 'zone' | 'bin'}
                        onUpdate={handleUpdateElement}
                        onDelete={handleDeleteElement}
                        onClose={() => setSelectedElementId(null)}
                    />
                )}
            </div >

            {/* Heatmap Legend */}
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

            <ImportLocationsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => loadWarehouseData(selectedWarehouseId)}
                warehouseId={selectedWarehouseId}
            />

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New {pendingCreate?.type}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="elementName">Name</Label>
                            <Input
                                id="elementName"
                                value={newElementName}
                                onChange={(e) => setNewElementName(e.target.value)}
                                placeholder="e.g. Room 1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="locationSelect">Parent Location</Label>
                            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        pendingCreate?.type === 'ROOM' ? 'Root Warehouse (Default)' : 'Select Parent Location...'
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {locationOptions.length === 0 && pendingCreate?.type === 'ROOM' ? (
                                        <SelectItem value={rootLocationId || 'root'}>Root Warehouse</SelectItem>
                                    ) : (
                                        locationOptions.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name} <span className="text-xs text-muted-foreground">({loc.structuralType})</span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {pendingCreate?.type !== 'ROOM' && !selectedLocationId && (
                                <p className="text-xs text-red-500">Parent location is required</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateConfirm} disabled={!newElementName || (!selectedLocationId && pendingCreate?.type !== 'ROOM')}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
