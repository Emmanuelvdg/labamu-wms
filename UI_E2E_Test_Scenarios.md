# UI-Driven End-to-End Test Scenarios — Labamu IMS

**Version:** 1.2  
**Date:** 2026-05-19  
**Execution method:** real browser, all interactions via UI only (no direct API calls in test body)  
**Base URL:** http://localhost:3000  
**Auth:** Admin user (`admin@labamu.co.id` / seeded credentials via `e2e/.auth/admin.json`)  
**Change log:** v1.2 — added Scenario A8 (WAVELESS), Track D (Picking Dashboard, Wave Release Rules, Route Builder v2 canvas); updated C6 for Route Builder v2; updated file layout

---

## Guiding Principles

1. Every scenario drives the UI from start to finish — no `page.evaluate` API shortcuts.  
2. Each scenario is **independently executable** — setup steps use the UI itself or a dedicated `beforeAll` that creates only the minimum state via the UI.  
3. Assertions target **visible UI state** (headings, table rows, status badges, toast messages) — not raw API responses.  
4. Scenarios are grouped into four tracks:
   - **Track A — Order & Fulfillment** (inbound → storage → outbound → dispatch → returns)
   - **Track B — Back-Office Operations** (stocktaking, replenishment, scrap, transfers, invoices)
   - **Track C — Setup & Configuration** (warehouses, products, rules, RBAC, admin portal)
   - **Track D — Advanced Picking Operations** (picking dashboard, wave release rules, route builder v2)

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

**Business narrative:** Multiple sales orders are grouped into a wave and picked simultaneously to maximise picker efficiency. An optional Wave Release Rule can trigger wave creation automatically.

