const API_URL = 'http://localhost:3001';

async function fetchWithRetry(url: string, options?: RequestInit) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        throw error;
    }
}

export async function fetchInventory() {
    return fetchWithRetry(`${API_URL}/inventory/products`);
}

export async function fetchWarehouses() {
    return fetchWithRetry(`${API_URL}/inventory/warehouses`);
}

export async function fetchAnalytics() {
    return fetchWithRetry(`${API_URL}/reporting/analytics`);
}

export async function createOrder(order: any) {
    return fetchWithRetry(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
}

export async function fetchOrders() {
    return fetchWithRetry(`${API_URL}/orders`);
}

export async function generateReport(type: string, period: string) {
    return fetchWithRetry(`${API_URL}/reporting/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period }),
    });
}

export async function fetchStrategies(type: 'picking' | 'reservation') {
    return fetchWithRetry(`${API_URL}/strategy/${type}`);
}

export async function toggleStrategy(type: 'picking' | 'reservation', id: string, active: boolean) {
    return fetchWithRetry(`${API_URL}/strategy/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
    });
}

export async function fetchBatches(productId: string) {
    return fetchWithRetry(`${API_URL}/inventory/batch/${productId}`);
}

export async function fetchTransactions(productId: string) {
    return fetchWithRetry(`${API_URL}/inventory/transactions/${productId}`);
}

export async function addBatch(batch: any) {
    return fetchWithRetry(`${API_URL}/inventory/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
    });
}

export async function createProduct(product: any) {
    return fetchWithRetry(`${API_URL}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
    });
}

export async function createWarehouse(warehouse: any) {
    return fetchWithRetry(`${API_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouse),
    });
}

export async function createShipment(data: any) {
    return fetchWithRetry(`${API_URL}/orders/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function createLocation(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchLocations(warehouseId?: string) {
    const url = warehouseId
        ? `${API_URL}/inventory/locations?warehouseId=${warehouseId}`
        : `${API_URL}/inventory/locations`;
    return fetchWithRetry(url);
}

export async function fetchLocationsTree(warehouseId?: string) {
    const url = warehouseId
        ? `${API_URL}/inventory/locations/tree?warehouseId=${warehouseId}`
        : `${API_URL}/inventory/locations/tree`;
    return fetchWithRetry(url);
}



export async function createAdjustment(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateAdjustment(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/inventory/adjustments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function applyAdjustment(id: string) {
    return fetchWithRetry(`${API_URL}/inventory/adjustments/${id}/apply`, {
        method: 'POST',
    });
}

export async function fetchAdjustments() {
    return fetchWithRetry(`${API_URL}/inventory/adjustments`);
}

export async function fetchStockMoves() {
    return fetchWithRetry(`${API_URL}/inventory/moves`);
}

export async function createScrapOrder(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/scrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchScrapOrders() {
    return fetchWithRetry(`${API_URL}/inventory/scrap`);
}

export async function createTransfer(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchValuation() {
    return fetchWithRetry(`${API_URL}/inventory/valuation`);
}

export async function createReorderingRule(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/reordering-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchReorderingRules() {
    return fetchWithRetry(`${API_URL}/inventory/reordering-rules`);
}

export async function checkReorderingRules() {
    return fetchWithRetry(`${API_URL}/inventory/reordering-rules/check`);
}



export async function moveLocation(locationId: string, newParentId: string | null) {
    return fetchWithRetry(`${API_URL}/inventory/locations/${locationId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newParentId }),
    });
}

export async function createPutawayRule(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/putaway-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchPutawayRules() {
    return fetchWithRetry(`${API_URL}/inventory/putaway-rules`);
}

export async function createPackage(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchPackages() {
    return fetchWithRetry(`${API_URL}/inventory/packages`);
}

export async function assignBatchToPackage(packageId: string, batchId: string) {
    return fetchWithRetry(`${API_URL}/inventory/packages/${packageId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
    });
}

export async function fetchRoutes() {
    return fetchWithRetry(`${API_URL}/inventory/routes`);
}

export async function createRoute(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function createRule(routeId: string, data: any) {
    return fetchWithRetry(`${API_URL}/inventory/routes/${routeId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}


