// Floor Plan Helper Functions
// Copy these functions into your floor-plan/page.tsx file after the renderResizeHandles function

export interface FunctionalArea {
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

/**
 * Calculate center-to-center distance between two areas in meters
 */
export function calculateDistance(area1: FunctionalArea, area2: FunctionalArea): number {
    const x1 = area1.x + area1.width / 2;
    const y1 = area1.y + area1.height / 2;
    const x2 = area2.x + area2.width / 2;
    const y2 = area2.y + area2.height / 2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Check if two areas overlap
 */
export function checkAreaOverlap(area1: FunctionalArea, area2: FunctionalArea): boolean {
    return !(
        area1.x + area1.width < area2.x ||
        area2.x + area2.width < area1.x ||
        area1.y + area1.height < area2.y ||
        area2.y + area2.height < area1.y
    );
}

/**
 * Check if area is outside warehouse boundary
 */
export function checkOutsideBoundary(area: FunctionalArea, width: number, height: number): boolean {
    return (
        area.x < 0 ||
        area.y < 0 ||
        area.x + area.width > width ||
        area.y + area.height > height
    );
}

/**
 * Render distance measurements between areas
 * Add this function in your component, then call it in the SVG after warehouse boundary
 */
export function renderDistances(
    areas: FunctionalArea[],
    showDistances: boolean,
    pixelsPerMeter: number
) {
    if (!showDistances || areas.length < 2) return null;

    const distances = [];
    for (let i = 0; i < areas.length; i++) {
        for (let j = i + 1; j < areas.length; j++) {
            const area1 = areas[i];
            const area2 = areas[j];
            const distance = calculateDistance(area1, area2);

            // Only show if distance < 30m (adjacency threshold)
            if (distance < 30) {
                const x1 = (area1.x + area1.width / 2) * pixelsPerMeter;
                const y1 = (area1.y + area1.height / 2) * pixelsPerMeter;
                const x2 = (area2.x + area2.width / 2) * pixelsPerMeter;
                const y2 = (area2.y + area2.height / 2) * pixelsPerMeter;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                distances.push(
                    <g key={`${area1.id}-${area2.id}`}>
                        <line
                            x1={x1} y1={y1}
                            x2={x2} y2={y2}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="5,5"
                            opacity={0.7}
                        />
                        <rect
                            x={midX - 25}
                            y={midY - 10}
                            width={50}
                            height={20}
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            rx={4}
                        />
                        <text
                            x={midX}
                            y={midY + 5}
                            textAnchor="middle"
                            fontSize={11}
                            fill="#3b82f6"
                            fontWeight="bold"
                        >
                            {distance.toFixed(1)}m
                        </text>
                    </g>
                );
            }
        }
    }

    return <g className="distance-overlay">{distances}</g>;
}

/**
 * Get visual indicators for collision warnings
 * Returns stroke color and warning icon for an area
 */
export function getCollisionIndicators(
    area: FunctionalArea,
    allAreas: FunctionalArea[],
    width: number,
    height: number,
    selectedAreaId?: string | null
) {
    const overlaps = allAreas.filter(a =>
        a.id !== area.id && checkAreaOverlap(area, a)
    );

    const outsideBoundary = checkOutsideBoundary(area, width, height);
    const hasWarning = overlaps.length > 0 || outsideBoundary;

    return {
        stroke: hasWarning ? '#ef4444' : (selectedAreaId === area.id ? '#2563eb' : 'none'),
        strokeWidth: hasWarning ? 3 : (selectedAreaId === area.id ? 4 : 0),
        strokeDasharray: hasWarning ? '5,5' : 'none',
        hasWarning,
        warningMessage: outsideBoundary
            ? 'Outside warehouse boundary'
            : overlaps.length > 0
                ? `Overlaps with ${overlaps.length} area(s)`
                : ''
    };
}

/**
 * Render collision warning icon on area
 * Add this inside your area <g> element
 */
export function renderCollisionWarning(
    area: FunctionalArea,
    hasWarning: boolean,
    warningMessage: string,
    pixelsPerMeter: number
) {
    if (!hasWarning) return null;

    return (
        <g>
            {/* Warning icon */}
            <circle
                cx={(area.width) * pixelsPerMeter - 10}
                cy={10}
                r={8}
                fill="#ef4444"
            />
            <text
                x={(area.width) * pixelsPerMeter - 10}
                y={14}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight="bold"
            >
                !
            </text>
            {/* Tooltip would go here */}
            <title>{warningMessage}</title>
        </g>
    );
}

/**
 * INTEGRATION GUIDE:
 * 
 * 1. Add state:
 *    const [showDistances, setShowDistances] = useState(false);
 * 
 * 2. Add toggle button in header (after Snap toggle):
 *    <div className="flex items-center space-x-2 mr-4">
 *        <Switch checked={showDistances} onCheckedChange={setShowDistances} id="distance-toggle" />
 *        <Label htmlFor="distance-toggle" className="text-sm">Distances</Label>
 *    </div>
 * 
 * 3. In SVG rendering, add after grid and boundary:
 *    {renderDistances(areas, showDistances, pixelsPerMeter)}
 * 
 * 4. Update area rendering to show collision warnings:
 *    const collision = getCollisionIndicators(area, areas, width, height, selectedArea?.id);
 *    <rect
 *        ... existing props
 *        stroke={collision.stroke}
 *        strokeWidth={collision.strokeWidth}
 *        strokeDasharray={collision.strokeDasharray}
 *    />
 *    {renderCollisionWarning(area, collision.hasWarning, collision.warningMessage, pixelsPerMeter)}
 */