**Preconditions:** 3 confirmed + reserved sales orders for different customers, all containing "A2 Widget" from the same warehouse zone. `ADVANCED_PICKING` feature flag enabled.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking` | Picking page loads; strategy cards visible |
| 2 | Select warehouse | Warehouse selected |
| 3 | Select strategy "WAVE" | WAVE option active; max-orders and criteria inputs appear |
| 4 | Set wave criteria: Criteria = Product; Max Orders = 3 | Fields set |
| 5 | Click "Start Picking Session" | Wave session begins; consolidated pick list shows orders grouped by product |
| 6 | For each pick line, confirm location and quantity | Lines checked off one by one |
| 7 | Click "Complete Session" | All 3 orders progress to PACKED queue; wave session closed |
| 8 | Navigate to `/packing` | 3 order cards visible in packing queue |

**Alternative path (Wave Release Rule triggers automatically):**
- Pre-create a TIME_BASED or ORDER_COUNT rule on `/picking/wave-rules`; when the rule fires, a wave session is created automatically and appears on the Picking Dashboard — see Scenario D2.

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

### Scenario A6 — Cross-Docking / Direct Ship

**Business narrative:** An urgent backorder has reserved stock that does not yet exist in the warehouse. When the supplier delivers, goods skip putaway entirely and are routed straight to the shipping dock to fulfil the waiting order.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Warehouse "A6 Warehouse" configured with 3-step outgoing flow (Receiving → Staging → Shipping Dock)
- Receiving location "A6-RECV", staging location "A6-STAGE", shipping dock location "A6-SHIP" created
- Storage location "A6-ZONE-01" created
- Putaway rule created: product category = "A6 Urgent"; strategy = FIXED; destination = "A6-SHIP" (shipping dock); priority = 100
- Product "A6 Urgent Widget" (SKU: `URGENT-A6`); category = "A6 Urgent"; unit cost 25.00
- Customer "A6 Customer"; Sales Order for "A6 Urgent Widget" qty 20 created, confirmed, and reserved (status = RESERVED) — **no stock exists yet**
- Purchase Order (APPROVED) for "A6 Urgent Widget" qty 20 from supplier

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to the APPROVED PO for "A6 Urgent Widget" | PO detail page loads; status = APPROVED |
| 2 | Click "Receive"; set received qty = 20; select location "A6-RECV" | Qty and location fields set |
| 3 | Click "Confirm Receipt" | Toast "Goods received"; PO status = RECEIVED |
| 4 | Navigate to `/putaway` | Putaway task for "A6 Urgent Widget" visible |
| 5 | Open the putaway task | Task detail shows: product "A6 Urgent Widget", qty 20, from "A6-RECV", **suggested destination = "A6-SHIP"** (cross-dock rule matched) |
| 6 | Confirm destination "A6-SHIP"; click "Complete Task" | Task closed; toast "Task completed" |
| 7 | Navigate to `/inventory` and filter for "A6 Urgent Widget" | On-hand qty shows 20; location = "A6-SHIP" (not any storage zone) |
| 8 | Navigate to `/picking`; select "A6 Warehouse"; strategy = SINGLE | Picking page ready |
| 9 | Start picking session | Pick task for the waiting A6 sales order appears; pick location = "A6-SHIP" |
| 10 | Confirm pick qty 20; complete session | Session completed; order progresses to PACKED queue |
| 11 | Navigate to `/packing`; start and complete packing for A6 order | Order status = PACKED |
| 12 | Navigate to order detail; create shipment and mark shipped | Order status = SHIPPED |
| 13 | Navigate to `/inventory`; filter "A6 Urgent Widget" | On-hand qty = 0; goods were never placed in a storage zone |

**Key assertion:** Inventory audit trail shows two moves — RECV → SHIP (putaway), then SHIP → OUT (pick) — with no intermediate storage location.

---

### Scenario A7 — Lot/Batch & Expiry Tracking (FEFO)

**Business narrative:** Goods are received with lot numbers and expiry dates. The system allocates the nearest-to-expiry lot first (FEFO). Expired lots are blocked from allocation.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Warehouse "A7 Warehouse" with receiving location "A7-RECV" and storage location "A7-STORE-01"
- Product "A7 Perishable" (SKU: `PERISHABLE-A7`); tracking = **Lot**; rotation policy = **FEFO**
- Customer "A7 Customer" and delivery method configured

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/purchases/new`; create and approve PO for "A7 Perishable" qty 100 from any supplier | PO status = APPROVED |
| 2 | Click "Receive"; on the receipt line, enter qty 50; enter **Lot Number = "LOT-A"**; set **Expiry Date = today + 30 days**; select location "A7-RECV" | Lot and expiry fields populated |
| 3 | Click "Add Lot Line"; enter qty 50; Lot Number = "LOT-B"; Expiry Date = **today + 10 days** (sooner expiry) | Second lot line visible |
| 4 | Click "Confirm Receipt" | Toast "Goods received"; two batch records created for "A7 Perishable" |
| 5 | Navigate to `/putaway`; complete putaway for both lots to "A7-STORE-01" | Both tasks completed; inventory shows 100 units, 2 batches |
| 6 | Navigate to `/inventory`; click "A7 Perishable"; open Batches tab | Table shows LOT-A (exp +30d, qty 50) and LOT-B (exp +10d, qty 50) |
| 7 | Navigate to `/orders/new`; create order for "A7 Customer"; add "A7 Perishable" qty 50; confirm + reserve | Order status = RESERVED |
| 8 | Navigate to `/picking`; start SINGLE picking session for "A7 Warehouse" | Pick task appears |
| 9 | Open pick task; check the **Lot/Batch** column on the pick line | **LOT-B** (soonest expiry) is shown as the allocated lot — FEFO applied |
| 10 | Confirm pick qty 50; complete session | Session completed; LOT-B stock reduced to 0 |
| 11 | Navigate to `/inventory` → "A7 Perishable" → Batches tab | LOT-B shows qty 0; LOT-A still shows qty 50 |
| 12 | Create a **second** PO; receive qty 30; Lot = "LOT-C"; Expiry = **yesterday** (already expired); putaway to "A7-STORE-01" | Batch record for LOT-C created |
| 13 | Navigate to `/orders/new`; create order for qty 20; confirm + click "Reserve Stock" | Warning or error visible: **"Cannot allocate — LOT-C is expired"** or reservation skips LOT-C and shows partial/zero reserved |
| 14 | Navigate to `/inventory` → "A7 Perishable" → Batches tab | LOT-C batch is flagged or status = EXPIRED / QUARANTINE |

