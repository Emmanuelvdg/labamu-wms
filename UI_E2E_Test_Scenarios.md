# UI-Driven End-to-End Test Scenarios — Labamu IMS

**Version:** 1.0  
**Date:** 2026-05-06  
**Execution method:** Playwright — real browser, all interactions via UI only (no direct API calls in test body)  
**Base URL:** http://localhost:3000  
**Auth:** Admin user (`admin@labamu.com` / seeded credentials via `e2e/.auth/admin.json`)

---

## Guiding Principles

1. Every scenario drives the UI from start to finish — no `page.evaluate` API shortcuts.  
2. Each scenario is **independently executable** — setup steps use the UI itself or a dedicated `beforeAll` that creates only the minimum state via the UI.  
3. Assertions target **visible UI state** (headings, table rows, status badges, toast messages) — not raw API responses.  
4. Scenarios are grouped into three tracks:
   - **Track A — Order & Fulfillment** (inbound → storage → outbound → dispatch → returns)
   - **Track B — Back-Office Operations** (stocktaking, replenishment, scrap, transfers, invoices)
   - **Track C — Setup & Configuration** (warehouses, products, rules, RBAC, admin portal)

---

## Track A — Order & Fulfillment

---

### Scenario A1 — Full Inbound Flow: Supplier → PO → Goods Receipt → Putaway

