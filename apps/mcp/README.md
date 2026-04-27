# Labamu WMS MCP Server

Model Context Protocol (MCP) server for Labamu WMS — version **2.0.0**. Enables LLMs like Claude to orchestrate the full range of warehouse operations: receiving, putaway, picking, packing, shipping, stocktaking, returns, reporting, and more.

## Setup

1. **Generate an API Key**
   - Log into the WMS web interface
   - Go to Settings → API Keys
   - Create a new key and copy it (shown only once)

2. **Configure environment**
   ```bash
   cd apps/mcp
   cp .env.example .env
   # Set WMS_API_URL and WMS_API_KEY in .env
   ```

3. **Install and build**
   ```bash
   npm install
   npm run build
   ```

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "labamu-wms": {
      "command": "node",
      "args": ["/absolute/path/to/labamu-ims/apps/mcp/dist/index.js"],
      "env": {
        "WMS_API_URL": "http://localhost:3001",
        "WMS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools (45)

### Products & Inventory
| Tool | Description |
|------|-------------|
| `list_products` | List/search products with filters: search, category, ABC classification, warehouse |
| `get_product` | Full product details including packaging and attributes |
| `create_product` | Create a new product (name, SKU, category, cost, barcode, reorder levels) |
| `update_product` | Update an existing product |
| `get_stock_levels` | Current stock levels for a product across all locations |
| `get_inventory` | Full inventory snapshot, filterable by product or location |
| `create_stock_adjustment` | Manual stock correction (damage, count error) |
| `get_stock_valuation` | Total stock valuation across all products |
| `run_abc_classification` | Run ABC analysis to categorise products by movement velocity |

### Warehouses & Locations
| Tool | Description |
|------|-------------|
| `list_warehouses` | List all warehouses |
| `get_location_tree` | Hierarchical location tree (zones → aisles → bays → bins) |
| `check_location_capacity` | Check whether a bin can hold a given product/quantity |
| `export_locations` | Export warehouse locations to CSV |
| `import_locations` | Bulk-import locations from CSV |

### Purchase Orders (Inbound)
| Tool | Description |
|------|-------------|
| `list_purchase_orders` | List all POs |
| `get_purchase_order` | PO details with line items and receipts |
| `create_purchase_order` | Create a new PO against a supplier |
| `receive_purchase_order` | Receive goods into a warehouse location |
| `approve_purchase_order` | Approve a PO pending authorisation |

### Orders (Outbound)
| Tool | Description |
|------|-------------|
| `list_orders` | List customer orders, filterable by status |
| `get_order` | Order details with line items and shipment |
| `create_order` | Create a new outbound order |
| `cancel_order` | Cancel an order |
| `check_order_availability` | Check all order items are in stock |

### Customers & Suppliers
| Tool | Description |
|------|-------------|
| `list_customers` | List all customers |
| `create_customer` | Create a customer with address/geo |
| `list_suppliers` | List all suppliers |
| `create_supplier` | Create a supplier with contact info |

### Picking
| Tool | Description |
|------|-------------|
| `create_picking_session` | Start a picking session (SINGLE, BATCH, CLUSTER, WAVE, WAVELESS) |
| `update_pick_task` | Record picked quantity or flag an exception |
| `complete_picking_session` | Mark a picking session complete |

### Putaway
| Tool | Description |
|------|-------------|
| `update_putaway_task` | Update putaway task status, override location, or flag exception |
| `complete_putaway_task` | Confirm final destination and complete the task |

### Packing
| Tool | Description |
|------|-------------|
| `get_packing_queue` | View orders ready to pack |
| `create_packing_session` | Start a packing session for an order |
| `complete_packing_session` | Mark packing complete |

### Stocktaking
| Tool | Description |
|------|-------------|
| `list_stocktaking_sessions` | List physical count sessions |
| `create_stocktaking_session` | Initiate a FULL, CYCLE, or SPOT count |
| `generate_stocktaking_tasks` | Generate individual counting tasks for a session |
| `reconcile_stocktaking` | Apply count results and update inventory |

### Returns
| Tool | Description |
|------|-------------|
| `create_return` | Initiate a customer return against an original order |
| `receive_return` | Process returned goods and record their condition |

### Shipping
| Tool | Description |
|------|-------------|
| `get_shipping_rates` | Calculate carrier rates by postcode and weight |
| `get_shipping_methods` | List configured delivery methods |
| `create_shipment` | Create a shipment record for a fulfilled order |

### Reporting & Replenishment
| Tool | Description |
|------|-------------|
| `get_analytics` | Dashboard metrics: stock value, fill rate, capacity, cycle times |
| `get_replenishment_alerts` | Low-stock and out-of-stock alerts |
| `get_inventory_ledger` | Chronological ledger of all stock transactions |

### Utilities
| Tool | Description |
|------|-------------|
| `lookup_barcode` | Resolve a barcode to product, location, batch, or package |
| `get_notifications` | Recent notifications for the authenticated user |
| `list_workflow_templates` | Available workflow templates |
| `start_workflow` | Launch a workflow instance from a template |

## Example Prompts

```
"What products are running low on stock?"
"Show me all pending purchase orders"
"Receive PO-042 into receiving bay REC-01"
"Start a batch picking session in Warehouse A"
"Create a return for order ORD-1234 — customer says item is damaged"
"What's our inventory fill rate for the last 30 days?"
"Run ABC classification for Warehouse B"
"Import these warehouse locations from CSV: [paste CSV]"
"What does barcode 5901234123457 refer to?"
```