**Edge cases:**
- Mixed lot pick (order qty 60 pulls remaining 50 from LOT-A + attempts LOT-C) → system skips expired lot; partial reservation shown
- Near-expiry warning threshold (configurable in product settings) triggers notification badge on inventory row

---

### Scenario A8 — WAVELESS Picking: Live Task Feed

**Business narrative:** The WAVELESS strategy assigns pick tasks to workers in real time without pre-batching. As new orders arrive and are reserved, the system immediately surfaces tasks; the worker's session page auto-refreshes to show the current task count.

**Preconditions:** `ADVANCED_PICKING` flag enabled. At least 2 reserved sales orders in the warehouse. Worker is logged in.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking`; select warehouse | Picking page ready |
| 2 | Select strategy "WAVELESS" | WAVELESS card active; no additional criteria inputs required |
| 3 | Click "Start Picking Session" | Session created; redirected to session detail page |
| 4 | Observe the live task badge / counter | Badge shows pending task count ≥ 1; page auto-refreshes every ≤ 10 s (calls `waveless-poll` endpoint) |
| 5 | Click the first task in the live feed | Pick task detail opens: product, location, qty shown |
| 6 | Confirm pick quantity; click "Confirm Pick" | Task marked done; badge count decrements |
| 7 | Open a second browser tab; create and reserve a new sales order for the same warehouse | New order reserved |
| 8 | Return to session detail tab | **Badge count increments** within the next poll interval — live update confirmed |
| 9 | Complete all pending pick tasks | Session progress reaches 100% |
| 10 | Click "End Session" | Session closed; toast shown; redirect to picking page |

**Key assertion:** The task badge updates without a full page reload — proving the live-poll mechanism is active.

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

### Scenario B7 — Inter-Warehouse Transfer: Full Cycle (Pick → Transit → Receive → Putaway)

**Business narrative:** Stock is formally transferred between two warehouses. The full workflow is exercised: the source warehouse picks and ships the goods, the destination warehouse receives them and puts them away, and inventory levels are correct at both ends throughout.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Warehouse "B7 Source WH" with storage location "B7-SRC-ZONE" containing product "B7 Transfer Widget" qty 30
- Warehouse "B7 Dest WH" with receiving location "B7-DST-RECV" and storage location "B7-DST-ZONE"
- Both warehouses configured with 2-step outgoing/incoming flows

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/transfers`; click "New Transfer Request" | Transfer request form opens |
| 2 | Source warehouse = "B7 Source WH"; destination = "B7 Dest WH" | Warehouses selected |
| 3 | Click "Add Item"; select product "B7 Transfer Widget"; qty = 20 | Line item appears |
| 4 | Click "Submit Request" | Transfer request created; status = PENDING |
| 5 | Click "Approve" (manager action) | Status changes to APPROVED |
| 6 | Navigate to `/picking`; select "B7 Source WH"; strategy = SINGLE | Picking page ready |
| 7 | Start picking session; pick task for the transfer request appears with qty 20 | Pick task visible; source location = "B7-SRC-ZONE" |
| 8 | Confirm pick qty 20; complete session | Session completed |
| 9 | Navigate to transfer request detail | Status = IN_TRANSIT |
| 10 | Navigate to `/inventory`; filter by "B7 Source WH"; search "B7 Transfer Widget" | Qty = 10 (reduced from 30 by 20) |
| 11 | Navigate to `/inventory/moves`; click "New Transfer" to record inbound at destination | Inbound move form |
| 12 | Select product "B7 Transfer Widget"; source = transit/outbound; destination = "B7-DST-RECV"; qty = 20 | Fields set |
| 13 | Click "Validate" | Move recorded; goods arrive at "B7-DST-RECV" |
| 14 | Navigate to `/putaway`; putaway task for "B7 Transfer Widget" at "B7 Dest WH" visible | Task appears with qty 20 |
| 15 | Select destination "B7-DST-ZONE"; click "Complete Task" | Putaway done; toast shown |
| 16 | Navigate to `/inventory`; filter by "B7 Dest WH"; search "B7 Transfer Widget" | Qty = 20 in "B7-DST-ZONE" |
| 17 | Navigate to transfer request detail | Status = COMPLETED |

