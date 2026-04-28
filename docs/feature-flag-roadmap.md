# Feature Flag Roadmap — Incremental Development Plan

**Created:** 2026-04-28  
**Status:** Planning  

Each feature is broken into self-contained milestones. Every milestone ships a working increment that can be tested independently before the next begins. The final milestone of each feature wires the feature flag gate so the platform admin can enable it per-tenant.

---

## Priority Order Summary

| # | Flag | Current | Effort | Blocking Dependencies |
|---|------|---------|--------|-----------------------|
| 1 | `API_ACCESS` | 95% | XS | None |
| 2 | `BARCODE_PRINT` | 70% | S | None |
| 3 | `ADVANCED_PICKING` | 60% | M | None |
| 4 | `BETA_FLOOR_PLAN` | 50% | M | None |
| 5 | `ADVANCED_ANALYTICS` | 50% | M | Soft: MULTI_CURRENCY for accurate reporting |
| 6 | `MULTI_CURRENCY` | 0% | L | None (but unblocks ADVANCED_ANALYTICS fully) |
| 7 | `SUPPLIER_PORTAL` | 0% | L | None |
| 8 | `AI_REORDER` | 10% | XL | Requires ≥90 days of transaction history in prod |

---

## 1. `API_ACCESS`

**Goal:** API keys can be created and the platform enforces their scopes on every request.

**Current state:** Key lifecycle (create / list / revoke / delete) and Settings UI are complete. The `ApiKeyGuard` validates the key exists but does **not** check scopes. No feature flag gate on key creation.

---

### M1.1 — Scope enforcement in ApiKeyGuard

**Build:**
- Add a `@RequireScope(scope: string)` decorator using `SetMetadata`
- Update `ApiKeyGuard.canActivate()` to read `required_scope` from route metadata and verify it exists in `validation.scopes`
- Decorate each `api-key` controller endpoint with appropriate scopes (e.g. `INVENTORY:READ` on `GET /inventory/products`)
- Scope check only applies when `authMethod === 'api-key'`; session-based auth bypasses it

**Test:**
- Unit: Guard passes when scopes match, throws `ForbiddenException` when they do not
- Integration: Create a key with `INVENTORY:READ` scope, call `POST /inventory/products` → expect 403; call `GET /inventory/products` → expect 200
- Integration: Key with no scopes → all scope-decorated endpoints return 403

---

### M1.2 — Per-key rate limiting

**Build:**
- Extend `ApiKeyService.validateApiKey()` to return the key's `id`
- Add a Redis-backed or in-memory rate limit counter keyed on `apiKeyId`
- Plug into the existing `ThrottlerGuard` via a custom throttler storage, or implement a lightweight middleware

**Test:**
- Integration: Exceed 60 requests/minute with the same API key → expect 429
- Integration: Two different keys share no rate limit bucket

---

### M1.3 — Feature flag gate on key creation

**Build:**
- In `ApiKeyController.create()`, read the company's `API_ACCESS` flag via `FeatureFlagService`
- Return `403 { message: "API access is not enabled for your account" }` when flag is off
- In the Settings → API Keys frontend page, check the flag on page load and show an "upgrade" banner when off

**Test:**
- Integration: Company with flag off → `POST /api-keys` returns 403
- Integration: Company with flag on → key created successfully
- E2E (Playwright): Settings → API Keys page shows "not enabled" banner when flag off; shows key list when on

---

### M1 Acceptance Criteria
- [ ] API key with `INVENTORY:READ` cannot call write endpoints
- [ ] Key creation blocked for tenants without `API_ACCESS` flag
- [ ] Rate limit per key enforced independently of global throttler

---

## 2. `BARCODE_PRINT`

**Goal:** Tenants with this flag can print PDF or ZPL labels for products and locations, with a configurable default printer.

**Current state:** PDF generation (Code128) works for products and locations. ZPL template exists in `PrintingService` but is not exposed via any endpoint. No printer config model or UI.

---

### M2.1 — Expose ZPL endpoints

**Build:**
- Add `GET /printing/location/:id/zpl` and `GET /printing/product/:id/zpl` to `PrintingController`
- Wire to existing `generateZPL()` in `PrintingService`; respond with `Content-Type: application/x-zpl`
- Expand the ZPL template to include product name, SKU, and barcode (currently only has `name` and `id`)

**Test:**
- Integration: `GET /printing/product/:id/zpl` returns a valid ZPL string starting with `^XA` and ending with `^XZ`
- Integration: `GET /printing/location/:id/zpl` contains the location barcode value

---

### M2.2 — Printer configuration model and API

**Build:**
- Add `PrinterConfig` Prisma model:
  ```prisma
  model PrinterConfig {
    id          String  @id @default(uuid())
    companyId   String
    name        String
    outputType  String  // PDF | ZPL
    host        String?
    port        Int?
    isDefault   Boolean @default(false)
    labelWidth  Int     @default(288)
    labelHeight Int     @default(144)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```
