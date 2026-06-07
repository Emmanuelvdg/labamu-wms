# Labamu Class A WMS - Product Requirements Document (PRD)

**Version:** 3.0
**Status:** Approved
**Date:** 2026-04-25

## 1. Executive Summary

Labamu WMS is a comprehensive, cloud-native Warehouse Management System designed to optimize end-to-end logistics operations. It bridges the gap between simple inventory tracking and enterprise-grade warehouse execution by offering advanced features like hierarchical location management, rule-based putaway strategies, and granular batch tracking, all wrapped in a modern, user-friendly interface.

## 2. User Personas

| Persona | Role | Key Responsibilities |
| :--- | :--- | :--- |
| **Warehouse Manager** | Operations Lead | Oversee daily throughput, configure warehouse rules, manage staff performance, and ensure inventory accuracy. |
| **Floor Operator** | Picker / Packer | Execute physical tasks: receiving goods, putting them away, picking orders, and packing shipments. |
| **Inventory Controller** | Stock Specialist | Perform cycle counts, investigate discrepancies, and manage stock adjustments and scrap. |
| **Purchasing Agent** | Procurement | Manage suppliers, create purchase orders, and monitor inbound lead times. |
| **System Admin** | IT Support | Manage users, roles, permissions, and system configurations. |
| **Platform Admin** | Labamu Operations | Manage the multi-tenant platform: onboard companies, configure plans, toggle feature flags, monitor health, impersonate tenants for support, and broadcast announcements. |

## 3. Unique Selling Points (USPs) & Acceptance Criteria

This section outlines the key differentiators of Labamu WMS, aligned with specific user acceptance scenarios.

| USP | As a... | I want... | So that... | Given... | When... | Then... |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hierarchical Location Management** | Warehouse Manager | To model my specific warehouse layout (Zone > Row > Shelf) | I can pinpoint exactly where items are stored. | An item stored at "A-01-02" (Zone A, Row 1, Shelf 2). | A user views the product inventory details. | The system displays the full path "Zone A / Row 1 / Shelf 2" rather than just a flat ID. |
| **Smart Putaway Rules** | Ops Director | To define location rules based on product attributes (e.g., "Frozen" items to "Freezer"). | New staff automatically put items in the correct place without asking. | A product tagged "Frozen" and a rule mapping "Frozen" category to "Freezer Zone". | An operator validates a receipt for this product. | The system generates a putaway task specifically targeting a location in the "Freezer Zone". |
| **Multi-Step Warehouse Flows** | Operations Lead | To configure a 2-step receiving process (Dock -> Storage). | We can inspect goods at a staging area before final storage. | A warehouse configured for "2-step inbound". | A purchase order is received at the dock. | The system creates a move to "Input/Staging" first, and then a separate putaway task to "Stock". |
| **Detailed Inventory Ledger** | Compliance Officer | To view a chronological history of every single stock movement. | I can audit inventory levels and trace discrepancies to specific events. | A product with multiple transactions (Receipts, Picks, Adjustments). | I open the "Stock Moves" report for that SKU. | I see a complete timeline of every change, including user ID, timestamp, and source document (PO/SO). |
| **Granular Batch & Expiry Tracking** | Quality Manager | To track inventory by Lot Number and Expiry Date. | We can enforce FEFO (First-Expired-First-Out) rotation and recall specific batches. | Detailed batch tracking is enabled for a product. | I create an outbound picking list. | The system directs the picker to the batch with the earliest expiry date first. |
| **Real-time Dashboard Analytics** | Warehouse Manager | To see real-time alerts for low stock and pending orders. | I can proactively prevent stockouts and bottlenecks. | Inventory for "Item A" drops below the minimum reorder point. | I view the main Dashboard. | The "Low Stock" widget immediately increments and highlights "Item A" for reordering. |
| **Putaway Rule Mismatch (Unhappy Flow)** | Warehouse Operator | To be guided even when no specific rule matches a product. | I don't get stuck with an item I can't put away. | A product arrives that matches NO specific Putaway Rules. | I scan the item for putaway. | The system defaults to the "General Storage" area or prompts the user to select a location manually (with a warning). |
| **Location Capacity Exceeded (Unhappy Flow)** | Warehouse Operator | To be prevented from checking items into a full bin. | We don't physically overflow bins and cause safety hazards. | Location A-01 is at maximum volume capacity. | I try to confirm a putaway task to A-01. | The system blocks the action, displays "Location Full", and suggests the nearest available alternative location. |
| **Insufficient Checking Stock (Unhappy Flow)** | Picker | To know immediately if there is a stock discrepancy during picking. | I don't waste time looking for items that aren't there. | The system thinks we have 10 units, but I can only find 8. | I enter "8" as the picked quantity (short pick). | The system flags the discrepancy, triggers a cycle count task for that bin, and directs me to another location for the remaining 2 units. |

