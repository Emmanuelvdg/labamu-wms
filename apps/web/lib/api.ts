import Cookies from 'js-cookie';

// Use the Next.js rewrite proxy so all requests go through the same origin
// (avoids cross-origin / CORS issues between localhost and 127.0.0.1)
export const API_URL = '/api';

// Server-side backend URL — set API_URL in .env (never exposed to the browser)
export const INTERNAL_API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function fetchWithRetry(url: string, options?: RequestInit) {
    try {
        const userId = Cookies.get('user_id');

        // Build auth headers: prefer JWT (via server cookie read) but keep
        // the legacy x-user-id for E2E/dev backward compat.
        // Note: the httpOnly `token` cookie is sent automatically by the browser
        // to same-origin Next.js API routes, which then proxy it to the backend.
        // For direct /api (Next.js rewrites to backend) requests, the browser
        // sends the httpOnly cookie automatically — no manual header needed.
        const headers = {
            ...options?.headers,
            ...(userId ? { 'x-user-id': userId } : {}),
        };

        const res = await fetch(url, { ...options, headers, cache: 'no-store' });
        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = res.statusText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || res.statusText;
            } catch (e) {
                errorMessage = errorText || res.statusText;
            }
            throw new Error(errorMessage);
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        // Not logging to console.error here because many expected UI validations (4xx) are thrown here
        throw error;
    }
}

// --- Inventory ---

export async function fetchInventory(filters?: {
    search?: string;
    category?: string;
    classification?: string;
    warehouseId?: string;
}) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.classification) params.append('classification', filters.classification);
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);

    return fetchWithRetry(`${API_URL}/inventory/products?${params.toString()}`);
}

export async function fetchLocationInventory(locationId: string) {
    const params = new URLSearchParams();
    params.append('locationId', locationId);
    return fetchWithRetry(`${API_URL}/inventory?${params.toString()}`);
}