**Key assertions:**
- Source warehouse qty: 30 → 10 (net −20)
- Destination warehouse qty: 0 → 20 (net +20)
- Transfer request status lifecycle: PENDING → APPROVED → IN_TRANSIT → COMPLETED

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

### Scenario B9 — Quality Control & Inspection Workflow

**Business narrative:** A purchase order is received and moved to a QC area. An inspector records pass/fail results per unit. Passing items proceed to storage; failing items are routed to scrap.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Warehouse "B9 Warehouse" with locations: "B9-RECV" (receiving), "B9-QC" (inspection area), "B9-STORE" (storage)
- Product "B9 Inspected Widget" (SKU: `INSPECT-B9`); unit cost 40.00
- Supplier "B9 Supplier"; Purchase Order (APPROVED) for 50 units of "B9 Inspected Widget"

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to the approved PO for "B9 Inspected Widget" | PO detail; status = APPROVED |
| 2 | Click "Receive"; enter qty 50; select location "B9-RECV"; click "Confirm Receipt" | Toast "Goods received"; PO status = RECEIVED; 50 units in "B9-RECV" |
| 3 | Navigate to `/putaway`; open the putaway task for "B9 Inspected Widget" | Task detail: from "B9-RECV", qty 50 |
| 4 | Change destination to "B9-QC" (QC area); click "Complete Task" | Task closed; 50 units now in "B9-QC" |
| 5 | Navigate to the PO detail → "Inspections" tab (or `/inventory/purchases/:id`) | Inspections tab visible; "Add Inspection" button |
| 6 | Click "Add Inspection" | Inspection form opens |
| 7 | Inspected qty = 50; Passed qty = 40; Failed qty = 10; Failure reason = "Damaged packaging"; click "Submit" | Inspection record created: 40 pass / 10 fail |
| 8 | PO inspection status shows "PARTIALLY_PASSED" or equivalent | Status badge updated |
| 9 | Navigate to `/inventory/adjustments/new` | Create Adjustment form |
| 10 | Select product "B9 Inspected Widget"; location "B9-QC"; type = DECREASE; qty = 10; reason = "QC Failure — Damaged packaging" | Form set |
| 11 | Click "Create Adjustment" → "Apply Adjustment" | Adjustment applied; 10 units removed from "B9-QC" |
| 12 | Navigate to `/inventory/scrap`; click "New Scrap Order" | Scrap form opens |
| 13 | Select "B9 Inspected Widget"; location "B9-QC" (or virtual scrap location); qty = 10; reason = "QC Failure" | Form set |
| 14 | Click "Create" → "Confirm Scrap" | Scrap order created and processed; status = COMPLETED |
| 15 | Navigate to `/putaway`; create a putaway task (or stock move) to move 40 passing units from "B9-QC" → "B9-STORE" | Task set up with correct qty |
| 16 | Complete putaway task | Task closed; toast shown |
| 17 | Navigate to `/inventory`; filter for "B9 Inspected Widget" | On-hand = 40 in "B9-STORE"; 0 in "B9-QC" |

**Key assertions:**
- 50 received → 10 scrapped (QC fail) → 40 in storage
- Scrap record references QC failure reason
- PO inspection record shows pass/fail split

**Edge case:**
- 100% fail: all 50 units rejected → scrap order for 50 → zero units reach storage; PO marked FAILED_INSPECTION

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

### Scenario C6 — Route Builder v2: Canvas, Connect Mode and Step Config

