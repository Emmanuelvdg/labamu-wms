# E2E Test Plan

This document outlines the End-to-End (E2E) test scenarios for the Labamu IMS application. These scenarios cover the core functionality of the system, ensuring that critical user flows work as expected.

## 1. Authentication
**Goal**: Verify user access control.
- [ ] **Scenario 1.1: Login with Valid Credentials**
    - **Action**: Navigate to `/login`, enter `admin@labamu.co.id` / `admin`, click Login.
    - **Expected**: Redirect to Dashboard (`/`).
- [ ] **Scenario 1.2: Login with Invalid Credentials**
    - **Action**: Enter invalid email/password.
    - **Expected**: Show error message "Invalid credentials".

## 2. Inventory Management
**Goal**: Verify product and stock management.
- [ ] **Scenario 2.1: Create a Warehouse**
    - **Action**: Use API or UI (if available) to create a new warehouse "E2E Warehouse".
    - **Expected**: Warehouse appears in lists and dropdowns.
- [ ] **Scenario 2.1b: Create Receiving Location (REQUIRED FOR PUTAWAY)**
    - **Action**: Navigate to `/inventory/locations`, create location named "Receiving Dock A", type: INTERNAL, parent: E2E Warehouse
    - **Expected**: Location appears in list. This is required for putaway operations.
    - **Note**: Receiving locations must be type INTERNAL with "Receiving" or "Staging" in the name, OR linked via WarehouseFunctionalArea.
- [ ] **Scenario 2.2: Create a Product**
    - **Action**: Navigate to `/inventory`, click "+ New Item", fill form (SKU: `E2E-PROD-001`, Name: `E2E Test Product`, Tracking: `none`), submit.
    - **Expected**: Product appears in the inventory list.
- [ ] **Scenario 2.3: Add Stock (Batch)**
    - **Action**: Navigate to Product Details (`/inventory/[id]`), click "Add Batch", select "E2E Warehouse", enter Quantity `50`, submit.
    - **Expected**: Stock level updates to 50. Transaction log shows "IN" movement.
- [ ] **Scenario 2.4: Filter Inventory**
    - **Action**: On `/inventory`, select "E2E Warehouse" from dropdown.
    - **Expected**: List shows `E2E Test Product`.
    - **Action**: Select a different warehouse.
    - **Expected**: List does NOT show `E2E Test Product` (if stock is only in E2E Warehouse).

## 3. Location Management
**Goal**: Verify location hierarchy and properties.
- [ ] **Scenario 3.1: Create Location Hierarchy**
    - **Action**: Create a "Zone A" (Type: Room) inside "E2E Warehouse". Then create "Row 1" (Type: Row) inside "Zone A".
    - **Expected**: Hierarchy is preserved. "Row 1" parent is "Zone A".
- [ ] **Scenario 3.2: Location with Properties**
    - **Action**: Create "Cold Storage" location with attribute `{"temperature": -18}`.
    - **Expected**: Location created. Details show the custom attribute.

## 4. Order Fulfillment
**Goal**: Verify order processing and stock allocation.
- [ ] **Scenario 4.1: Create an Order**
    - **Action**: Use API to create an order for `E2E-PROD-001` (Qty: 10).
    - **Expected**: Order created with status `PENDING`.
- [ ] **Scenario 4.2: Allocate Order**
    - **Action**: Trigger allocation logic (via API or UI button).
    - **Expected**: Order status changes to `ALLOCATED`. Warehouse assigned is "E2E Warehouse".
- [ ] **Scenario 4.3: Verify Stock Reservation**
    - **Action**: Check Product Details.
    - **Expected**: "Reserved" quantity increases by 10. "Available" quantity decreases by 10.

## 5. Inter-Warehouse Transfer (IWT)
**Goal**: Verify stock transfer between warehouses.
- [ ] **Scenario 5.1: Create Transfer Request**
    - **Action**: Use API to request transfer of 10 units of `E2E-PROD-001` from "E2E Warehouse" to "Main Warehouse".
    - **Expected**: Transfer Order created with status `PENDING_APPROVAL` (or `APPROVED` if admin).
- [ ] **Scenario 5.2: Approve Transfer**
    - **Action**: Approve the transfer request (if pending).
    - **Expected**: Status updates to `APPROVED`.

## 6. Picking Operations
**Goal**: Verify warehouse picking workflows.
- [ ] **Scenario 6.1: Create Picking Session**
    - **Action**: Navigate to Warehouse Operations > Picking. Create a new session for "E2E Warehouse".
    - **Expected**: Session created. Tasks generated for the allocated order from Scenario 4.
- [ ] **Scenario 6.2: Execute Picking**
    - **Action**: Open the picking task. Mark items as "Picked".
    - **Expected**: Task status updates to `COMPLETED`.
- [ ] **Scenario 6.3: Complete Session**
    - **Action**: Click "Complete Session".
    - **Expected**: Session marks as `COMPLETED`. Order status updates to `PICKED` (or `PACKING`).

## 7. Reporting & Analytics
**Goal**: Verify data visualization and report generation.
- [ ] **Scenario 7.1: Dashboard Metrics**
    - **Action**: Navigate to Dashboard.
    - **Expected**: "Total Stock Value" reflects the added inventory. "Low Stock" alerts if applicable.
- [ ] **Scenario 7.2: Generate Compliance Report**
    - **Action**: Navigate to Reporting, select "VAT Report", click Generate.
    - **Expected**: Report generated containing the recent transactions.

## 8. Integration (Mock)
**Goal**: Verify external system simulation.
- [ ] **Scenario 8.1: Sync Sales Channels**
    - **Action**: Trigger Sales Channel Sync.
    - **Expected**: Mock orders (`ORD-001`) are imported.
- [ ] **Scenario 8.2: Sync Logistics**
    - **Action**: Trigger Logistics Sync.
    - **Expected**: Mock tracking updates (`JNE-001`) are processed.
