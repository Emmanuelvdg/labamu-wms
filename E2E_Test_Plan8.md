# E2E Test Plan 8.0: Full Regression Suite

This test plan is a clean execution intended to verify the recent Beta Remediation fixes, featuring new test cases for dashboard drilldowns, utilisation reporting, and security boundaries.

**Date**: 2026-03-03
**Prerequisites**: Dev servers running on ports 3000 (web) and 3001 (api)

---

## Traceability Matrix: User Guide → E2E Coverage

| # | User Guide Section | E2E Scenario(s) | Phase |
|---|---|---|---|
| 1 | Security & Auth | 1.0: Rate Limiting / 1.1: Login | 1 |
| 2 | Dashboard & Reports | 6.1: Metrics, 6.2: Drilldown, 6.3: Utilisation, 6.4: Cycle Time | 6 |
| 3 | Products | 2.2: Create Product | 2 |
| 4 | Locations | 1.4: Define Receiving Area, 1.5: Define Storage Hierarchy | 1 |
| 5 | Warehouses | 1.3: Create Warehouse (DC1) | 1 |
| 6 | Unified Floor Plan | 7.1–7.7: Floor Plan Access, Create Object, Drag & Drop, Resize, Bins, Functional Areas | 7 |
| 7 | Adjustments | 10.1: Create Adjustment (Relative), 10.2: Verify in Ledger | 10 |
| 8 | Scrap Orders | 10.3: Create Scrap Order, 10.4: Verify in Stock Moves | 10 |
| 9 | Partner Locations | 10.6: Create Partner Location | 10 |
| 10 | Routes | 10.5: Create Route | 10 |
| 11 | Stocktaking | 12.1–12.5: Session, Generate Tasks, Count, Discrepancy, Reconcile | 12 |
| 12 | Suppliers | 2.3: Create Suppliers | 2 |
| 13 | Purchase Orders | 3.1–3.2: Create & Confirm PO, Receive Goods | 3 |
| 14 | PO QA & Documents | 9.1–9.7: PO Detail, Upload Invoice, QA Inspection, 3-Way Match | 9 |
| 15 | Putaway | 3.3: Putaway Process | 3 |
| 16 | Putaway Rules | 11.1–11.4: Create (FIXED/ZONE_PRIORITY), Edit, Delete Rules | 11 |
| 17 | Picking Strategies | 11.5: Verify FIFO | 11 |
| 18 | Rotation Policies | 11.6: Verify FEFO | 11 |
| 19 | Sales Orders | 4.1: Create Sales Order, 5.1: Cancel Pending Order | 4, 5 |
| 20 | Worker Interface | 4.3: Mobile Picking (Simulated) | 4 |
| 21 | Delivery Methods | 8.1: Lalamove Live Quote | 8 |
| 22 | Shipping | 4.4: Pack & Ship | 4 |
| 23 | Invoices | 13.4: Create Sales Invoice | 13 |
| 24 | Returns (RMA) | 13.1–13.3: Create Return, Receive Damaged, Receive Sellable | 13 |
| 25 | Audit Trail | 13.5: Stock Moves, 13.6: Inventory Ledger Export | 13 |
| 26 | Settings & RBAC | 14.1: Access Settings, 14.2: Create User, 14.3: Verify Permissions | 14 |
| 27 | Mobile App | 14.5: Mobile Dashboard, 14.6: Mobile Putaway Workflow | 14 |
| 28 | User Guide | 14.4: Access User Guide | 14 |
| 29 | Safety & Limits | 5.2: Deletion Safety, 5.3: Capacity Limit Check | 5 |

---

## Phase 0: Environment Reset
- [x] **Scenario 0.1: Flush Data**
    - **Action**: Run `npx ts-node apps/api/scripts/flush-user-data.ts`
    - **Expected**: All Warehouses, Products, Orders, and transactional data are deleted. Admin account remains.
    - **Result**: **PASSED**

---

## Phase 1: Infrastructure Setup & Security
**Persona**: Admin / Warehouse Manager

- [ ] **Scenario 1.0: Auth Rate Limiting**
    - **Action**: Attempt to login 6 times rapidly with an incorrect password.
    - **Expected**: By the 6th attempt, the API should return a `429 Too Many Requests` error, proving the rate limiter is active.
    - **Result**: **FAILED** (10 attempts made, all returned 401 Unauthorized, no rate limiting triggered)

- [x] **Scenario 1.1: Initial Login**
    - **Action**: Navigate to `http://localhost:3000`. Login as `admin@labamu.co.id`.
    - **Expected**: Dashboard loads (empty state acceptable). No errors.
    - **Result**: **PASSED**