## 4. Functional Requirements

### 4.0 Multi-Tenancy
- **Tenant Isolation:** All data is logically scoped by `companyId` using Prisma middleware. No tenant can read or write another tenant's data.
- **Self-Service Onboarding:** `POST /companies/register` creates a new company + first admin user in a single transaction, with no platform admin involvement required.
- **Tenant Lifecycle:** Companies transition through `ACTIVE → SUSPENDED → CANCELLED` statuses. Suspended tenants cannot log in.

### 4.1 Inventory Management
- **Product Catalog:** Manage products with support for variants, barcodes (SKU/EAN), and physical dimensions.
- **Batches & Serials:** Support for Lot/Batch numbers and unique Serial Number tracking.
- **Stock Adjustments:** Functionality for Cycle Counts (relative adjustments) and Stocktakes (absolute updates).
- **Scrap Management:** Formal workflow for writing off damaged or expired stock with reason codes.

### 4.2 Inbound Operations
- **Purchase Orders (PO):** Create, approve, and track POs with suppliers.
- **Receiving:** Mobile-friendly interface for checking in goods against POs. Support for over/under-receiving.
- **Putaway:** Automated generation of putaway tasks to move goods from Receiving -> Storage based on optimization rules.

### 4.3 Outbound Operations
- **Sales Orders (SO):** Management of customer orders with status tracking (Draft, Confirmed, Picking, Shipped).
- **Inventory Reservation:** Soft-allocate stock to orders to prevent overselling.
- **Picking:** Generation of optimized pick lists (shortest path). Support for Wave Picking and Batch Picking.
- **Packing & Shipping:** Verification of picked items and generation of shipping labels/documents.

### 4.4 Warehouse Configuration
- **Multi-Warehouse:** Support for multiple physical facilities within a single tenant.
- **Locations:** Create and manage infinite hierarchy of locations with capacity constraints (Volume/Weight).
- **Zones:** Logical grouping of locations for defining pick paths and storage rules.
- **Unified Floor Plan:** Visual drag-and-drop editor for warehouse layout.
    -   **Grid System:** Meter-based coordinate system (x, y) for precise mapping.
    -   **Visual Management:** Drag-and-drop locations, rotate elements, and visualize functional areas (Receiving, Shipping).
    -   **Capacity Visualization:** (Future) Heatmaps for utilization.

### 4.5 Transfer Operations
- **Inter-Warehouse Transfers:** Create and manage stock movement between warehouses.
- **Transfer Requests:** Initiate transfers with source warehouse, destination warehouse, and item details.
- **Approval Workflow:** Two-stage approval process (PENDING → APPROVED → IN_TRANSIT → COMPLETED).
- **Status Tracking:** Monitor transfers through multiple states with full visibility.
- **Transfer History:** Audit trail of all inter-warehouse movements with initiator and approver records.
- **Cancellation:** Support for cancelling pending or approved transfers before execution.

### 4.6 Reporting & Analytics
- **Live Dashboard:** Key Performance Indicators (KPIs) for daily operations.
- **Valuation Report:** Current inventory value based on Average Cost or Standard Cost.
- **Transaction History:** Immutable ledger of all moves for audit trails.