- Add endpoints in a new `PrinterConfigController`:
  - `GET /printing/printers` — list configured printers
  - `POST /printing/printers` — create config
  - `PUT /printing/printers/:id` — update
  - `DELETE /printing/printers/:id` — delete
  - `PATCH /printing/printers/:id/default` — set as default

**Test:**
- Integration: CRUD operations on printer configs
- Integration: Setting a new default clears the previous default

---

### M2.3 — Printer configuration settings page (frontend)

**Build:**
- Add Settings → Printers page at `app/(dashboard)/settings/printers/page.tsx`
- Form: printer name, output type (PDF/ZPL), optional host/port (for network printers), label dimensions
- List view with edit / delete / set-default actions
- Add "Printers" link to the Settings navigation

**Test:**
- E2E: Create a printer config, verify it appears in the list
- E2E: Set a printer as default, verify the badge moves

---

### M2.4 — Format selector and batch printing

**Build:**
- Update `PrintButton` component to accept `format: 'pdf' | 'zpl'` prop; read the default from the tenant's default printer config
- Add batch print endpoint: `POST /printing/batch` accepts `{ items: [{ type: 'product'|'location', id: string }], format: 'pdf'|'zpl' }` — returns a ZIP for ZPL or merged PDF
- Add multi-select checkboxes to the Products and Locations list pages with a "Print Labels" bulk action button

**Test:**
- Integration: Batch request with 3 products returns a ZIP containing 3 ZPL files
- E2E: Select 2 products → "Print Labels" → browser download triggered

---

### M2.5 — Feature flag gate

**Build:**
- Add `@RequireFeatureFlag('BARCODE_PRINT')` guard to all `/printing/*` endpoints
- In the frontend, hide "Print Label" buttons when the flag is off (check via a `useFeatureFlag('BARCODE_PRINT')` hook that reads from a server component or context)

**Test:**
- Integration: Company without flag → `GET /printing/product/:id/pdf` returns 403
- E2E: Print buttons not rendered when flag off; visible when on

---

### M2 Acceptance Criteria
- [ ] PDF and ZPL labels generate correctly for products and locations
- [ ] Printer config persists per-company
- [ ] Batch print downloads a ZIP of ZPL or merged PDF
- [ ] All print endpoints blocked for tenants without the flag

---

## 3. `ADVANCED_PICKING`

**Goal:** All picking strategies (SINGLE, BATCH, CLUSTER, WAVE, WAVELESS, ZONE) are fully operational; tenants without the flag only see SINGLE.

**Current state:** API and DB for all 4 strategies exist. Frontend exposes all strategies but CLUSTER/WAVE UI is thinner. Zone picking is missing entirely. No wave release rules. No picking list print.

---

### M3.1 — Zone picking strategy

**Build:**
- Add `ZONE` to the `PickingStrategy` enum in Prisma schema and create a migration
- Implement `createZoneSession()` in `PickingStrategyService`:
  - Groups pending order lines by the warehouse zone of their source location
  - Creates one `PickingTask` per zone, ordered by proximity (using existing routing distance API)
- Add `ZONE` option to the strategy selector in `picking/page.tsx`

**Test:**
- Integration: `POST /strategy/picking/sessions` with `strategy: ZONE` creates tasks grouped by zone
- Integration: Tasks are ordered by zone proximity (route distance ascending)

---

### M3.2 — Wave release rules engine

**Build:**
- Add `WaveReleaseRule` Prisma model:
  ```prisma
  model WaveReleaseRule {
    id          String  @id @default(uuid())
    companyId   String
    warehouseId String
    triggerType String  // ORDER_COUNT | CUT_OFF_TIME | MANUAL
    threshold   Int?    // for ORDER_COUNT
    cutOffTime  String? // "14:30" for CUT_OFF_TIME
    isActive    Boolean @default(true)
  }
  ```
- Implement a `@Cron('*/5 * * * *')` job in `StrategyModule` that evaluates active rules and auto-releases waves
- Add CRUD endpoints `GET|POST|PUT|DELETE /strategy/wave-rules`
- Add wave release rules management UI under Picking settings

**Test:**
- Unit: Rule with `ORDER_COUNT` threshold of 5 triggers after 5 eligible orders accumulate
- Integration: Cron job fires, finds a rule with met threshold, creates a wave session
- E2E: Create a rule, verify wave auto-releases when order count is reached

---

### M3.3 — Picking list PDF

**Build:**
- Add `GET /strategy/picking/sessions/:id/picklist` to `StrategyController`
- Implement `generatePickingListPdf(sessionId)` in `PrintingService` using pdfmake — table of tasks: product, location path, quantity, status
- Add "Print Pick List" button to the active session header in the picking UI

**Test:**
- Integration: Endpoint returns `Content-Type: application/pdf`
- Integration: PDF content contains all task rows for the session

---

### M3.4 — Feature flag gate