export async function getProduct(id: string) {
    return fetchWithRetry(`${API_URL}/inventory/products/${id}`);
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

export async function updateProduct(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/inventory/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function createWarehouse(warehouse: any) {
    return fetchWithRetry(`${API_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouse),
    });
}

export async function deleteWarehouse(id: string) {
    return fetchWithRetry(`${API_URL}/inventory/warehouses/${id}`, {
        method: 'DELETE',
    });
}

export async function updateWarehouse(id: string, data: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    incomingSteps?: string;
    outgoingSteps?: string;
    autoReplenishmentEnabled?: boolean;
    requireWeightVerification?: boolean;
}) {
    return fetchWithRetry(`${API_URL}/inventory/warehouses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchBatches(productId: string) {
    return fetchWithRetry(`${API_URL}/inventory/batch/${productId}`);
}

export async function fetchAllBatches(warehouseId?: string) {
    const url = warehouseId
        ? `${API_URL}/inventory/batches?warehouseId=${warehouseId}`
        : `${API_URL}/inventory/batches`;
    return fetchWithRetry(url);
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

export async function getLocationDetails(id: string) {
    const res = await fetch(`${API_URL}/inventory/locations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch location details');
    return res.json();
}

export async function createLocation(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateLocation(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/inventory/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteLocation(id: string) {
    return fetchWithRetry(`${API_URL}/inventory/locations/${id}`, {
        method: 'DELETE',
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

// --- Packaging ---

export async function createPackaging(data: any) {
    return fetchWithRetry(`${API_URL}/inventory/packaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchPackaging(productId: string) {
    return fetchWithRetry(`${API_URL}/inventory/packaging/${productId}`);
}

// --- Customers ---

export async function fetchCustomers() {
    return fetchWithRetry(`${API_URL}/customers`);
}

export async function getCustomer(id: string) {
    return fetchWithRetry(`${API_URL}/customers/${id}`);
}

export async function createCustomer(data: any) {
    return fetchWithRetry(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateCustomer(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteCustomer(id: string) {
    return fetchWithRetry(`${API_URL}/customers/${id}`, {
        method: 'DELETE',
    });
}

// --- Orders & Shipping ---

export async function createOrder(order: any) {
    return fetchWithRetry(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
}

export async function cancelOrder(id: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}/cancel`, {
        method: 'POST',
    });
}

export async function deleteOrder(id: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}`, {
        method: 'DELETE',
    });
}

export async function updateOrderStatus(id: string, status: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
}

export async function reassignOrderWarehouse(id: string, warehouseId: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId, status: 'RESERVED' }),
    });
}

export async function fetchOrders() {
    return fetchWithRetry(`${API_URL}/orders`);
}

export async function fetchOrder(id: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}`);
}

export async function createShipment(data: any) {
    return fetchWithRetry(`${API_URL}/orders/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function checkAvailability(id: string) {
    return fetchWithRetry(`${API_URL}/orders/${id}/check-availability`, {
        method: 'POST',
    });
}

// --- Purchase Orders ---

export async function fetchPurchaseOrders() {
    return fetchWithRetry(`${API_URL}/purchase-orders`);
}

export async function getPurchaseOrder(id: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}`);
}

export async function createPurchaseOrder(data: any) {
    return fetchWithRetry(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function receivePurchaseOrder(
    id: string,
    destinationLocationId: string,
    itemsToReceive: { poItemId: string; quantity: number }[]
) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            locationId: destinationLocationId,
            items: itemsToReceive
        }),
    });
}

export async function fetchPurchaseOrderReceipts(id: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}/receipts`);
}

// --- PO Documents ---

export async function uploadPODocument(poId: string, file: File, documentType: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return fetchWithRetry(`${API_URL}/purchase-orders/${poId}/documents`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type — browser will set it with boundary for FormData
    });
}

export async function fetchPODocuments(poId: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${poId}/documents`);
}

// --- PO QA Inspections ---

export async function submitPOInspection(poId: string, data: {
    inspectorId?: string;
    notes?: string;
    results: { productId: string; receivedQty: number; acceptedQty: number; rejectedQty: number; rejectionReason?: string }[];
}) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${poId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchPOInspections(poId: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${poId}/inspections`);
}

// --- PO 3-Way Match ---

export async function verifyPOThreeWayMatch(poId: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${poId}/match`, {
        method: 'POST',
    });
}

// --- Rules & Strategies ---

export async function fetchStrategies(type: 'picking' | 'reservation', warehouseId?: string) {
    const url = type === 'picking' && warehouseId
        ? `${API_URL}/strategy/${type}?warehouseId=${warehouseId}`
        : `${API_URL}/strategy/${type}`;
    return fetchWithRetry(url);
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

export async function createPickingBatch(criteria: string, warehouseId?: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria, warehouseId }),
    });
}

export async function createPickingCluster(size: number, warehouseId?: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size, warehouseId }),
    });
}

// --- Wave Release Rules ---

export async function fetchWaveRules(warehouseId: string) {
    return fetchWithRetry(`${API_URL}/strategy/wave-rules?warehouseId=${warehouseId}`);
}

export async function createWaveRule(data: {
    warehouseId: string;
    name: string;
    triggerType?: string;
    cronExpression?: string;
    minOrders?: number;
    maxOrders?: number;
    enabled?: boolean;
}) {
    return fetchWithRetry(`${API_URL}/strategy/wave-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateWaveRule(id: string, data: Partial<{ name: string; triggerType: string; cronExpression: string; minOrders: number; maxOrders: number; enabled: boolean }>) {
    return fetchWithRetry(`${API_URL}/strategy/wave-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteWaveRule(id: string) {
    return fetchWithRetry(`${API_URL}/strategy/wave-rules/${id}`, { method: 'DELETE' });
}

export async function triggerWaveRule(id: string) {
    return fetchWithRetry(`${API_URL}/strategy/wave-rules/${id}/trigger`, { method: 'POST' });
}

export async function createPickingWave(criteria: string, warehouseId?: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/wave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria, warehouseId }),
    });
}

// --- Picking Session Management ---

export async function createPickingSession(data: { warehouseId: string; strategy?: string; criteria?: string; maxOrders?: number }) {
    return fetchWithRetry(`${API_URL}/strategy/picking/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function getActivePickingSession(warehouseId: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/sessions/active?warehouseId=${warehouseId}`);
}

export async function pollWavelessTasks(sessionId: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/sessions/${sessionId}/waveless-poll`);
}

export async function downloadPicklistPdf(sessionId: string): Promise<Blob> {
    const res = await fetch(`${API_URL}/strategy/picking/sessions/${sessionId}/picklist`);
    if (!res.ok) throw new Error(`Failed to fetch picklist PDF: ${res.status}`);
    return res.blob();
}

export async function updatePickingTask(taskId: string, data: { pickedQuantity: number; status: string; exceptionReason?: string }) {
    return fetchWithRetry(`${API_URL}/strategy/picking/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function completePickingSession(sessionId: string) {
    return fetchWithRetry(`${API_URL}/strategy/picking/sessions/${sessionId}/complete`, {
        method: 'POST',
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

// --- Putaway Session Management ---

export async function createPutawaySession(warehouseId: string, workerId?: string) {
    return fetchWithRetry(`${API_URL}/inventory/putaway/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId, workerId }),
    });
}