### 4.7 Packing Station
- **Packing Queue:** Visual queue of orders in `PACKING` status awaiting packing.
- **Packing Sessions:** Workers create packing sessions, assign items to parcels, and track progress.
- **Parcel Management:** Create multiple parcels per order. Record parcel weight and contents.
- **Completion Flow:** Session marked `COMPLETED` when all order items are assigned to parcels.

### 4.8 Shipping Documents
- **Shipping Labels:** Automated PDF generation with barcode, order ID, destination address, and tracking info.
- **Packing Slips:** Itemized PDF documents for each shipment listing contents and quantities.
- **Daily Manifests:** Warehouse-level PDF summarizing all shipments for a given date.

### 4.9 Replenishment Engine
- **Reorder Point Monitoring:** Automated scanning of all products against configurable `reorderPoint` thresholds.
- **Replenishment Alerts:** Dashboard showing products below threshold with severity ranking.
- **Auto-PO Generation:** One-click creation of purchase orders directly from replenishment alerts.
- **Alert Lifecycle:** Dismiss alerts that don't require action; auto-regenerated on next scan if still below threshold.

### 4.10 Notifications & Alerts
- **Notification Bell:** Real-time unread notification count badge in the header bar.
- **Notification Types:** EXPIRY_WARNING, EXPIRED_STOCK, LOW_STOCK, SYSTEM alerts.
- **Expiry Checker:** Scheduled service that scans batches for expiring or expired stock and creates notifications.
- **Notification Center:** Full-page view with filtering, read/unread management, and bulk actions.

### 4.11 Barcode Validation
- **Universal Barcode Lookup:** Single endpoint that resolves barcodes to Product (by SKU), Location (by code), or Batch (by batch number).
- **Context-Aware Validation:** Barcode scans validated against specific operations (RECEIVE_PO, PICK_TASK, PACK_ORDER, PUTAWAY).
- **Scan-to-Receive:** Scan a product barcode against a PO to receive one unit automatically.
- **Scan-to-Pick:** Scan a product barcode to validate and complete a picking task.

### 4.12 Analytics & Classification
- **ABC Auto-Classification:** Automated product classification (A/B/C) based on historical outbound velocity over configurable time periods.
- **Pick Accuracy Metrics:** Warehouse-level KPIs tracking accuracy percentage, perfect picks, exceptions, and short picks.
- **Zone-Scoped Cycle Counts:** Generate expected inventory counts scoped to specific zones or location patterns for targeted auditing.
- **Multi-Carrier Rate Comparison:** Mock carrier integration providing rate comparison across USPS, FedEx, and UPS.

### 4.13 Backoffice Admin Portal
The backoffice is an internal operations portal accessible only to Labamu platform admins (`ALL:MANAGE` permission). It is completely separate from the tenant-facing dashboard (`/` → `/(dashboard)/`) and has its own route group (`/(admin)/`) with a distinct dark-slate UI.

#### 4.13.1 Tenant Management
- **CRUD:** Create, view, edit, and list all tenant companies with column-level filtering.
- **Status Control:** Suspend or reactivate tenants individually or in bulk.
- **Invite Users:** Add users to any tenant directly from the backoffice.
- **Detail View:** Per-tenant page with tabbed sections: Overview, Plan & Billing, Feature Flags.

#### 4.13.2 Health & Usage Monitoring
- **Usage Metrics:** Per-tenant counts for Products, Warehouses, Suppliers, Customers, Users, Orders.
- **Health Dashboard:** Active user count (30-day window), last login date, days since last activity.
- **Onboarding Tracker:** 5-step completion checklist with progress bar.

#### 4.13.3 Plan & Billing Management
- **Plan Tiers:** FREE / STARTER / PROFESSIONAL / ENTERPRISE with configurable default limits per tier.
- **Limit Overrides:** Platform admins can set custom `maxUsers`, `maxWarehouses`, `maxProducts`, `maxOrders` per tenant.
- **Trial Management:** Set `trialEndsAt` date per tenant.
- **Billing Cycles:** MONTHLY or ANNUAL.
- **Limits vs. Usage:** Visual progress bars show current usage against each limit.