**Build:**
- Add a `PickingStrategyGuard` that checks `ADVANCED_PICKING` flag when strategy is not `SINGLE`
- In `picking/page.tsx`, hide BATCH/CLUSTER/WAVE/WAVELESS/ZONE options when flag is off (only show SINGLE)

**Test:**
- Integration: Company without flag + `strategy: BATCH` → 403
- Integration: Company without flag + `strategy: SINGLE` → 200
- E2E: Strategy dropdown shows only "Single Order" when flag off; all options when on

---

### M3 Acceptance Criteria
- [ ] Zone picking creates tasks ordered by warehouse zone proximity
- [ ] Wave rules auto-release waves on schedule
- [ ] Pick list PDF downloadable from active session
- [ ] Advanced strategies blocked for tenants without the flag

---

## 4. `BETA_FLOOR_PLAN`

**Goal:** Warehouse managers can build and edit an interactive floor plan by dragging, resizing, and linking functional areas to physical locations.

**Current state:** Full API and DB (geometry fields, snap-to-grid config, area CRUD) are complete. The floor plan page currently redirects but has no interactive canvas.

---

### M4.1 — Canvas foundation

**Build:**
- Install `react-konva` and `konva` packages in `apps/web`
- Create `FloorPlanCanvas` component at `components/floor-plan/canvas.tsx`
- On load: fetch `GET /warehouses/:id/areas` and render each area as a `Konva.Rect` or `Konva.Line` (polygon) using stored `x`, `y`, `width`, `height`
- Render warehouse boundary based on `floorPlanWidth` / `floorPlanHeight`
- Replace the current redirect in the floor plan page with this component

**Test:**
- Manual: Open a warehouse floor plan page; existing areas appear as coloured boxes on canvas

---

### M4.2 — Drag, resize, and create areas

**Build:**
- Enable `Konva.Transformer` on selected shapes for resize handles
- On drag-end: call `PUT /warehouses/:warehouseId/areas/:areaId` with updated `x`, `y`
- On resize-end: call the same endpoint with updated `width`, `height`
- "Add Area" button opens a sidebar form (name, areaType, colour); on submit calls `POST /warehouses/:id/areas` and adds the shape to the canvas

**Test:**
- E2E: Drag an area, reload page — area appears in new position
- E2E: Add a new area via form, verify it persists after page reload

---

### M4.3 — Snap-to-grid

**Build:**
- Read `gridEnabled` and `gridSize` from the warehouse record
- Draw grid lines on a background `Konva.Layer`
- On drag-end, snap `x` and `y` to the nearest grid increment before saving
- Add grid toggle and grid size controls to the floor plan toolbar; call `PATCH /warehouses/:id/floor-plan` on change

**Test:**
- Manual: Enable grid, drag area — position snaps to grid on release

---

### M4.4 — Link areas to locations

**Build:**
- In the area sidebar, add a "Linked Location" selector (searchable dropdown using `GET /inventory/locations?warehouseId=:id`)
- Save `linkedLocationId` on area create/update
- Clicking a linked area shows a tooltip with the location's current utilisation (`GET /inventory/locations/:id/utilisation`)

**Test:**
- Integration: Area with `linkedLocationId` returns utilisation data via the tooltip API call
- E2E: Link an area to a location, verify the utilisation tooltip appears on hover

---

### M4.5 — Feature flag gate

**Build:**
- Hide the "Floor Plan" tab on the warehouse detail page when `BETA_FLOOR_PLAN` flag is off for the tenant
- No API gate needed (floor plan endpoints are within the authenticated app)

**Test:**
- E2E: Flag off → floor plan tab absent from warehouse navigation
- E2E: Flag on → tab visible and canvas loads

---

### M4 Acceptance Criteria
- [ ] Areas can be created, moved, and resized via drag on canvas
- [ ] Snap-to-grid works when enabled
- [ ] Areas link to storage locations with live utilisation tooltip
- [ ] Floor plan tab hidden for tenants without the flag

---

## 5. `ADVANCED_ANALYTICS`

**Goal:** Tenants see interactive trend charts, a custom date range picker, and drilldown views for every KPI card. Basic dashboard always visible; advanced views gated.

**Current state:** API has comprehensive drilldown and trend endpoints. Frontend has 7 static KPI cards and a simple bar chart hardcoded to the last 7 days. Currency hardcoded to IDR.

---

### M5.1 — Date range picker and period selector

**Build:**
- Install `react-day-picker` (already a common shadcn dependency)
- Add a `DateRangePicker` component to the reporting page header
- Replace the hardcoded "Last 7 days" label with preset buttons (Today, 7d, 30d, 90d) + custom range
- Pass `startDate` / `endDate` / `period` to `fetchAnalytics()` and re-fetch on change

**Test:**
- E2E: Select "30d" — network request to `/reporting/analytics?period=30d` is made
- E2E: Custom date range — request includes `startDate` and `endDate` query params

---

