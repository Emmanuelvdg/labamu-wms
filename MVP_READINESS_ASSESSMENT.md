# Labamu IMS — MVP Readiness Assessment
**Date**: June 2026  
**Target market**: Mid-sized SME distribution companies (10–200 staff, 1–5 warehouses, 100–10,000 SKUs, B2B physical goods)  
**E2E test coverage**: 252/270 passing (18 conditional skips, 0 failures)

---

## Executive Summary

Labamu IMS is a functionally comprehensive warehouse management system built on a modern, production-grade stack (NestJS 10, Next.js 16, Prisma 5.22, PostgreSQL). The core distribution workflow — purchase order → receive → putaway → pick → pack → ship — is fully implemented, transaction-safe, and multi-tenant isolated. An MCP server provides AI-assisted data operations covering 40 tools across the entire operational surface.

**Verdict: Conditional Go for staged beta rollout.**  
The platform is ready for controlled onboarding of early customers. Six issues require resolution before unrestricted production release, of which one is a security fix that should be applied immediately.

---

## Part A — Functionality Assessment

### What Is Ready

| Module | Status | Notes |
|---|---|---|
| Products & batches | Ready | Full CRUD, FEFO/FIFO/LIFO batch tracking, ABC classification |
| Warehouses & locations | Ready | Hierarchical zones/aisles/bays/bins, floor plan, capacity checks |
| Purchase orders | Ready | Full lifecycle: draft → approve → receive → QA → 3-way match |
| Stock adjustments | Ready | Manual adjustments, scrap orders, damage recording |
| Sales orders | Ready | Creation, FEFO stock reservation, status transitions |
| Picking | Ready | Single, batch, cluster, wave, waveless strategies; exception handling |
| Packing | Ready | Session management, weight verification |
| Putaway | Ready | Rule-based routing, no-rule fallback, exception workflow |
| Stocktaking | Ready | Full, cycle, and spot counts; task generation; variance reconciliation |
| Returns (RMA) | Ready | Return creation, receipt, condition grading (good/damaged/unsellable) |
| Shipment dispatch | Ready | Carrier assignment, tracking ID, Lalamove integration (live API) |
| Replenishment | Ready | Reorder point monitoring, low-stock alerts, auto-PO generation |
| Suppliers | Ready | CRUD, price history, invitation flow |
| Customers | Ready | CRUD, delivery location coordinates |
| Multi-tenancy & RBAC | Ready | Prisma middleware enforces companyId on all queries; role-permission model |
| Feature flags | Ready | Per-tenant gating (ADVANCED_PICKING, AI_REORDER, etc.) |
| Platform admin | Ready | Tenant management, impersonation, plan config, audit log |
| Reporting | Ready | VAT report, SAF-T export, inventory value, utilisation metrics |
| MCP server | Ready | 40 tools covering full WMS surface; API-key authenticated |
| Frontend coverage | Ready | 80+ pages across all operational modules |

### Functionality Gaps

#### F1 — No pagination on list endpoints `BLOCKING`
All major list operations (`getOrders`, `getProducts`, `getAllBatches`, `getLocations`, `getStockTransactions`) execute unbounded `findMany()` queries with no `limit` or `offset`. A company with 5,000 SKUs or 10,000 orders will experience multi-second response times and potential out-of-memory failures. This is the single highest-priority functional issue.

**Affected files**: `apps/api/src/inventory/inventory.controller.ts`, `apps/api/src/order/order.service.ts`, and all other list endpoints.

#### F2 — Email notifications absent `HIGH`
`NotificationService` creates only in-app database records. There is no email dispatch anywhere. Distribution companies need email for:
- Low stock / critical stock alerts to procurement managers
- PO approval requests to authorisers
- Order confirmation and dispatch updates

Without email, users must actively log in to discover urgent operational events.

#### F3 — Bulk product creation is sequential `MEDIUM`
The MCP server provides `create_product`, `create_supplier`, and `create_customer` as single-record tools, making AI-assisted onboarding of large catalogues feasible but slow. At the API's global rate limit of 100 requests/60s, loading 3,000 SKUs takes approximately 30 minutes of sequential calls. A `bulk_create_products` MCP tool with server-side batching would reduce this to under 2 minutes.