**Business narrative:** A buyer raises a purchase order, the warehouse receives the physical goods against that PO, and an operator completes the putaway tasks to place stock in the correct storage location.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Warehouse "Regression Warehouse A1" created at `/inventory/warehouses` (New Warehouse button)
- Receiving location "A1-RECV" created under that warehouse at `/inventory/locations`
- Storage location "A1-ZONE-01-A-01" (Zone → Aisle → Bay → Shelf) created under that warehouse
- Supplier "A1 Supplier" created at `/inventory/suppliers`
- Product "A1 Widget" (SKU: `WIDGET-A1`) created at `/inventory/products` with unit cost 10.00

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/purchases/new` | Page title contains "Create Purchase Order" |
| 2 | Select supplier "A1 Supplier" from the supplier dropdown | Supplier name visible in form |
| 3 | Set Expected Delivery Date to 7 days from today | Date field populated |
| 4 | Click "Add Line Item"; select product "A1 Widget"; enter quantity 50; unit cost 10.00 | Line item row appears with subtotal 500.00 |
| 5 | Click "Create Purchase Order" | Toast "Purchase order created" appears; redirected to PO detail page |
| 6 | Verify PO status badge = "DRAFT" | Status badge visible with text DRAFT |
| 7 | Click "Submit for Approval" | Status badge changes to PENDING |
| 8 | Click "Approve" | Status badge changes to APPROVED |
| 9 | Click "Receive" (or navigate to `/inventory/purchases/:id/receive`) | Receive Goods page loads; PO number shown |
| 10 | For line item "A1 Widget", enter received quantity 50 | Quantity field shows 50 |
| 11 | Select location "A1-RECV" from location selector | Location set on receipt line |
| 12 | Click "Confirm Receipt" | Toast "Goods received"; page redirects to PO detail; PO status = RECEIVED |
| 13 | Navigate to `/putaway` | Putaway page loads; pending task for "A1 Widget" visible in task list |
| 14 | Click the putaway task row to open it | Task detail shows: Product "A1 Widget", Qty 50, From "A1-RECV" |
| 15 | Select destination location "A1-ZONE-01-A-01" | Destination field populated |
| 16 | Click "Complete Task" | Task disappears from pending list; toast "Task completed" |
| 17 | Navigate to `/inventory` and search for "A1 Widget" | Row shows On-Hand qty ≥ 50; location "A1-ZONE-01-A-01" listed |

**Edge cases to cover in secondary test variants:**
- Partial receipt (receive 30 of 50) → PO status = PARTIAL_RECEIVED; remaining quantity shows on receipt page
- Receive to wrong location type (Staging) → putaway rule overrides to correct zone

---

### Scenario A2 — Full Outbound Flow: Sales Order → Pick → Pack → Ship

**Business narrative:** A sales order is created for a customer, the warehouse picks the goods, packs them, and dispatches the shipment.

**Preconditions:** Stock for "A2 Widget" (qty ≥ 20) must exist in a known storage location. Can depend on A1 or seed via UI in `beforeAll`.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/customers`, click "New Customer" | Modal or page opens |
| 2 | Enter name "A2 Customer", email, phone, address; click Save | Customer row appears in list with correct name |
| 3 | Navigate to `/orders/new` | Create Sales Order page loads |
| 4 | Select customer "A2 Customer" | Customer name shown in form |
| 5 | Select delivery method from dropdown | Delivery method populated |
| 6 | Click "Add Line"; select product "A2 Widget"; enter qty 10 | Line total visible |
| 7 | Click "Create Order" | Redirected to order detail; status = DRAFT |
| 8 | Click "Confirm Order" | Status changes to CONFIRMED |
| 9 | Click "Reserve Stock" (or equivalent Reserve button) | Status changes to RESERVED; reserved qty shown on line |
| 10 | Navigate to `/picking` | Picking page loads; warehouse selector visible |
| 11 | Select warehouse containing "A2 Widget" | Warehouse selected |
| 12 | Select strategy "SINGLE" | Strategy radio/button active |
| 13 | Click "Start Picking Session" | Picking session panel opens; order A2 appears in queue |
| 14 | Click the order row to begin picks | Pick task shows: Product "A2 Widget", Qty 10, Location shown |
| 15 | Enter/confirm the picked quantity 10; click "Confirm Pick" | Task marked done; session progress indicator updates |
| 16 | Click "Complete Session" | Toast "Session completed"; redirect back to picking page |
| 17 | Navigate to `/packing` | Packing queue shows order for "A2 Customer" — status READY_TO_PACK |
| 18 | Click "Start Packing" on the order card | Packing session page opens; item list shows "A2 Widget" × 10 |
| 19 | Confirm each item (scan or click checkmark) | Items marked as packed |
| 20 | Select a box/carton type if prompted; click "Close Package" | Package created; barcode/label shown |
| 21 | Click "Complete Packing" | Order status changes to PACKED; redirect to packing queue |
| 22 | Navigate to `/orders/:id` for the A2 order | Status = PACKED |
| 23 | Click "Create Shipment" | Shipment form opens |
| 24 | Select carrier, enter tracking number; click "Create" | Shipment record appears on order detail |
| 25 | Click "Dispatch" / "Mark as Shipped" | Order status = SHIPPED; shipment status = DISPATCHED |
| 26 | Navigate to `/inventory` and check "A2 Widget" on-hand | Qty reduced by 10 |

---

### Scenario A3 — Returns / RMA Flow (UI-Driven)

**Business narrative:** A customer returns items from a shipped order. The warehouse receives the return, inspects items, and either restocks or scraps them.

