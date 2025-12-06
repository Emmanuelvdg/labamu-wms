export const API_URL = 'http://localhost:3001';

async function fetchWithRetry(url: string, options?: RequestInit) {
    try {
        const res = await fetch(url, { ...options, cache: 'no-store' });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        throw error;
    }
}

// --- Inventory ---

export async function fetchInventory() {
    return fetchWithRetry(`${API_URL}/inventory/products`);
}

export async function fetchWarehouses() {
    return fetchWithRetry(`${API_URL}/inventory/warehouses`);
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

export async function fetchValuation() {
    return fetchWithRetry(`${API_URL}/inventory/valuation`);
}

export async function fetchStockMoves() {
    return fetchWithRetry(`${API_URL}/inventory/moves`);
}

// --- Locations ---

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

export async function moveLocation(locationId: string, newParentId: string | null) {
    return fetchWithRetry(`${API_URL}/inventory/locations/${locationId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newParentId }),
    });
}

// --- Adjustments & Scrap ---

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

export const checkCycleCounts = async () => {
    return fetchWithRetry(`${API_URL}/inventory/cycle-counts`);
};

export const startCycleCount = async (locationIds: string[]) => {
    return fetchWithRetry(`${API_URL}/inventory/cycle-counts/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationIds }),
    });
};

// --- Orders & Shipping ---

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

export async function createShipment(data: any) {
    return fetchWithRetry(`${API_URL}/orders/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// --- Purchase Orders ---

export async function fetchPurchaseOrders() {
    return fetchWithRetry(`${API_URL}/purchase-orders`);
}

export async function createPurchaseOrder(data: any) {
    return fetchWithRetry(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function receivePurchaseOrder(id: string, destinationLocationId: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationLocationId }),
    });
}

// --- Rules & Strategies ---

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

export async function createStrategy(type: 'picking' | 'reservation', data: any) {
    return fetchWithRetry(`${API_URL}/strategy/${type}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateStrategy(type: 'picking' | 'reservation', id: string, data: any) {
    return fetchWithRetry(`${API_URL}/strategy/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteStrategy(type: 'picking' | 'reservation', id: string) {
    return fetchWithRetry(`${API_URL}/strategy/${type}/${id}`, {
        method: 'DELETE',
    });
}

export async function createPickingBatch(criteria: 'contact' | 'carrier' | 'location') {
    return fetchWithRetry(`${API_URL}/strategy/picking/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria }),
    });
}

export async function createPickingCluster(size: number) {
    return fetchWithRetry(`${API_URL}/strategy/picking/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size }),
    });
}

export async function createPickingWave(criteria: 'product' | 'category') {
    return fetchWithRetry(`${API_URL}/strategy/picking/wave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria }),
    });
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

// --- Reporting ---

export async function fetchAnalytics() {
    return fetchWithRetry(`${API_URL}/reporting/analytics`);
}

export async function generateReport(type: string, period: string) {
    return fetchWithRetry(`${API_URL}/reporting/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period }),
    });
}

// --- Supplier Management ---

export const fetchSuppliers = async () => {
    return fetchWithRetry(`${API_URL}/suppliers`);
};

export const getSupplier = async (id: string) => {
    return fetchWithRetry(`${API_URL}/suppliers/${id}`);
};

export const createSupplier = async (data: { name: string; contactInfo?: string }) => {
    return fetchWithRetry(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

export const updateSupplier = async (id: string, data: { name?: string; contactInfo?: string }) => {
    return fetchWithRetry(`${API_URL}/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

export const deleteSupplier = async (id: string) => {
    return fetchWithRetry(`${API_URL}/suppliers/${id}`, {
        method: 'DELETE',
    });
};

export const fetchSupplierOrders = async (id: string) => {
    return fetchWithRetry(`${API_URL}/suppliers/${id}/orders`);
};

export const fetchProductPriceHistory = async (productId: string) => {
    return fetchWithRetry(`${API_URL}/suppliers/reports/price-history?productId=${productId}`);
};