### M5.2 — Trend charts (recharts)

**Build:**
- Install `recharts`
- Add a "Utilisation Trend" `LineChart` using `GET /reporting/utilisation/history`
- Add a "Cycle Time Trend" `LineChart` using `GET /reporting/cycle-time/trend`
- Both charts respect the selected date range from M5.1

**Test:**
- E2E: Charts render with data points; hovering a point shows a tooltip with value and date

---

### M5.3 — KPI drilldown views

**Build:**
- Each KPI card becomes clickable and opens a drilldown sheet/modal
- Wire each card to its drilldown endpoint:
  - Inventory Value → `GET /reporting/analytics/drilldown/stock-value` (product breakdown table)
  - Fulfillment Rate → `GET /reporting/analytics/drilldown/fulfillment` (order list with status)
  - Stockout Rate → `GET /reporting/analytics/drilldown/stockout` (products at zero stock)
  - Pending Orders → `GET /reporting/analytics/drilldown/pending-orders`
  - Cycle Time → `GET /reporting/analytics/drilldown/cycle-time`
  - Capacity → `GET /reporting/analytics/drilldown/capacity`
- Drilldowns respect the active date range

**Test:**
- E2E: Click "Inventory Value" card → drilldown sheet opens with product rows
- E2E: Drilldown table is filterable/sortable

---

### M5.4 — Inventory ledger page

**Build:**
- Create `app/(dashboard)/reporting/ledger/page.tsx`
- Table with columns: Date, Product, Transaction Type, Qty (±), Location, Reference (order/PO ID)
- Filter bar: product search, location filter, date range, transaction type
- Calls `GET /reporting/inventory-ledger` with filter params
- Add "Inventory Ledger" link to the Reporting navigation

**Test:**
- E2E: Filter by product — table updates showing only that product's transactions
- E2E: Transaction rows link back to the source order/PO

---

### M5.5 — Feature flag gate

**Build:**
- Basic KPI cards and the simple bar chart remain visible to all tenants (no flag required)
- Trend charts, drilldown views, custom date range picker, and ledger page are rendered only when `ADVANCED_ANALYTICS` flag is on
- Show an "Upgrade to Advanced Analytics" banner with a lock icon when flag is off

**Test:**
- E2E: Flag off → trend charts absent, KPI cards not clickable, banner shown
- E2E: Flag on → all views accessible

---

### M5 Acceptance Criteria
- [ ] Date range picker controls all analytics API calls
- [ ] Utilisation and cycle time trend lines render from real API data
- [ ] All 6 KPI drilldowns show detailed tabular data
- [ ] Inventory ledger page is searchable and filterable
- [ ] Advanced views hidden behind flag with upgrade prompt

---

## 6. `MULTI_CURRENCY`

**Goal:** Each company has a default currency. Orders and invoices record the currency at time of creation. FX rates can be entered manually or fetched from a provider. All monetary reporting converts to the company's default currency.

**Current state:** Zero implementation. All amounts are unitless floats; reporting hardcodes `'IDR'`.

---

### M6.1 — Currency and ExchangeRate models

**Build:**
- Add to Prisma schema:
  ```prisma
  model Currency {
    code          String  @id        // ISO 4217: "IDR", "USD", "EUR"
    name          String
    symbol        String
    decimalPlaces Int     @default(2)
    isActive      Boolean @default(true)
  }

  model ExchangeRate {
    id           String   @id @default(uuid())
    companyId    String
    fromCurrency String
    toCurrency   String
    rate         Float
    effectiveAt  DateTime @default(now())
    source       String   // MANUAL | PROVIDER
    @@index([companyId, fromCurrency, toCurrency, effectiveAt])
  }
  ```
- Add `defaultCurrency String @default("IDR")` to the `Company` model
- Seed the 10 most common currencies (IDR, USD, EUR, SGD, MYR, AUD, GBP, JPY, CNY, HKD)
- Run migration

**Test:**
- Integration: `GET /currencies` returns seeded list
- Migration applies cleanly without data loss

---

### M6.2 — Add currencyCode to transactional models

**Build:**
- Add `currencyCode String @default("IDR")` to `Order`, `Invoice`, `PurchaseOrder` (non-breaking — existing rows default to IDR)
- Run migration
- Update `CreateOrderDto`, `CreateInvoiceDto`, `CreatePurchaseOrderDto` to accept optional `currencyCode`
- On create, default to the company's `defaultCurrency` if not provided

**Test:**
- Integration: Create order without `currencyCode` → saved with company's default
- Integration: Create order with `currencyCode: "USD"` → saved as USD

---

### M6.3 — Currency management API

**Build:**
- `GET /currencies` — list all active currencies (public, no auth needed for display)
- `GET /companies/:id/currencies` — list currencies active for a company
- `POST /companies/:id/currencies/:code/activate` — add a currency to a company's active set
- `GET /companies/:id/exchange-rates` — latest rate per pair
- `POST /companies/:id/exchange-rates` — manually enter a rate (`fromCurrency`, `toCurrency`, `rate`)
- `GET /companies/:id/exchange-rates/history` — rate history for a pair