**Preconditions:** A shipped order with at least one product exists (can reuse A2 final state).

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/orders/:id` (the shipped A2 order) | Order status = SHIPPED |
| 2 | Click "Create Return" or navigate to `/inventory/operations` → Returns | Return creation form opens |
| 3 | Select or confirm the source order; select line "A2 Widget" qty 5; select reason "DAMAGED" | Line and reason populated |
| 4 | Click "Submit Return Request" | Toast "Return request created"; return record appears with status REQUESTED |
| 5 | Navigate to `/returns` (or returns tab) | Return record visible with customer name and status |
| 6 | Click on the return record; click "Receive Return" | Receive return form opens |
| 7 | Confirm received qty 5; select return-to location "A1-RECV" | Fields populated |
| 8 | Click "Confirm Receipt" | Return status changes to RECEIVED |
| 9 | For each received item, select disposition: 3 units → RESTOCK, 2 units → SCRAP | Disposition checkboxes/dropdowns set |
| 10 | Click "Process Disposition" | Toast "Disposition applied"; return status = CLOSED |
| 11 | Navigate to `/inventory` and check "A2 Widget" on-hand | Qty increased by 3 (restocked units) |
| 12 | Navigate to `/inventory/scrap` | Scrap record for 2 units of "A2 Widget" visible |

---

### Scenario A4 — Batch Picking Wave Session

**Business narrative:** Multiple sales orders are grouped into a wave and picked simultaneously to maximise picker efficiency.

**Preconditions:** 3 confirmed + reserved sales orders for different customers, all containing "A2 Widget" from the same warehouse zone.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking` | Picking page loads |
| 2 | Select warehouse | Warehouse selected |
| 3 | Select strategy "WAVE" | WAVE option active |
| 4 | Click "Create Wave" or "Configure Wave" | Wave configuration panel opens |
| 5 | Set wave criteria: Zone = "A1-ZONE-01"; Max Orders = 3 | Fields set |
| 6 | Click "Generate Wave" | Wave created; 3 orders assigned to the wave |
| 7 | Click "Start Wave Session" | Wave session begins; consolidated pick list shown |
| 8 | For each pick line, confirm location and quantity | Lines checked off one by one |
| 9 | Click "Complete Wave" | All 3 orders progress to PACKED queue; wave session closed |
| 10 | Navigate to `/packing` | 3 order cards visible in packing queue |

---

### Scenario A5 — Cluster / Zone Picking Session

**Business narrative:** A cluster of orders is assigned to a single picker with a trolley; picks are sorted by zone to minimise travel.

**Preconditions:** 4 reserved orders in different zones of the same warehouse.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking`; select warehouse | Page ready |
| 2 | Select strategy "CLUSTER" | CLUSTER active |
| 3 | Set cluster size to 4 | Cluster size field shows 4 |
| 4 | Click "Start Picking Session" | Session opens with 4-order cluster; picks sorted by zone in UI |
| 5 | Complete picks in zone order (confirm each) | Progress bar advances per pick |
| 6 | On completion, click "Finish Cluster" | Session closed; toast shown |
| 7 | Verify all 4 orders show in packing queue | 4 cards visible |

---

## Track B — Back-Office Operations

---

### Scenario B1 — Stocktaking: Full Count Session

**Business narrative:** The warehouse manager initiates a full physical stockcount, operators enter counted quantities, and discrepancies are reconciled against system quantities.

**Preconditions:** Warehouse "B1 Warehouse" with known inventory (seeded via UI in `beforeAll`).

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/stocktaking` | Sessions list page loads with "New Session" button |
| 2 | Click "New Session"; select warehouse "B1 Warehouse"; type = FULL; name = "B1-Count-001" | Form populated |
| 3 | Click "Create Session" | Session card appears with status OPEN |
| 4 | Click the session row to open detail | Session detail page; "Generate Tasks" button visible |
| 5 | Click "Generate Tasks" | Count tasks appear in task list (one per location with stock) |
| 6 | For the first task, click "Enter Count" | Count entry modal opens; system quantity shown |
| 7 | Enter counted quantity (deliberately differ by 2 units: system − 2) | Counted qty field set |
| 8 | Click "Submit Count" | Task marked COUNTED; discrepancy badge shown (−2) |
| 9 | Complete counts for all remaining tasks (enter matching quantities) | All tasks COUNTED |
| 10 | Click "Reconcile" | Reconciliation summary page shows: 1 discrepancy, N matches |
| 11 | Review discrepancy line (Product, System Qty, Counted Qty, Variance) | Variance = −2 visible |
| 12 | Click "Apply Adjustments" | Confirmation modal appears |
| 13 | Confirm | Session status = RECONCILED; toast "Session reconciled" |
| 14 | Navigate to `/inventory` and search for the product with the variance | On-hand qty decreased by 2 |

**Edge cases:**
- Zero-count task (count = 0 for a location that had stock) → large negative variance highlighted in red
- Re-open count on a COUNTED task → previous count replaced

---

### Scenario B2 — Cycle Count (Targeted Location Count)