export async function getActivePutawaySession(warehouseId: string) {
    return fetchWithRetry(`${API_URL}/inventory/putaway/sessions/${warehouseId}/active`);
}

export async function updatePutawayTask(taskId: string, data: any) {
    return fetchWithRetry(`${API_URL}/inventory/putaway/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// Phase 4: Fetch attribute definitions for dynamic forms
export async function fetchAttributeDefinitions() {
    return fetchWithRetry(`${API_URL}/inventory/attributes/definitions`);
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

export async function fetchAnalytics(params?: { period?: string; startDate?: string; endDate?: string }) {
    const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
    return fetchWithRetry(`${API_URL}/reporting/analytics${qs}`);
}

export async function generateReport(type: string, period: string) {
    return fetchWithRetry(`${API_URL}/reporting/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period }),
    });
}

export async function fetchUtilisationHistory(params: {
    warehouseId?: string;
    locationId?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
}) {
    const searchParams = new URLSearchParams();
    if (params.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params.locationId) searchParams.append('locationId', params.locationId);
    if (params.period) searchParams.append('period', params.period);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);

    return fetchWithRetry(`${API_URL}/reporting/utilisation/history?${searchParams.toString()}`);
}

export async function fetchCycleTimeTrend(params: {
    period?: string;
    startDate?: string;
    endDate?: string;
}) {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.append('period', params.period);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);

    return fetchWithRetry(`${API_URL}/reporting/cycle-time/trend?${searchParams.toString()}`);
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

export async function fetchProducts() {
    return fetchWithRetry(`${API_URL}/inventory/products`);
}


// --- Fulfillment & IWT ---

export async function fetchFulfillmentRules() {
    return fetchWithRetry(`${API_URL}/fulfillment/rules`);
}

export async function createFulfillmentRule(data: any) {
    return fetchWithRetry(`${API_URL}/fulfillment/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateFulfillmentRule(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/fulfillment/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteFulfillmentRule(id: string) {
    return fetchWithRetry(`${API_URL}/fulfillment/rules/${id}`, {
        method: 'DELETE',
    });
}

export async function fetchTransfers() {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers`);
}

export async function createTransferRequest(data: any) {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function approveTransfer(id: string, approverId: string) {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId }),
    });
}

// Roles & Permissions
export async function fetchRoles() {
    return fetchWithRetry(`${API_URL}/settings/roles`);
}

export async function getRole(id: string) {
    return fetchWithRetry(`${API_URL}/settings/roles/${id}`);
}

// --- Returns (RMA) ---

