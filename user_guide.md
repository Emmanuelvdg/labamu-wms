# Labamu WMS - User Guide

Comprehensive documentation for the Labamu Inventory Management System.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Inventory Management](#inventory-management)
3. [Inbound Operations](#inbound-operations)
4. [Outbound Operations](#outbound-operations)
5. [Reporting & Admin](#reporting--admin)
6. [Mobile Warehouse App](#mobile-warehouse-app)
7. [End-to-End Examples](#end-to-end-examples)

---

## Getting Started

### Dashboard
**Purpose:** The command center for your warehouse operations, offering real-time visibility into stock value, alerts, and activity.

**✨ New: Deep Dive Analytics**
- **Date Filtering:** Toggle view between 7, 30, and 90 days, or select a custom range to analyze trends over specific periods.
- **Drill-Down:** Double-click on any KPI card (e.g., "Stock Value" or "Pending Orders") to open a detailed view with granular line-item data.

**Key Metrics & Widgets:**
- **Total Inventory Value:** The aggregate cost value of all `ACTIVE` inventory.
- **Low Stock Alerts:** Real-time counter of items below their `Min Quantity` reorder point. Click to view the specific items and generate POs.
- **Pending Orders:** Sales orders currently in `PENDING` or `RESERVED` state, awaiting picking.
- **Recent Activity:** A timeline of the last 10 system actions (logins, stock moves, settings changes).

---

## Inventory Management

### Products
**Purpose:** The master record for every item you buy, store, or sell.

**Detailed Configuration:**
- **SKU (Stock Keeping Unit):** Unique alphanumeric identifier (Required).
- **Dimensions & Weight:** Critical for shipping calculation and storage capacity logic.
- **Cost & Price:** 'Cost' is used for inventory valuation (COGS); 'Price' is the default sales price.
- **Packaging Units:** Define specific unit types (e.g., "Case of 12", "Pallet of 50") in the "Manage Packaging" tab.
- **Ti-Hi Configuration:** For Pallet units, define `Ti` (Cartons per Layer) and `Hi` (Layers per Pallet) to automatically calculate pallet capacity.
- **Storage Requirements:** Tag items as "Refrigerated", "Hazardous", or "Heavy" to restrict where they can be put away.

### Locations
**Purpose:** A digital twin of your physical warehouse layout, enabling precise stock tracking.

**Structural Hierarchy:**
WAREHOUSE → ROOM → ROW → BAY → SHELF → POSITION

Attributes set at a parent level automatically apply to all child locations unless explicitly overridden. For example, setting `{ "refrigerated": true }` on a ROOM applies to all locations within it.

**✨ New: Address Codes & Capacity**
- **Address Codes:** Locations now have granular codes (e.g., `ZONE-A`, `ROW-1`) that automatically roll up into full addresses (e.g., `WH1.ZONE-A.ROW-1.BAY-3`). This ensures distinct, scannable identifiers for every position.
- **Capacity Planning:** You can now define physical limits for locations:
    - **Dimensions (L x W x H):** Inner usable space in mm.
    - **Max Weight:** Weight limit in kg.
These constraints are used by the system to prevent overloading locations during putaway recommendations.

### Warehouses
**Purpose:** Top-level facilities that act as the root of your location hierarchy.

**Workflow Configuration:**
- **Inbound Steps:** 1-step (direct), 2-steps (receive+stage), 3-steps (receive+stage+quality).
- **Outbound Steps:** 1-step (pick-ship), 2-steps (pick-pack), 3-steps (pick-pack-stage).

**✨ Automatic Setup:**
When creating a warehouse, the system automatically creates standard functional areas (Receiving Dock, Main Storage, Shipping Dock) based on your selected workflow.

**Multi-Step Flows:**
Configuring a warehouse for multi-step flows (2 or 3 steps) enables detailed tracking throughout the facility:
- **1-Step (Direct)::** Vendor -> Stock. Best for simple operations.
- **2-Step (Receive & Putaway):** Vendor -> Input -> Stock. Adds a staging step for breakdown or inspection.
- **3-Step (Quality Control):** Vendor -> Input -> Quality Control -> Stock. Enables a dedicated Quality Assurance process with exception handling.

**✨ Address Management:**
Each warehouse can have a complete structured address including:
- **Street Address:** Physical location
- **City, State, Postal Code, Country:** Geographic details
- **Latitude/Longitude:** GPS coordinates for delivery integrations

This structured address information is critical for automated delivery quotations and third-party logistics integrations (e.g., Lalamove).


### Adjustments
**Purpose:** Reconciling system usage with physical reality (Cycle Counts, Stocktakes).
- **Relative Entry:** (+2 found)
- **Absolute Entry:** (Counted 5 total)

### Scrap Orders
**Purpose:** Formal process for writing off inventory value due to damage or expiry.

### Partner Locations
**Purpose:** Extending visibility to 3rd party sites like Retail Stores or Consignment Partners.

### Optimized Putaway
**Purpose:** The system recommends the best location for incoming goods based on Product Velocity (A/B/C) and Zone Priority.

### Routes
**Purpose:** Defining the lifecycle and movement path of inventory (Push/Pull rules).

---

## Inbound Operations

### Suppliers
**Purpose:** CRM for your vendors, tracking payment terms and lead times.

### Purchase Orders & Receiving
**Purpose:** The commercial agreement to buy goods and the act of accepting them.
1. **Draft:** Create PO.
2. **Order:** Confirm PO.
3. **Receive:** Receive goods into a receiving location. Supports partial receiving.

### Putaway Operations
**Purpose:** Moving received goods from receiving areas to their designated storage locations.

**✨ New: Manual Inbound**
Manually adding an inventory batch (e.g., "Found stock") now triggers a standard Putaway Task, ensuring that even unplanned inventory follows the optimized storage logic.

**Workflow:**
1. **Start Session:** Batch multiple putaway tasks.
2. **View Tasks:** See optimized suggestions.
3. **Execute:** Physical move and confirmation.
4. **Complete:** Finalize session.

**Features:**
- **Smart Recommendations:** Based on Zone Priority and Product Velocity.
- **Exceptions:** Handle Location Full, Damaged, or Short Receipts.

### Putaway Rules Management
**Purpose:** Define sophisticated, rule-based logic for automated putaway location selection.

**Rule Components:**
- **Matching Criteria:** Product, Category, Velocity, Storage Requirements (Frozen, Hazmat), Weight, etc.
- **Strategies:**
  - **FIXED:** Dedicated locations.
  - **ZONE_PRIORITY:** Best available zone.
  - **CLOSEST:** Minimize travel.
  - **LEAST_OCCUPIED:** Balance utilization.
  - **BALANCED:** Random distribution.

---

### Multi-Step Receiving & Exception Handling
**Purpose:** Manage complex receiving flows involving Quality Control (QC) or multi-stage putaway.

**Process:**
1. **Chain Generation:** Upon receiving a PO, the system generates a `TransferOrder` containing a chain of linked `StockMoves` (e.g., Input -> QC -> Stock).
2. **Execution:** Workers execute each move sequentially.
3. **Exception Handling (Quality Failure):** If items fail QC, the worker can deviate from the standard flow by moving items to a *Quarantine* or *Scrap* location. The system detects this deviation and automatically re-routes the workflow, cancelling the original "Happy Path" move to Stock.

---

## Outbound Operations

### Creating Orders
**Purpose:** The demand signal. Allocates inventory.

### Picking Strategies
- **FIFO (First-In, First-Out):** Oldest stock first.
- **FEFO (First-Expired, First-Out):** Expiry date priority.

### Worker Interface
**Purpose:** Mobile-focused screen for picking execution.
- Scan Location -> Scan Product -> Confirm Pick.

### Delivery Methods
**Purpose:** Calculating shipping costs and managing delivery logistics.

**Method Types:**
- **Fixed Price:** Flat rate shipping cost
- **Rule-based:** Calculate based on weight, volume, and dimensions
- **Lalamove (On-Demand):** Real-time delivery quotations from Lalamove API

**✨ Lalamove Integration:**
The system provides seamless integration with Lalamove for on-demand delivery services in supported markets (Indonesia, Singapore, Thailand, Philippines, Vietnam).

**Setting Up Lalamove:**
1. Navigate to Configuration > Delivery Methods
2. Create a new delivery method with Provider = "LALAMOVE"
3. Configure your Lalamove credentials in environment variables
4. The system automatically maps markets to appropriate languages

**Using Lalamove for Order Delivery:**
1. **Create Order:** Ensure warehouse and customer have complete address information
2. **Select Method:** In the order's "Shipping Info" section, select "Lalamove Delivery (On-Demand)" from dropdown
3. **Auto-Quote:** System automatically fetches real-time quotation from Lalamove
4. **View Cost:** "Estimated Cost" updates to show actual Lalamove price (e.g., IDR 8,500)
5. **Apply:** Click "Apply" to confirm the delivery method
6. **Book Delivery:** Once order is ready to ship, use "Book Delivery" in the Lalamove card

**Supported Service Types:**
- **MOTORCYCLE:** Small, lightweight deliveries (< 20kg)
- **SEDAN:** Medium deliveries (20-100kg)
- **VAN:** Large deliveries (100-500kg)
- **LORRY:** Extra-large deliveries (> 500kg)

The system automatically selects the appropriate service type based on order weight.

**Requirements:**
- Warehouse must have: Street address, city, state, postal code, country, latitude, longitude
- Customer must have: Street address, city, state, postal code, country, latitude, longitude

### Invoices
**Purpose:** Financial documents. Sales Invoices (AR) and Vendor Bills (AP).

---

## Reporting & Admin

### Reports
**Purpose:** Compliance and Deep Dive.
- **Inventory Valuation:** Current stock value.
- **Compliance:** VAT/SAF-T data.

### Stock Moves
**Purpose:** The ledger of truth. Detailed record of every single transaction.

### Inventory Ledger
**Purpose:** A chronological, immutable record of every stock movement in the system. Essential for audits and traceability.

**Key Features:**
- **Unified History:** Combines data from Inbound Receipts, Outbound Orders, Adjustments, and Scrap.
- **Traceability:** Links directly back to source documents (PO Number, Order Number).
- **Detailed Columns:** Date, Type, Product, Quantity, Warehouse, Location, Notes.
- **Advanced Filtering:** Filter by Warehouse, Location, Product, Date Range, or Transaction Type.
- **Export to CSV:** Download the full ledger history for external reporting or auditing.

### Settings
**Purpose:** Admin controls for Users, Roles, and General configuration.

### API Keys & MCP Integration
**Purpose:** Enable secure programmatic access to the WMS and LLM-powered task orchestration.

**API Key Management:**
- **Generation:** Create secure API keys with granular permission scopes (e.g., `INVENTORY:READ`, `ORDERS:CREATE`)
- **Scope Selection:** Choose exactly which APIs each key can access
- **Lifecycle:** View last used date, revoke inactive keys, or delete keys permanently
- **Security:** Keys are shown only once during generation and stored as SHA-256 hashes

**MCP Server Integration:**
The system includes a Model Context Protocol (MCP) server that allows AI assistants like Claude to orchestrate warehouse operations using generated API keys.

**Available Tools:**
- **list_products:** Query inventory products
- **get_stock_levels:** Check current stock for any product
- **create_purchase_order:** Generate purchase orders programmatically
- **start_putaway_task:** Initiate putaway operations

**Setup:**
1. Navigate to Settings > API Keys
2. Generate a new key with desired scopes
3. Configure the MCP server in `apps/mcp/.env` with your key
4. Add to Claude Desktop config or use via MCP protocol

**Use Cases:**
- "Ask Claude to list all products in the warehouse"
- "Request stock levels for a specific item"
- "Generate purchase orders via natural language commands"
- "Automate warehouse task management through AI"


## Returns Management (RMA)

### Overview
**Purpose:** Manage customer returns efficiently, including validation, receiving, condition assessment, and inventory restocking.

### Process Flow
1. **Create Return Request:**
   - Initiate a return from an existing Sales Order.
   - Select items and quantities to return.
   - Assign a reason (e.g., "Damaged", "Wrong Item") and expected condition.

2. **Receive Return:**
   - Warehouse staff receives the returned items.
   - **Condition Check:** Verify if the item is `SELLABLE`, `DAMAGED`, or `REFURBISH`.
   - **Quality Control:** 
     - `SELLABLE`: Automatically restocked to a picking or storage location.
     - `DAMAGED`: Quarantined or scrapped.

3. **Restocking:**
   - The system automatically creates a `StockTransaction` (Transaction Type: `RETURN`) to increase inventory.
   - Financial adjustments (Refunds/Credits) are triggered based on the return status.

### How to Use
1. Navigate to **Orders > Returns**.
2. Click **New Return** and select the original Sales Order.
3. Once the physical item arrives, click **Receive**.
4. Input the **Received Quantity** and assessed **Condition**.
5. Click **Process Return** to finalize and update stock.

---

## Stocktaking & Cycle Counting

### Overview
**Purpose:** Maintain exact inventory accuracy through regular physical counts and reconciliation.

### Types of Stocktakes
- **Cycle Count:** Frequent, small-scale counts of high-velocity items (A-Class) or specific zones. Does not require shutting down the warehouse.
- **Full Stocktake:** Complete wall-to-wall count of the entire facility. Usually done annually.
- **Spot Check:** Ad-hoc count of a specific location or product to investigate a discrepancy.

### Workflow
1. **Create Session:** Define the scope (Warehouse, Zone, or Product Category).
2. **Generate Tasks:** System creates counting tasks for every location containing the target products.
3. **Count:**
   - Workers navigate to the location.
   - Enter the **Physical Quantity** found.
   - Blind counting supported (system doesn't show expected quantity).
4. **Reconcile:**
   - Manager reviews the **Discrepancy Report** (Variance between System vs. Counted).
   - **Approve Adjustments:** System automatically creates `StockTransaction` records (Type: `ADJUSTMENT`) to correct the inventory balance.

### How to Use
1. Navigate to **Inventory > Stocktaking**.
2. Click **New Session** and choose "Cycle Count".
3. Click **Generate Tasks**.
4. Open the **Counting Interface** and enter values for each task.
5. Click **Reconcile** → **Approve & Adjust Inventory** to finalize.

---



## Mobile Warehouse App

### Overview
**Purpose:** A dedicated, touch-friendly interface designed for warehouse workers to perform operations directly on the floor using handheld devices or tablets.

**Access:**
- URL: `/mobile/dashboard`
- **Features:** Large buttons, high contrast, simplified navigation, and barcode scanning support.

### Dashboard
The Mobile Dashboard provides quick access to core workflows:
- **Picking:** Process active picking sessions.
- **Putaway:** Handle incoming goods from receiving.
- **Stocktake:** Perform counting tasks.
- **Scan:** Quick lookup for Locations or Products.

### Workflows

#### 1. Picking
**Goal:** Fulfill customer orders by picking items from storage.
- **Process:**
  1. **Start Session:** App assigns a batch of tasks.
  2. **Navigate:** Go to the suggested Location.
  3. **Scan Location:** Verify you are at the correct bin (Green checkmark).
  4. **Scan Product:** Verify the item SKU/Barcode.
  5. **Confirm Qty:** Enter the quantity picked.
  6. **Next Task:** Automatically advances to the next optimized location.

#### 2. Putaway
**Goal:** Store received items in optimized locations.
- **Process:**
  1. **From:** See items in `Receiving Dock`.
  2. **To:** App suggests a destination based on putaway rules.
  3. **Execute:** Move item to target.
  4. **Scan Target:** Validate destination location.
  5. **Confirm:** Inventory is officially moved.

#### 3. Stocktaking
**Goal:** Verify physical inventory counts.
- **Process:**
  1. **Select Session:** Choosing an active count session.
  2. **Blind/Guided:** See expected quantity (Guided) or just input what you see (Blind).
  3. **Scan or Select:** Scan a bin to find tasks for that location.
  4. **Input:** Enter physical count.

#### 4. Universal Scanner (Quick Lookup)
**Goal:** Instant information without navigating menus.
- **Location Scan:** Shows location type and full address.
- **Product Scan:** Shows "On Hand" and "Available" stock levels for that item.

---

## End-to-End Examples

### Scenario A: The Full Retail Flow
1. **Buy:** Create PO, Receive goods.
2. **Sell:** Create Sales Order.
3. **Process:** Reserve -> Pick -> Pack -> Ship.
4. **Bill:** Generate Invoice.

### Scenario B: Resupplying a Retail Store (STO)
1. **Trigger:** Store needs stock.
2. **Action:** Create Transfer Order (Main -> Store).
3. **Execute:** Pick & Ship from Main.
4. **Receive:** Store receives items.