**Business narrative:** A manager triggers a targeted cycle count for a high-velocity location to verify accuracy without a full warehouse count.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/cycle-counts` | Cycle count dashboard loads |
| 2 | Click "Start Cycle Count" | Location selector modal opens |
| 3 | Select 2 specific locations | Selected locations listed |
| 4 | Click "Start" | Count tasks created for the 2 locations |
| 5 | Enter counted quantities for both (matching system qty) | Tasks marked COUNTED |
| 6 | Click "Reconcile" | Summary shows 0 discrepancies |
| 7 | Click "Apply" | Session closed; no inventory adjustments |

---

### Scenario B3 — Inventory Adjustment (Positive and Negative)

**Business narrative:** A warehouse supervisor corrects inventory records after a discrepancy found outside of a formal stocktake.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/adjustments/new` | Create Adjustment form loads |
| 2 | Select product "A1 Widget"; select location "A1-ZONE-01-A-01" | Fields populated |
| 3 | Enter adjustment type = INCREASE; qty = 5; reason = "Found in aisle" | Form complete |
| 4 | Click "Create Adjustment" | Adjustment record appears with status PENDING |
| 5 | Click "Apply Adjustment" | Status changes to APPLIED; toast shown |
| 6 | Navigate to `/inventory`; check "A1 Widget" | On-hand qty increased by 5 |
| 7 | Repeat steps 1–6 with adjustment type = DECREASE; qty = 3; reason = "Damage write-off" | On-hand qty decreases by 3 |

---

### Scenario B4 — Scrap Order Flow

**Business narrative:** Items are declared as scrap (expired, broken), removed from inventory, and the scrap record is visible in the scrap log.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/scrap` | Scrap orders list; "New Scrap Order" button |
| 2 | Click "New Scrap Order" | Form opens |
| 3 | Select product "A1 Widget"; location "A1-ZONE-01-A-01"; qty 4; reason "Expired" | Form fields set |
| 4 | Click "Create Scrap Order" | Scrap order appears in list with status PENDING |
| 5 | Click "Process" / "Confirm Scrap" | Status = COMPLETED; toast shown |
| 6 | Navigate to `/inventory`; check "A1 Widget" | On-hand qty reduced by 4 |

---

### Scenario B5 — Replenishment Alert → Auto Purchase Order

**Business narrative:** When stock falls below a reorder point, the replenishment engine raises an alert; the manager reviews it and triggers an automatic purchase order.

**Preconditions:** Product "B5 Replenish Widget" with reorder point 50 and current stock = 5 (seeded via UI adjustments), supplier linked.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/replenishment` | Replenishment dashboard loads |
| 2 | Observe alert card for "B5 Replenish Widget" — status LOW_STOCK | Alert visible with product name |
| 3 | Click "Trigger Check" or refresh | Alert count ≥ 1 |
| 4 | Click on the alert row | Alert detail shows: current stock 5, reorder point 50, suggested qty |
| 5 | Click "Create Auto PO" | Confirmation dialog |
| 6 | Confirm | Toast "Purchase order created"; alert status changes to PO_CREATED |
| 7 | Click the PO link in the alert | Navigated to new PO detail page with status PENDING |
| 8 | Navigate to `/inventory/purchases` | New PO for "B5 Replenish Widget" visible in list |

---

### Scenario B6 — Invoice Creation and PO Matching

**Business narrative:** A vendor invoice arrives; the AP clerk creates it in the system and matches it to the corresponding purchase order to confirm three-way match.