export async function createReturnRequest(data: any) {
    return fetchWithRetry(`${API_URL}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function receiveReturn(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/returns/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchReturnsByOrder(orderId: string) {
    return fetchWithRetry(`${API_URL}/returns/order/${orderId}`);
}

export async function createRole(data: any) {
    return fetchWithRetry(`${API_URL}/settings/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateRole(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/settings/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteRole(id: string) {
    return fetchWithRetry(`${API_URL}/settings/roles/${id}`, {
        method: 'DELETE',
    });
}

// --- Invoices ---

export async function fetchInvoices() {
    return fetchWithRetry(`${API_URL}/invoices`);
}

export async function getInvoice(id: string) {
    return fetchWithRetry(`${API_URL}/invoices/${id}`);
}

export async function createInvoice(data: any) {
    return fetchWithRetry(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function matchInvoice(id: string) {
    return fetchWithRetry(`${API_URL}/invoices/${id}/match`, {
        method: 'POST',
    });
}

// Users
export async function fetchUsers() {
    return fetchWithRetry(`${API_URL}/settings/users`);
}

export async function createUser(data: any) {
    return fetchWithRetry(`${API_URL}/settings/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}


export async function updateUser(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/settings/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id: string) {
    return fetchWithRetry(`${API_URL}/settings/users/${id}`, {
        method: 'DELETE',
    });
}

// Categories
export async function fetchCategories() {
    return fetchWithRetry(`${API_URL}/settings/categories`);
}

export async function createCategory(data: any) {
    return fetchWithRetry(`${API_URL}/settings/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteCategory(id: string) {
    return fetchWithRetry(`${API_URL}/settings/categories/${id}`, {
        method: 'DELETE',
    });
}

// --- Stocktaking ---

export async function fetchStocktakeSessions(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return fetchWithRetry(`${API_URL}/stocktaking/sessions${query}`);
}

export async function createStocktakeSession(data: { warehouseId: string; type: string; description?: string; scopeLocationIds?: string[]; scopeProductIds?: string[] }) {
    return fetchWithRetry(`${API_URL}/stocktaking/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function fetchStocktakeSession(id: string) {
    return fetchWithRetry(`${API_URL}/stocktaking/sessions/${id}`);
}

export async function generateStocktakeTasks(id: string) {
    return fetchWithRetry(`${API_URL}/stocktaking/sessions/${id}/generate-tasks`, {
        method: 'POST',
    });
}

export async function submitStocktakeCount(taskId: string, countedQuantity: number, countedBy: string) {
    return fetchWithRetry(`${API_URL}/stocktaking/tasks/${taskId}/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedQuantity, countedBy }),
    });
}

export async function reconcileStocktakeSession(id: string) {
    return fetchWithRetry(`${API_URL}/stocktaking/sessions/${id}/reconcile`, {
        method: 'POST',
    });
}


export const api = {
    get: (url: string) => fetchWithRetry(`${API_URL}${url}`),
    post: (url: string, data?: any) => fetchWithRetry(`${API_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    put: (url: string, data?: any) => fetchWithRetry(`${API_URL}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    delete: (url: string) => fetchWithRetry(`${API_URL}${url}`, { method: 'DELETE' }),
};

// ========== Packing ==========
export async function fetchPackingQueue(warehouseId?: string) {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return fetchWithRetry(`${API_URL}/packing/queue${params}`);
}

export async function createPackingSession(orderId: string, workerId?: string) {
    return fetchWithRetry(`${API_URL}/packing/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, workerId }),
    });
}

export async function fetchPackingSession(sessionId: string) {
    return fetchWithRetry(`${API_URL}/packing/sessions/${sessionId}`);
}

export async function fetchPackingSessionByOrder(orderId: string) {
    return fetchWithRetry(`${API_URL}/packing/sessions/order/${orderId}`);
}

export async function scanPackingItem(sessionId: string, barcode: string) {
    return fetchWithRetry(`${API_URL}/packing/sessions/${sessionId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
    });
}

export async function createPackingParcel(sessionId: string, data: {
    weight?: number; length?: number; width?: number; height?: number;
    trackingNumber?: string; items: { productId: string; quantity: number }[];
}) {
    return fetchWithRetry(`${API_URL}/packing/sessions/${sessionId}/parcels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function removePackingParcel(parcelId: string) {
    return fetchWithRetry(`${API_URL}/packing/parcels/${parcelId}`, { method: 'DELETE' });
}

export async function completePackingSession(sessionId: string) {
    return fetchWithRetry(`${API_URL}/packing/sessions/${sessionId}/complete`, { method: 'POST' });
}

// ========== Replenishment ==========
export async function fetchReplenishmentSummary(warehouseId?: string) {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return fetchWithRetry(`${API_URL}/replenishment/summary${params}`);
}

export async function fetchReplenishmentAlerts(filters?: { warehouseId?: string; status?: string; type?: string }) {
    const params = new URLSearchParams();
    if (filters?.warehouseId) params.set('warehouseId', filters.warehouseId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithRetry(`${API_URL}/replenishment/alerts${qs}`);
}

export async function triggerStockCheck(warehouseId?: string) {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return fetchWithRetry(`${API_URL}/replenishment/check${params}`, { method: 'POST' });
}

export async function createAutoReplenishmentPO(alertId: string) {
    return fetchWithRetry(`${API_URL}/replenishment/alerts/${alertId}/auto-po`, { method: 'POST' });
}

export async function dismissReplenishmentAlert(alertId: string) {
    return fetchWithRetry(`${API_URL}/replenishment/alerts/${alertId}/dismiss`, { method: 'POST' });
}

// ========== Notifications ==========
export async function fetchNotifications(filters?: { read?: boolean; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.read !== undefined) params.set('read', String(filters.read));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithRetry(`${API_URL}/notifications${qs}`);
}

export async function fetchUnreadNotificationCount() {
    return fetchWithRetry(`${API_URL}/notifications/unread-count`);
}

export async function markNotificationRead(id: string) {
    return fetchWithRetry(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
    return fetchWithRetry(`${API_URL}/notifications/mark-all-read`, { method: 'POST' });
}

// ========== Workflows ==========
export async function fetchWorkflowTemplates() {
    return fetchWithRetry(`${API_URL}/workflows`);
}

export async function createWorkflowTemplate(data: any) {
    return fetchWithRetry(`${API_URL}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function getWorkflowTemplate(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}`);
}

export async function updateWorkflowTemplate(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function deleteWorkflowTemplate(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}`, { method: 'DELETE' });
}

export async function activateWorkflowTemplate(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}/activate`, { method: 'POST' });
}

export async function validateWorkflowTemplate(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}/validate`, { method: 'POST' });
}

export async function cloneWorkflowTemplate(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}/clone`, { method: 'POST' });
}

export async function createWorkflowVersion(id: string) {
    return fetchWithRetry(`${API_URL}/workflows/${id}/version`, { method: 'POST' });
}

export async function fetchWorkflowInstances(warehouseId?: string) {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    return fetchWithRetry(`${API_URL}/workflow-instances${params}`);
}

export async function getWorkflowInstance(id: string) {
    return fetchWithRetry(`${API_URL}/workflow-instances/${id}`);
}

export async function fetchWorkflowInstanceDetails(id: string) {
    return fetchWithRetry(`${API_URL}/workflow-instances/${id}`);
}

export async function startWorkflow(templateId: string, data: { warehouseId: string; triggerRef?: string; triggerType?: string }) {
    return fetchWithRetry(`${API_URL}/workflow-instances/${templateId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function pauseWorkflowInstance(id: string, userId: string) {
    return fetchWithRetry(`${API_URL}/workflow-instances/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });
}

export async function resumeWorkflowInstance(id: string) {
    return fetchWithRetry(`${API_URL}/workflow-instances/${id}/resume`, { method: 'POST' });
}

// --- Platform Tenants ---

export async function fetchTenants() {
    return fetchWithRetry(`${API_URL}/companies`);
}

export async function getTenant(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}`);
}

export async function registerTenant(data: {
    name: string;
    slug: string;
    plan: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}) {
    return fetchWithRetry(`${API_URL}/companies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateTenant(id: string, data: { name?: string; slug?: string; plan?: string }) {
    return fetchWithRetry(`${API_URL}/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    return fetchWithRetry(`${API_URL}/companies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
}

export async function inviteUserToTenant(companyId: string, data: { name: string; email: string; password: string }) {
    return fetchWithRetry(`${API_URL}/companies/${companyId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
