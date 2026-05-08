# Regression Remediation Plan — Labamu IMS

Fix all 17 bugs found during the 2026-05-05 regression run, grouped by root-cause cluster for maximum parallelism and minimum risk.

---

## User Review Required

> [!IMPORTANT]
> **B5/B6 (Transfer/Scrap INSUFFICIENT_STOCK)** are caused by the regression run itself consuming stock via adjustments before those tests run. These will be self-healing once the fixes for B1–B4 are in (fresh seed → new batches won't be depleted). No service logic change is needed.

> [!IMPORTANT]
> **B8 (Order `type` required)** — the DTO already marks `type` as required + validated enum. This is intentional API design. The fix is to update the regression test call to pass `type: 'SALES'` rather than change the service. Confirmed by reading `create-order.dto.ts`.

> [!WARNING]
> **B7 (cold-chain routing to zp=0)** — the putaway test engine returns `selectedLocation` = Receiving Dock for the ink product. This indicates the cold-chain putaway rule is matching but then selecting the Receiving area as destination rather than a Cold zone bin. This requires investigation into `putaway.service.ts` selection logic.

---

## Open Questions

None — root causes are fully identified from source review.

---

## Bug Inventory & Root Causes

| Bug | Symptom | Root Cause |
|-----|---------|-----------|
| B1 | POST /inventory/products → 500 | `createProduct` maps `sellingPrice → price`, `unitCost → averageCost`, `velocityClass → velocity` but the test payload uses the *frontend* field names. API schema mismatch — no validation DTO. |
| B2 | POST /inventory/batch → 500 | `addBatch` requires `costPerUnit` (not `unitCost`) and `purchaseDate` as `Date` (not string). Test sent wrong field names. |
| B3 | POST /api-keys → 500 | ApiKey model has a Prisma unique constraint that conflicts on creation — needs investigation in `api-key.service.ts`. |
| B4 | POST /stocktaking/sessions → 500 | `createSession` passes `{ warehouseId, type, description }` to Prisma but the test sent `{ warehouseId, name }` (no `type`). |
| B5 | POST /inventory/transfer → 400 | Stock depleted by adjustment tests run before transfer test. Self-healing (see above). |
| B6 | POST /inventory/scrap → 400 | Same as B5. Self-healing. |
| B7 | Putaway test routes ink to zp=0 | Cold-chain rule fires but `suggestLocations()` in putaway service falls through to the Receiving Dock as the default. Location filter logic needs review. |
| B8 | POST /orders → 400 | `CreateOrderDto` requires `type` and `priority`. Regression test missing these fields. Fix: update test payload. |
| B9 | Double-submit PO returns 201 | `submitPurchaseOrder()` re-submits already-submitted PO without an idempotency guard. Should throw 400. |
| B10 | GET /inventory/products/:id → 200 for bad ID | `getProduct()` calls `findUnique` which returns `null`, but the controller returns it as 200. Should throw NotFoundException. |
| B11 | POST /invoices → 500 | `createInvoice` requires `vendorId` (not `supplierId`) + `issueDate`, `dueDate`, `items[]`. Test sent wrong payload shape. |
| B12 | GET /packing/sessions → 404 | `PackingController` prefix is `packing` but has no `GET /sessions` list route — only `GET /packing/queue`. |
| B13 | GET /returns → 404 | `ReturnsController` has no `GET /` list route. |
| B14 | GET /replenishment/rules → 404 | No `/rules` endpoint in `ReplenishmentController` — only `summary`, `alerts`, `check`. |
| B15 | GET /delivery-methods → 404 | `DeliveryMethodsController` prefix is `configuration/delivery-methods`, not `/delivery-methods`. |
| B16 | GET /picking-strategies → 404 | No standalone picking-strategies list endpoint; strategies are embedded inside the strategy module at a different path. |
| B17 | POST /supplier-auth/invite → 404 | `SupplierAuthController` has `register`, `login`, `me` — no `invite` route. Invite logic exists in service (`register`) but no admin-facing invite endpoint. |

---

## Proposed Changes

### Wave 1 — Controller/Route Gaps (B12, B13, B14, B15, B16, B17)
These are pure additions with no logic risk.

---

#### [MODIFY] [packing.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/packing/packing.controller.ts)
Add `GET /packing/sessions` list endpoint.
```typescript
@Get('sessions')
async listSessions(@Query('orderId') orderId?: string) {
    return this.packingService.listSessions(orderId);
}
```
Also add `listSessions()` to `packing.service.ts` — simple `prisma.packingSession.findMany()`.

---

#### [MODIFY] [returns.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/returns/returns.controller.ts)
Add `GET /returns` list route and `GET /returns/:id` single-return route.
```typescript
@Get()
async listReturns(@Query('orderId') orderId?: string) {
    return this.returnsService.listReturns(orderId);
}

@Get(':id')
async getReturn(@Param('id') id: string) {
    return this.returnsService.getReturn(id);
}
```
Add `listReturns()` and `getReturn()` to `returns.service.ts`.

---

#### [MODIFY] [replenishment.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/inventory/replenishment.controller.ts)
Add `GET /replenishment/rules` to expose configured reorder rules.
```typescript
@Get('rules')
async getRules(@Query('warehouseId') warehouseId?: string, @Req() req?: any) {
    return this.prisma.reorderRule.findMany({ where: warehouseId ? { warehouseId } : undefined });
}
```

---

#### [MODIFY] [delivery-methods.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/configuration/delivery-methods.controller.ts)
Change controller prefix from `configuration/delivery-methods` → `delivery-methods` so the route matches the spec. The existing route `GET /configuration/delivery-methods` will be preserved as an alias via a second controller or a redirect.

Actually the cleaner fix: add a **second controller** at `delivery-methods` that delegates to the same service, registered in `app.module.ts`.

---

#### [NEW] `src/configuration/delivery-methods-alias.controller.ts`
```typescript
@Controller('delivery-methods')
export class DeliveryMethodsAliasController extends DeliveryMethodsController {}
```
Register in `app.module.ts` controllers array.

---

#### [MODIFY] [strategy.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/strategy/strategy.controller.ts)
Investigate current route for picking strategies and expose at `/picking-strategies` if not already present. If already at `/strategy/picking/strategies`, add alias at `/picking-strategies`.

---

#### [MODIFY] [supplier-auth.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/supplier-auth/supplier-auth.controller.ts)
Add admin-facing `POST /supplier-auth/invite` endpoint that creates a `SupplierInvitation` record.
```typescript
@Post('invite')
invite(@Body() body: { email: string; supplierId: string; expiresInDays?: number }) {
    return this.service.invite(body.email, body.supplierId, body.expiresInDays ?? 7);
}
```
Add `invite()` to `supplier-auth.service.ts` — creates `SupplierInvitation` with token + expiry.

---

### Wave 2 — Service Logic Bugs (B9, B10, B7)

---

#### [MODIFY] [purchase-order.service.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/purchase-order/purchase-order.service.ts)
**B9** — Add idempotency guard in `submitPurchaseOrder()`:
```typescript
if (po.status !== 'DRAFT' && po.status !== 'PENDING') {
    throw new BadRequestException(`PO is already ${po.status}. Cannot re-submit.`);
}
```

---

#### [MODIFY] [inventory.controller.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/inventory/inventory.controller.ts)
**B10** — Wrap `getProduct()` result with 404 guard:
```typescript
const product = await this.inventoryService.getProduct(id);
if (!product) throw new NotFoundException(`Product ${id} not found`);
return product;
```

---

#### [MODIFY] [putaway.service.ts](file:///c:/Users/EmmanuelVanDeGeer/.gemini/antigravity/scratch/labamu-ims/apps/api/src/inventory/putaway.service.ts)
**B7** — Investigate `testPutawayRule()` / `suggestLocations()`: the cold-chain rule for ink product (INK-CTR-014) has `preferredZonePriorityMin=35, preferredZonePriorityMax=45` but the function returns the Receiving Dock (zp=0). Likely the location filter is applied but then falls back to the first available location. Fix: ensure fallback does not return locations outside the preferred zone range for cold-chain rules, or raise a clear 400 if no suitable location exists.

---

### Wave 3 — Payload/Schema Mismatches (B1, B2, B3, B4, B11)
These bugs are caused by either missing validation DTOs or wrong test payloads. The fix strategy:

- **B1 (products):** The `createProduct` service accepts raw field names (`price`, `averageCost`, `velocity`, `category`). The test used different names (`sellingPrice`, `unitCost`, `velocityClass`, `categoryId`). Fix: add a proper validation DTO to `inventory.controller.ts` that maps the API contract fields (`sellingPrice → price`, `unitCost → averageCost`, `velocityClass → velocity`, `categoryId → category`), OR update the service to accept both. **Recommended: add a `CreateProductDto` with `@Transform` mapping to the internal field names.**

- **B2 (batches):** `addBatch` expects `{ costPerUnit, purchaseDate: Date }`. Test sent `{ unitCost, purchaseDate: string }`. Fix: add `CreateBatchDto` with `@Transform(() => Number)` on `costPerUnit` (accept both `unitCost` alias), and parse `purchaseDate` as Date.

- **B3 (api-keys):** Needs direct investigation of `api-key.service.ts` to find the Prisma constraint error. Likely a missing `companyId` in the create payload or a unique constraint on `name`.

- **B4 (stocktaking):** `createSession()` requires `{ warehouseId, type }`. Test sent `{ warehouseId, name }`. Fix: update `StocktakingController` `createSession` endpoint to accept `name` as an alias for `type`, OR add a `CreateStocktakeSessionDto` with both fields where `type` defaults to `'FULL'` if omitted and `name` is stored separately.

- **B11 (invoices):** `createInvoice` requires `{ vendorId, issueDate, dueDate, items[] }`. Test sent `{ invoiceNumber, amount, supplierId }`. Fix: add `CreateInvoiceDto` validation so callers get a clear 400 with the correct field list rather than a 500.

---

### Wave 4 — Regression Test Corrections (B8, B5/B6)

No source code changes. Update the regression execution script/plan:

- **B8:** Add `type: 'SALES'`, `priority: 'NORMAL'` to all order creation test calls.
- **B5/B6:** Ensure transfer and scrap tests run *before* adjustment tests (or use a product/location with dedicated test stock not touched by other tests). Alternatively, re-seed fresh stock before those specific tests.

---

## Verification Plan

### After Wave 1
```
GET /packing/sessions → 200
GET /returns → 200
GET /replenishment/rules → 200
GET /delivery-methods → 200
GET /picking-strategies → 200
POST /supplier-auth/invite → 201
```

### After Wave 2
```
POST /purchase-orders/:id/submit (re-submit) → 400
GET /inventory/products/non-existent-id → 404
POST /putaway-rules/test (ink product) → 201 with selectedLocation.zonePriority in [35,45]
```

### After Wave 3
```
POST /inventory/products → 201 (with mapped fields)
POST /inventory/batch → 201
POST /api-keys → 201
POST /stocktaking/sessions → 201 (with name only)
POST /invoices → 400 (clear validation error, not 500)
```

### After Wave 4
Re-run full regression. Target: **≥ 210 PASS / < 5 FAIL**.

### Automated re-run command
```bash
# Re-seed fresh data
npx ts-node --transpile-only apps/api/scripts/seed-realistic-data.ts

# Then run MCP browser regression sweep (same fetch pattern as last run)
```
