// Canvas utility functions for coordinate conversions and calculations

import { Point } from './types';

/**
 * Convert meters to pixels based on scale
 */
export function metersToPixels(meters: number, pixelsPerMeter: number): number {
    return meters * pixelsPerMeter;
}

/**
 * Convert pixels to meters based on scale
 */
export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
    return pixels / pixelsPerMeter;
}

/**
 * Calculate pixels per meter to fit warehouse in viewport
 */
export function calculatePixelsPerMeter(
    warehouseWidth: number,
    warehouseHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    padding: number = 0.9
): number {
    return Math.min(
        viewportWidth / warehouseWidth,
        viewportHeight / warehouseHeight
    ) * padding;
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
    if (!enabled) return value;
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Manhattan distance (for warehouse pathfinding)
 */
export function manhattanDistance(p1: Point, p2: Point): number {
    return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
}

/**
 * Check if two rectangles overlap
 */
export function checkOverlap(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
): boolean {
    return !(
        rect1.x + rect1.width < rect2.x ||
        rect2.x + rect2.width < rect1.x ||
        rect1.y + rect1.height < rect2.y ||
        rect2.y + rect2.height < rect1.y
    );
}

/**
 * Check if rectangle is outside boundary
 */
export function checkOutsideBoundary(
    rect: { x: number; y: number; width: number; height: number },
    boundaryWidth: number,
    boundaryHeight: number
): boolean {
    return (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.x + rect.width > boundaryWidth ||
        rect.y + rect.height > boundaryHeight
    );
}

/**
 * Format meters for display
 */
export function formatMeters(meters: number, decimals: number = 1): string {
    return `${meters.toFixed(decimals)}m`;
}

/**
 * Calculate route distance for multiple points
 */
export function calculateRouteDistance(points: Point[]): number {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += manhattanDistance(points[i], points[i + 1]);
    }
    return total;
}

/**
 * Get color for heat map based on intensity (0-100)
 */
export function getHeatMapColor(intensity: number): string {
    // Blue (low) → Yellow (medium) → Red (high)
    if (intensity < 33) {
        const r = Math.round((intensity / 33) * 255);
        return `rgb(${r}, ${r + 100}, 255)`;
    } else if (intensity < 66) {
        const adjusted = (intensity - 33) / 33;
        const r = 255;
        const g = Math.round(200 + adjusted * 55);
        const b = Math.round(255 - adjusted * 255);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const adjusted = (intensity - 66) / 34;
        const g = Math.round(255 - adjusted * 100);
        return `rgb(255, ${g}, 0)`;
    }
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