#### 4.13.4 Feature Flags
- **8 System Flags:** `ADVANCED_PICKING`, `BETA_FLOOR_PLAN`, `AI_REORDER`, `MULTI_CURRENCY`, `SUPPLIER_PORTAL`, `ADVANCED_ANALYTICS`, `BARCODE_PRINT`, `API_ACCESS`.
- **Per-Tenant Toggles:** Enable or disable any flag for any tenant independently, with optional internal notes.
- **Global Overview Page:** `/admin/feature-flags` — select a tenant and manage their flags from a single toggle matrix.
- **Tenant Detail Flags Tab:** Feature flag management is also available inline on the tenant detail page.

#### 4.13.5 Tenant Impersonation
- **Action:** Platform admin clicks "Impersonate" on a tenant's detail page.
- **Token Swap:** A 15-minute JWT scoped to the target company is issued. The admin's original session token is saved and restored on exit.
- **Impersonation Banner:** An amber banner appears at the top of the tenant dashboard indicating the active impersonation session.
- **Exit:** Admin clicks "Exit Impersonation" in the banner to restore their platform admin session and return to `/admin`.
- **Audit:** Every impersonation is written to the `AuditLog`.

#### 4.13.6 Platform Analytics
- **KPI Cards:** Total tenants, total users, total orders, active tenants.
- **Growth Chart:** Bar chart — new tenants per month over the last 12 months.
- **Plan Distribution:** Pie chart and tabular breakdown of tenants per plan tier.
- **Status Distribution:** Pie chart — ACTIVE / SUSPENDED / CANCELLED split.

#### 4.13.7 Audit Log
- **Scope:** All platform administration actions (status changes, plan updates, flag toggles, impersonation, bulk ops, announcements).
- **Fields:** Timestamp, actor email, action type, target type/ID/label, metadata (JSON).
- **UI:** Filterable by action type, searchable by actor or target. Configurable page size (50 / 200 / 500).

#### 4.13.8 Announcements
- **Create:** Title, body, target (All Tenants | By Plan | Specific Company), optional start/end times.
- **Active Resolution:** Tenants call `GET /platform/announcements/active?companyId=&plan=` — the API returns only announcements relevant to them based on targeting rules.
- **Lifecycle:** Announcements are active between `startsAt` and `endsAt` (no `endsAt` = indefinite).
- **Delete:** Platform admins can delete any announcement immediately.

#### 4.13.9 Bulk Operations
- **Multi-Select:** Checkboxes on the tenant list; "select all filtered" toggle.
- **Bulk Status Change:** Apply ACTIVE / SUSPENDED / CANCELLED to all selected companies in one API call.
- **Bulk Plan Change:** Set plan tier for all selected companies in one API call.
- **Audit:** Each company in a bulk operation generates a separate `AuditLog` entry.

### 4.14 Email Notification System

Per-tenant, configurable email alerts delivered via SMTP. Tenant admins control which notification types are active and who receives them; the platform provides the SMTP transport layer.

#### 4.14.1 Supported Notification Types

| Notification Type | Trigger Condition | Default Recipients |
| :--- | :--- | :--- |
| `LOW_STOCK_ALERT` | Product stock falls at or below the `reorderPoint` threshold | All company users |
| `CRITICAL_STOCK_ALERT` | Product stock reaches zero or falls below a critical floor | All company users |
| `PO_APPROVAL_REQUEST` | A Purchase Order is submitted and requires approval | Configured approver list |
| `ORDER_DISPATCH_CONFIRMATION` | A Sales Order status transitions to `SHIPPED` | Configured recipient list |

#### 4.14.2 Per-Tenant Configuration

- Tenant admins can independently enable or disable each notification type via the Settings UI.
- Each notification type has its own configurable recipient email list.
- When no custom recipient list is defined, the system defaults to all active users of that company.
- Configuration is stored per company and isolated by `companyId` (multi-tenancy applies).

#### 4.14.3 API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/companies/:id/notification-config/:type` | Retrieve the current configuration for a specific notification type for a tenant. |
| `PUT` | `/companies/:id/notification-config/:type` | Create or update the configuration (enabled flag, recipient list) for a notification type. |

#### 4.14.4 Technical Delivery