**Business narrative:** A logistics manager creates a route strategy, uses the visual canvas to define step nodes and transition connections (Connect Mode), configures each step via the config panel, validates the graph, and activates the route.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/routes`; click "New Route" | Create route dialog opens with "Route Name" field |
| 2 | Enter name = "C6 Inbound Standard"; click "Create & Edit Canvas" | URL changes to `/inventory/routes/builder?id=<new-id>` |
| 3 | Wait for "Loading Route Builder…" spinner to disappear | Step Types palette visible in sidebar; canvas grid rendered |
| 4 | Observe sidebar step type list | At minimum: RECEIVE, QC_INSPECT, PUTAWAY, CONDITION, END visible |
| 5 | Drag (or click "Add Step") for step type RECEIVE | RECEIVE node appears on canvas |
| 6 | Add step type PUTAWAY | PUTAWAY node appears alongside RECEIVE |
| 7 | Add step type END | END node appears |
| 8 | Click "Connect" button in builder toolbar | Button becomes active (aria-pressed = true) or instruction text "Click a source step…" appears |
| 9 | Click the RECEIVE node (source) | Node highlighted in connect-mode colour |
| 10 | Click the PUTAWAY node (target) | Bézier SVG edge drawn from RECEIVE → PUTAWAY |
| 11 | Click PUTAWAY (source) → click END (target) | Second edge drawn: PUTAWAY → END |
| 12 | Press ESC or click "Cancel Connect" | Connect mode deactivated; no partial edge rendered |
| 13 | Click the RECEIVE node to select it | Right-side step config panel slides in |
| 14 | Verify panel heading contains "Step Properties" or "Step Config" | Panel visible with at least one editable field |
| 15 | Toggle "Requires Supervisor Approval" (or any config field) to ON | Field state changes without page error |
| 16 | Click "Save" in the toolbar | Toast "Route saved" shown |
| 17 | Click "Validate" in the toolbar | Toast "Graph is valid" or validation modal shows success |
| 18 | Click "Activate" | Route status changes to ACTIVE; toolbar or breadcrumb shows ACTIVE badge |
| 19 | Navigate back to `/inventory/routes` | Route row shows status = ACTIVE |
| 20 | Click the delete / archive button on the route; confirm | Route removed from list |

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

### Scenario C11 — Carrier Integration & Shipping Labels (Lalamove)

**Business narrative:** An admin configures Lalamove as a delivery method. A dispatcher ships an order via Lalamove, receives a live quotation, confirms the booking, and the tracking reference flows back into the order detail.

**Preconditions (UI setup steps — included in `beforeAll`):**
- Lalamove API credentials configured (sandbox keys) — visible at `/settings/lalamove`
- Warehouse "C11 Warehouse" with structured address fields (street, city, country, latitude, longitude) filled in — required for Lalamove geocoding
- Customer "C11 Customer" with structured address fields filled in (delivery destination)
- Product "C11 Delivery Widget"; stock qty ≥ 5 in warehouse
- Sales order for "C11 Customer" — 5 units of "C11 Delivery Widget" — picked and packed (status = PACKED)

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/settings/lalamove` | Lalamove settings page loads; API Key and API Secret fields visible |
| 2 | Verify credentials are saved (masked values shown) | Fields show masked key; "Test Connection" button visible |
| 3 | Click "Test Connection" | Toast "Connection successful" (sandbox API responds) |
| 4 | Navigate to `/configuration/delivery-methods`; click "New Delivery Method" | Create form opens |
| 5 | Name = "Lalamove Express"; provider = **Lalamove (Live Quote)**; click Save | Method row appears; "Price / Logic" column shows "Live Quote" badge |
| 6 | Navigate to the PACKED C11 sales order | Order detail; status = PACKED |
| 7 | Click "Create Shipment" | Shipment form opens; delivery method dropdown visible |
| 8 | Select "Lalamove Express" from the delivery method dropdown | **Quotation panel appears automatically** showing: service type (MOTORCYCLE/SEDAN/VAN based on order weight), quoted price (e.g. IDR 8,500), and currency |
| 9 | Verify the quoted price is a non-zero number | Price > 0 displayed |
| 10 | Click "Confirm & Place Order" (or "Dispatch") | API call to Lalamove sandbox — order placed |
| 11 | Toast "Shipment created" shown; page redirects to order detail | Order status = SHIPPED |
| 12 | On order detail — Shipment section | **Lalamove Order ID** field is populated; **Tracking Link** is visible and clickable |
| 13 | Navigate to `/shipments` | C11 order row shows carrier = "Lalamove Express"; tracking reference visible |

**Key assertions:**
- Quotation is fetched live (non-zero price from Lalamove sandbox) before confirming
- Lalamove order ID and tracking share link are persisted on the order/shipment record
- No manual tracking number entry required — it is returned by the carrier API