**Preconditions:** An APPROVED purchase order for supplier "A1 Supplier" exists.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/invoices/new` | Create Invoice form loads |
| 2 | Select vendor "A1 Supplier" | Vendor field populated |
| 3 | Set Issue Date (today) and Due Date (30 days) | Dates set |
| 4 | Add line item: product "A1 Widget"; qty 50; unit price 10.00 | Line shows total 500.00 |
| 5 | Click "Create Invoice" | Redirected to invoice detail; status = DRAFT; invoice number assigned |
| 6 | Navigate to `/invoices` | Invoice row visible |
| 7 | Click on invoice → click "Match to PO" | PO matching dialog opens with matching PO listed |
| 8 | Select the matching PO; click "Confirm Match" | Invoice status changes to MATCHED; toast shown |
| 9 | Verify matched PO number shown on invoice detail | PO reference visible on invoice |

---

### Scenario B7 — Inter-Warehouse Transfer (UI-Driven)

**Business narrative:** Stock is moved from one warehouse to another via the Transfers/Stock Moves UI.

**Preconditions:** Two warehouses with known stock in source; product "B7 Transfer Widget" qty ≥ 30 in source.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/moves` | Stock Moves list loads |
| 2 | Click "New Transfer" | Transfer form opens |
| 3 | Select product "B7 Transfer Widget" | Product selected |
| 4 | Select source location | Source populated |
| 5 | Select destination location (different warehouse) | Destination populated |
| 6 | Enter qty 20 | Qty field set |
| 7 | Click "Create Transfer" | Stock move record appears with status DRAFT |
| 8 | Click "Validate" | Status changes to DONE; toast "Transfer validated" |
| 9 | Navigate to `/inventory`; filter by source warehouse | "B7 Transfer Widget" qty reduced by 20 |
| 10 | Filter by destination warehouse | Qty increased by 20 |

---

### Scenario B8 — Putaway Rule Exception: Location Full

**Business narrative:** During putaway, a target location is at capacity; the system presents an alternative location; the operator selects it.

**Preconditions:** Storage location "B8-FULL-LOC" set to capacity 0 (or fully occupied); product "B8 Widget" in receiving queue.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/putaway`; open putaway task for "B8 Widget" | Task detail open |
| 2 | System suggests "B8-FULL-LOC" (or navigate to it) | Suggested location shown |
| 3 | Click the location — system shows capacity warning | Warning: "Location full" or similar |
| 4 | Click "Request Alternative" | Alternative location modal appears with list of available locations |
| 5 | Select an alternative from the list | Location selected |
| 6 | Click "Confirm Alternative" | Task updates with new location; toast shown |
| 7 | Click "Complete Task" | Task closed; inventory assigned to alternative location |

---

## Track C — Setup & Configuration

---

### Scenario C1 — Warehouse and Location Hierarchy Setup

**Business narrative:** A new warehouse is onboarded end-to-end: warehouse record, full location tree, and floor plan.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/warehouses`; click "New Warehouse" | Modal/form opens |
| 2 | Enter name "C1 Main Warehouse", address, short code "C1MW"; click Save | Warehouse row appears in list |
| 3 | Click warehouse row → navigate to detail | Warehouse detail page; "Manage Locations" button visible |
| 4 | Click "Add Location"; type = ZONE; name "Zone A"; click Save | Zone appears in location tree |
| 5 | Click "Add Child" under Zone A; type = AISLE; name "A1" | Aisle appears under Zone A |
| 6 | Continue: Bay "A1-01", Shelf "A1-01-S1" | Full hierarchy visible in tree |
| 7 | Click on "A1-01-S1"; set max capacity = 100 units; click Save | Capacity shown on location detail |
| 8 | Navigate to `/inventory/warehouses/:id/floor-plan` | Floor plan canvas loads |
| 9 | Drag a zone element onto the canvas; label it "Zone A" | Element placed on plan |
| 10 | Click "Save Floor Plan" | Toast "Floor plan saved" |

**Verify:** `/inventory/locations?warehouseId=C1MW` returns the full hierarchy tree in the sidebar.

---

### Scenario C2 — Product Catalog: Full Product Setup

