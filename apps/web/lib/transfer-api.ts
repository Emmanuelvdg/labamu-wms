import { fetchWithRetry, API_URL } from './api';

/**
 * Transfer Operations API Client
 * Handles all API calls related to stock transfers between warehouses/locations
 */

export interface TransferItem {
    productId: string;
    quantity: number;
}

export interface CreateTransferRequest {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    items: TransferItem[];
    notes?: string;
}

export interface Transfer {
    id: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    sourceWarehouse: any;
    destinationWarehouse: any;
    items: any[];
    status: string;
    initiatorId: string;
    approverId?: string;
    initiator?: any;
    approver?: any;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Fetch all transfer orders
 */
export async function fetchTransfers(): Promise<Transfer[]> {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers`);
}

/**
 * Create a new transfer request
 */
export async function createTransferRequest(data: CreateTransferRequest): Promise<Transfer> {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

/**
 * Approve a pending transfer
 */
export async function approveTransfer(id: string, approverId: string): Promise<Transfer> {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId }),
    });
}

/**
 * Get a single transfer by ID
 */
export async function getTransferById(id: string): Promise<Transfer> {
    return fetchWithRetry(`${API_URL}/fulfillment/transfers/${id}`);
}