Note: This is a throughput concern, not a capability gap. The mechanism for bulk onboarding via AI agent exists and is the right approach for this market. This supersedes the earlier concern about missing CSV product import.

#### F4 — Operational audit trail incomplete `MEDIUM`
Platform-level audit logging exists (`AuditService` tracks tenant creation, impersonation, plan changes). Operational audit — who adjusted inventory, who approved a PO, who changed an order status — is not logged. Distribution companies routinely investigate stock discrepancies; without this trail, root cause is untraceable.

#### F5 — Barcode label generation absent `MEDIUM`
`BarcodeService.lookup()` exists (scan → find product/location/batch), and `bwip-js` is already a dependency. There is no endpoint to generate a barcode image for a product or shelf location, and no label printing queue. Receiving and putaway workflows without printed barcodes degrade to manual data entry.

#### F6 — Excel export not supported `LOW`
Reports and stock lists are CSV-only. Finance and operations teams at SME distributors universally expect `.xlsx` for reports, order lists, and product data. `pdfmake` is already a dependency for PDF; `exceljs` would cover Excel.

#### F7 — CSV location parser handles quoted fields poorly `LOW`
The underlying location import parser (`inventory.service.ts:106`) uses a naive comma split that silently mangles location names containing commas. The `import_locations` MCP tool passes through to this same endpoint. A proper parser (`csv-parse`) should replace it.

---

## Part B — Production Readiness Assessment

### Security

#### S1 — `x-user-id` header accepted as authentication `CRITICAL — FIX IMMEDIATELY`
`permissions.guard.ts:65–67` includes a fallback for E2E testing that accepts any `x-user-id` header as an authenticated identity:

```typescript
if (!userId) {
    userId = request.headers['x-user-id'] ?? request.query?.userId;
}
```

Any HTTP client can set this header to any user UUID and impersonate that user with their full permissions. This is also unnecessarily listed in the CORS `allowedHeaders` config, advertising the vulnerability. This must be disabled in production.

#### S2 — Input validation not strictly enforced `LOW`
The global `ValidationPipe` is configured with `forbidNonWhitelisted: false` (`main.ts:57`), meaning unknown request properties are stripped silently rather than rejected with a 400. This should be `true` for strict API contracts and to catch integration errors early.

#### S3 — Cookie security attributes unverified `LOW`
JWT tokens are set as httpOnly cookies by the Next.js frontend. The production deployment must confirm `Set-Cookie` includes `Secure; SameSite=Strict` attributes. If cookies are set without `Secure`, tokens are exposed over HTTP.

#### S4 — MCP SDK version outdated `LOW`
The MCP server uses `@modelcontextprotocol/sdk ^0.6.0` (early-era). Current is `1.x`. While stdio transport works correctly, upgrading enables HTTP/SSE transport and improved error schemas. Not blocking for MVP.

### What Is Correctly Configured

| Control | Status |
|---|---|
| JWT authentication | Validates `JWT_SECRET` at startup; errors on default value in production |
| Multi-tenant isolation | Prisma `$use` middleware enforces `companyId` on all scoped model queries |
| Rate limiting | Global 100 req/60s; login endpoint 5 req/60s (production) |
| CORS | Configurable via `CORS_ORIGINS` env var; credentials-aware |
| Helmet security headers | Enabled globally (`app.use(helmet())`) |
| Input validation | Class-validator DTOs with `whitelist: true` and `transform: true` |
| SQL injection | Prisma parameterised queries throughout; no raw `$queryRaw` found |
| Transaction safety | `$transaction` wrappers on all critical stock operations |
| Bcrypt password hashing | Confirmed in auth service |
| API key rate limiting | Separate `ApiKeyRateLimiterService` for API key endpoints |

### Performance

#### P1 — No pagination (see F1 above) `BLOCKING`
Also the primary performance concern. Unbounded queries are a correctness issue at scale, not just a UX issue.

#### P2 — Missing database index on `Location.parentId` `LOW`
Hierarchical location tree traversal (used in putaway routing) performs sequential scans as location counts grow. Add `@@index([parentId])` to the `Location` model in the Prisma schema.