- **Transport:** SMTP via `nodemailer`. Platform admins configure a single platform-level SMTP connection (host, port, credentials).
- **Graceful Degradation:** If no SMTP configuration is present, email dispatch is a no-op — no errors are thrown, and operations continue normally.
- **Tenant Isolation:** Emails are scoped per tenant; one tenant's configuration does not affect another's delivery.
- **Trigger Points:** Email dispatch is invoked within the relevant service layer (inventory service for stock alerts, PO service for approval requests, order service for dispatch confirmations).

## 5. Non-Functional Requirements

### 5.1 Performance
- **Response Time:** API responses should be under 200ms for standard read operations.
- **Scalability:** System must handle 100,000+ SKU catalog and 10,000+ daily transactions.

### 5.2 Security & Compliance
- **Authentication:** Secure session-based auth with secure, HTTP-only cookies.
- **RBAC:** Strictly enforced Role-Based Access Control at the API endpoint level.
- **Audit:** All critical actions (Create, Update, Delete) must be logged with User ID and Timestamp.

### 5.3 Usability
- **Mobile First:** Core execution interfaces (Scanning, Picking, Receiving) must be fully responsive and touch-optimized.
- **Accessibility:** UI should adhere to WCAG 2.1 AA standards where possible.

## 6. Technical Architecture

- **Frontend:** Next.js (React) for a fast, SEO-friendly, and interactive implementation.
  - Route Groups: `(dashboard)` for tenant app, `(admin)` for backoffice, `(mobile)` for worker UX.
  - State: Client-side React hooks + cookie-based auth context.
  - Charts: Recharts (bar, pie) for analytics visualisations.
- **Backend:** NestJS (Node.js) for a modular, scalable, and type-safe server-side architecture.
  - Auth: `@Global()` `AuthModule` with `JwtModule`, cookie-based strategy.
  - Multi-tenancy: AsyncLocalStorage + Prisma middleware for row-level isolation.
  - Admin guard: `PermissionsGuard` with strict `ALL` resource literal matching.
- **Database:** PostgreSQL for robust relational data integrity using Prisma ORM.
  - Tenant models: `Company`, `TenantPlan`, `FeatureFlag`, `AuditLog`, `Announcement`, `NotificationConfig`.
- **Email:** `nodemailer` for SMTP-based transactional email delivery. Platform-level SMTP credentials; graceful no-op when unconfigured.
- **Hosting:** Dockerized container deployment compatible with AWS ECS or Kubernetes.

## 7. Future Roadmap (Post-MVP)

### Delivered (v3.0)
- **Backoffice Admin Portal:** Complete platform administration UI at `/admin` (Phases 0–9).
- **Multi-Tenancy:** Row-level isolation, self-service onboarding, tenant lifecycle management.
- **Tenant Impersonation:** 15-minute scoped JWT flow with banner + audit trail.
- **Feature Flags:** 8 system flags toggleable per tenant.
- **Platform Analytics:** Growth charts, plan/status distribution, KPI cards.
- **Email Notification System:** Per-tenant configurable SMTP-based email alerts for low/critical stock, PO approvals, and order dispatch confirmations.

### Planned
- **Mobile App:** Native iOS/Android app for barcode scanning using device camera.
- **Integration:** Pre-built connectors for Shopify, WooCommerce, and NetSuite.
- **Advanced Labor Management:** Tracking worker productivity and picking rates.
- **Predictive Analytics:** Demand forecasting and automated reorder suggestions using ML.
- **Wave Picking Optimization:** Route optimization using spatial coordinates from the floor plan.
- **Billing Integration:** Stripe subscription management linked to `TenantPlan` tier.
- **SSO / SAML:** Enterprise single sign-on for larger tenants.

## 8. Dynamic Routing & Workflow Engine
- **Visual Builder:** Drag-and-drop interface for creating custom inbound/outbound material flows.
- **Dynamic Execution:** Transitions between tasks (e.g., QC Inspect to Putaway) are evaluated dynamically based on real-time conditions.
- **Waveless Picking:** Replaces rigid picking waves with a continuous, priority-driven queue of pick tasks.
