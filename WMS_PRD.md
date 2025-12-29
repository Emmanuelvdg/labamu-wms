# Labamu Class A WMS - Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Approved
**Date:** 2024-12-30

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

### 4.5 Reporting & Analytics
- **Live Dashboard:** Key Performance Indicators (KPIs) for daily operations.
- **Valuation Report:** Current inventory value based on Average Cost or Standard Cost.
- **Transaction History:** Immutable ledger of all moves for audit trails.

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
- **Backend:** NestJS (Node.js) for a modular, scalable, and type-safe server-side architecture.
- **Database:** PostgreSQL for robust relational data integrity using Prisma ORM.
- **Hosting:** Dockerized container deployment compatible with AWS ECS or Kubernetes.

## 7. Future Roadmap (Post-MVP)
- **Mobile App:** Native iOS/Android app for barcode scanning using device camera.
- **Integration:** Pre-built connectors for Shopify, WooCommerce, and NetSuite.
- **Advanced Labor Management:** Tracking worker productivity and picking rates.