**Business narrative:** A product manager creates a product with all attributes, adds packaging configurations, and sets up a rotation policy.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory`; click "Add Product" | Create product form opens |
| 2 | Enter: Name "C2 Perishable Widget"; SKU "C2PW-001"; Category "Food"; Velocity = A | Fields populated |
| 3 | Enter dimensions (L/W/H), weight, selling price, unit cost | All fields set |
| 4 | Select rotation policy "FEFO" (First Expired First Out) | FEFO selected |
| 5 | Click "Save Product" | Product appears in inventory list |
| 6 | Click product row → navigate to detail | Product detail; "Add Packaging" button visible |
| 7 | Click "Add Packaging"; type = PALLET; Ti = 10, Hi = 5; click Save | Packaging row appears: "10×5 Pallet" |
| 8 | Add second packaging: type = CARTON; units per carton = 12 | Carton packaging row appears |
| 9 | Navigate to supplier "A1 Supplier" → link product "C2 Perishable Widget" | Product linked to supplier |
| 10 | Navigate back to product detail | Supplier listed under "Linked Suppliers" section |

---

### Scenario C3 — Putaway Rules Configuration and Test

**Business narrative:** A warehouse manager creates putaway rules that direct products to specific zones based on category and velocity, then validates them with a test.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/putaway-rules/new` | Create Putaway Rule form |
| 2 | Name = "C3-Rule-Food-ChillZone"; Strategy = CATEGORY; Category = "Food" | Fields set |
| 3 | Set Destination Location = "Zone A" (created in C1) | Destination selected |
| 4 | Priority = 10; click Save | Rule row appears in rules list |
| 5 | Create second rule: Strategy = VELOCITY; Velocity = A; Destination = "Zone A"; Priority = 20 | Second rule in list |
| 6 | Navigate to `/inventory/putaway-rules`; click "Test Rule" | Test panel opens |
| 7 | Select product "C2 Perishable Widget"; qty = 5; warehouse = C1 | Test inputs populated |
| 8 | Click "Run Test" | Result shows matched rule "C3-Rule-Food-ChillZone"; suggested destination = "Zone A" |

---

### Scenario C4 — Reordering Rules Setup

**Business narrative:** A planning analyst creates reordering rules for products to automate replenishment triggers.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/reordering-rules` | Reordering rules list |
| 2 | Click "New Rule" | Create form opens |
| 3 | Select product "C2 Perishable Widget"; location = "A1-01-S1" | Fields set |
| 4 | Min quantity = 50; Max quantity = 200 | Quantities entered |
| 5 | Click Save | Rule row appears in list with product and quantities |
| 6 | Click "Check Rules" button | System runs check; if stock < min, alert shown; otherwise "No alerts" |

---

### Scenario C5 — Delivery Methods Configuration

**Business narrative:** An admin sets up the delivery methods available to customers on sales orders.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/configuration/delivery-methods` | Delivery methods list |
| 2 | Click "New Delivery Method" | Form opens |
| 3 | Name = "Standard Ground"; carrier = "FedEx"; lead time = 3 days | Fields set |
| 4 | Click Save | Method row appears in list |
| 5 | Click "Edit" on the row; change lead time to 4; click Save | Row updates to 4 days |
| 6 | Create second method: "Express 2-Day"; carrier = "UPS"; lead time = 2 | Second row in list |
| 7 | Navigate to `/orders/new` → delivery method dropdown | Both methods visible as options |

---

### Scenario C6 — Route Builder and Rule Configuration

