# E2E Test Plan 6.0: Full Regression Suite

This test plan updates E2E-Test_Plan5.md with the latest features and addresses previously incomplete scenarios.

**Date**: 2026-02-09
**Prerequisites**: Dev servers running on ports 3000 (web) and 3001 (api)

---

## Phase 0: Environment Reset
- [ ] **Scenario 0.1: Flush Data**
    - **Action**: Run `npx ts-node apps/api/scripts/flush-user-data.ts`
    - **Expected**: All Warehouses, Products, Orders, and transactional data are deleted. Admin account remains.

---

## Phase 1: Infrastructure Setup
**Persona**: Admin / Warehouse Manager

- [ ] **Scenario 1.1: Initial Login**
    - **Action**: Navigate to `http://localhost:3000`. Login as `admin@labamu.co.id`.
    - **Expected**: Dashboard loads (empty state acceptable). No errors.

- [ ] **Scenario 1.2: Create Warehouse (DC1)**
    - **Action**: Navigate to Settings > Warehouses. Create "Distribution Center 1" (Code: DC1).
    - **Expected**: DC1 appears in the warehouse list.

- [ ] **Scenario 1.3: Define Receiving Area**
    - **Action**: Navigate to Inventory > Locations. Create "Receiving Dock 1" inside DC1 (Type: INTERNAL).
    - **Expected**: Location created and visible in location tree.

- [ ] **Scenario 1.4: Define Storage Hierarchy**
    - **Action**: Create hierarchy: "Zone A" (ROOM) -> "Row 1" (ROW) -> "Shelf 1" (SHELF) -> "Bin 01" (POSITION).
    - **Expected**: Full hierarchy visible in Location Tree with expand/collapse.

---

## Phase 2: Catalog Management
**Persona**: Inventory Manager

- [ ] **Scenario 2.1: Create Categories**
    - **Action**: Settings > Categories. Create "Electronics".
    - **Expected**: Category created and listed.

- [ ] **Scenario 2.2: Create Product**
    - **Action**: Inventory > New Item.
    - **Details**: Name: "Pro Laptop X", SKU: "LAP-X", Category: "Electronics". Dimensions: 20x20x20cm.
    - **Expected**: Product created. Stock shows 0.

- [ ] **Scenario 2.3: Create Suppliers**
    - **Action**: Procurement > Suppliers. Create "TechSupplier Inc".
    - **Expected**: Supplier appears in list.

---

## Phase 3: Inbound Operations (Procure-to-Pay)
**Persona**: Purchasing Agent & Receiver

- [ ] **Scenario 3.1: Create & Confirm PO**
    - **Action**: Procurement > New Order. Supplier: "TechSupplier Inc", Item: "Pro Laptop X", Qty: 10. Confirm PO.
    - **Expected**: Status `CONFIRMED`.

- [ ] **Scenario 3.2: Receive Goods**
    - **Action**: Receive to "Receiving Dock 1". Qty: 10.
    - **Expected**: Stock at Dock. PO Status `DONE`.

- [ ] **Scenario 3.3: Putaway Process**
    - **Action**: Warehouse Ops > Putaway. Move items from "Receiving Dock 1" to "Bin 01".
    - **Expected**: Stock is now at "Bin 01". Receiving Dock 1 is empty.

---

## Phase 4: Outbound Operations (Order-to-Cash)
**Persona**: Sales Rep & Warehouse Worker

- [ ] **Scenario 4.1: Create Sales Order**
    - **Action**: Sales > New Order. Customer: "Corporate Client A" (Create if needed). Item: "Pro Laptop X", Qty: 2.
    - **Expected**: SO created.

- [ ] **Scenario 4.2: Allocate Order**
    - **Action**: Click "Allocate".
    - **Expected**: Status `RESERVED`. Stock at "Bin 01" reserved.

- [ ] **Scenario 4.3: Mobile Picking (Simulated)**
    - **Action**: Navigate to `/mobile/dashboard`. Open Picking Task. Scan Bin 01 -> Product -> Confirm Qty 2.
    - **Expected**: Order Status `PACKING`.

- [ ] **Scenario 4.4: Pack & Ship**
    - **Action**: Sales > Order Details. Ship Order (Carrier: "DHL Test").
    - **Expected**: Status `SHIPPED`. Inventory deducted (8 remaining).

---

## Phase 5: Safety & Exceptions
**Persona**: Administrator

- [ ] **Scenario 5.1: Cancel Pending Order**
    - **Action**: Create new SO for 1 unit. Allocate. Cancel Order.
    - **Expected**: Status `CANCELLED`. Stock released.

- [ ] **Scenario 5.2: Verify Deletion Safety**
    - **Action**: Attempt to delete "Distribution Center 1" (has locations/stock).
    - **Expected**: Deletion blocked with error message.
    - **Note**: Previously FAILED in Plan 5 - verify if fixed.

- [ ] **Scenario 5.3: Capacity Limit Check**
    - **Action**: Attempt to move stock exceeding location weight limit.
    - **Expected**: Graceful error message (not 500 error).

---

## Phase 6: Reporting & Analytics
**Persona**: Manager

- [ ] **Scenario 6.1: Dashboard Metrics**
    - **Action**: Navigate to Dashboard (`/`).
    - **Expected**: Non-zero metrics after Phase 4 completion. Stock value, fulfillment rate shown.

- [ ] **Scenario 6.2: Utilisation Graph**
    - **Action**: Reporting > Utilisation. Select "Distribution Center 1".
    - **Expected**: Graph shows utilisation. Bin-01 appears in dropdown.

- [ ] **Scenario 6.3: Cycle Time**
    - **Action**: Reporting > Cycle Time.
    - **Expected**: Graph loads with order cycle time data.

---

## Phase 7: Floor Plan Features (NEW)
**Persona**: Warehouse Manager

- [ ] **Scenario 7.1: Unified Floor Plan Access**
    - **Action**: Navigate to `/floor-plan`. Select "Distribution Center 1".
    - **Expected**: Floor plan canvas loads with grid.

- [ ] **Scenario 7.2: Location Dropdown in Creation Modal**
    - **Action**: Drag "New Room" from palette to canvas.
    - **Expected**: Modal shows "Select Location" dropdown (not text input) with filtered Room options.

- [ ] **Scenario 7.3: Drag & Drop Elements**
    - **Action**: Drag an existing element to new position.
    - **Expected**: Element snaps to grid. Position persists after refresh.

---

## Phase 8: Live Integrations (Lalamove)
- [ ] **Scenario 8.1: Live Quote**
    - **Action**: Create SO. Click Ship -> Lalamove -> Get Quote.
    - **Expected**: Real quote returned (requires API keys configuration).

---

## Execution Summary
| Phase | Scenarios | Status |
|-------|-----------|--------|
| 0 | 1 | ⏳ Pending |
| 1 | 4 | ⏳ Pending |
| 2 | 3 | ⏳ Pending |
| 3 | 3 | ⏳ Pending |
| 4 | 4 | ⏳ Pending |
| 5 | 3 | ⏳ Pending |
| 6 | 3 | ⏳ Pending |
| 7 | 3 | ⏳ Pending |
| 8 | 1 | ⏳ Pending |