- [x] **Scenario 1.2: Check CORS Headers**
    - **Action**: Verify the browser network tab for the `/auth/me` request.
    - **Expected**: Request succeeds. `x-user-id` is included and accepted by CORS. Sidebar menu renders all restricted modules successfully.
    - **Result**: **PASSED**

- [x] **Scenario 1.3: Create Warehouse (DC1)**
    - **Action**: Navigate to Settings > Warehouses. Create "Distribution Center 1" (Code: DC1).
    - **Expected**: DC1 appears in the warehouse list.
    - **Result**: **PASSED**

- [x] **Scenario 1.4: Define Receiving Area**
    - **Action**: Navigate to Inventory > Locations. Create "Receiving Dock 1" inside DC1 (Type: INTERNAL).
    - **Expected**: Location created and visible in location tree.
    - **Result**: **PASSED**

- [x] **Scenario 1.5: Define Storage Hierarchy**
    - **Action**: Create hierarchy: "Zone A" (ROOM) -> "Row 1" (ROW) -> "Shelf 1" (SHELF) -> "Bin 01" (POSITION).
    - **Expected**: Full hierarchy visible in Location Tree.
    - **Result**: **PASSED**

---

## Phase 2: Catalog Management
**Persona**: Inventory Manager

- [x] **Scenario 2.1: Create Categories**
    - **Action**: Settings > Categories. Create "Electronics".
    - **Expected**: Category created and listed.
    - **Result**: **PASSED**

- [x] **Scenario 2.2: Create Product**
    - **Action**: Inventory > New Item.
    - **Details**: Name: "Pro Laptop X", SKU: "LAP-X", Category: "Electronics". Dimensions: 20x20x20cm. Weight: 2.5kg.
    - **Expected**: Product created. Stock shows 0.
    - **Result**: **PASSED**

- [x] **Scenario 2.3: Create Suppliers**
    - **Action**: Procurement > Suppliers. Create "TechSupplier Inc".
    - **Expected**: Supplier appears in list.
    - **Result**: **PASSED**

---

## Phase 3: Inbound Operations (Procure-to-Pay)
**Persona**: Purchasing Agent & Receiver

- [/] **Scenario 3.1: Create & Confirm PO**
    - **Action**: Procurement > New Order. Supplier: "TechSupplier Inc", Item: "Pro Laptop X", Qty: 10. Confirm PO.
    - **Expected**: Status `CONFIRMED`.
    - **Result**: **PENDING**

- [ ] **Scenario 3.2: Receive Goods**
    - **Action**: Receive to "Receiving Dock 1". Qty: 10.
    - **Expected**: Stock at Dock. PO Status `DONE`.
    - **Result**: **PENDING**

- [ ] **Scenario 3.3: Putaway Process**
    - **Action**: Warehouse Ops > Putaway. Move items from "Receiving Dock 1" to "Bin 01".
    - **Expected**: Stock is now at "Bin 01". Receiving Dock 1 is empty.
    - **Result**: **PENDING**

---

## Phase 4: Outbound Operations (Order-to-Cash)
**Persona**: Sales Rep & Warehouse Worker

- [ ] **Scenario 4.1: Create Sales Order**
    - **Action**: Sales > New Order. Customer: "Corporate Client A" (Create if needed). Item: "Pro Laptop X", Qty: 2.
    - **Expected**: SO created. Status `DRAFT`.
    - **Result**: **PENDING**

- [ ] **Scenario 4.2: Allocate Order**
    - **Action**: Click "Allocate".
    - **Expected**: Status `RESERVED`. Stock at "Bin 01" reserved.
    - **Result**: **PENDING**

- [ ] **Scenario 4.3: Mobile Picking (Simulated)**
    - **Action**: Navigate to `/mobile/dashboard`. Open Picking Task. Scan Bin 01 -> Product -> Confirm Qty 2.
    - **Expected**: Order Status `PACKING`.
    - **Result**: **PENDING**

- [ ] **Scenario 4.4: Pack & Ship**
    - **Action**: Sales > Order Details. Ship Order (Carrier: "DHL Test").
    - **Expected**: Status `SHIPPED`. Inventory deducted (8 remaining).
    - **Result**: **PENDING**

---

## Phase 5: Safety & Exceptions
**Persona**: Administrator

- [ ] **Scenario 5.1: Cancel Pending Order**
    - **Action**: Create new SO for 1 unit. Allocate. Cancel Order.
    - **Expected**: Status `CANCELLED`. Stock released.
    - **Result**: **PENDING**

