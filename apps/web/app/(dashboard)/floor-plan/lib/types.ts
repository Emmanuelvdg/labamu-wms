// Unified Floor Plan Type Definitions

export interface Point {
    x: number;
    y: number;
}

export interface Dimensions {
    width: number;
    height: number;
}

export interface Position extends Point, Dimensions {
    rotation?: number;
}

// Layer visibility configuration
export interface LayerConfig {
    functionalAreas: boolean;
    zones: boolean;
    bins: boolean;
}

// Floor plan configuration
export interface FloorPlanConfig {
    id: string;
    warehouseId: string;
    shape: 'rectangle' | 'l_shape' | 'u_shape' | 'custom';
    vertices?: Point[];
    width: number;  // meters
    height: number; // meters
    gridEnabled: boolean;
    gridSize: number; // meters
    snapToGrid: boolean;
    layers: LayerConfig;
    defaultZoom: number;
}

// Functional Area (Layer 1)
export interface FunctionalArea extends Position {
    id: string;
    name: string;
    areaType: string;
    color?: string;
    sequence: number;
    locationId?: string;
}

// Storage Zone (Layer 2) - Rooms, Aisles
export interface StorageZone extends Position {
    id: string;
    name: string;
    type: string;
    structuralType: 'ROOM' | 'AISLE' | 'ROW';
    parentId?: string;
    color?: string;
    visible: boolean;
}

// Storage Bin (Layer 3) - Individual positions
export interface StorageBin extends Position {
    id: string;
    name: string;
    type: string;
    structuralType: 'BAY' | 'SHELF' | 'POSITION' | 'BIN';
    parentId?: string;
    color?: string;
    visible: boolean;
    // Real-time data (will be added in Phase 2)
    occupancy?: number;
    inventory?: any;
}

// Unified floor plan element (can be any layer)
export type FloorPlanElement = FunctionalArea | StorageZone | StorageBin;

// View state
export interface ViewState {
    zoom: number;
    panX: number;
    panY: number;
    selectedElementId: string | null;
    selectedLayer: 'functionalAreas' | 'zones' | 'bins' | 'all';
}

// Editing state
export interface EditingState {
    mode: 'select' | 'drag' | 'resize' | 'measure';
    isDragging: boolean;
    isResizing: boolean;
    resizeHandle?: string;
    dragStart?: Point;
    dragOffset?: Point;
}

// Tool state
export interface ToolState {
    showGrid: boolean;
    showRulers: boolean;
    showDistances: boolean;
    measurementPoints: Point[];
}

// Warehouse with floor plan
export interface Warehouse {
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
