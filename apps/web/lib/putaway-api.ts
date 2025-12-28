// Putaway API functions - Add to api.ts after picking functions
import { fetchWithRetry } from './api';

// Use /api routes for putaway operations (goes through Next.js proxy)
const PUTAWAY_API_BASE = '/api';


// --- Putaway Session Management ---

export async function createPutawaySession(data: { warehouseId: string; workerId?: string }) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function getActivePutawaySession(warehouseId: string) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/sessions/${warehouseId}/active`);
}

export async function updatePutawayTask(taskId: string, data: {
    putawayQuantity?: number;
    status?: string;
    exceptionType?: string;
    exceptionReason?: string;
    actualQuantity?: number;
    alternativeLocationId?: string;
    requiresSupervisorReview?: boolean;
}) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function completePutawaySession(sessionId: string) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/sessions/${sessionId}/complete`, {
        method: 'PATCH',
    });
}

export async function getAlternativeLocations(taskId: string, warehouseId: string) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/tasks/${taskId}/alternatives?warehouseId=${warehouseId}`);
}

export async function handleDamagedInventory(taskId: string, data: { damagedQty: number; goodQty: number; quarantineLocationId?: string }) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/tasks/${taskId}/exception/damaged`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function handleQuantityMismatch(taskId: string, data: { expectedQty: number; actualQty: number; reason: string }) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/tasks/${taskId}/exception/mismatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function getBlockedPutawayTasks(warehouseId: string) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/tasks/blocked?warehouseId=${warehouseId}`);
}

export async function checkLocationCapacity(locationId: string, productId: string, quantity: number) {
    return fetchWithRetry(`${PUTAWAY_API_BASE}/inventory/putaway/locations/${locationId}/capacity?productId=${productId}&quantity=${quantity}`);
}