#### P3 — No caching layer `POST-MVP`
All reads hit PostgreSQL directly. Product catalogue, warehouse configuration, and routing rules are high-read, low-write data. At MVP scale (<50 concurrent users) this is not a bottleneck. Redis should be planned for the first scaling milestone.

#### P4 — Connection pool not explicitly configured `POST-MVP`
`PrismaClient` uses default connection pooling. Add `connection_limit` to `DATABASE_URL` and evaluate PgBouncer when scaling to multiple API instances.

### What Is Not Yet Implemented (Correct Scope for Post-MVP)

- **Payment processing**: TenantPlan infrastructure exists (maxUsers, maxWarehouses, maxOrders fields) but billing enforcement and payment integration are absent. Correct scope for a dedicated billing milestone.
- **Supplier self-service portal**: Invitation flow is implemented; portal-side order visibility is incomplete.
- **AI demand forecasting**: Feature-flagged; requires `SalesForecast` table population via external forecast service.
- **Live Lalamove rate quoting**: Cost calculation currently returns 0 for Lalamove; live API call happens at dispatch. Acceptable if customers use fixed-price or rule-based delivery methods initially.
- **Mobile app**: Browser-based warehouse operations are workable for MVP.

---

## Part C — Remediation Plan

Issues are sequenced by risk, then by dependency order. Each phase is independently releasable.

---

### Phase 0 — Pre-release security fix (1 day)
*Do this before any customer receives access.*

| ID | Action | File | Effort |
|---|---|---|---|
| S1a | Remove `x-user-id` header fallback from `PermissionsGuard` | `apps/api/src/common/auth/permissions.guard.ts:65–67` | 1h |
| S1b | Remove `x-user-id` from CORS `allowedHeaders` | `apps/api/src/main.ts:48` | 15m |
| S1c | Update E2E specs that relied on header (already done — tests use login) | `apps/web/e2e/*.spec.ts` | Done |
| S2 | Set `forbidNonWhitelisted: true` in global ValidationPipe | `apps/api/src/main.ts:57` | 15m |

---

### Phase 1 — Pagination (1 week)
*Required before any meaningful production load.*

Add `limit` (default 50, max 500) and `offset` (default 0) query parameters to all list endpoints, returning `{ data: [], total: number }`. Priority order:

1. `GET /inventory/products`
2. `GET /orders`
3. `GET /purchase-orders`
4. `GET /inventory/batches`
5. `GET /inventory/locations`
6. `GET /inventory/transactions`
7. `GET /suppliers`, `GET /customers`
8. All remaining list endpoints

Also add `@@index([parentId])` to `Location` in the Prisma schema and run migration.

Update the MCP server's `list_products`, `list_orders`, and `list_purchase_orders` tools to expose `limit` and `offset` parameters.

---

### Phase 2 — Email notifications (3–5 days)
*Required for operational reliability.*

Integrate an email provider (AWS SES recommended for cost at SME scale; SendGrid as alternative).

1. Create `EmailService` in `apps/api/src/common/email/`
2. Wire to existing `NotificationService` — when a notification is created, also dispatch email if the user has an email address and the notification type warrants it
3. Priority notification types for initial implementation:
   - `CRITICAL_STOCK` / `LOW_STOCK` → procurement manager
   - `PO_APPROVAL_REQUIRED` → designated approver(s)
   - `ORDER_SHIPPED` → customer contact (if email on Customer record)
4. Add `SMTP_HOST` / `AWS_SES_*` environment variables to `.env.example`

---

### Phase 3 — Operational audit log (3 days)
*Required for stock discrepancy investigations.*

Extend `AuditService` (currently at `apps/api/src/company/audit.service.ts`) or create a parallel `OperationalAuditService`:

1. Add audit calls to:
   - Inventory adjustments (`POST /inventory/adjustments`)
   - PO approval/rejection (`POST /purchase-orders/:id/approve`)
   - Order status transitions (PENDING → RESERVED → PICKED → PACKED → SHIPPED)
   - Stock moves and receipts
2. Store: `actorId`, `action`, `entity`, `entityId`, `before`, `after`, `timestamp`
3. Expose `GET /audit/operations` endpoint with filter by entity type, date range, and actor
4. Add `get_audit_log` tool to MCP server