**Business narrative:** A logistics manager creates a route with ordered rules to define where stock flows within the warehouse.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/routes`; click "New Route" | Create route form |
| 2 | Name = "Inbound Standard"; description = "Receiving to Zone A"; click Save | Route row in list |
| 3 | Click route row → detail; click "Add Rule" | Rule form opens |
| 4 | Action = PUSH_TO; Source = "A1-RECV"; Destination = "Zone A"; Sequence = 1 | Fields set |
| 5 | Click Save | Rule appears under route |
| 6 | Add second rule: Action = PUSH_TO; Source = "Zone A"; Destination = "A1-01-S1"; Sequence = 2 | Second rule appears |
| 7 | Navigate to `/inventory/routes/builder` | Visual route builder renders with route nodes |
| 8 | Verify nodes "A1-RECV → Zone A → A1-01-S1" connected in correct sequence | Node connections visible |
| 9 | Click "Delete" on the route; confirm deletion | Route removed from list; 404 on route detail |

---

### Scenario C7 — RBAC: Create Role, Assign to User, Verify Permissions

**Business narrative:** An admin creates a role with limited permissions and verifies that a user with that role cannot access restricted pages.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to Settings → Roles; click "Create Role" | Role creation form |
| 2 | Name = "C7 Picker Role"; toggle on: INVENTORY:READ, ORDERS:READ, PICKING:READ | Permissions selected |
| 3 | Click Save | Role appears in roles list |
| 4 | Navigate to Settings → Users; click "Create User" | User form |
| 5 | Email = `picker-c7@labamu.com`; password; assign role "C7 Picker Role" | Fields set |
| 6 | Click Save | User row visible |
| 7 | Log out of admin; log in as `picker-c7@labamu.com` | Dashboard loads |
| 8 | Navigate to `/inventory` | Inventory page loads (READ allowed) |
| 9 | Attempt to navigate to `/inventory/adjustments/new` | Redirected to 403 / Access Denied page |
| 10 | Attempt to navigate to `/settings` | Redirected / Settings nav item not visible |
| 11 | Verify picking nav item is visible | Picking link in sidebar |
| 12 | Log out; log back in as admin | Admin dashboard restored |

---

### Scenario C8 — Settings: Picking and Packing Configuration

**Business narrative:** A warehouse manager configures picking strategy defaults and packing station rules through the Settings UI.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/settings` | Settings page; sidebar with tabs visible |
| 2 | Click "Picking" tab | Picking settings panel renders |
| 3 | Change default strategy to "BATCH" | Option selected |
| 4 | Set batch size = 8 | Field updated |
| 5 | Click "Save" | Toast "Settings saved" |
| 6 | Refresh page; navigate back to Picking tab | Strategy still shows "BATCH"; batch size = 8 |
| 7 | Click "Packing" tab | Packing settings panel |
| 8 | Enable "Require weight verification" toggle | Toggle on |
| 9 | Click Save | Toast shown |
| 10 | Click "Routing" tab | Routing settings visible |
| 11 | Enable "Enforce route rules" toggle | Toggle on |
| 12 | Click Save | Settings persisted |

---

### Scenario C9 — Supplier Portal: Create Supplier and Send Invitation

**Business narrative:** A procurement manager creates a supplier record and invites the supplier contact to the portal.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/suppliers`; click "New Supplier" | Supplier creation form |
| 2 | Name = "C9 Test Supplier"; contact email; phone; address | Fields set |
| 3 | Click Save | Supplier row in list |
| 4 | Click supplier row → detail | Supplier detail page; "Invite Supplier" button visible |
| 5 | Click "Invite Supplier"; enter email `supplier-c9@external.com` | Invite form |
| 6 | Click "Send Invitation" | Toast "Invitation sent"; invitation badge on supplier detail |

---

### Scenario C10 — Admin Portal: Tenant Lifecycle Management

**Business narrative:** A platform admin creates a tenant, configures its feature flags, impersonates it, and posts an announcement.

**Precondition:** Logged in as platform admin (admin portal user).

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/admin` | Platform Overview with KPI cards |
| 2 | Click "Tenants" in sidebar | Tenant list table loads |
| 3 | Click "New Tenant" | Creation modal opens |
| 4 | Name = "C10 Demo Corp"; plan = STARTER; admin email = `admin@c10demo.com` | Fields set |
| 5 | Click Create | Tenant row appears in list; status = ACTIVE |
| 6 | Click tenant row → detail | Tenant detail with Overview, Plan & Billing, Feature Flags tabs |
| 7 | Click "Feature Flags" tab | Flag list with toggles |
| 8 | Toggle "PUTAWAY_RULES" to ON | Toggle flips; toast "Flag updated" |
| 9 | Click "Impersonate" | Browser redirects to tenant dashboard; amber impersonation banner at top |
| 10 | Verify banner text contains "C10 Demo Corp" | Correct tenant name in banner |
| 11 | Click "Exit Impersonation" in banner | Admin session restored; back on `/admin` |
| 12 | Navigate to `/admin/announcements`; click "New Announcement" | Announcement form |
| 13 | Title = "C10 Test Announcement"; body = "Regression test notice"; target = All Tenants | Fields set |
| 14 | Click "Publish" | Announcement row appears in list; no Inactive badge (active immediately) |