**Edge cases:**
- Missing warehouse coordinates → form validation prevents shipment creation; error message "Warehouse address is incomplete for Lalamove delivery"
- Missing customer coordinates → same validation error at dispatch time
- Lalamove sandbox unavailable → graceful error toast; shipment not created; order stays PACKED

---

## Track D — Advanced Picking Operations

> **Feature flag prerequisite:** `ADVANCED_PICKING` must be enabled for the tenant before running any scenario in this track (toggle in `/admin/tenants/:id` → Feature Flags tab).

---

### Scenario D1 — Picking Dashboard: Supervisor Session Monitor and Re-Sequence

**Business narrative:** A warehouse supervisor monitors active picking sessions in real time via the Picking Dashboard. When the system detects a more optimal task ordering for an active session, the supervisor reviews the re-sequence preview and accepts it to update the pick order without interrupting the worker.

**Preconditions:** At least one active picking session exists (created via A2 or A4). `ADVANCED_PICKING` enabled.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking/dashboard` | Page heading "Picking Dashboard" visible; no Application error |
| 2 | Observe KPI card row | At least one of: "Active Sessions", "Tasks Pending", "Tasks Picked", "Tasks Failed" cards visible with numeric values |
| 3 | Observe sessions table | Active session row visible with columns: Strategy, Worker, Start Time, Progress |
| 4 | Verify no "Application error" or "Unhandled error" text on page | Body does not contain error text |
| 5 | Locate the "Re-sequence" (or "Reoptimise") button on an active session row | Button visible and enabled |
| 6 | Click "Re-sequence" | Side panel slides in; "Current Order" column lists current task sequence |
| 7 | Verify "Proposed Order" column is also visible | Both columns side-by-side in the panel |
| 8 | Click "Accept" | `POST /strategy/picking/sessions/:id/reoptimise` called; toast "Tasks reordered" shown; panel closes |
| 9 | Observe the session row's pick order has updated | Task sequence on session detail (if navigable) shows new order |
| 10 | Open a second session's re-sequence panel; click "Reject" (or "Cancel") | Panel closes; no API call to reoptimise; session unchanged |

**Edge cases:**
- No active sessions: sessions table shows empty state ("No active sessions"); KPI cards still render (may show 0)
- Re-sequence panel with a single-task session: "Proposed Order" is identical to "Current Order"; Accept still succeeds without error

---

### Scenario D2 — Wave Release Rules: Full CRUD and Manual Trigger

**Business narrative:** A warehouse manager creates wave release rules to automate wave creation on a schedule (TIME_BASED), at an order count threshold (ORDER_COUNT), or on demand (MANUAL). They enable/disable rules and manually trigger a MANUAL rule to release a wave for waiting orders.

**Preconditions:** `ADVANCED_PICKING` feature flag enabled. At least one reserved order exists for the trigger test.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/picking/wave-rules` | Heading "Wave Release Rules" visible; "New Rule" button present |
| 2 | Click "New Rule" | Inline form appears with heading "New Wave Release Rule"; "Rule Name" field and "Create rule" button visible |
| 3 | Enter name "D2 Morning Wave"; select trigger type = TIME_BASED | Rule type selector set |
| 4 | Select or enter cron preset "Daily at 08:00" (cron: `0 8 * * *`) | Cron field populated |
| 5 | Click "Create rule" | Inline form closes; rule "D2 Morning Wave" appears in list with TIME_BASED badge |
| 6 | Click "New Rule" again; name = "D2 Auto-50"; trigger type = ORDER_COUNT; min orders = 50; max orders = 100 | Fields set |
| 7 | Click "Create rule" | "D2 Auto-50" rule appears in list with ORDER_COUNT badge |
| 8 | Click "New Rule" again; name = "D2 Manual Release"; trigger type = MANUAL | Fields set |
| 9 | Click "Create rule" | "D2 Manual Release" appears in list with MANUAL badge and a "Trigger" action button |
| 10 | Click the enable/disable toggle on "D2 Morning Wave" | Toggle flips to disabled; rule row shows disabled/inactive state |
| 11 | Click the toggle again | Rule returns to enabled state |
| 12 | Click "Trigger" on "D2 Manual Release" | `POST /strategy/wave-rules/:id/trigger` called; toast appears: "Wave released — X orders included" or "No RESERVED orders available" |
| 13 | Click the delete button on "D2 Auto-50"; confirm dialog | Rule removed from list; no longer visible |

