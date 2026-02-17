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

/**
 * Helper function to call WMS API
 */
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

/**
 * Create and configure the MCP server
 */
const server = new Server(
    {
        name: 'labamu-wms',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_products',
                description: 'List all products in the WMS inventory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        search: {
                            type: 'string',
                            description: 'Optional search query to filter products by name or SKU',
                        },
                    },
                },
            },
            {
                name: 'get_stock_levels',
                description: 'Get current stock levels for a product',
                inputSchema: {
                    type: 'object',
                    properties: {
                        productId: {
                            type: 'string',
                            description: 'Product ID to get stock levels for',
                        },
                    },
                    required: ['productId'],
                },
            },
            {
                name: 'create_purchase_order',
                description: 'Create a new purchase order for incoming inventory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        supplierId: {
                            type: 'string',
                            description: 'Supplier ID',
                        },
                        items: {
                            type: 'array',
                            description: 'Array of order items',
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
                name: 'start_putaway_task',
                description: 'Start a putaway task (move received inventory to storage)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: {
                            type: 'string',
                            description: 'Putaway task ID to start',
                        },
                    },
                    required: ['taskId'],
                },
            },
            {
                name: 'export_locations',
                description: 'Export all locations for a warehouse to CSV format',
                inputSchema: {
                    type: 'object',
                    properties: {
                        warehouseId: {
                            type: 'string',
                            description: 'ID of the warehouse to export locations from',
                        },
                    },
                    required: ['warehouseId'],
                },
            },
            {
                name: 'import_locations',
                description: 'Import locations from CSV content',
                inputSchema: {
                    type: 'object',
                    properties: {
                        warehouseId: {
                            type: 'string',
                            description: 'ID of the warehouse to import to',
                        },
                        csvContent: {
                            type: 'string',
                            description: 'CSV content string. Required columns: Name, StructuralType',
                        },
                    },
                    required: ['warehouseId', 'csvContent'],
                },
            },
        ],
    };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'list_products': {
                const query = args && args.search ? `?search=${encodeURIComponent(args.search as string)}` : '';
                const products = await callWmsApi(`/inventory/products${query}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(products, null, 2),
                        },
                    ],
                };
            }

            case 'get_stock_levels': {
                const inventory = await callWmsApi(`/inventory/levels?productId=${args?.productId || ''}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(inventory, null, 2),
                        },
                    ],
                };
            }

            case 'create_purchase_order': {
                const po = await callWmsApi('/purchase-orders', {
                    method: 'POST',
                    body: JSON.stringify(args),
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Purchase order created successfully:\n${JSON.stringify(po, null, 2)}`,
                        },
                    ],
                };
            }

            case 'start_putaway_task': {
                const result = await callWmsApi(`/inventory/putaway/tasks/${args?.taskId || ''}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'IN_PROGRESS' }),
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Putaway task started:\n${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            }

            case 'export_locations': {
                const warehouseId = args?.warehouseId as string;
                if (!warehouseId) throw new Error('warehouseId is required');

                // Fetch the CSV text
                const response = await fetch(`${WMS_API_URL}/inventory/locations/export?warehouseId=${warehouseId}`, {
                    headers: {
                        'X-API-KEY': WMS_API_KEY,
                    },
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`API Error (${response.status}): ${error}`);
                }

                const csvContent = await response.text();

                return {
                    content: [
                        {
                            type: 'text',
                            text: csvContent,
                        },
                    ],
                };
            }

            case 'import_locations': {
                const warehouseId = args?.warehouseId as string;
                const csvContent = args?.csvContent as string;

                if (!warehouseId) throw new Error('warehouseId is required');
                if (!csvContent) throw new Error('csvContent is required');

                const result = await callWmsApi('/inventory/locations/import', {
                    method: 'POST',
                    body: JSON.stringify({ warehouseId, csv: csvContent }),
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Import complete:\n${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});

/**
 * Start the server
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Labamu WMS MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
