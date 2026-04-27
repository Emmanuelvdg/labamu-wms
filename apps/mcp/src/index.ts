#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

const WMS_API_URL = process.env.WMS_API_URL || 'http://localhost:3001';
const WMS_API_KEY = process.env.WMS_API_KEY || '';

if (!WMS_API_KEY) {
    console.error('ERROR: WMS_API_KEY environment variable is required');
    process.exit(1);
}

async function callWmsApi(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${WMS_API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': WMS_API_KEY,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
    }

    return response.json();
}

async function callWmsApiRaw(endpoint: string, options: RequestInit = {}): Promise<string> {
    const response = await fetch(`${WMS_API_URL}${endpoint}`, {
        ...options,
        headers: {
            'X-API-KEY': WMS_API_KEY,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
    }

    return response.text();
}

function ok(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function msg(text: string): { content: Array<{ type: 'text'; text: string }> } {
    return { content: [{ type: 'text', text }] };
}

const server = new Server(
    { name: 'labamu-wms', version: '2.0.0' },
    { capabilities: { tools: {} } }
);

// ─── Tool Definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        // ── Products & Inventory ──────────────────────────────────────────────
        {
            name: 'list_products',
            description: 'List products in the WMS. Supports filtering by search term, category, ABC classification, and warehouse.',
            inputSchema: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Filter by name or SKU' },
                    category: { type: 'string', description: 'Filter by category ID' },
                    classification: { type: 'string', enum: ['A', 'B', 'C'], description: 'ABC classification filter' },
                    warehouseId: { type: 'string', description: 'Filter by warehouse ID' },
                },
            },
        },
        {
            name: 'get_product',
            description: 'Get full details for a single product including packaging, attributes, and stock.',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string', description: 'Product ID' },
                },
                required: ['productId'],
            },
        },
        {
            name: 'create_product',
            description: 'Create a new product in the WMS.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    sku: { type: 'string' },
                    description: { type: 'string' },
                    categoryId: { type: 'string' },
                    supplierId: { type: 'string' },
                    unitCost: { type: 'number' },
                    unitPrice: { type: 'number' },
                    weight: { type: 'number', description: 'Weight in kg' },
                    barcode: { type: 'string' },
                    reorderPoint: { type: 'number' },
                    reorderQuantity: { type: 'number' },
                },
                required: ['name', 'sku'],
            },
        },
        {
            name: 'update_product',
            description: 'Update an existing product.',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    categoryId: { type: 'string' },
                    supplierId: { type: 'string' },
                    unitCost: { type: 'number' },
                    unitPrice: { type: 'number' },
                    weight: { type: 'number' },
                    barcode: { type: 'string' },
                    reorderPoint: { type: 'number' },
                    reorderQuantity: { type: 'number' },
                    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] },
                },
                required: ['productId'],
            },
        },
        {
            name: 'get_stock_levels',
            description: 'Get current stock levels for a product across all locations and warehouses.',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string', description: 'Product ID' },
                },
                required: ['productId'],
            },
        },
        {
            name: 'get_inventory',
            description: 'Get a snapshot of current inventory, optionally filtered by product or location.',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string' },
                    locationId: { type: 'string' },
                },
            },
        },
        {
            name: 'create_stock_adjustment',
            description: 'Create a manual stock adjustment (e.g. damage, correction). Must be applied separately.',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string' },
                    locationId: { type: 'string' },
                    quantity: { type: 'number', description: 'Positive to add, negative to remove' },
                    reason: { type: 'string', description: 'Reason for the adjustment' },
                },
                required: ['productId', 'locationId', 'quantity', 'reason'],
            },
        },
        {
            name: 'get_stock_valuation',
            description: 'Get the current total stock valuation across all products.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'run_abc_classification',
            description: 'Run ABC classification analysis for a warehouse to categorise products by velocity.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                    periodDays: { type: 'number', description: 'Analysis window in days (default: 90)' },
                },
                required: ['warehouseId'],
            },
        },

        // ── Warehouses & Locations ────────────────────────────────────────────
        {
            name: 'list_warehouses',
            description: 'List all warehouses.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'get_location_tree',
            description: 'Get the full hierarchical location tree for a warehouse (zones → aisles → bays → bins).',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                },
            },
        },
        {
            name: 'check_location_capacity',
            description: 'Check whether a storage location has capacity for a given product and quantity.',
            inputSchema: {
                type: 'object',
                properties: {
                    locationId: { type: 'string' },
                    productId: { type: 'string' },
                    quantity: { type: 'number' },
                },
                required: ['locationId', 'productId', 'quantity'],
            },
        },
        {
            name: 'export_locations',
            description: 'Export all locations for a warehouse as CSV.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                },
                required: ['warehouseId'],
            },
        },
        {
            name: 'import_locations',
            description: 'Import locations from CSV content. Required columns: Name, StructuralType.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                    csvContent: { type: 'string' },
                },
                required: ['warehouseId', 'csvContent'],
            },
        },

        // ── Purchase Orders (Inbound) ─────────────────────────────────────────
        {
            name: 'list_purchase_orders',
            description: 'List all purchase orders.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'get_purchase_order',
            description: 'Get full details of a purchase order including line items and receipts.',
            inputSchema: {
                type: 'object',
                properties: {
                    purchaseOrderId: { type: 'string' },
                },
                required: ['purchaseOrderId'],
            },
        },
        {
            name: 'create_purchase_order',
            description: 'Create a new purchase order for incoming inventory.',
            inputSchema: {
                type: 'object',
                properties: {
                    supplierId: { type: 'string' },
                    expectedDate: { type: 'string', description: 'ISO 8601 date string' },
                    notes: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'number' },
                                unitCost: { type: 'number' },
                            },
                            required: ['productId', 'quantity'],
                        },
                    },
                },
                required: ['supplierId', 'items'],
            },
        },
        {
            name: 'receive_purchase_order',
            description: 'Receive goods against a purchase order into a warehouse location.',
            inputSchema: {
                type: 'object',
                properties: {
                    purchaseOrderId: { type: 'string' },
                    locationId: { type: 'string', description: 'Receiving location ID' },
                    items: {
                        type: 'array',
                        description: 'Subset of items to receive (omit to receive all)',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'number' },
                            },
                            required: ['productId', 'quantity'],
                        },
                    },
                },
                required: ['purchaseOrderId', 'locationId'],
            },
        },
        {
            name: 'approve_purchase_order',
            description: 'Approve a purchase order that is pending approval.',
            inputSchema: {
                type: 'object',
                properties: {
                    purchaseOrderId: { type: 'string' },
                    userId: { type: 'string', description: 'Approving user ID' },
                },
                required: ['purchaseOrderId', 'userId'],
            },
        },

        // ── Outbound Orders ───────────────────────────────────────────────────
        {
            name: 'list_orders',
            description: 'List outbound customer orders.',
            inputSchema: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filter by status (e.g. PENDING, PICKING, PACKED, SHIPPED)' },
                },
            },
        },
        {
            name: 'get_order',
            description: 'Get full details of a customer order including line items and shipment.',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                },
                required: ['orderId'],
            },
        },
        {
            name: 'create_order',
            description: 'Create a new outbound customer order.',
            inputSchema: {
                type: 'object',
                properties: {
                    customerId: { type: 'string' },
                    warehouseId: { type: 'string' },
                    deliveryMethodId: { type: 'string' },
                    notes: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'number' },
                                unitPrice: { type: 'number' },
                            },
                            required: ['productId', 'quantity'],
                        },
                    },
                },
                required: ['customerId', 'items'],
            },
        },
        {
            name: 'cancel_order',
            description: 'Cancel a customer order.',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                },
                required: ['orderId'],
            },
        },
        {
            name: 'check_order_availability',
            description: 'Check whether all items in an order are available in stock.',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                },
                required: ['orderId'],
            },
        },

        // ── Customers & Suppliers ─────────────────────────────────────────────
        {
            name: 'list_customers',
            description: 'List all customers.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'create_customer',
            description: 'Create a new customer.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                },
                required: ['name'],
            },
        },
        {
            name: 'list_suppliers',
            description: 'List all suppliers.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'create_supplier',
            description: 'Create a new supplier.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    contactInfo: {
                        type: 'object',
                        description: 'Contact details (email, phone, address)',
                    },
                },
                required: ['name'],
            },
        },

        // ── Picking ───────────────────────────────────────────────────────────
        {
            name: 'create_picking_session',
            description: 'Start a new picking session for a warehouse. Strategy options: SINGLE, BATCH, CLUSTER, WAVE, WAVELESS.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                    strategy: {
                        type: 'string',
                        enum: ['SINGLE', 'BATCH', 'CLUSTER', 'WAVE', 'WAVELESS'],
                        description: 'Picking strategy to use',
                    },
                    maxOrders: { type: 'number', description: 'Max orders to include (BATCH/CLUSTER/WAVE)' },
                },
                required: ['warehouseId', 'strategy'],
            },
        },
        {
            name: 'update_pick_task',
            description: 'Record the picked quantity for a pick task and optionally mark it complete or flag an exception.',
            inputSchema: {
                type: 'object',
                properties: {
                    taskId: { type: 'string' },
                    pickedQuantity: { type: 'number' },
                    status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED', 'EXCEPTION'] },
                    exceptionReason: { type: 'string' },
                },
                required: ['taskId', 'pickedQuantity', 'status'],
            },
        },
        {
            name: 'complete_picking_session',
            description: 'Mark a picking session as complete.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },

        // ── Putaway ───────────────────────────────────────────────────────────
        {
            name: 'update_putaway_task',
            description: 'Update the status or destination of a putaway task (e.g. mark IN_PROGRESS, flag exceptions).',
            inputSchema: {
                type: 'object',
                properties: {
                    taskId: { type: 'string' },
                    status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED', 'EXCEPTION'] },
                    putawayQuantity: { type: 'number' },
                    alternativeLocationId: { type: 'string', description: 'Override suggested location' },
                    exceptionType: { type: 'string', enum: ['DAMAGED', 'MISMATCH', 'NO_SPACE'] },
                    exceptionReason: { type: 'string' },
                },
                required: ['taskId'],
            },
        },
        {
            name: 'complete_putaway_task',
            description: 'Complete a putaway task and confirm the actual destination location.',
            inputSchema: {
                type: 'object',
                properties: {
                    taskId: { type: 'string' },
                    actualDestinationId: { type: 'string', description: 'Location ID where inventory was placed' },
                },
                required: ['taskId', 'actualDestinationId'],
            },
        },

        // ── Packing ───────────────────────────────────────────────────────────
        {
            name: 'get_packing_queue',
            description: 'Get the list of orders ready to be packed, optionally filtered by warehouse.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                },
            },
        },
        {
            name: 'create_packing_session',
            description: 'Start a packing session for an order.',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                    workerId: { type: 'string', description: 'Worker/user ID (optional)' },
                },
                required: ['orderId'],
            },
        },
        {
            name: 'complete_packing_session',
            description: 'Mark a packing session as complete.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },

        // ── Stocktaking ───────────────────────────────────────────────────────
        {
            name: 'list_stocktaking_sessions',
            description: 'List stocktaking (physical count) sessions, optionally filtered by warehouse.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                },
            },
        },
        {
            name: 'create_stocktaking_session',
            description: 'Create a new stocktaking session to initiate a physical inventory count.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                    type: { type: 'string', enum: ['FULL', 'CYCLE', 'SPOT'], description: 'Type of count' },
                    description: { type: 'string' },
                },
                required: ['warehouseId', 'type'],
            },
        },
        {
            name: 'generate_stocktaking_tasks',
            description: 'Generate individual counting tasks for a stocktaking session.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },
        {
            name: 'reconcile_stocktaking',
            description: 'Reconcile a completed stocktaking session — applies variances to inventory.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string' },
                },
                required: ['sessionId'],
            },
        },

        // ── Returns ───────────────────────────────────────────────────────────
        {
            name: 'create_return',
            description: 'Initiate a customer return request against an original order.',
            inputSchema: {
                type: 'object',
                properties: {
                    originalOrderId: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'number' },
                                returnReason: { type: 'string', description: 'e.g. DAMAGED, WRONG_ITEM, CHANGED_MIND' },
                            },
                            required: ['productId', 'quantity', 'returnReason'],
                        },
                    },
                },
                required: ['originalOrderId', 'items'],
            },
        },
        {
            name: 'receive_return',
            description: 'Physically receive returned goods and record their condition.',
            inputSchema: {
                type: 'object',
                properties: {
                    returnId: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'number' },
                                condition: { type: 'string', enum: ['GOOD', 'DAMAGED', 'UNSELLABLE'] },
                            },
                            required: ['productId', 'quantity', 'condition'],
                        },
                    },
                },
                required: ['returnId', 'items'],
            },
        },

        // ── Shipping ──────────────────────────────────────────────────────────
        {
            name: 'get_shipping_rates',
            description: 'Calculate shipping rates between two postcodes for a given weight.',
            inputSchema: {
                type: 'object',
                properties: {
                    originZip: { type: 'string' },
                    destZip: { type: 'string' },
                    weightKg: { type: 'number' },
                },
                required: ['originZip', 'destZip', 'weightKg'],
            },
        },
        {
            name: 'get_shipping_methods',
            description: 'List available delivery/shipping methods.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'create_shipment',
            description: 'Create a shipment record for a fulfilled order.',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                    carrier: { type: 'string' },
                    trackingId: { type: 'string' },
                },
                required: ['orderId', 'carrier'],
            },
        },

        // ── Reporting & Replenishment ─────────────────────────────────────────
        {
            name: 'get_analytics',
            description: 'Get dashboard analytics: stock value, fulfillment rate, order volume, capacity utilisation, and cycle times.',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['today', '7d', '30d', '90d'], description: 'Reporting period' },
                    warehouseId: { type: 'string' },
                },
            },
        },
        {
            name: 'get_replenishment_alerts',
            description: 'Get active replenishment alerts for products that are low or out of stock.',
            inputSchema: {
                type: 'object',
                properties: {
                    warehouseId: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'DISMISSED', 'AUTO_PO_CREATED'] },
                    type: { type: 'string', enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT'] },
                },
            },
        },
        {
            name: 'get_inventory_ledger',
            description: 'Get a chronological ledger of all inventory transactions (receipts, picks, adjustments, returns).',
            inputSchema: {
                type: 'object',
                properties: {
                    productId: { type: 'string' },
                    locationId: { type: 'string' },
                    startDate: { type: 'string', description: 'ISO 8601 date' },
                    endDate: { type: 'string', description: 'ISO 8601 date' },
                },
            },
        },

        // ── Utilities ─────────────────────────────────────────────────────────
        {
            name: 'lookup_barcode',
            description: 'Look up what a barcode refers to (product, location, batch, or package).',
            inputSchema: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Barcode or QR code string' },
                },
                required: ['code'],
            },
        },
        {
            name: 'get_notifications',
            description: 'Get recent notifications for the authenticated user.',
            inputSchema: {
                type: 'object',
                properties: {
                    unreadOnly: { type: 'boolean', description: 'Return only unread notifications' },
                    limit: { type: 'number', description: 'Max results (default: 20)' },
                },
            },
        },
        {
            name: 'list_workflow_templates',
            description: 'List available workflow templates that can be triggered for warehouse operations.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'start_workflow',
            description: 'Start a workflow instance from a template.',
            inputSchema: {
                type: 'object',
                properties: {
                    templateId: { type: 'string' },
                    warehouseId: { type: 'string' },
                    triggerRef: { type: 'string', description: 'Reference ID that triggered this workflow (e.g. orderId)' },
                    triggerType: { type: 'string', description: 'Type of trigger (e.g. ORDER, PURCHASE_ORDER)' },
                },
                required: ['templateId'],
            },
        },
    ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, unknown>;

    try {
        switch (name) {

            // ── Products & Inventory ──────────────────────────────────────────
            case 'list_products': {
                const params = new URLSearchParams();
                if (a.search) params.set('search', String(a.search));
                if (a.category) params.set('category', String(a.category));
                if (a.classification) params.set('classification', String(a.classification));
                if (a.warehouseId) params.set('warehouseId', String(a.warehouseId));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/inventory/products${q}`));
            }

            case 'get_product':
                return ok(await callWmsApi(`/inventory/products/${a.productId}`));

            case 'create_product': {
                const { productId: _id, ...body } = a;
                return ok(await callWmsApi('/inventory/products', { method: 'POST', body: JSON.stringify(body) }));
            }

            case 'update_product': {
                const { productId, ...body } = a;
                return ok(await callWmsApi(`/inventory/products/${productId}`, { method: 'PUT', body: JSON.stringify(body) }));
            }

            case 'get_stock_levels':
                return ok(await callWmsApi(`/inventory/levels?productId=${encodeURIComponent(String(a.productId))}`));

            case 'get_inventory': {
                const params = new URLSearchParams();
                if (a.productId) params.set('productId', String(a.productId));
                if (a.locationId) params.set('locationId', String(a.locationId));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/inventory${q}`));
            }

            case 'create_stock_adjustment':
                return ok(await callWmsApi('/inventory/adjustments', { method: 'POST', body: JSON.stringify(a) }));

            case 'get_stock_valuation':
                return ok(await callWmsApi('/inventory/valuation'));

            case 'run_abc_classification': {
                const q = a.periodDays ? `?periodDays=${a.periodDays}` : '';
                return ok(await callWmsApi(`/inventory/abc-classification/${a.warehouseId}/run${q}`, { method: 'POST' }));
            }

            // ── Warehouses & Locations ────────────────────────────────────────
            case 'list_warehouses':
                return ok(await callWmsApi('/inventory/warehouses'));

            case 'get_location_tree': {
                const q = a.warehouseId ? `?warehouseId=${encodeURIComponent(String(a.warehouseId))}` : '';
                return ok(await callWmsApi(`/inventory/locations/tree${q}`));
            }

            case 'check_location_capacity': {
                const params = new URLSearchParams({
                    productId: String(a.productId),
                    quantity: String(a.quantity),
                });
                return ok(await callWmsApi(`/inventory/locations/${a.locationId}/capacity?${params}`));
            }

            case 'export_locations': {
                const csv = await callWmsApiRaw(
                    `/inventory/locations/export?warehouseId=${encodeURIComponent(String(a.warehouseId))}`,
                );
                return msg(csv);
            }

            case 'import_locations':
                return ok(await callWmsApi('/inventory/locations/import', {
                    method: 'POST',
                    body: JSON.stringify({ warehouseId: a.warehouseId, csv: a.csvContent }),
                }));

            // ── Purchase Orders ───────────────────────────────────────────────
            case 'list_purchase_orders':
                return ok(await callWmsApi('/purchase-orders'));

            case 'get_purchase_order': {
                const [po, receipts] = await Promise.all([
                    callWmsApi(`/purchase-orders/${a.purchaseOrderId}`),
                    callWmsApi(`/purchase-orders/${a.purchaseOrderId}/receipts`),
                ]);
                return ok({ ...po, receipts });
            }

            case 'create_purchase_order':
                return ok(await callWmsApi('/purchase-orders', { method: 'POST', body: JSON.stringify(a) }));

            case 'receive_purchase_order': {
                const { purchaseOrderId, ...body } = a;
                return ok(await callWmsApi(`/purchase-orders/${purchaseOrderId}/receive`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                }));
            }

            case 'approve_purchase_order': {
                const { purchaseOrderId, userId } = a;
                return ok(await callWmsApi(`/purchase-orders/${purchaseOrderId}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({ userId }),
                }));
            }

            // ── Outbound Orders ───────────────────────────────────────────────
            case 'list_orders': {
                const q = a.status ? `?status=${encodeURIComponent(String(a.status))}` : '';
                return ok(await callWmsApi(`/orders${q}`));
            }

            case 'get_order':
                return ok(await callWmsApi(`/orders/${a.orderId}`));

            case 'create_order':
                return ok(await callWmsApi('/orders', { method: 'POST', body: JSON.stringify(a) }));

            case 'cancel_order':
                return ok(await callWmsApi(`/orders/${a.orderId}/cancel`, { method: 'POST' }));

            case 'check_order_availability':
                return ok(await callWmsApi(`/orders/${a.orderId}/check-availability`, { method: 'POST' }));

            // ── Customers & Suppliers ─────────────────────────────────────────
            case 'list_customers':
                return ok(await callWmsApi('/customers'));

            case 'create_customer':
                return ok(await callWmsApi('/customers', { method: 'POST', body: JSON.stringify(a) }));

            case 'list_suppliers':
                return ok(await callWmsApi('/suppliers'));

            case 'create_supplier':
                return ok(await callWmsApi('/suppliers', { method: 'POST', body: JSON.stringify(a) }));

            // ── Picking ───────────────────────────────────────────────────────
            case 'create_picking_session':
                return ok(await callWmsApi('/strategy/picking/sessions', { method: 'POST', body: JSON.stringify(a) }));

            case 'update_pick_task': {
                const { taskId, ...body } = a;
                return ok(await callWmsApi(`/strategy/picking/tasks/${taskId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(body),
                }));
            }

            case 'complete_picking_session':
                return ok(await callWmsApi(`/strategy/picking/sessions/${a.sessionId}/complete`, { method: 'POST' }));

            // ── Putaway ───────────────────────────────────────────────────────
            case 'update_putaway_task': {
                const { taskId, ...body } = a;
                return ok(await callWmsApi(`/inventory/putaway/tasks/${taskId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(body),
                }));
            }

            case 'complete_putaway_task':
                return ok(await callWmsApi(`/inventory/putaway/tasks/${a.taskId}/complete`, {
                    method: 'POST',
                    body: JSON.stringify({ actualDestinationId: a.actualDestinationId }),
                }));

            // ── Packing ───────────────────────────────────────────────────────
            case 'get_packing_queue': {
                const q = a.warehouseId ? `?warehouseId=${encodeURIComponent(String(a.warehouseId))}` : '';
                return ok(await callWmsApi(`/packing/queue${q}`));
            }

            case 'create_packing_session':
                return ok(await callWmsApi('/packing/sessions', { method: 'POST', body: JSON.stringify(a) }));

            case 'complete_packing_session':
                return ok(await callWmsApi(`/packing/sessions/${a.sessionId}/complete`, { method: 'POST' }));

            // ── Stocktaking ───────────────────────────────────────────────────
            case 'list_stocktaking_sessions': {
                const q = a.warehouseId ? `?warehouseId=${encodeURIComponent(String(a.warehouseId))}` : '';
                return ok(await callWmsApi(`/stocktaking/sessions${q}`));
            }

            case 'create_stocktaking_session':
                return ok(await callWmsApi('/stocktaking/sessions', { method: 'POST', body: JSON.stringify(a) }));

            case 'generate_stocktaking_tasks':
                return ok(await callWmsApi(`/stocktaking/sessions/${a.sessionId}/generate-tasks`, { method: 'POST' }));

            case 'reconcile_stocktaking':
                return ok(await callWmsApi(`/stocktaking/sessions/${a.sessionId}/reconcile`, { method: 'POST' }));

            // ── Returns ───────────────────────────────────────────────────────
            case 'create_return':
                return ok(await callWmsApi('/returns', { method: 'POST', body: JSON.stringify(a) }));

            case 'receive_return': {
                const { returnId, ...body } = a;
                return ok(await callWmsApi(`/returns/${returnId}/receive`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                }));
            }

            // ── Shipping ──────────────────────────────────────────────────────
            case 'get_shipping_rates': {
                const params = new URLSearchParams({
                    originZip: String(a.originZip),
                    destZip: String(a.destZip),
                    weightKg: String(a.weightKg),
                });
                return ok(await callWmsApi(`/shipping/rates?${params}`));
            }

            case 'get_shipping_methods':
                return ok(await callWmsApi('/shipping/methods'));

            case 'create_shipment':
                return ok(await callWmsApi('/orders/ship', { method: 'POST', body: JSON.stringify(a) }));

            // ── Reporting & Replenishment ─────────────────────────────────────
            case 'get_analytics': {
                const params = new URLSearchParams();
                if (a.period) params.set('period', String(a.period));
                if (a.warehouseId) params.set('warehouseId', String(a.warehouseId));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/reporting/analytics${q}`));
            }

            case 'get_replenishment_alerts': {
                const params = new URLSearchParams();
                if (a.warehouseId) params.set('warehouseId', String(a.warehouseId));
                if (a.status) params.set('status', String(a.status));
                if (a.type) params.set('type', String(a.type));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/replenishment/alerts${q}`));
            }

            case 'get_inventory_ledger': {
                const params = new URLSearchParams();
                if (a.productId) params.set('productId', String(a.productId));
                if (a.locationId) params.set('locationId', String(a.locationId));
                if (a.startDate) params.set('startDate', String(a.startDate));
                if (a.endDate) params.set('endDate', String(a.endDate));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/reporting/inventory-ledger${q}`));
            }

            // ── Utilities ─────────────────────────────────────────────────────
            case 'lookup_barcode':
                return ok(await callWmsApi(`/barcode/lookup?code=${encodeURIComponent(String(a.code))}`));

            case 'get_notifications': {
                const params = new URLSearchParams();
                if (a.unreadOnly) params.set('read', 'false');
                if (a.limit) params.set('limit', String(a.limit));
                const q = params.toString() ? `?${params}` : '';
                return ok(await callWmsApi(`/notifications${q}`));
            }

            case 'list_workflow_templates':
                return ok(await callWmsApi('/workflows'));

            case 'start_workflow': {
                const { templateId, ...body } = a;
                return ok(await callWmsApi(`/workflow-instances/${templateId}/start`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                }));
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Labamu WMS MCP Server v2.0.0 running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
