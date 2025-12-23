import Cookies from 'js-cookie';

export const API_URL = 'http://localhost:3001';

export async function fetchWithRetry(url: string, options?: RequestInit) {
    try {
        const userId = Cookies.get('user_id');
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
        console.error(`Failed to fetch ${url}:`, error);
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

export async function createCustomer(data: any) {
    return fetchWithRetry(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

export async function createPurchaseOrder(data: any) {
    return fetchWithRetry(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function receivePurchaseOrder(id: string, items: { productId: string; quantity: number; locationId: string }[]) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
}

export async function fetchPurchaseOrderReceipts(id: string) {
    return fetchWithRetry(`${API_URL}/purchase-orders/${id}/receipts`);
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
        body: JSON.stringify(data),
    });
}

export async function updateUser(id: string, data: any) {
    return fetchWithRetry(`${API_URL}/settings/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id: string) {
    return fetchWithRetry(`${API_URL}/settings/users/${id}`, {
        method: 'DELETE',
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
