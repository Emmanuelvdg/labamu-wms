# E2E Test Plan 2.0: Realistic User Journeys

This test plan simulates a "Day 1" deployment, starting with a clean environment (only Admin user exists). It covers the end-to-end setup and operation of a distribution center.

## Phase 0: Environment Reset
- [ ] **Scenario 0.1: Flush Data**
    - **Action**: Run `npx ts-node apps/api/scripts/flush-user-data.ts`
    - **Expected**: All Warehouses, Products, Orders, and transactional data are deleted. Admin account remains.

## Phase 1: Infrastructure Setup
**Persona**: Admin / Warehouse Manager

- [x] **Scenario 1.1: Initial Login**
    - **Action**: Login as `admin@labamu.co.id`.
    - **Expected**: Empty Dashboard. No errors.
- [x] **Scenario 1.2: Create Warehouse (DC1)**
    - **Action**: Go to Settings > Warehouses. Create "Distribution Center 1" (Code: DC1).
    - **Expected**: DC1 appears in the list.
- [x] **Scenario 1.3: Define Receiving Area**
    - **Action**: Go to Inventory > Locations. Create "Receiving Dock 1" inside DC1 (Type: INTERNAL).
    - **Expected**: Location created. this is critical for inbound workflows.
- [x] **Scenario 1.4: Define Storage Hierarchy**
    - **Action**: Create "Zone A" (Type: ROOM) inside DC1.
    - **Action**: Create "Row 1" (Type: ROW) inside "Zone A".
    - **Action**: Create "Shelf 1" (Type: SHELF) inside "Row 1".
    - **Action**: Create "Bin 01" (Type: POSITION) inside "Shelf 1".
    - **Expected**: Full hierarchy is visible in Location Tree.

## Phase 2: Catalog Management
**Persona**: Inventory Manager

- [x] **Scenario 2.1: Create Categories**
    - **Action**: Settings > Categories. Create "Electronics".
    - **Expected**: Category created.
- [x] **Scenario 2.2: Create Attributes**
    - **Action**: Settings > Attributes. Create "Serial Number" (Type: Text, Required: No).
    - **Expected**: Attribute available.
- [x] **Scenario 2.3: Create Suppliers**
    - **Action**: Procurement > Suppliers. Create "TechSupplier Inc".
    - **Expected**: Supplier listed.
- [x] **Scenario 2.4: Create Product (Laptop)**
    - **Action**: Inventory > New Item.
    - **Details**: Name: "Pro Laptop X", SKU: "LAP-X", Category: "Electronics", Price: $1000.
    - **Expected**: Product created. Stock: 0.

## Phase 3: Inbound Operations (Procure-to-Pay)
**Persona**: Purchasing Agent & Receiver

- [x] **Scenario 3.1: Create Purchase Order**
    - **Action**: Procurement > New Order.
    - **Details**: Supplier: "TechSupplier Inc", Item: "Pro Laptop X", Qty: 10.
    - **Expected**: PO created with status `DRAFT`.
- [x] **Scenario 3.2: Confirm PO**
    - **Action**: Open PO. Click "Confirm".
    - **Expected**: Status updates to `CONFIRMED` (ORDERED).
- [x] **Scenario 3.3: Receive Goods**
    - **Action**: Click "Receive Products".
    - **Details**: Receive to "Receiving Dock 1". Qty: 10.
    - **Expected**: Stock created at Dock. PO Status: `DONE` (RECEIVED). Inventory log shows IN.
- [x] **Scenario 3.4: Putaway Process**
    - **Action**: Navigate to Warehouse Ops > Putaway.
    - **Expected**: Putaway Task generated (Dock -> Storage).
    - **Action**: Execute Putaway (Move to "Bin 01").
    - **Expected**: Stock is now at "Zone A / Row 1 / Shelf 1 / Bin 01".

## Phase 4: Outbound Operations (Order-to-Cash)
**Persona**: Sales Rep & Warehouse Worker

- [x] **Scenario 4.1: Create Customer**
    - **Action**: Sales > Customers. Create "Corporate Client A".
    - **Expected**: Customer created.
- [x] **Scenario 4.2: Create Sales Order**
    - **Action**: Sales > New Order.
    - **Details**: Customer: "Corporate Client A", Item: "Pro Laptop X", Qty: 2.
    - **Expected**: SO created. Status: `PENDING`.
- [x] **Scenario 4.3: Allocate Order**
    - **Action**: Click "Allocate" (or Wait for auto-allocation).
    - **Expected**: Status: `RESERVED`. Stock at "Bin 01" is reserved.
- [x] **Scenario 4.4: Picking Process**
    - **Action**: Warehouse Ops > Picking. Start Session.
    - **Expected**: Task directs user to "Bin 01".
    - **Action**: Pick 2 units. Confirm.
    - **Expected**: Order Status: `PACKING`.
- [x] **Scenario 4.5: Packing & Shipping**
    - **Action**: Order Details > Ship Order.
    - **Action**: Enter Carrier: "DHL Test", Tracking: "TRACK-999".
    - **Expected**: Order Status: `SHIPPED`. Inventory deducted.

## Phase 5: Reporting & Analytics
**Persona**: Warehouse Manager

- [x] **Scenario 5.1: Cycle Time Analysis**
    - **Action**: Navigation > Reporting > Cycle Time.
    - **Expected**: Cycle Time Trend chart is visible with data bars and trendline.
    - **Action**: Click "Last 7 Days" filter.
    - **Expected**: Chart updates to show data for the selected period. Verified via Browser Subagent.