**Test:**
- Integration: Post a manual rate → returned by GET latest
- Integration: Duplicate pair → creates a new history entry, doesn't overwrite

---

### M6.4 — Currency settings page (frontend)

**Build:**
- Settings → Currency page at `app/(dashboard)/settings/currency/page.tsx`
- Default currency selector (company-wide)
- Active currencies list with enable/disable toggles
- FX rate table: rows per active pair, "Edit Rate" inline input, last updated timestamp
- Save calls `POST /companies/:id/exchange-rates`

**Test:**
- E2E: Change default currency → confirmed in company settings response
- E2E: Enter a manual rate → appears in the rate table with today's date

---

### M6.5 — FX provider integration (scheduled sync)

**Build:**
- Add `FX_PROVIDER_API_KEY` and `FX_PROVIDER_URL` env vars (support Open Exchange Rates format)
- Add a `@Cron('0 0 * * *')` job in a new `CurrencyModule` that fetches latest rates for all active company currency pairs and upserts them with `source: PROVIDER`
- Manual rates take precedence over provider rates (use the most recent `effectiveAt` within the same day)
- Add `apps/api/.env.example` entry for the new vars

**Test:**
- Unit: Mock HTTP call returns rates → service creates `ExchangeRate` records with source `PROVIDER`
- Integration: Manual rate on the same day overrides provider rate in monetary calculations

---

### M6.6 — Currency-aware reporting

**Build:**
- Add a `CurrencyService.convert(amount, fromCode, toCode, companyId)` method that looks up the latest rate
- Update `ReportingService.getDashboardAnalytics()` to convert all amounts to company's `defaultCurrency` before summing
- Remove the hardcoded `'IDR'` references (currently in `reporting.service.ts:49` and in the reporting page `Intl.NumberFormat` calls)
- Update the reporting page to read `company.defaultCurrency` and format accordingly

**Test:**
- Unit: `convert(100, 'USD', 'IDR', companyId)` returns `100 * rate` using the latest stored rate
- Integration: Analytics endpoint returns `currencyCode` in the response alongside monetary values
- E2E: Reporting page shows the company's default currency symbol

---

### M6.7 — Currency selector on order/invoice UI

**Build:**
- Add a currency dropdown to the "Create Order" and "Create Invoice" forms (only shows currencies active for the company)
- Defaults to company's `defaultCurrency`
- Submitted `currencyCode` is stored on the record and displayed on the order/invoice detail page

**Test:**
- E2E: Create an order with USD selected → order detail shows "USD"
- E2E: Default currency pre-selected in the dropdown on form open

---

### M6.8 — Feature flag gate

**Build:**
- When `MULTI_CURRENCY` flag is off: hide currency selector on all forms (always uses default), hide Settings → Currency page
- When on: all M6 features are accessible

**Test:**
- E2E: Flag off → Create Order form has no currency selector; currency always IDR
- E2E: Flag on → selector visible

---

### M6 Acceptance Criteria
- [ ] Company default currency configurable
- [ ] Orders and invoices store their currency at creation time
- [ ] Manual FX rates enterable; provider sync runs nightly
- [ ] All dashboard monetary values converted to company's default currency
- [ ] Currency features hidden when flag is off

---

## 7. `SUPPLIER_PORTAL`

**Goal:** Suppliers have their own login, can view purchase orders issued to them, submit ASNs, and upload their invoices.

**Current state:** Zero portal implementation. Supplier model exists for admin management only.

---

### M7.1 — SupplierUser model and invite flow

**Build:**
- Add to Prisma schema:
  ```prisma
  model SupplierUser {
    id           String    @id @default(uuid())
    supplierId   String
    email        String    @unique
    passwordHash String
    isActive     Boolean   @default(true)
    lastLoginAt  DateTime?
    createdAt    DateTime  @default(now())
    supplier     Supplier  @relation(fields: [supplierId], references: [id])
  }

  model SupplierInvitation {
    id         String   @id @default(uuid())
    supplierId String
    email      String
    token      String   @unique
    expiresAt  DateTime
    usedAt     DateTime?
  }
  ```
- Run migration
- `POST /suppliers/:id/invite` (already exists on `SupplierController`) — generate a `SupplierInvitation` token and email it to the supplier contact

**Test:**
- Integration: Invite endpoint creates an invitation record with a 72-hour expiry
- Integration: Token is unique per invitation

---

### M7.2 — Supplier authentication

**Build:**
- Create `SupplierAuthModule` in `apps/api/src/supplier-auth/`
- `POST /supplier-auth/register` — accepts invitation token + new password; creates `SupplierUser`
- `POST /supplier-auth/login` — email + password → returns a JWT with `{ sub: supplierUserId, supplierId, role: 'SUPPLIER' }`
- `GET /supplier-auth/me` — returns the logged-in supplier user
- Separate `JwtStrategy` that only accepts tokens with `role: 'SUPPLIER'`
- Add `SupplierAuthGuard` for protecting supplier-only routes