- [ ] **Scenario 5.2: Verify Deletion Safety**
    - **Action**: Attempt to delete "Distribution Center 1" (has locations/stock).
    - **Expected**: Deletion blocked with clear error message.
    - **Result**: **PENDING**

- [ ] **Scenario 5.3: Capacity Limit Check**
    - **Action**: Attempt to move 5000 units of "Pro Laptop X" (2.5kg each) into a Bin with a 500kg max weight limit.
    - **Expected**: Graceful AppError explaining capacity limits exceeded.
    - **Result**: **PENDING**

---

## Phase 6: Reporting & Analytics
**Persona**: Manager

- [ ] **Scenario 6.1: Dashboard Metrics**
    - **Action**: Navigate to Dashboard (`/`).
    - **Expected**: Stock value, fulfillment rate, and pending order metrics are displayed accurately.
    - **Result**: **PENDING**

- [ ] **Scenario 6.2: Dashboard Drilldown**
    - **Action**: Click on the "Pending Orders" metric card on the dashboard.
    - **Expected**: Navigates to the `/orders` page, with filters pre-applied to show only open/pending orders.
    - **Result**: **PENDING**

- [ ] **Scenario 6.3: Utilisation Report & Drilldown Testing**
    - **Action**: Reporting > Utilisation. Select "Distribution Center 1" and view the graph. Hover or click specific data points / bins.
    - **Expected**: Graph displays space utilized vs available. Enables drilldown to see exactly which products or SKU categories occupy the capacity in specific locations.
    - **Result**: **PENDING**

- [ ] **Scenario 6.4: Cycle Time**
    - **Action**: Reporting > Cycle Time.
    - **Expected**: Graph loads with order cycle time trends accurately.
    - **Result**: **PENDING**

---

## Phase 7: Floor Plan Features
**Persona**: Warehouse Manager

- [ ] **Scenario 7.1: Unified Floor Plan Access**
    - **Action**: Navigate to `/floor-plan`. Select "Distribution Center 1".
    - **Expected**: Floor plan canvas loads with grid. Functional areas are displayed.
    - **Result**: **PENDING**

- [ ] **Scenario 7.2: Create Floor Plan Object**
    - **Action**: Drag "New Room" from palette onto the canvas.
    - **Expected**: Modal appears with Location dropdown, dimension fields, and color picker.
    - **Result**: **PENDING**

- [ ] **Scenario 7.3: Location Dropdown Filtering**
    - **Action**: In the creation modal, click the Location dropdown.
    - **Expected**: Only valid parent locations matching the semantic constraints are shown.
    - **Result**: **PENDING**

- [ ] **Scenario 7.4: Drag & Drop Elements**
    - **Action**: Drag an existing element to a new position on the canvas.
    - **Expected**: Element snaps to grid. Position persists after refresh.
    - **Result**: **PENDING**

- [ ] **Scenario 7.5: Resize Element**
    - **Action**: Select an element. Drag the corner handle to resize.
    - **Expected**: Element dimensions update. New size persists after refresh.
    - **Result**: **PENDING**

- [ ] **Scenario 7.6: Add Bin to Floor Plan**
    - **Action**: Drag "Bin" from palette. Select "Bin 01" from dropdown.
    - **Expected**: Exactly 1 bin object is created on the canvas. Bug from v7 where multiple bins spawned is fixed.
    - **Result**: **PENDING**

- [ ] **Scenario 7.7: Functional Areas Display**
    - **Action**: Observe the floor plan for DC1.
    - **Expected**: Auto-generated functional areas (Receiving Dock, Main Storage, Shipping Dock) are visible.
    - **Result**: **PENDING**

---

## Phase 8: Live Integrations (Lalamove)
- [ ] **Scenario 8.1: Live Quote**
    - **Action**: Create SO. Click Ship -> Lalamove -> Get Quote.
    - **Expected**: Real quote returned or fails gracefully with clear missing API key error.
    - **Result**: **PENDING**

---

## Phase 9: Purchase Order Receiving & QA
**Persona**: QA Inspector

- [ ] **Scenario 9.1: Navigate to PO Detail**
    - **Action**: Navigate to Inbound > Purchase Orders. Click on the PO.
    - **Expected**: Detail page loads with 5 tabs (Details, Receipts, Attachments, QA Inspection, 3-Way Match).
    - **Result**: **PENDING**

- [ ] **Scenario 9.2: Upload Invoice**
    - **Action**: Click "Attachments". Drag and drop a PDF file (Invoice).
    - **Expected**: Document logged with type "INVOICE".
    - **Result**: **PENDING**