---

### Phase 4 — MCP bulk create tools (2–3 days)
*Reduces onboarding time for large catalogues from 30 minutes to under 2 minutes.*

Add server-side batch endpoints:

1. `POST /inventory/products/bulk` — accepts array of up to 500 product objects, processes in batches of 50 with `createMany`
2. `POST /suppliers/bulk` — same pattern
3. `POST /customers/bulk` — same pattern

Add corresponding MCP tools:
- `bulk_create_products(items: ProductInput[])` — with per-record success/failure reporting
- `bulk_create_suppliers(items: SupplierInput[])`
- `bulk_create_customers(items: CustomerInput[])`

Also fix the CSV location parser at `apps/api/src/inventory/inventory.service.ts:106` to use `csv-parse` for correct quoted field handling.

---

### Phase 5 — Barcode label generation (1 week)
*Required for warehouse efficiency with physical goods.*

1. Add `GET /inventory/products/:id/barcode` endpoint using `bwip-js` (already in dependencies) — returns PNG image
2. Add `GET /inventory/locations/:id/barcode` endpoint — same
3. Add `GET /inventory/batches/:id/barcode` endpoint
4. Create a label print queue: `POST /printing/queue` accepts `{ entityType, entityId, printerId, copies }`
5. Add `generate_barcode` MCP tool: `{ entityType: 'product'|'location'|'batch', entityId }`
6. Frontend: add "Print Label" action button on product detail, location detail, and batch detail pages

---

### Phase 6 — Excel export (2 days)
*Quality-of-life for finance and operations users.*

Add `exceljs` dependency. Implement `format=xlsx` query parameter on existing export endpoints:

1. `GET /reporting/inventory-ledger?format=xlsx`
2. `GET /inventory/products?format=xlsx` (after pagination is in place)
3. `GET /orders?format=xlsx`
4. `GET /purchase-orders?format=xlsx`

Reuse existing data fetch logic; only the serialisation layer changes.

---

### Phase 7 — Post-MVP scaling preparation (ongoing)
*Not blocking for MVP; address when user load warrants.*

| Item | Action |
|---|---|
| Redis cache | Add `CacheModule` with Redis; cache product catalogue, warehouse config, routing rules (5-minute TTL) |
| Connection pooling | Add `connection_limit=10` to `DATABASE_URL`; evaluate PgBouncer for multi-instance deployments |
| MCP SDK upgrade | Upgrade `@modelcontextprotocol/sdk` from `^0.6.0` to `^1.x`; enables HTTP/SSE transport |
| Supplier portal | Complete supplier-side order visibility and self-service receipt confirmation |
| Payment / billing | Implement TenantPlan enforcement; integrate Stripe for subscription billing |
| AI forecasting | Populate `SalesForecast` table via forecast microservice; activate `AI_REORDER` feature flag |

---

## Summary Scorecard

| # | Issue | Severity | Phase | Effort |
|---|---|---|---|---|
| S1 | `x-user-id` header auth bypass | Critical | 0 | 1 day |
| F1 / P1 | No pagination on list endpoints | Blocking | 1 | 1 week |
| F2 | No email notifications | High | 2 | 3–5 days |
| F4 | No operational audit log | Medium | 3 | 3 days |
| F3 | Bulk product create throughput | Medium | 4 | 2–3 days |
| F7 | Naive CSV location parser | Low | 4 | 4 hours |
| S2 | `forbidNonWhitelisted: false` | Low | 0 | 15 min |
| S3 | Cookie Secure attribute unverified | Low | 0 | 15 min |
| F5 | Barcode label generation | Medium | 5 | 1 week |
| F6 | Excel export | Low | 6 | 2 days |
| P2 | Missing `Location.parentId` index | Low | 1 | 30 min |
| P3 | No Redis cache | Post-MVP | 7 | — |
| P4 | Connection pool config | Post-MVP | 7 | — |
| S4 | MCP SDK version outdated | Low | 7 | 4 hours |

**Total estimated effort to production-ready**: ~4–5 weeks  
**Minimum for controlled beta launch**: Phase 0 + Phase 1 = ~1 week