**Edge cases:**
- Trigger with no reserved orders: toast shows informational message ("No RESERVED orders available"); no wave session created; page does not error
- Trigger with reserved orders: toast shows `sessionId` reference; wave session appears in Picking Dashboard

---

### Scenario D3 — Route Builder v2: Connect Mode, Step Config, and Activate Flow

**Business narrative:** This scenario validates the full advanced Route Builder v2 interaction — building a multi-step flow using the Connect Mode two-click transition system, configuring step properties, validating the graph, and activating the route for live use.

> Note: This is a deeper integration test of C6. Where C6 validates the basic create/connect/save flow, D3 validates edge cases: ESC-cancel during connect, editing a config field, running validation, and the full activate lifecycle.

**Preconditions:** Navigate to `/inventory/routes`; create a new route "D3 Advanced Route" using the "New Route" dialog → "Create & Edit Canvas". Wait for builder canvas to fully load (spinner gone).

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Confirm canvas is ready | "Loading Route Builder…" text not visible; Step Types palette in sidebar |
| 2 | Add 3 steps from palette: RECEIVE, QC_INSPECT, END | 3 nodes rendered on canvas |
| 3 | Click "Connect" in toolbar | Connect mode active (button aria-pressed = true or instruction text visible) |
| 4 | Click RECEIVE node → press ESC before selecting target | Connect mode cancelled; no edge drawn from RECEIVE |
| 5 | Click "Connect" again; click RECEIVE → click QC_INSPECT | Edge drawn: RECEIVE → QC_INSPECT |
| 6 | While still in Connect mode, click QC_INSPECT → click END | Edge drawn: QC_INSPECT → END; canvas shows complete flow |
| 7 | Click somewhere on canvas (not a node) to deselect | No node selected; connect mode may auto-exit |
| 8 | Click the QC_INSPECT node | Step config panel opens on the right |
| 9 | In config panel, toggle "Requires Supervisor Approval" to ON | Field state = checked/true |
| 10 | Click "Save" toolbar button | Toast "Route saved"; no page error |
| 11 | Click "Validate" | Toast "Graph is valid" OR validation passes with green indicator |
| 12 | Click "Activate" | Route status → ACTIVE; toast "Route activated"; toolbar shows ACTIVE state |
| 13 | Navigate to `/inventory/routes` | "D3 Advanced Route" row shows status ACTIVE |
| 14 | Navigate back to builder for D3 route | Canvas still shows all 3 nodes and 2 edges |
| 15 | Add a 4th node (NOTIFY) without connecting it; click "Validate" | Validation fails: toast or modal shows error ("All branches must terminate in an END state" or "Unconnected node detected") |

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

### Scenario E3 — Replenishment Chain: Min/Max Rule → Consume Stock → Auto-PO

**Business narrative:** Validates the complete replenishment lifecycle in one stitched sequence: configure a min/max rule, consume stock below the threshold via real sales orders, run the replenishment check, and confirm an auto-generated purchase order is created and routable for approval.

Runs in sequence: C4 (reorder rule) → A2 × N (sell stock below min) → B5 (replenishment check → auto-PO) → A1 (receive auto-PO goods).

**Preconditions:** Supplier "E3 Supplier" and product "E3 Replenish Widget" created. Stock seeded to 25 units in "E3 Warehouse" via a positive adjustment.

**Steps and assertions:**