- [ ] **Scenario 9.3: Upload Delivery Note**
    - **Action**: Upload a second file (Delivery Note).
    - **Expected**: Second document appears in list. Badge shows count "2".
    - **Result**: **PENDING**

- [ ] **Scenario 9.4: Submit QA Inspection (All Accepted)**
    - **Action**: Click "QA Inspection". Keep all quantities accepted. Submit.
    - **Expected**: Inspection status "PASSED".
    - **Result**: **PENDING**

- [ ] **Scenario 9.5: Submit QA Inspection (Partial Rejection)**
    - **Action**: "+ New Inspection". Set Accepted=8, Rejected=2, Reason=Breakage. Submit.
    - **Expected**: Inspection "PARTIAL". Inventory reduced by 2 units via `ADJUSTMENT`.
    - **Result**: **PENDING**

- [ ] **Scenario 9.6: Run 3-Way Match**
    - **Action**: Click "3-Way Match". Click "Run 3-Way Match".
    - **Expected**: Status evaluates to MATCHED or DISCREPANCY depending on QA and Invoice data.
    - **Result**: **PENDING**

- [ ] **Scenario 9.7: Verify Receipts Tab**
    - **Action**: Click "Receipts" tab.
    - **Expected**: All GRNs listed chronologically.
    - **Result**: **PENDING**

---

## Phase 10: Inventory Adjustments, Scrap, Routes
**Persona**: Inventory Manager

- [ ] **Scenario 10.1: Create Inventory Adjustment (Relative)**
    - **Action**: Inventory > Adjustments. Select "Bin 01", product "Pro Laptop X". Enter relative adjustment: +2. Reason: "Found Stock".
    - **Expected**: Adjustment created. StockTransaction marked as `ADJUSTMENT`.
    - **Result**: **PENDING**

- [ ] **Scenario 10.2: Verify Adjustment in Ledger**
    - **Action**: View Adjustments list.
    - **Expected**: +2 adjustment appears in the ledger.
    - **Result**: **PENDING**

- [ ] **Scenario 10.3: Create Scrap Order**
    - **Action**: Inventory > Scrap. 1 unit of "Pro Laptop X" from "Bin 01". Reason: "Damaged".
    - **Expected**: Scrap order created. Stock at "Bin 01" decreases by 1.
    - **Result**: **PENDING**

- [ ] **Scenario 10.4: Verify Scrap in Stock Moves**
    - **Action**: API `/inventory/transactions`
    - **Expected**: Scrap transaction appears with correct reason.
    - **Result**: **PENDING**

- [ ] **Scenario 10.5: Create Route**
    - **Action**: Inventory > Routes. Create Push Rule: "Receiving Dock → Main Storage".
    - **Expected**: Route created.
    - **Result**: **PENDING**

- [ ] **Scenario 10.6: Create Partner Location**
    - **Action**: Inventory > Locations. Create type CUSTOMER.
    - **Expected**: Partner location appears in tree.
    - **Result**: **PENDING**

---

## Phase 11: Putaway Rules & Picking Strategies
**Persona**: Warehouse Manager

- [ ] **Scenario 11.1: Create Putaway Rule (Fixed)**
    - **Action**: Inbound > Putaway Rules. Strategy: FIXED, Destination: "Bin 01". Priority: 10.
    - **Expected**: Rule created.
    - **Result**: **PENDING**

- [ ] **Scenario 11.2: Create Putaway Rule (Zone)**
    - **Action**: Strategy: ZONE_PRIORITY. Priority: 5.
    - **Expected**: Rule created.
    - **Result**: **PENDING**

- [ ] **Scenario 11.3: Edit & Delete Rules**
    - **Action**: Edit test rule priority. Then delete rule.
    - **Expected**: Priority updates correctly, deletion succeeds.
    - **Result**: **PENDING**

- [ ] **Scenario 11.4: Verify Picking Strategy (FIFO)**
    - **Action**: Process Sales Order against 2 inventory batches.
    - **Expected**: System reserves stock from the oldest batch. Date parse `Invalid time value` bug from v7 is fixed.
    - **Result**: **PENDING**

- [ ] **Scenario 11.5: Rotation Policy (FEFO)**
    - **Action**: Set location to FEFO. Add batches with expiries.
    - **Expected**: Earliest expiry reserved first.
    - **Result**: **PENDING**

---

## Phase 12: Stocktaking & Cycle Counting
**Persona**: Warehouse Manager & Worker

