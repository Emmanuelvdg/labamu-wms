# E2E Test Plan 3.0: Safety & Exceptions

This test plan builds upon Test Plan 2.0 by adding "Day 2" scenarios focused on data integrity, error handling, and the new "Safe Delete/Cancel" workflows.

## Phase 0-4: Standard Operations
*Refer to [E2E Test Plan 2.0](./E2E-Test_Plan2.md) for Phases 0-4 (Setup, Catalog, Inbound, Outbound).*

## Phase 5: Safety & Exceptions (New)
**Persona**: Administrator / Warehouse Manager

### Warehouses & Locations
- [ ] **Scenario 5.1: Attempt to Delete Active Warehouse**
    - **Pre-condition**: "Distribution Center 1" has active locations and stock (from Phase 3).
    - **Action**: Go to Settings > Warehouses. Click Delete on "Distribution Center 1".
    - **Expected**: Modal appears showing dependencies (Products, Locations). Delete is blocked.

- [ ] **Scenario 5.2: Attempt to Delete Active Location**
    - **Action**: Go to Inventory > Locations. Select "Bin 01" (contains stock). Click Delete.
    - **Expected**: Modal appears warning about "Inventory Records". Delete is blocked.

- [ ] **Scenario 5.3: Safe Location Deletion**
    - **Action**: Create empty location "Unused Shelf".
    - **Action**: Click Delete on "Unused Shelf".
    - **Expected**: Confirmation modal appears (No dependencies). Delete succeeds.

### Order Management
- [ ] **Scenario 5.4: Cancel Pending Order**
    - **Action**: Create Sales Order for 1x "Pro Laptop X".
    - **Action**: Click "Allocate" (Status: `RESERVED`).
    - **Action**: Click "Cancel Order".
    - **Expected**:
        - Order Status updates to `CANCELLED`.
        - Stock Reservation is released (Available Qty increases).

- [ ] **Scenario 5.5: Attempt to Delete Active Order**
    - **Action**: View the `CANCELLED` order from 5.4.
    - **Action**: Click "Delete Order".
    - **Expected**: Order is permanently deleted.

- [ ] **Scenario 5.6: Attempt to Cancel Shipped Order**
    - **Action**: Open the Shipped Order from Scenario 4.5.
    - **Action**: Verify "Cancel Order" button is NOT visible or disabled.
    - **Action**: (API Test) Try `POST /orders/:id/cancel`.
    - **Expected**: Error 400 "Cannot cancel shipped order".

## Phase 6: Edge Cases
- [ ] **Scenario 6.1: Delete Location with Children**
    - **Action**: Try to delete "Zone A" (Parent of Row 1 -> Shelf 1).
    - **Expected**: Blocked due to "Child Locations".

- [ ] **Scenario 6.2: Delete Location with Open Tasks**
    - **Action**: Create PO -> Receive. Do NOT Putaway.
    - **Action**: Try to delete "Receiving Dock 1".
    - **Expected**: Blocked due to "Inventory" or "Active Batches".