**Test:**
- Integration: Register with valid token → `SupplierUser` created, invitation marked used
- Integration: Register with expired/used token → 400
- Integration: Login with correct credentials → JWT returned; `role` claim is `SUPPLIER`
- Integration: JWT from supplier login cannot access internal tenant endpoints

---

### M7.3 — Supplier-scoped purchase order endpoints

**Build:**
- Create `SupplierPortalController` with route prefix `supplier-portal`:
  - `GET /supplier-portal/purchase-orders` — returns only POs for the logged-in supplier's company
  - `GET /supplier-portal/purchase-orders/:id` — PO detail (read-only)
  - `GET /supplier-portal/purchase-orders/:id/documents` — view attached documents
- All endpoints protected by `SupplierAuthGuard`

**Test:**
- Integration: Supplier A cannot see Supplier B's POs
- Integration: Supplier can see their own POs in PENDING/APPROVED/RECEIVED states

---

### M7.4 — Supplier portal frontend

**Build:**
- Create route group `app/(supplier)/` with its own `layout.tsx` (minimal layout: logo, "My Portal" heading, logout button; no main app sidebar)
- Pages:
  - `app/(supplier)/portal/login/page.tsx` — supplier login form
  - `app/(supplier)/portal/dashboard/page.tsx` — list of POs with status badges
  - `app/(supplier)/portal/purchase-orders/[id]/page.tsx` — PO detail with line items
- Separate auth cookie `supplier_token` (not shared with the main `auth` cookie)

**Test:**
- E2E: Supplier login → redirects to portal dashboard
- E2E: Dashboard shows only the supplier's own POs
- E2E: Attempting to access `/dashboard` with a supplier token redirects to supplier portal

---

### M7.5 — Advanced Shipping Notice (ASN)

**Build:**
- Add `AdvancedShippingNotice` Prisma model:
  ```prisma
  model AdvancedShippingNotice {
    id               String   @id @default(uuid())
    purchaseOrderId  String
    supplierId       String
    estimatedArrival DateTime
    trackingNumber   String?
    notes            String?
    status           String   @default("SUBMITTED") // SUBMITTED | ACKNOWLEDGED | RECEIVED
    items            AsnItem[]
    createdAt        DateTime @default(now())
  }

  model AsnItem {
    id        String @id @default(uuid())
    asnId     String
    productId String
    quantity  Int
    asn       AdvancedShippingNotice @relation(fields: [asnId], references: [id])
  }
  ```
- `POST /supplier-portal/purchase-orders/:id/asn` — supplier submits an ASN
- `GET /supplier-portal/purchase-orders/:id/asn` — supplier views their ASN
- Warehouse team sees incoming ASNs at `GET /purchase-orders/:id/asn` (internal route)
- ASN submission form on the PO detail page in the supplier portal

**Test:**
- Integration: Supplier submits ASN with estimated arrival and line items → stored correctly
- Integration: Warehouse team can see the ASN on the PO detail page
- E2E: Supplier fills in ASN form → confirmation shown; ASN visible to warehouse admin

---

### M7.6 — Supplier invoice upload

**Build:**
- `POST /supplier-portal/purchase-orders/:id/invoice` — supplier uploads their invoice PDF (multipart)
- Stored using the existing `PurchaseOrderDocument` mechanism with `documentType: 'SUPPLIER_INVOICE'`
- Warehouse team receives a notification (`NotificationService`) when a supplier invoice is uploaded
- Invoice appears in `GET /purchase-orders/:id/documents` for the warehouse team

**Test:**
- Integration: Upload a PDF → document stored, notification created for the company
- E2E: Supplier uploads invoice → warehouse admin sees it in the PO documents tab

---

### M7.7 — Feature flag gate

**Build:**
- Supplier portal routes are always accessible to supplier users (they authenticate independently)
- The **admin-facing** controls (sending invites, viewing ASNs) are gated behind `SUPPLIER_PORTAL` flag
- When flag is off: "Invite Supplier" button hidden, supplier portal management section hidden in Settings

**Test:**
- E2E: Company without flag → no "Invite Supplier" button on supplier detail page
- E2E: Company with flag → invite button visible; email sent on click

---

### M7 Acceptance Criteria
- [ ] Supplier can register via invite token, log in, and view their POs only
- [ ] Supplier portal has a completely separate layout and auth flow
- [ ] ASN submitted by supplier is visible to warehouse team
- [ ] Supplier invoice upload triggers a notification
- [ ] Invite flow hidden for tenants without the flag

---

## 8. `AI_REORDER`

**Goal:** Replace simple threshold-based replenishment alerts with forecast-driven suggestions that account for demand velocity and configurable seasonality.

