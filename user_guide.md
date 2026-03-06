# Labamu WMS - User Guide

Comprehensive documentation for the Labamu Inventory Management System.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Inventory Management](#inventory-management)
3. [Floor Plan Management](#floor-plan-management)
4. [Inbound Operations](#inbound-operations)
5. [Outbound Operations](#outbound-operations)
6. [Transfer Operations](#transfer-operations)
7. [Reporting & Admin](#reporting--admin)
8. [Mobile Warehouse App](#mobile-warehouse-app)
9. [Packing Station](#packing-station)
10. [Shipping Documents](#shipping-documents)
11. [Replenishment Engine](#replenishment-engine)
12. [Notifications & Alerts](#notifications--alerts)
13. [Barcode Validation](#barcode-validation)
14. [Analytics & Classification](#analytics--classification)
15. [End-to-End Examples](#end-to-end-examples)

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
    - **Dimensions (L x W x H):** Inner usable space in mm.
    - **Max Weight:** Weight limit in kg.
These constraints are used by the system to prevent overloading locations during putaway recommendations.

**✨ Safe Deletion:**
Locations can only be deleted if they are empty and unused. The system prevents accidental data loss by blocking deletion if the location contains:
- **Child Locations:** Sub-locations must be removed first (e.g. remove Bins before checking Shelf).
- **Active Inventory:** Locations with stock cannot be deleted.
- **Open Tasks:** Any active Picking or Putaway tasks targeting this location must be completed or cancelled.

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

## Floor Plan Management

### Overview
**Purpose:** A visual, interactive warehouse layout editor that provides a 2D representation of your warehouse's physical space. The floor plan enables warehouse managers to design, visualize, and manage the spatial organization of their facility.

**Access:** Navigate to **Warehouse > Floor Plan** in the sidebar, or visit `/floor-plan`.

### ✨ Unified Floor Plan Editor

**Key Features:**
- **Meter-Based Coordinate System:** All positions and dimensions are in real-world meters, providing accurate spatial representation.
- **Snap-to-Grid:** Elements automatically snap to a configurable grid for clean, aligned layouts.
- **Zoom & Pan:** Mouse wheel to zoom, click-and-drag on empty space to pan the canvas.
- **Multi-Warehouse Support:** Use the warehouse selector dropdown to switch between facilities.

### Element Palette
Drag elements from the palette onto the canvas to build your layout:

| Element | Description |
|---------|-------------|
| **Room** | Major areas (e.g., Cold Storage, Hazmat Room) |
| **Row** | Shelf rows within a room |
| **Bay** | Horizontal sections of a row |
| **Shelf** | Vertical levels within a bay |
| **Bin** | Individual storage positions |

### Creating Floor Plan Objects
1. **Drag** an element type from the palette onto the canvas.
2. A **creation modal** appears with:
   - **Location Dropdown:** Select an existing location from the hierarchy (filtered by structural type).
   - **Dimensions:** Set width and height in meters.
   - **Color:** Choose a visual color for the element.
3. Click **Create** to place the element on the canvas.

### Editing & Moving Elements
- **Click** an element to select it (shows resize handles).
- **Drag** to reposition — element snaps to grid.
- **Resize** by dragging corner handles.
- Changes are **auto-saved** to the database.
- Positions persist across page refreshes.

### Functional Areas
When a warehouse is created, the system auto-generates functional areas (Receiving Dock, Main Storage, Shipping Dock) which appear on the floor plan with distinct colors. These areas are linked to physical locations and represent the workflow zones of your warehouse.

---

## Inbound Operations

### Suppliers
**Purpose:** CRM for your vendors, tracking payment terms and lead times.

### Purchase Orders & Receiving
**Purpose:** The commercial agreement to buy goods, the act of accepting them, quality assurance, and payment verification.

**Process Flow:**
1. **Create PO:** Draft purchase order with supplier, items, quantities, and costs.
2. **Confirm PO:** Order status changes to `ORDERED`.
3. **Receive Goods (GRN):** Receive goods into a receiving location. Supports partial receiving. Each receipt generates a Goods Receipt Note (GRN).
4. **Attach Documents:** Upload invoices, delivery notes, QA certificates, or photos against the PO.
5. **QA Inspection:** Record accepted/rejected quantities per product with rejection reasons (Breakage, Damaged, Expired, Wrong Item, Quality Issue).
6. **Inventory Adjustment:** Rejected quantities are automatically deducted from inventory with audit trail.
7. **3-Way Match:** Compare PO quantities vs. GRN received quantities vs. Invoice amounts to verify consistency before payment.

**✨ New: PO Detail Page (Tabbed Interface)**
Navigate to any Purchase Order to see a comprehensive 5-tab interface:
- **Details Tab:** PO header info (buyer, dates, ASN, terms) and line items table.
- **Receipts Tab:** GRN history showing received quantities per receipt.
- **Attachments Tab:** Drag-and-drop document upload zone. Supports Invoice, Delivery Note, QA Certificate, Photo, and Other types. Files stored securely with unique identifiers.
- **QA Inspection Tab:** Form to record accepted/rejected quantities per product line. Selecting a rejection reason triggers automatic inventory adjustments and stock transaction logging.
- **3-Way Match Tab:** Run a verification comparing PO ordered quantities, GRN received quantities, and Invoice quantities/costs. Shows pass/fail status per line item.

**Document Types:**
| Type | Code | Purpose |
|------|------|---------|
| Invoice | `INVOICE` | Vendor invoice for payment processing |
| Delivery Note | `DELIVERY_NOTE` | Carrier delivery confirmation |
| QA Certificate | `QA_CERT` | Quality assurance documentation |
| Photo | `PHOTO` | Visual evidence of delivery condition |
| Other | `OTHER` | Miscellaneous supporting documents |

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

### Managing Orders
**Cancelling Orders:**
Orders can be cancelled if they have not yet been shipped. Cancelling an order automatically:
- Releases any reserved stock back to "Available".
- Cancels associated picking tasks.
- Updates the order status to `CANCELLED`.

**Deleting Orders:**
For data integrity, multiple restrictions apply to deleting orders:
- **Allowed:** You can safely delete `PENDING` orders (if no stock is reserved) or `CANCELLED` orders.
- **Blocked:** Active orders (`RESERVED`, `PICKING`, `PACKING`) cannot be deleted. You must Cancel them first to release the stock.
- **Blocked:** `SHIPPED` orders cannot be deleted to preserve the historical ledger.

### Delivery Methods
**Purpose:** Calculating shipping costs and managing delivery logistics.

**Method Types:**
- **Fixed Price:** Flat rate shipping cost
- **Rule-based:** Calculate based on weight, volume, and dimensions
- **Lalamove (On-Demand):** Real-time delivery quotations from Lalamove API
- **Manual/Carrier:** Standard carrier shipping (DHL, FedEx, etc.)

### Shipping Execution
**Purpose:** Finalizing the outbound process by confirming shipment details.

**How to Ship an Order:**
1. Navigate to the Order Details page (Order must be in `PACKING` status).
2. Locate the **Process Shipment** section at the bottom of the "Shipping & Delivery" card.
3. Click **Ship Order**.
4. Enter the **Carrier Name** (e.g., DHL, FedEx) and **Tracking ID**.
5. Click **Confirm Shipment**.
   - The Order Status changes to `SHIPPED`.
   - Inventory is deducted from the system.
   - Tracking details are saved to the order.

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

## Transfer Operations

### Overview
**Purpose:** Manage internal stock transfers between warehouses to optimize inventory distribution, rebalance stock levels, or resupply remote locations.

Transfer Operations enable controlled movement of inventory between facilities with a two-stage approval workflow and full audit trail. This is essential for multi-warehouse operations where stock needs to be redistributed based on demand.

### Creating a Transfer Request

**How to Create:**
1. Navigate to **Internal Operations > Transfer Operations**.
2. Click **New Transfer**.
3. Fill in the transfer details:
   - **Source Warehouse:** The warehouse sending the inventory.
   - **Destination Warehouse:** The warehouse receiving the inventory.
   - **Products:** Add one or more products with quantities to transfer.
   - **Notes (Optional):** Add any relevant context (e.g., "Emergency restocking for Store A").
4. Click **Create Transfer**.

The transfer is created with status `PENDING` and awaits approval.

### Transfer Status Workflow

Transfers progress through the following statuses:

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **PENDING** | Transfer request created, awaiting approval | Approve, Cancel |
| **APPROVED** | Transfer approved by manager, ready for execution | Begin picking/shipment |
| **IN_TRANSIT** | Items picked from source, in transit to destination | Update tracking |
| **COMPLETED** | Items received at destination warehouse | View history |
| **CANCELLED** | Transfer cancelled before completion | None |

### Approving Transfer Requests

**Approval Workflow:**
1. Manager navigates to **Transfer Operations**.
2. Reviews pending transfers (status: `PENDING`).
3. Verifies:
   - Source warehouse has sufficient stock.
   - Destination warehouse needs the inventory.
   - Transfer aligns with business goals.
4. Clicks **Approve** button.
5. Transfer status changes to `APPROVED`.

**Best Practices:**
- Approve transfers during low-activity periods to minimize disruption.
- Verify stock availability before approving large transfers.
- Use notes to communicate special handling instructions.

### Managing Transfers

**Viewing Transfer History:**
- All transfers are displayed in a table with:
  - Transfer ID (shortened hash)
  - Source and Destination warehouses
  - Number of items
  - Current status
  - Initiator and approver names
  - Creation date

**Filtering Transfers:**
- (Future enhancement) Filter by warehouse, status, or date range.

**Cancelling Transfers:**
- Transfers in `PENDING` or `APPROVED` status can be cancelled.
- Once `IN_TRANSIT` or `COMPLETED`, transfers cannot be cancelled.

### Integration with Warehouse Operations

**Impact on Inventory:**
- **Source Warehouse:** Stock is reserved when transfer is `APPROVED`, deducted when `IN_TRANSIT`.
- **Destination Warehouse:** Stock is added when transfer is `COMPLETED`.

**Picking Integration:**
- Once approved, transfers generate picking tasks at the source warehouse.
- Workers use the standard Picking interface to prepare items for shipment.

**Receiving Integration:**
- Destination warehouse receives items via standard Receiving workflow.
- Transfer is marked `COMPLETED` upon final receipt confirmation.

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

## Packing Station

### Overview
**Purpose:** Streamline the packing process for outbound orders with a dedicated workspace and parcel management.

**Process:**
1. **Queue:** Navigate to the Packing page. Orders in `PACKING` status appear in the queue.
2. **Start Session:** Select an order and click "Start Packing" to create a packing session.
3. **Add Parcels:** Create one or more parcels per order. Enter parcel weight and assign items.
4. **Complete:** Once all items are assigned to parcels, click "Complete Packing". The session status changes to `COMPLETED`.

---

## Shipping Documents

### Overview
**Purpose:** Generate professional shipping documents for outbound logistics.

**Available Documents:**
| Document | Endpoint | Contents |
|----------|----------|----------|
| **Shipping Label** | `GET /shipping/label/:orderId` | Barcode, order ID, destination address, tracking info |
| **Packing Slip** | `GET /shipping/packing-slip/:orderId` | Itemized list with quantities and descriptions |
| **Daily Manifest** | `GET /shipping/manifest/:warehouseId` | All shipments for the date with summary totals |

---

## Replenishment Engine

### Overview
**Purpose:** Proactively monitor stock levels and generate purchase orders before stockouts occur.

**Workflow:**
1. **Check Levels:** Run `POST /inventory/replenishment/check` to scan all products against their `reorderPoint`.
2. **View Alerts:** Navigate to Replenishment Dashboard. Products below threshold are listed with severity ranking.
3. **Auto-Create PO:** Click "Auto-Create PO" to generate a purchase order for the recommended quantity.
4. **Dismiss:** Dismiss irrelevant alerts. They will regenerate on the next check if still below threshold.

---

## Notifications & Alerts

### Overview
**Purpose:** Keep all users informed of critical warehouse events through in-app notifications.

**Notification Bell:**
- Visible in the top navigation bar after login.
- Red badge shows unread notification count.
- Click to see the latest notifications in a dropdown.

**Notification Types:**
| Type | Description |
|------|-------------|
| `EXPIRY_WARNING` | Batch expiring within the configured threshold (default: 30 days) |
| `EXPIRED_STOCK` | Batch with stock that has already expired |
| `LOW_STOCK` | Product below reorder point |
| `SYSTEM` | General system alerts |

**Expiry Checking:**
- Run `POST /notifications/check-expiry` to scan all inventory batches.
- Batches expiring within 30 days generate `EXPIRY_WARNING` notifications.
- Already expired batches with remaining stock generate `EXPIRED_STOCK` notifications.

---

## Barcode Validation

### Overview
**Purpose:** Universal barcode lookup and context-aware validation for mobile scanning workflows.

**Universal Lookup:** `POST /barcode/lookup`
- Resolves barcodes to **Product** (by SKU), **Location** (by code), or **Batch** (by batch number).
- Returns entity type and full details.
- Returns `400` with clear message if barcode is unrecognized.

**Scan-to-Receive:** `POST /purchase-orders/:id/scan-receive`
- Scan a product barcode to receive 1 unit against a PO.
- Validates that the product is in the PO line items.
- Automatically selects a default receiving location.

**Scan-to-Pick:** `POST /strategy/picking/tasks/:id/scan-pick`
- Validates scanned barcode matches the expected product for the task.
- Marks the picking task as completed on successful scan.

---

## Analytics & Classification

### ABC Auto-Classification
**Purpose:** Automatically classify products into A/B/C tiers based on outbound velocity to optimize warehouse layout.

**Usage:** `POST /inventory/abc-classification/:warehouseId/run` with `{ "periodDays": 90 }`
- **A-Class:** Top 80% of outbound value (fast-moving) → store in Golden Zone.
- **B-Class:** Next 15% of value (medium) → store in accessible areas.
- **C-Class:** Bottom 5% of value (slow-moving) → store in back of house.

### Pick Accuracy Metrics
**Purpose:** Track warehouse picking quality over configurable time periods.

**Usage:** `GET /reporting/pick-accuracy/:warehouseId?periodDays=30`

**Returned Metrics:**
- `accuracyPercentage` — Overall pick accuracy rate
- `totalTasks` — Total picking tasks in the period
- `perfectPicks` — Tasks completed without exceptions
- `exceptions` — Tasks with exception reasons
- `shortPicks` — Tasks where picked quantity was less than requested

### Zone-Scoped Cycle Counts
**Purpose:** Generate expected inventory counts for specific warehouse zones without counting everything.

**Usage:** `GET /reporting/cycle-count/:warehouseId?zone=Zone+A`
- Returns inventory records limited to locations matching the zone pattern.
- Includes `expectedQuantity` per product/location combination.
- Ideal for targeted auditing of high-value zones.

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
