# Floor Plan Feature - Technical Architecture

## Overview

The enhanced warehouse floor plan feature provides an interactive, meter-based layout designer for warehouse functional areas with precision editing capabilities.

## System Components

### Database Schema

**Warehouse Model Extensions** (`packages/database/prisma/schema.prisma`):
```prisma
model Warehouse {
  // ... existing fields
  
  // Floor Plan Configuration
  floorPlanShape     String? @default("rectangle")  // "rectangle", "u_shape", "l_shape", "custom"
  floorPlanVertices  String? // JSON array of {x, y} points in meters
  floorPlanWidth     Float?  @default(50.0)  // meters
  floorPlanHeight    Float?  @default(30.0)  // meters
  
  // Grid Settings
  gridEnabled        Boolean @default(true)
  gridSize           Float   @default(1.0)   // meters
  snapToGrid         Boolean @default(true)
}
```

**Migration**: `20251229040821_add_floor_plan_fields`

### Backend API

**Endpoints** (`apps/api/src/warehouse/warehouse-area.controller.ts`):

```typescript
// Update warehouse floor plan configuration
PATCH /warehouses/:id/floor-plan
Body: {
  shape?: 'rectangle' | 'u_shape' | 'l_shape' | 'custom';
  vertices?: Array<{x: number, y: number}>;
  width?: number;  // meters
  height?: number; // meters
  gridEnabled?: boolean;
  gridSize?: number;  // meters
  snapToGrid?: boolean;
}
```

**Service** (`apps/api/src/warehouse/warehouse-area.service.ts`):
```typescript
async updateFloorPlan(warehouseId: string, data: UpdateFloorPlanDto) {
  return this.prisma.warehouse.update({
    where: { id: warehouseId },
    data: {
      floorPlanShape: data.shape,
      floorPlanVertices: data.vertices ? JSON.stringify(data.vertices) : undefined,
      floorPlanWidth: data.width,
      floorPlanHeight: data.height,
      gridEnabled: data.gridEnabled,
      gridSize: data.gridSize,
      snapToGrid: data.snapToGrid
    }
  });
}
```

### Frontend Components

**Main Floor Plan Page** (`apps/web/app/inventory/warehouses/[id]/floor-plan/page.tsx`):

#### State Management
```typescript
const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
const [areas, setAreas] = useState<FunctionalArea[]>([]);
const [selectedArea, setSelectedArea] = useState<FunctionalArea | null>(null);
const [zoom, setZoom] = useState(1);
const [resizing, setResizing] = useState<ResizeState | null>(null);
const [showDistances, setShowDistances] = useState(false);
```

#### Coordinate System
```typescript
// Warehouse dimensions in meters
const width = warehouse.floorPlanWidth || 50;
const height = warehouse.floorPlanHeight || 30;

// Calculate pixels per meter for rendering
const pixelsPerMeter = Math.min(
    viewportWidth / width,
    viewportHeight / height
) * 0.9;

// Convert between pixels and meters
const metersToPixels = (meters: number) => meters * pixelsPerMeter;
const pixelsToMeters = (pixels: number) => pixels / pixelsPerMeter;
```

#### Grid Rendering
```typescript
function renderGrid() {
  const gridLines = [];
  const gridSize = warehouse.gridSize || 1;
  
  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    const isMajor = x % 5 === 0;
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x * pixelsPerMeter} y1={0}
        x2={x * pixelsPerMeter} y2={height * pixelsPerMeter}
        stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );
  }
  // ... horizontal lines
  return <g>{gridLines}</g>;
}
```

#### Resize Handles
```typescript
// 8 resize handles: 4 corners + 4 edges
const handles = [
  { pos: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
  { pos: 'n',  cursor: 'n-resize',  x: area.width / 2, y: 0 },
  { pos: 'ne', cursor: 'ne-resize', x: area.width, y: 0 },
  { pos: 'e',  cursor: 'e-resize',  x: area.width, y: area.height / 2 },
  { pos: 'se', cursor: 'se-resize', x: area.width, y: area.height },
  { pos: 's',  cursor: 's-resize',  x: area.width / 2, y: area.height },
  { pos: 'sw', cursor: 'sw-resize', x: 0, y: area.height },
  { pos: 'w',  cursor: 'w-resize',  x: 0, y: area.height / 2 },
];

// Render handles
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
    onMouseDown={(e) => startResize(e, area, h.pos)}
  />
))}
```

#### Resize Logic
```typescript
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
    case 'se': // Southeast corner
      width += deltaX;
      height += deltaY;
      if (maintainAspectRatio) {
        height = width / aspectRatio;
      }
      break;
    case 'nw': // Northwest corner
      x += deltaX;
      y += deltaY;
      width -= deltaX;
      height -= deltaY;
      if (maintainAspectRatio) {
        // Maintain aspect ratio logic
      }
      break;
    // ... other handles
  }
  
  // Enforce minimum size (1m × 1m)
  width = Math.max(1, width);
  height = Math.max(1, height);
  
  return { x, y, width, height };
}
```

