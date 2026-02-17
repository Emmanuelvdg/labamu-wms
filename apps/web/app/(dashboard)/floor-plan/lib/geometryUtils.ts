// Geometry and validation utilities for floor plan
// Migrated from warehouses/[id]/floor-plan/helpers.tsx

export interface FloorPlanElement {
    id: string;
    name: string;
    x: number;  // in meters
    y: number;  // in meters
    width: number;  // in meters
    height: number;  // in meters
    rotation?: number;
}

/**
 * Calculate center-to-center distance between two elements in meters
 */
export function calculateDistance(
    elem1: FloorPlanElement,
    elem2: FloorPlanElement
): number {
    const x1 = elem1.x + elem1.width / 2;
    const y1 = elem1.y + elem1.height / 2;
    const x2 = elem2.x + elem2.width / 2;
    const y2 = elem2.y + elem2.height / 2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Calculate Manhattan distance (for warehouse pathfinding)
 */
export function manhattanDistance(
    elem1: FloorPlanElement,
    elem2: FloorPlanElement
): number {
    const x1 = elem1.x + elem1.width / 2;
    const y1 = elem1.y + elem1.height / 2;
    const x2 = elem2.x + elem2.width / 2;
    const y2 = elem2.y + elem2.height / 2;
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Check if two elements overlap
 */
export function checkOverlap(
    elem1: FloorPlanElement,
    elem2: FloorPlanElement
): boolean {
    return !(
        elem1.x + elem1.width < elem2.x ||
        elem2.x + elem2.width < elem1.x ||
        elem1.y + elem1.height < elem2.y ||
        elem2.y + elem2.height < elem1.y
    );
}

/**
 * Check if element is outside warehouse boundary
 */
export function checkOutsideBoundary(
    elem: FloorPlanElement,
    boundaryWidth: number,
    boundaryHeight: number
): boolean {
    return (
        elem.x < 0 ||
        elem.y < 0 ||
        elem.x + elem.width > boundaryWidth ||
        elem.y + elem.height > boundaryHeight
    );
}

/**
 * Get collision indicators for visual feedback
 */
export function getCollisionIndicators(
    elem: FloorPlanElement,
    allElements: FloorPlanElement[],
    boundaryWidth: number,
    boundaryHeight: number,
    selectedElemId?: string | null
) {
    const overlaps = allElements.filter(
        (e) => e.id !== elem.id && checkOverlap(elem, e)
    );

    const outsideBoundary = checkOutsideBoundary(elem, boundaryWidth, boundaryHeight);
    const hasWarning = overlaps.length > 0 || outsideBoundary;

    return {
        stroke: hasWarning ? '#ef4444' : selectedElemId === elem.id ? '#2563eb' : 'none',
        strokeWidth: hasWarning ? 3 : selectedElemId === elem.id ? 4 : 0,
        strokeDasharray: hasWarning ? '5,5' : 'none',
        hasWarning,
        warningMessage: outsideBoundary
            ? 'Outside warehouse boundary'
            : overlaps.length > 0
                ? `Overlaps with ${overlaps.length} element(s)`
                : '',
    };
}

/**
 * Calculate route distance for multiple points
 */
export function calculateRouteDistance(points: Array<{ x: number; y: number }>): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        total += dx + dy; // Manhattan distance
    }
    return total;
}

/**
 * Format meters for display
 */
export function formatMeters(meters: number, decimals: number = 1): string {
    return `${meters.toFixed(decimals)}m`;
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
    if (!enabled) return value;
    return Math.round(value / gridSize) * gridSize;
}