---

## Composite End-to-End Journeys

These journeys run multiple tracks sequentially in a single spec to validate the complete platform lifecycle.

---

### Scenario E1 — Complete Platform Lifecycle (Setup → Inbound → Outbound → Return → Report)

Runs in sequence: C1 (warehouse setup) → A1 (inbound receipt) → A2 (outbound ship) → A3 (return) → B1 (stocktake) → reporting validation.

**Key assertions at end of journey:**
- Dashboard shows total orders ≥ 1 SHIPPED
- Inventory on-hand quantity reflects all in/out movements
- Stocktaking session status = RECONCILED
- `/reporting/compliance` page loads and shows transaction data for the regression warehouse

---

### Scenario E2 — Configuration-First Setup → First Order

Validates that a brand-new warehouse can be configured end-to-end and immediately used for a full order cycle.

Runs in sequence: C1 (warehouse) → C2 (product) → C3 (putaway rules) → C4 (reorder rules) → C5 (delivery methods) → A1 (PO receive putaway) → A2 (order pick pack ship).

**Key assertions:**
- All setup steps succeed with no server errors (no 500 toasts)
- Product flows through the newly created location hierarchy
- Putaway rule directs to the configured zone (not fallback)
- Order ships successfully via newly created delivery method

---

## Playwright Implementation Notes

### File layout
```
apps/web/e2e/
  ui-a1-inbound-flow.spec.ts
  ui-a2-outbound-flow.spec.ts
  ui-a3-returns-flow.spec.ts
  ui-a4-wave-picking.spec.ts
  ui-a5-cluster-picking.spec.ts
  ui-b1-stocktaking.spec.ts
  ui-b2-cycle-count.spec.ts
  ui-b3-inventory-adjustment.spec.ts
  ui-b4-scrap-orders.spec.ts
  ui-b5-replenishment.spec.ts
  ui-b6-invoice-matching.spec.ts
  ui-b7-inter-warehouse-transfer.spec.ts
  ui-b8-putaway-exception.spec.ts
  ui-c1-warehouse-setup.spec.ts
  ui-c2-product-catalog.spec.ts
  ui-c3-putaway-rules.spec.ts
  ui-c4-reordering-rules.spec.ts
  ui-c5-delivery-methods.spec.ts
  ui-c6-route-builder.spec.ts
  ui-c7-rbac.spec.ts
  ui-c8-settings.spec.ts
  ui-c9-supplier-portal.spec.ts
  ui-c10-admin-tenant.spec.ts
  ui-e1-full-lifecycle.spec.ts
  ui-e2-config-first-order.spec.ts
```

### Shared helpers (`e2e/helpers/ui-helpers.ts`)
```typescript
// Use these rather than repeating selectors across specs
export async function createWarehouse(page, name, shortCode)
export async function createProduct(page, sku, name, category)
export async function createSupplier(page, name, email)
export async function createCustomer(page, name, email)
export async function createPurchaseOrder(page, supplierId, lines[])
export async function approvePO(page, poId)
export async function receivePO(page, poId, locationName, quantities[])
export async function createSalesOrder(page, customerId, lines[])
export async function reserveOrder(page, orderId)
```

### Selector conventions
- Prefer `getByRole` and `getByTestId` over CSS selectors
- Status badges: `page.getByTestId('status-badge')` or `page.getByText('SHIPPED')`
- Toast messages: `page.getByRole('status')` or `page.locator('[data-sonner-toast]')`
- Table rows: `page.getByRole('row').filter({ hasText: productName })`

### Timeout guidance
- Navigation: 10 000 ms
- API-backed table renders: 15 000 ms
- Session operations (picking, packing complete): 20 000 ms

### Test isolation
Each spec cleans up its own created records in `afterAll` by navigating to the relevant list page and deleting rows — never relying on database teardown scripts.