- [ ] **Scenario 12.1: Create Stocktake Session**
    - **Action**: Inventory > Stocktaking. Cycle Count for DC1.
    - **Expected**: Session created (PLANNED).
    - **Result**: **PENDING**

- [ ] **Scenario 12.2: Generate Counting Tasks**
    - **Action**: Generate Tasks.
    - **Expected**: Tasks created for populated locations.
    - **Result**: **PENDING**

- [ ] **Scenario 12.3: Count Variations**
    - **Action**: Submit one matching count (Variance 0) and one discrepancy error (Variance -1).
    - **Expected**: Status updates correctly. Discrepancy highlighted.
    - **Result**: **PENDING**

- [ ] **Scenario 12.4: Reconcile Adjustments**
    - **Action**: Reconcile and Approve.
    - **Expected**: Session COMPLETED. StockTransactions for variances logged.
    - **Result**: **PENDING**

---

## Phase 13: Returns, Invoices & Audit Trail
**Persona**: Sales Manager & Finance

- [ ] **Scenario 13.1: Create Return Request (RMA)**
    - **Action**: Orders > Returns. New Return for Shipped Order. Reason "Damaged".
    - **Expected**: Return created (PENDING).
    - **Result**: **PENDING**

- [ ] **Scenario 13.2: Receive Return (Damaged vs Sellable)**
    - **Action**: Receive 1 Damaged, then receive 1 Sellable.
    - **Expected**: Damaged goes to Quarantine. Sellable goes to Restock/Storage.
    - **Result**: **PENDING**

- [ ] **Scenario 13.3: Create Sales Invoice**
    - **Action**: Outbound > Invoices. Link to Sales Order.
    - **Expected**: Invoice generated properly without HTTP 500 error.
    - **Result**: **PENDING**

- [ ] **Scenario 13.4: Verify Audit Trail**
    - **Action**: View Stock Moves for "Pro Laptop X".
    - **Expected**: Chronological trail of IN, MOVE, RESERVE, OUT, ADJUST, RETURN.
    - **Result**: **PENDING**

- [ ] **Scenario 13.5: Ledger Export**
    - **Action**: Reporting > Inventory Ledger. Export CSV.
    - **Expected**: CSV downloads with accurate records.
    - **Result**: **PENDING**

---

## Phase 14: Role-Based Access (RBAC) & Settings
**Persona**: Administrator

- [ ] **Scenario 14.1: Access Settings**
    - **Action**: Settings (`/settings`).
    - **Expected**: Page loads successfully.
    - **Result**: **PENDING**

- [ ] **Scenario 14.2: Create User**
    - **Action**: Create user "worker@labamu.co.id" with role "Warehouse Worker".
    - **Expected**: User listed.
    - **Result**: **PENDING**

- [ ] **Scenario 14.3: Verify Missing Permissions**
    - **Action**: Log in as worker.
    - **Expected**: Worker is redirected or prevented from accessing restricted views. Sidebar only shows items they have rights to.
    - **Result**: **PENDING**

- [ ] **Scenario 14.4: User Guide Access**
    - **Action**: Access `/user-guide`.
    - **Expected**: Documentation is available with all sections.
    - **Result**: **PENDING**

- [ ] **Scenario 14.5: Mobile Interfaces**
    - **Action**: Enter `/mobile/dashboard` and execute a Putaway flow.
    - **Expected**: Mobile interface renders large touch targets and fulfills API requests seamlessly.
    - **Result**: **PENDING**

---

## Execution Summary
| Phase | Title | Scenarios | Status |
|-------|-------|-----------|--------|
| 0 | Environment Reset | 1 | ⌛ Pending |
| 1 | Auth & Setup | 6 | ⌛ Pending |
| 2 | Catalog | 3 | ⌛ Pending |
| 3 | Inbound | 3 | ⌛ Pending |
| 4 | Outbound | 4 | ⌛ Pending |
| 5 | Exceptions | 3 | ⌛ Pending |
| 6 | Reports & Analytics | 4 | ⌛ Pending |
| 7 | Floor Plans | 7 | ⌛ Pending |
| 8 | Lalamove | 1 | ⌛ Pending |
| 9 | PO & QA | 7 | ⌛ Pending |
| 10 | Ledger | 6 | ⌛ Pending |
| 11 | Strategies | 5 | ⌛ Pending |
| 12 | Stocktaking | 4 | ⌛ Pending |
| 13 | Audit | 5 | ⌛ Pending |
| 14 | RBAC | 5 | ⌛ Pending |
| **Total** | | **64** | **0% Completed** |