**Current state:** `ReplenishmentAlert` fires when `currentQty <= reorderPoint` (static threshold). No historical pattern analysis. No ML.

---

### M8.1 — Historical sales aggregation

**Build:**
- Add `DailySalesSummary` Prisma model:
  ```prisma
  model DailySalesSummary {
    id          String   @id @default(uuid())
    companyId   String
    productId   String
    warehouseId String
    date        DateTime @db.Date
    unitsSold   Int
    revenue     Float
    @@unique([companyId, productId, warehouseId, date])
    @@index([companyId, productId, date])
  }
  ```
- Add a `@Cron('0 1 * * *')` job `DailySummaryJob` that aggregates yesterday's `StockTransaction` records (type: PICK/SALE) into `DailySalesSummary` rows
- One-time backfill script: `scripts/backfill-daily-summaries.ts` — processes all historical transactions

**Test:**
- Unit: Job correctly sums PICK transactions for each product/warehouse/day
- Integration: Run job → `DailySalesSummary` rows created; idempotent (running again doesn't duplicate)
- Integration: Backfill script processes 90 days of history without timeout

---

### M8.2 — Forecasting engine (exponential smoothing)

**Build:**
- Add `ForecastService` at `apps/api/src/inventory/forecast.service.ts`
- Implement **Double Exponential Smoothing** (Holt's method) in TypeScript — handles trend but not seasonality yet:
  ```
  L(t) = α * y(t) + (1 - α) * (L(t-1) + T(t-1))
  T(t) = β * (L(t) - L(t-1)) + (1 - β) * T(t-1)
  Forecast(t+h) = L(t) + h * T(t)
  ```
- Add `SalesForecast` Prisma model:
  ```prisma
  model SalesForecast {
    id             String   @id @default(uuid())
    companyId      String
    productId      String
    warehouseId    String
    forecastDate   DateTime @db.Date
    predictedQty   Float
    confidence     Float    // 0.0 – 1.0
    method         String   // EXPONENTIAL_SMOOTHING | MOVING_AVERAGE
    generatedAt    DateTime @default(now())
    @@unique([companyId, productId, warehouseId, forecastDate])
  }
  ```
- `POST /replenishment/forecast/run` — admin triggers a forecast run for a company/warehouse
- `@Cron('0 2 * * *')` auto-runs forecasts nightly
- Only runs for companies where `AI_REORDER` flag is on AND there is ≥90 days of `DailySalesSummary` data

**Test:**
- Unit: Provide a known time series (e.g. `[10,12,11,13,14,15]`) → forecast for next 7 days is reasonable
- Integration: Forecast run creates `SalesForecast` rows for each product with sufficient history
- Integration: Company with <90 days history is skipped (no partial forecasts)

---

### M8.3 — Forecast-driven replenishment alerts

**Build:**
- Update `ReplenishmentService.checkStockLevels()`:
  - If `AI_REORDER` flag is **on** for the company: use the latest `SalesForecast` to compute "days of cover" = `currentStock / predictedDailyDemand`; fire alert when days-of-cover < `leadTimeDays + safetyDays`
  - If flag is **off**: use existing threshold logic unchanged
- Suggested order quantity becomes `predictedDailyDemand * reorderCycleDays` (rather than the static `product.reorderQuantity`)
- Add `forecastedDemand`, `daysOfCover`, `suggestedOrderQty` fields to `ReplenishmentAlert`

**Test:**
- Unit: Product with 50 units, forecast of 10/day → `daysOfCover = 5`; if lead time is 7 days, alert fires
- Integration: Company with AI flag on uses forecast-based alert; company without uses threshold

---

### M8.4 — Seasonality configuration

**Build:**
- Add `SeasonalityProfile` Prisma model:
  ```prisma
  model SeasonalityProfile {
    id        String            @id @default(uuid())
    companyId String
    name      String
    periods   SeasonalityPeriod[]
  }

  model SeasonalityPeriod {
    id          String  @id @default(uuid())
    profileId   String
    label       String  // "Ramadan", "Year-End Sale"
    startMD     String  // "03-15" (month-day, repeats yearly)
    endMD       String  // "03-30"
    multiplier  Float   // 1.5 = 50% uplift
    profile     SeasonalityProfile @relation(fields: [profileId], references: [id])
  }
  ```
- Apply multiplier in `ForecastService` when the forecast date falls within a seasonal period
- Add Settings → Seasonality page: create profiles, add periods with a date-range picker and multiplier input

**Test:**
- Unit: Forecast for a date within a period with `multiplier: 1.5` → predicted qty × 1.5
- E2E: Create a Ramadan period with 1.4x multiplier → forecast run reflects uplift

---

### M8.5 — Forecast accuracy tracking

**Build:**
- Add `@Cron('0 3 * * *')` job `ForecastAccuracyJob`:
  - For each `SalesForecast` where `forecastDate = yesterday`, look up actual `DailySalesSummary.unitsSold`
  - Compute MAE (mean absolute error) and MAPE (mean absolute percentage error)
  - Store in a `ForecastAccuracy` model: `{ forecastId, actualQty, mae, mape }`
- `GET /replenishment/forecast/accuracy` — returns rolling 30-day accuracy per product

**Test:**
- Unit: Accuracy job computes correct MAE given known forecast vs actual
- Integration: After running for 30 days, accuracy endpoint returns a per-product table

---

### M8.6 — AI suggestions UI

**Build:**
- Update the Replenishment page (`app/(dashboard)/replenishment/page.tsx`):
  - When `AI_REORDER` flag is on, add an "AI Insights" panel above the alerts table
  - Each alert card shows: "Predicted demand: **120 units/week** · Days of cover: **3.2 days** · Suggested order: **85 units**"
  - Confidence badge (green ≥80%, yellow 60–79%, red <60%)
  - "Create PO" button pre-fills the PO with the AI-suggested quantity
- `GET /replenishment/forecast/:productId` — returns the next 30-day forecast for display

**Test:**
- E2E: Alert card shows predicted demand and suggested order quantity
- E2E: Click "Create PO" → PO creation form pre-filled with AI quantity
- E2E: Flag off → standard alert cards without AI panels shown

---

### M8.7 — Feature flag gate and data sufficiency check

**Build:**
- `FeatureFlagService.setFlag()` — when enabling `AI_REORDER`, check if the company has ≥90 days of `DailySalesSummary` data; if not, return a warning (not an error) to the backoffice admin
- Admin backoffice shows a data readiness indicator next to the `AI_REORDER` toggle: "Data ready: 45/90 days"
- When flag is on but no forecast exists yet, replenishment page shows: "Forecasts are being generated — check back in a few minutes"

**Test:**
- Integration: Toggle returns `{ enabled: true, warning: "Only 45 days of history available; forecasts may be less accurate" }` when insufficient data
- E2E: Backoffice shows data readiness progress bar next to the AI_REORDER toggle

---

### M8 Acceptance Criteria
- [ ] Daily sales aggregation job runs nightly and is idempotent
- [ ] Exponential smoothing produces reasonable 30-day forecasts
- [ ] Replenishment alerts use forecast-based days-of-cover when flag is on
- [ ] Seasonal multipliers are applied to forecasts during configured periods
- [ ] Forecast accuracy is tracked and viewable per product
- [ ] Alert cards display predicted demand, days of cover, suggested order qty, and confidence
- [ ] Backoffice shows data readiness before the flag can be enabled

---

## Testing Standards (All Features)

### Per-milestone minimum bar
| Type | Requirement |
|------|-------------|
| Unit tests | Every new service method has a Jest unit test with mocked Prisma |
| Integration tests | Every new API endpoint tested via `supertest` in NestJS e2e suite |
| E2E tests | Every new UI interaction has a Playwright spec in `apps/web/e2e/` |
| Migration | Every Prisma migration runs cleanly on a clean DB and on a DB with production-like seed data |
| Flag gate | Each feature's final milestone has an E2E test verifying the flag-off state |

### Playwright spec naming convention
```
apps/web/e2e/
  api-access.spec.ts          # Feature 1
  barcode-print.spec.ts       # Feature 2
  advanced-picking.spec.ts    # Feature 3
  floor-plan.spec.ts          # Feature 4
  advanced-analytics.spec.ts  # Feature 5
  multi-currency.spec.ts      # Feature 6
  supplier-portal.spec.ts     # Feature 7
  ai-reorder.spec.ts          # Feature 8
```

### Definition of Done for each milestone
1. All tests for that milestone pass (`npm test` in API, `npx playwright test` for E2E)
2. TypeScript compiles with zero errors (`tsc --noEmit`)
3. Prisma migration applied and schema in sync
4. No new `console.log` or `TODO` comments left in production code
5. Code committed with a `feat(flag-name/milestone):` prefix

---

## Dependencies Between Features

```
API_ACCESS ──────────────────────────────────► (standalone)
BARCODE_PRINT ───────────────────────────────► (standalone)
ADVANCED_PICKING ────────────────────────────► uses BARCODE_PRINT for pick list PDF (soft)
BETA_FLOOR_PLAN ─────────────────────────────► (standalone)
ADVANCED_ANALYTICS ──────────────────────────► works standalone; full currency accuracy needs MULTI_CURRENCY
MULTI_CURRENCY ──────────────────────────────► (standalone, but unblocks ADVANCED_ANALYTICS fully)
SUPPLIER_PORTAL ─────────────────────────────► soft: MULTI_CURRENCY for invoice amounts in supplier currency
AI_REORDER ─────────────────────────────────► requires ADVANCED_PICKING for meaningful demand signals (soft)
                                               requires ≥90 days of live transaction data
```

---

*This document should be updated as milestones complete. Mark each milestone heading with ✅ when all tests pass and the code is merged.*