#### Snap-to-Grid
```typescript
function snapToGrid(value: number): number {
  const gridSize = warehouse.gridSize || 1;
  if (!warehouse.snapToGrid) return value;
  return Math.round(value / gridSize) * gridSize;
}

// Apply during drag/resize
const snappedX = snapToGrid(xMeters);
const snappedY = snapToGrid(yMeters);
```

### Helper Functions

**Distance & Collision Helpers** (`apps/web/app/inventory/warehouses/[id]/floor-plan/helpers.tsx`):

```typescript
// Calculate center-to-center distance
export function calculateDistance(area1, area2): number {
  const x1 = area1.x + area1.width / 2;
  const y1 = area1.y + area1.height / 2;
  const x2 = area2.x + area2.width / 2;
  const y2 = area2.y + area2.height / 2;
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Check if two areas overlap
export function checkAreaOverlap(area1, area2): boolean {
  return !(
    area1.x + area1.width < area2.x ||
    area2.x + area2.width < area1.x ||
    area1.y + area1.height < area2.y ||
    area2.y + area2.height < area1.y
  );
}

// Check if area is outside boundary
export function checkOutsideBoundary(area, width, height): boolean {
  return (
    area.x < 0 ||
    area.y < 0 ||
    area.x + area.width > width ||
    area.y + area.height > height
  );
}
```

## Data Flow

### Loading Floor Plan
```
1. User navigates to /inventory/warehouses/:id/floor-plan
2. Frontend calls GET /api/warehouses/:id
3. Next.js proxy forwards to GET /warehouses/:id (NestJS)
4. Backend returns warehouse with floor plan data
5. Frontend calls GET /warehouses/:id/areas
6. Backend returns functional areas
7. Floor plan renders with:
   - Warehouse boundary (vertices)
   - Grid (gridSize, gridEnabled)
   - Functional areas at (x, y) with (width, height)
```

### Resizing an Area
```
1. User clicks area → setSelectedArea(area)
2. Resize handles rendered
3. User drags handle → startResize()
4. Mouse move → handleResizeMove()
   - Calculate new dimensions
   - Apply snap-to-grid if enabled
   - Update state optimistically
5. Mouse up → handleResizeEnd()
   - Call PUT /warehouses/:id/areas/:areaId
   - Save { x, y, width, height } in meters
   - Update database
```

### Toggle Grid/Snap
```
1. User clicks Grid toggle
2. Call PATCH /warehouses/:id/floor-plan { gridEnabled: !current }
3. Backend updates warehouse.gridEnabled
4. Frontend re-renders grid
```

## Performance Considerations

### SVG Rendering
- Uses SVG for precise geometric rendering
- Scales well from small (10m × 10m) to large (200m × 100m) warehouses
- Transform-based zoom doesn't require re-rendering

### Optimistic Updates
- State updates immediately on drag/resize
- Database saves occur on mouse release
- Prevents lag during interactions

### Debouncing
- Grid calculations cached
- Resize calculations throttled during mousemove
- Reduces unnecessary computations

## Security

### Authorization
- Warehouse access checked via user's warehouse assignments
- Only assigned users can view/edit floor plans
- Permission: `WAREHOUSE:UPDATE` required for edits

### Validation
- Backend validates:
  - Warehouse ID exists
  - Area dimensions >= 1m
  - Coordinates within reasonable bounds
  - User has access to warehouse

## Future Enhancements

### Phase 2 (Planned)
- **Distance Measurements**: Visual overlays with travel times
- **Collision Detection**: Red warnings for overlapping areas
- **Vertex Editing**: Drag warehouse boundary corners
- **Shape Editor**: Draw custom warehouse shapes

### Phase 3 (Planned)
- **Undo/Redo**: History management with Ctrl+Z/Y
- **Export**: PNG/PDF generation
- **Print**: Print-friendly layouts
- **Templates**: Pre-built warehouse layouts
- **Multi-Level**: Support for mezzanines and multiple floors

## Integration Points

### Putaway Optimization
- Future: Use floor plan distances for optimal putaway location selection
- Calculate travel distance from receiving to storage areas
- Factor into putaway rule matching

### Picking Optimization
- Future: Optimize picking routes based on floor plan layout
- Minimize travel distance
Route optimization for batch picking

### Reporting
- Future: Generate heat maps of high-traffic areas
- Identify bottlenecks
- Visualize product distribution

## Testing

### Unit Tests
- Coordinate conversion (meters ↔ pixels)
- Snap-to-grid calculations
- Collision detection algorithms
- Distance calculations

### Integration Tests
- API endpoint responses
- Database persistence
- Validation rules

### E2E Tests
- Drag and drop areas
- Resize with handles
- Toggle grid/snap
- Save and reload

---

**Last Updated**: December 29, 2024  
**Version**: 2.0 (Enhanced Interactive Floor Plan)