| # | UI Action | Assertion |
|---|-----------|-----------|
| 1 | Navigate to `/inventory/reordering-rules`; click "New Rule" | Create form opens |
| 2 | Product = "E3 Replenish Widget"; location = "E3 Warehouse storage"; min = 20; max = 100 | Fields set |
| 3 | Click Save | Rule row appears; min = 20, max = 100 |
| 4 | Navigate to `/inventory/replenishment`; click "Trigger Check" | Dashboard shows **No alerts** (current stock 25 > min 20) |
| 5 | Navigate to `/orders/new`; create and ship a sales order for "E3 Replenish Widget" qty 10 (stock now = 15) | Order shipped; on-hand decreases to 15 |
| 6 | Navigate to `/inventory/replenishment`; click "Trigger Check" | **Alert appears** for "E3 Replenish Widget" — status LOW_STOCK; current = 15, threshold = 20 |
| 7 | Click the alert row | Alert detail shows: current stock 15, min threshold 20, suggested PO qty = 85 (to reach max 100) |
| 8 | Click "Create Auto PO" → confirm dialog | Toast "Purchase order created"; alert status changes to PO_CREATED |
| 9 | Click the PO link in the alert | Navigated to new PO detail; supplier = "E3 Supplier"; qty = 85; status = PENDING |
| 10 | Navigate to `/inventory/purchases` | PO row visible; reference to "E3 Replenish Widget" |
| 11 | Approve the PO | Status = APPROVED |
| 12 | Click "Receive"; enter qty 85; select storage location; confirm receipt | PO status = RECEIVED; on-hand increases by 85 → total = 100 |
| 13 | Navigate to `/inventory/replenishment` | Alert for "E3 Replenish Widget" is dismissed or no longer LOW_STOCK |

**Key assertions:**
- No alert fires while stock ≥ min (step 4)
- Alert fires immediately after stock drops below min (step 6)
- Auto-PO qty targets the max quantity (max − current = 100 − 15 = 85)
- Receiving the PO clears the alert and restores stock to max

---

## Playwright Implementation Notes

### File layout
```
apps/web/e2e/
  # Track A — Order & Fulfillment
  ui-a1-inbound-flow.spec.ts
  ui-a2-outbound-flow.spec.ts
  ui-a3-returns-flow.spec.ts
  ui-a4-wave-picking.spec.ts
  ui-a5-cluster-picking.spec.ts
  ui-a6-cross-docking.spec.ts
  ui-a7-lot-batch-expiry.spec.ts
  ui-a8-waveless-picking.spec.ts          # NEW v1.2

  # Track B — Back-Office Operations
  ui-b1-stocktaking.spec.ts
  ui-b2-cycle-count.spec.ts
  ui-b3-inventory-adjustment.spec.ts
  ui-b4-scrap-orders.spec.ts
  ui-b5-replenishment.spec.ts
  ui-b6-invoice-matching.spec.ts
  ui-b7-inter-warehouse-transfer.spec.ts
  ui-b8-putaway-exception.spec.ts
  ui-b9-qc-inspection.spec.ts

  # Track C — Setup & Configuration
  ui-c1-warehouse-setup.spec.ts
  ui-c2-product-catalog.spec.ts
  ui-c3-putaway-rules.spec.ts
  ui-c4-reordering-rules.spec.ts
  ui-c5-delivery-methods.spec.ts
  ui-c6-route-builder-v2.spec.ts          # updated v1.2 (Connect Mode, Step Config, Validate/Activate)
  ui-c7-rbac.spec.ts
  ui-c8-settings.spec.ts
  ui-c9-supplier-portal.spec.ts
  ui-c10-admin-tenant.spec.ts
  ui-c11-carrier-shipping-labels.spec.ts

  # Track D — Advanced Picking Operations (NEW v1.2)
  ui-d1-picking-dashboard.spec.ts         # KPI cards, sessions table, re-sequence
  ui-d2-wave-release-rules.spec.ts        # create TIME_BASED/ORDER_COUNT/MANUAL, toggle, trigger, delete
  ui-d3-route-builder-advanced.spec.ts    # Connect Mode edge cases, step config, validate/activate lifecycle

  # Composite Journeys
  ui-e1-full-lifecycle.spec.ts
  ui-e2-config-first-order.spec.ts
  ui-e3-replenishment-chain.spec.ts
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

// Advanced Picking helpers (NEW v1.2)
export async function startPickingSession(page, warehouse, strategy, opts?)
export async function waitForRouteBuilderCanvas(page)          // waits for spinner to hide
export async function enableConnectMode(page)
export async function connectNodes(page, sourceLabel, targetLabel)
export async function openStepConfigPanel(page, nodeLabel)
export async function createWaveRule(page, name, triggerType, opts?)
export async function triggerWaveRule(page, ruleName)
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
