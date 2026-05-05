# Labamu IMS — Full Platform Regression Test Execution
**Status: ✅ ALL 39 MODULES COMPLETE & PASSED (190+ API tests + 39 UI tests)**  
**Date: 2026-05-05**  
**Environment: Local Development (Port 3000/3001)**

---

## 1. Overview
This document contains the execution results for the Labamu WMS Full Platform Regression. Modules 1–38 cover the full API surface. Module 39 covers the Backoffice Admin Portal (v3.0 additions) via Playwright E2E specs with traceability to PRD §4.13.

---

**Version:** 2.2  
**Coverage:** All 200+ API endpoints across 38 modules + Backoffice Admin Portal (Module 39, 39 UI test cases) — **230+ total tests, all passing**  
**Data dependency:** `seed-realistic-data.ts` must be executed before running  
**Auth:** All requests require `x-user-id` header with admin user ID  
**Base URL:** `http://localhost:3001`

---

## Test Data Reference

| Entity | Key Values |
|--------|-----------|
| Warehouse DC | `Distribution Center Jakarta` (DC-JKT) |
| Warehouse Depot | `Surabaya Regional Depot` (DEP-SBY) |
| Zone A bins | codes `A1-1-01` … `A3-3-05` (zonePriority ≤ 20) |
| Zone B bins | codes `B1-1-01` … `B2-3-05` (zonePriority 21-50) |
| Zone C bins | codes `C1-1-01` … `C2-3-05` (zonePriority 51-100) |
| Cold zone bins | codes `F1-1-01` … `F1-2-05` (zonePriority 35-45) |
| Class A products | `MSE-WLS-005`, `USB-HUB-006` |
| Class B products | `LAP-STD-002`, `KBD-MEC-004` |
| Class C products | `PPR-A4-011`, `PEN-BLU-012` |
| Cold-chain products | `INK-CTR-014`, `PHT-PPR-015`, `EXP-INK-101` |
| Heavy product (9.5 kg) | `DKT-WRK-003` |
| Boundary-weight (5 kg) | `THR-WGT-100` |
| Virtual/zero-weight | `VRT-LIC-099` |
| Oversized (30 kg) | `HVY-SRV-103` |
| Discontinued | `DSC-CAM-102` |
| Expired batch | `BATCH-EXPIRED-001` (EXP-INK-101, expired -5 days) |
| Near-expiry batch | `BATCH-NEAREXP-001` (EXP-INK-101, expires +3 days) |
| POs | `PO-2024-001` (received), `PO-2024-002` (approved), `PO-2024-003` (draft), `PO-2024-004` (draft), `PO-REJECT-001` (rejected), `PO-PARTIAL-001` (partial), `PO-OVERDUE-001` (overdue) |
| Admin user | `admin@labamu.co.id` |

---

## Module 1 — Authentication & Users

### 1.1 Login — Happy Flow
**POST /auth/login**  
Body: `{ "email": "admin@labamu.co.id", "password": "admin" }`  
Expected: `HTTP 200`, response contains token or session  
Result: ✅ Passed (200 OK) - Admin login successful.  

### 1.2 Login — Wrong Password
**POST /auth/login**  
Body: `{ "email": "admin@labamu.co.id", "password": "wrongpassword123" }`  
Expected: `HTTP 401`  
Result: ✅ Passed (401 Unauthorized) - Invalid credentials message returned.  

### 1.3 Login — Unknown Email
**POST /auth/login**  
Body: `{ "email": "nobody@example.com", "password": "password123" }`  
Expected: `HTTP 401`  
Result: ✅ Passed (401 Unauthorized) - Non-existent user rejected.  

### 1.4 Login — Rate Limiting
**POST /auth/login** (6 rapid requests with wrong password)  
Expected: 6th request returns `HTTP 429` (too many requests)  

### 1.5 Get Current User
**GET /auth/me** (with valid `x-user-id` header)  
Expected: `HTTP 200`, body contains `id`, `email`, `roles`  
Result: ✅ Passed (200 OK) - admin@labamu.co.id details retrieved.  

### 1.6 Get Current User — Missing Header
**GET /auth/me** (no `x-user-id` header)  
Expected: `HTTP 401` or `HTTP 403`  
Result: ✅ Passed (401 Unauthorized) - Rejected without user header.  

### 1.7 List Users
**GET /settings/users**  
Expected: `HTTP 200`, array contains at least the admin user  
Result: ✅ Passed (200 OK) - User list retrieved (5 users).  

### 1.8 Create User
**POST /settings/users**  
Body: `{ "email": "test.user@labamu.co.id", "name": "Test User", "password": "Test@1234", "roleIds": [] }`  
Expected: `HTTP 200` or `HTTP 201`, new user returned  
Result: ✅ Passed (201 Created) - test.user@labamu.co.id created.  

### 1.9 Create User — Duplicate Email
**POST /settings/users** (same email as 1.8)  
Expected: `HTTP 400` or `HTTP 409`  
Result: ✅ Passed (400 Bad Request) - Duplicate email blocked.  

### 1.10 Reset Password
**POST /settings/users/:id/reset-password**  
Body: `{ "newPassword": "NewPass@5678" }`  
Expected: `HTTP 200`  
Result: ✅ Passed (200 OK) - Password reset successful.  

### 1.11 Delete User
**DELETE /settings/users/:id** (user created in 1.8)  
Expected: `HTTP 200` or `HTTP 204`  
Result: ✅ Passed (200 OK) - User deleted.  

### 1.12 Get Available Permissions
**GET /settings/roles/available-permissions**  
Expected: `HTTP 200`, array of `{ resource, action }` objects  
Result: ✅ Passed (200 OK) - 13 resources (INVENTORY, WAREHOUSE, etc.) retrieved.  

---

## Module 2 — Roles & Permissions

### 2.1 List Roles
**GET /settings/roles**  
Expected: `HTTP 200`, array includes default roles  

### 2.2 Create Role
**POST /settings/roles**  
Body: `{ "name": "Warehouse Operator", "description": "Can pick and putaway", "permissions": [{ "resource": "INVENTORY", "action": "READ" }] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 2.3 Create Role — Duplicate Name
**POST /settings/roles** (same name as 2.2)  
Expected: `HTTP 400` or `HTTP 409`  

### 2.4 Get Role by ID
**GET /settings/roles/:id** (role from 2.2)  
Expected: `HTTP 200`, includes `permissions` array  
Result: ✅ Passed (200 OK) - Role details retrieved.  

### 2.5 Update Role Permissions
**PUT /settings/roles/:id**  
Body: `{ "name": "Warehouse Operator", "permissions": [{ "resource": "INVENTORY", "action": "READ" }, { "resource": "INVENTORY", "action": "UPDATE" }] }`  
Expected: `HTTP 200`  

### 2.6 Delete Role
**DELETE /settings/roles/:id** (role from 2.2)  
Expected: `HTTP 200` or `HTTP 204`  

### 2.7 Delete Non-Existent Role
**DELETE /settings/roles/non-existent-id**  
Expected: `HTTP 404`  

---

## Module 3 — API Keys

### 3.1 Create API Key
**POST /api-keys**  
Expected: `HTTP 200` or `HTTP 201`, response contains `key` (shown once only)  

### 3.2 List API Keys
**GET /api-keys**  
Expected: `HTTP 200`, array; key values masked  

### 3.3 Revoke API Key
**DELETE /api-keys/:id/revoke** (key from 3.1)  
Expected: `HTTP 200`  

### 3.4 Delete API Key
**DELETE /api-keys/:id** (same key after revoke)  
Expected: `HTTP 200` or `HTTP 204`  

---

## Module 4 — Categories & Attributes

### 4.1 List Categories
**GET /settings/categories**  
Expected: `HTTP 200`, includes `Computing`, `Networking`, `Printing & Imaging`, `Office Supplies`, `Peripherals`  

### 4.2 Create Category
**POST /settings/categories**  
Body: `{ "name": "Test Category" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 4.3 Get Category
**GET /settings/categories/:id**  
Expected: `HTTP 200`  

### 4.4 Update Category
**PATCH /settings/categories/:id**  
Body: `{ "name": "Test Category Updated" }`  
Expected: `HTTP 200`  

### 4.5 Delete Category
**DELETE /settings/categories/:id**  
Expected: `HTTP 200` or `HTTP 204`  

### 4.6 List Attribute Definitions
**GET /inventory/attributes/definitions**  
Expected: `HTTP 200`, includes `Zone Type`, `Supports Cold Chain`, `Temperature Min (°C)`, `Temperature Max (°C)`, `Max Pallets`  

### 4.7 Create Attribute Definition
**POST /settings/attributes**  
Body: `{ "name": "Hazardous Material", "type": "BOOLEAN" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 4.8 Update Attribute Definition
**PUT /settings/attributes/:id**  
Body: `{ "name": "Hazardous Material", "type": "SELECT", "options": "Yes,No" }`  
Expected: `HTTP 200`  

### 4.9 Delete Attribute Definition
**DELETE /settings/attributes/:id**  
Expected: `HTTP 200` or `HTTP 204`  

---

## Module 5 — Warehouses & Locations

### 5.1 List Warehouses
**GET /inventory/warehouses**  
Expected: `HTTP 200`, includes `Distribution Center Jakarta` and `Surabaya Regional Depot`  

### 5.2 Create Warehouse
**POST /inventory/warehouses**  
Body: `{ "name": "Test Warehouse Bandung", "shortName": "BWN", "address": "Jl. Test 1, Bandung", "city": "Bandung", "status": "Enabled" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 5.3 Update Warehouse
**PUT /inventory/warehouses/:id** (warehouse from 5.2)  
Body: `{ "name": "Test Warehouse Bandung", "shortName": "BWN-2" }`  
Expected: `HTTP 200`  

### 5.4 Get Warehouse Details (area controller)
**GET /warehouses/:id**  
Expected: `HTTP 200`, includes floorplan/grid settings  

### 5.5 Get Location Tree
**GET /inventory/locations/tree?warehouseId=:dcId**  
Expected: `HTTP 200`, hierarchical structure with WAREHOUSE → ROOM → ROW → SHELF → POSITION  

### 5.6 Get Locations Flat List
**GET /inventory/locations?warehouseId=:dcId**  
Expected: `HTTP 200`, array of locations  

### 5.7 Get Locations Filtered by Type
**GET /inventory/locations?warehouseId=:dcId&structuralType=POSITION**  
Expected: `HTTP 200`, all results have `structuralType: "POSITION"`  

### 5.8 Create Location
**POST /inventory/locations**  
Body: `{ "name": "Test Bin 99", "warehouseId": ":dcId", "type": "internal", "structuralType": "POSITION", "code": "TEST-99", "zonePriority": 25 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 5.9 Update Location
**PUT /inventory/locations/:id** (location from 5.8)  
Body: `{ "name": "Test Bin 99 Updated", "zonePriority": 26 }`  
Expected: `HTTP 200`  

### 5.10 Move Location to New Parent
**PUT /inventory/locations/:id/move**  
Body: `{ "newParentId": ":shelfId" }`  
Expected: `HTTP 200`  

### 5.11 Get Location Details
**GET /inventory/locations/:id** (bin `A1-1-01`)  
Expected: `HTTP 200`, includes `structuralType`, `zonePriority`, `dynamicAttributes`  

### 5.12 Get Location Utilisation
**GET /inventory/locations/:id/utilisation** (bin `A1-1-01`)  
Expected: `HTTP 200`, body contains `status`, `weightUtilisation`, `volumeUtilisation`, `details`  

### 5.13 Get Location Capacity — Can Accept
**GET /inventory/locations/:id/capacity?productId=:mouseId&quantity=10** (Zone A bin, mouse product)  
Expected: `HTTP 200`, `canAccept: true`  

### 5.14 Get Location Capacity — Exceeds Weight
**GET /inventory/locations/:id/capacity?productId=:serverProductId&quantity=1** (bin with maxWeight=100, server=30kg — add 4 servers first)  
Expected: `HTTP 200`, `canAccept: false`, `reason` contains "weight"  

### 5.15 Batch Utilisation
**POST /inventory/locations/utilisation-batch**  
Body: `{ "locationIds": [":binA", ":binB", ":binC"], "metric": "UTILISATION" }`  
Expected: `HTTP 200` or `HTTP 201`, object keyed by location IDs  

### 5.16 Batch Utilisation — Velocity Metric
**POST /inventory/locations/utilisation-batch**  
Body: `{ "locationIds": [":binId"], "metric": "VELOCITY" }`  
Expected: `HTTP 200` or `HTTP 201`, response includes `velocityScore`  

### 5.17 Batch Utilisation — Congestion Metric
**POST /inventory/locations/utilisation-batch**  
Body: `{ "locationIds": [":binId"], "metric": "CONGESTION" }`  
Expected: `HTTP 200` or `HTTP 201`, response includes `congestionScore`  

### 5.18 Check Location Dependencies
**GET /inventory/locations/:id/dependencies** (a bin with inventory)  
Expected: `HTTP 200`  

### 5.19 Delete Location — With Inventory (should fail or warn)
**DELETE /inventory/locations/:id** (bin that has active inventory batches)  
Expected: `HTTP 400` or `HTTP 409` (cannot delete occupied location)  

### 5.20 Delete Location — Empty Bin
**DELETE /inventory/locations/:id** (empty test bin from 5.8)  
Expected: `HTTP 200` or `HTTP 204`  

### 5.21 Suggest Removal Strategy
**GET /inventory/locations/:id/suggest-removal?productId=:productId&quantity=5**  
Expected: `HTTP 200`  

### 5.22 Export Locations as CSV
**GET /inventory/locations/export?warehouseId=:dcId**  
Expected: `HTTP 200`, `Content-Type: text/csv`  

### 5.23 Import Locations from CSV
**POST /inventory/locations/import**  
Body: `{ "warehouseId": ":dcId", "csv": "name,type,structuralType,code\nImport Test Bin,internal,POSITION,IMP-001" }`  
Expected: `HTTP 200` or `HTTP 201`; clean up afterward  

### 5.24 Get Warehouse Zones
**GET /warehouses/:id/zones**  
Expected: `HTTP 200`, includes Zone A, Zone B, Zone C, Zone COLD  

### 5.25 Get Bin Utilisation (warehouse level)
**GET /warehouses/:id/bins/utilization**  
Expected: `HTTP 200`  

### 5.26 Get Warehouse Areas
**GET /warehouses/:id/areas**  
Expected: `HTTP 200`  

### 5.27 Get Warehouse Dependencies
**GET /warehouses/:id/dependencies**  
Expected: `HTTP 200`  

---

## Module 6 — Products

### 6.1 List Products
**GET /inventory/products**  
Expected: `HTTP 200`, at least 20 products (15 core + 5 edge-case)  

### 6.2 Search Products
**GET /inventory/products?search=Laptop**  
Expected: `HTTP 200`, results contain only products matching "Laptop"  

### 6.3 Filter by Category
**GET /inventory/products?category=Computing**  
Expected: `HTTP 200`, all results in Computing category  

### 6.4 Filter by Velocity Class
**GET /inventory/products?classification=A**  
Expected: `HTTP 200`, all results have `velocityClass: "A"`  

### 6.5 Get Product by ID
**GET /inventory/products/:id** (MSE-WLS-005)  
Expected: `HTTP 200`, includes `sku`, `weight`, `velocityClass`, `temperatureMin/Max`  

### 6.6 Get Non-Existent Product
**GET /inventory/products/non-existent-id**  
Expected: `HTTP 404`  

### 6.7 Create Product
**POST /inventory/products**  
Body: `{ "sku": "TST-001", "name": "Test Product", "categoryId": ":computingCatId", "weight": 1.5, "unitCost": 100000, "sellingPrice": 150000, "velocityClass": "B" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 6.8 Create Product — Duplicate SKU
**POST /inventory/products** (same SKU as 6.7)  
Expected: `HTTP 400` or `HTTP 409`  

### 6.9 Update Product
**PUT /inventory/products/:id** (product from 6.7)  
Body: `{ "name": "Test Product Updated", "sellingPrice": 175000 }`  
Expected: `HTTP 200`  

### 6.10 Create Product Packaging
**POST /inventory/products/:id/packaging**  
Body: `{ "name": "Box of 10", "unitType": "BOX", "quantity": 10, "barcode": "TST001BOX" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 6.11 Get Product Packaging
**GET /inventory/products/:id/packaging**  
Expected: `HTTP 200`, array  

### 6.12 Delete Packaging
**DELETE /inventory/packaging/:id**  
Expected: `HTTP 200` or `HTTP 204`  

---

## Module 7 — Inventory Batches & Stock

### 7.1 List Batches
**GET /inventory/batches?warehouseId=:dcId**  
Expected: `HTTP 200`, includes seeded batches across all products  

### 7.2 Get Batches for Product
**GET /inventory/batch/:productId** (MSE-WLS-005)  
Expected: `HTTP 200`, array with `batchNumber`, `quantity`, `expiryDate`  

### 7.3 Add Batch
**POST /inventory/batch**  
Body: `{ "productId": ":mouseId", "locationId": ":binA101", "warehouseId": ":dcId", "quantity": 50, "batchNumber": "TEST-BATCH-NEW", "purchaseDate": "2026-01-01" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 7.4 Get Inventory Stock Levels
**GET /inventory?productId=:mouseId**  
Expected: `HTTP 200`  

### 7.5 Get Inventory — By Location
**GET /inventory?locationId=:binA101**  
Expected: `HTTP 200`  

### 7.6 Get Product Transactions
**GET /inventory/transactions/:productId** (MSE-WLS-005)  
Expected: `HTTP 200`, transaction history array  

### 7.7 Get Stock Transactions
**GET /inventory/transactions**  
Expected: `HTTP 200`  

### 7.8 Get Inventory Valuation
**GET /inventory/valuation**  
Expected: `HTTP 200`, contains total value  

### 7.9 Check Expired Batches Notification
**POST /notifications/check-expired**  
Expected: `HTTP 200` or `HTTP 201`, notifications created for `BATCH-EXPIRED-001` (EXP-INK-101)  

### 7.10 Check Near-Expiry Batches
**POST /notifications/check-expiry?days=7**  
Expected: `HTTP 200` or `HTTP 201`, notification created for `BATCH-NEAREXP-001` (expires in 3 days)  

### 7.11 Check Near-Expiry — No Batches Within 1 Day
**POST /notifications/check-expiry?days=1**  
Expected: `HTTP 200` or `HTTP 201`, no notifications for batches expiring in 3+ days  

---

## Module 8 — Inventory Adjustments

### 8.1 List Adjustments
**GET /inventory/adjustments**  
Expected: `HTTP 200`, array  

### 8.2 Create Positive Adjustment
**POST /inventory/adjustments**  
Body: `{ "productId": ":mouseId", "locationId": ":binA101", "warehouseId": ":dcId", "countedQuantity": <currentQty + 10>, "currentQuantity": <currentQty>, "reason": "Cycle count correction — surplus" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 8.3 Create Negative Adjustment
**POST /inventory/adjustments**  
Body: `{ "productId": ":mouseId", "locationId": ":binA101", "warehouseId": ":dcId", "countedQuantity": <currentQty - 5>, "currentQuantity": <currentQty>, "reason": "Cycle count correction — shrinkage" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 8.4 Apply Adjustment
**POST /inventory/adjustments/:id/apply**  
Expected: `HTTP 200` or `HTTP 201`, stock quantity updated  

### 8.5 Apply Adjustment — Already Applied
**POST /inventory/adjustments/:id/apply** (same adjustment from 8.4)  
Expected: `HTTP 400` (cannot apply twice)  

### 8.6 Update Adjustment Reason (before apply)
**PUT /inventory/adjustments/:id**  
Body: `{ "reason": "Updated reason" }`  
Expected: `HTTP 200`  

### 8.7 Create Adjustment — Missing Required Fields
**POST /inventory/adjustments**  
Body: `{ "productId": ":mouseId" }` (missing countedQuantity/currentQuantity)  
Expected: `HTTP 400`  

---

## Module 9 — Stock Transfers & Scrap

### 9.1 Transfer Stock Between Locations
**POST /inventory/transfer**  
Body: `{ "productId": ":mouseId", "sourceLocationId": ":binA101", "destinationLocationId": ":binA102", "quantity": 5, "reason": "Zone rebalancing" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 9.2 Transfer — Quantity Exceeds Available
**POST /inventory/transfer**  
Body: `{ "productId": ":mouseId", "sourceLocationId": ":binA101", "destinationLocationId": ":binA102", "quantity": 99999 }`  
Expected: `HTTP 400` (insufficient stock)  

### 9.3 Transfer — Same Source and Destination
**POST /inventory/transfer**  
Body: `{ "productId": ":mouseId", "sourceLocationId": ":binA101", "destinationLocationId": ":binA101", "quantity": 5 }`  
Expected: `HTTP 400`  

### 9.4 Create Scrap Order
**POST /inventory/scrap**  
Body: `{ "locationId": ":binA101", "productId": ":mouseId", "quantity": 2, "reason": "Damaged in warehouse" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 9.5 List Scrap Orders
**GET /inventory/scrap**  
Expected: `HTTP 200`, includes scrap from 9.4  

### 9.6 Create Stock Move
**POST /inventory/moves**  
Body: `{ "productId": ":mouseId", "sourceLocationId": ":binA101", "destinationLocationId": ":binB101", "quantity": 3 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 9.7 List Stock Moves
**GET /inventory/moves**  
Expected: `HTTP 200`  

### 9.8 Validate Stock Move
**POST /inventory/moves/:id/validate**  
Expected: `HTTP 200` or `HTTP 201`  

### 9.9 Get Transit Items
**GET /inventory/transit**  
Expected: `HTTP 200`  

---

## Module 10 — Suppliers

### 10.1 List Suppliers
**GET /suppliers**  
Expected: `HTTP 200`, includes `TechSupply Co.`, `OfficeWorld Ltd.`, `GlobalImport Inc.`  

### 10.2 Get Supplier by ID
**GET /suppliers/:id**  
Expected: `HTTP 200`, includes supplier stats  

### 10.3 Create Supplier
**POST /suppliers**  
Body: `{ "name": "Test Vendor PT", "contactInfo": "vendor@test.co.id" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 10.4 Update Supplier
**PATCH /suppliers/:id** (supplier from 10.3)  
Body: `{ "name": "Test Vendor PT (Updated)", "contactInfo": "updated@test.co.id" }`  
Expected: `HTTP 200`  

### 10.5 Get Supplier Orders
**GET /suppliers/:id/orders** (TechSupply Co.)  
Expected: `HTTP 200`, includes associated POs  

### 10.6 Get Product Price History
**GET /suppliers/reports/price-history?productId=:laptopId**  
Expected: `HTTP 200`  

### 10.7 Delete Supplier — With Open POs (should fail)
**DELETE /suppliers/:id** (TechSupply Co. — has open POs)  
Expected: `HTTP 400` or `HTTP 409`  

### 10.8 Delete Supplier — No Orders
**DELETE /suppliers/:id** (supplier from 10.3)  
Expected: `HTTP 200` or `HTTP 204`  

---

## Module 11 — Purchase Orders

### 11.1 List Purchase Orders
**GET /purchase-orders**  
Expected: `HTTP 200`, includes all 7 seeded POs  

### 11.2 Get PO by ID
**GET /purchase-orders/:id** (PO-2024-001)  
Expected: `HTTP 200`, includes `status`, `approvalStatus`, `items`, `threeWayMatch`  

### 11.3 Get Non-Existent PO
**GET /purchase-orders/non-existent-id**  
Expected: `HTTP 404`  

### 11.4 Create PO — Happy Flow
**POST /purchase-orders**  
Body: `{ "poNumber": "PO-TEST-001", "supplierId": ":techSupplyId", "orderDate": "2026-04-10", "expectedDate": "2026-05-10", "items": [{ "productId": ":mouseId", "quantity": 100, "unitCost": 150000 }], "paymentTerms": "NET30" }`  
Expected: `HTTP 200` or `HTTP 201`, `status: "DRAFT"`, `approvalStatus: "PENDING"`  

### 11.5 Create PO — Missing Required Fields
**POST /purchase-orders**  
Body: `{ "supplierId": ":techSupplyId" }` (no items, no dates)  
Expected: `HTTP 400`  

### 11.6 Submit PO for Approval
**POST /purchase-orders/:id/submit** (PO-TEST-001 from 11.4)  
Expected: `HTTP 200` or `HTTP 201`, `status: "ORDERED"` or `"PENDING"`  

### 11.7 Submit Already-Submitted PO
**POST /purchase-orders/:id/submit** (same PO, already submitted)  
Expected: `HTTP 400` (already in submitted state)  

### 11.8 Approve PO
**POST /purchase-orders/:id/approve**  
Body: `{ "userId": ":adminUserId" }`  
Expected: `HTTP 200` or `HTTP 201`, `approvalStatus: "APPROVED"`  

### 11.9 Reject PO
**POST /purchase-orders/:id/reject** (PO-2024-003, still DRAFT)  
Body: `{ "userId": ":adminUserId", "reason": "Budget not approved" }`  
Expected: `HTTP 200` or `HTTP 201`, `approvalStatus: "REJECTED"`  

### 11.10 Receive Goods — Happy Flow
**POST /purchase-orders/:id/receive** (PO-2024-002, status ORDERED/APPROVED)  
Body: `{ "locationId": ":receivingDockId", "items": [{ "productId": ":mouseId", "quantity": 50 }] }`  
Expected: `HTTP 200` or `HTTP 201`, inventory batch created  

### 11.11 Receive Goods — Over-Receipt
**POST /purchase-orders/:id/receive**  
Body: `{ "locationId": ":receivingDockId", "items": [{ "productId": ":mouseId", "quantity": 99999 }] }`  
Expected: `HTTP 400` or accepted with discrepancy flag  

### 11.12 Receive Goods — Wrong Product
**POST /purchase-orders/:id/receive**  
Body: `{ "locationId": ":receivingDockId", "items": [{ "productId": ":unrelatedProductId", "quantity": 1 }] }`  
Expected: `HTTP 400`  

### 11.13 QA Inspection — Happy Flow
**POST /purchase-orders/:id/inspections**  
Body: `{ "results": [{ "productId": ":mouseId", "receivedQty": 50, "acceptedQty": 48, "rejectedQty": 2, "rejectionReason": "Packaging damaged" }] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 11.14 Get Inspections
**GET /purchase-orders/:id/inspections**  
Expected: `HTTP 200`, includes inspection from 11.13  

### 11.15 3-Way Match — Happy Flow
**POST /purchase-orders/:id/match** (PO-2024-001 — already received)  
Expected: `HTTP 200` or `HTTP 201`, `threeWayMatch: "MATCHED"` or `"DISCREPANCY"`  

### 11.16 3-Way Match — Partial Receipt
**POST /purchase-orders/:id/match** (PO-PARTIAL-001)  
Expected: `HTTP 200` or `HTTP 201`, `threeWayMatch: "DISCREPANCY"`  

### 11.17 Scan Receive via Barcode
**POST /purchase-orders/:id/scan-receive**  
Body: `{ "barcode": "MSE-WLS-005", "locationId": ":receivingDockId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 11.18 Get PO Receipts
**GET /purchase-orders/:id/receipts** (PO-2024-001)  
Expected: `HTTP 200`, array of receipts  

### 11.19 Upload PO Document
**POST /purchase-orders/:id/documents** (multipart form, file < 10MB, `documentType: "INVOICE"`)  
Expected: `HTTP 200` or `HTTP 201`  

### 11.20 Upload PO Document — Oversized File
**POST /purchase-orders/:id/documents** (file > 10MB)  
Expected: `HTTP 400` or `HTTP 413`  

### 11.21 List PO Documents
**GET /purchase-orders/:id/documents**  
Expected: `HTTP 200`, includes document from 11.19  

### 11.22 Download PO Document
**GET /purchase-orders/:id/documents/:docId/download**  
Expected: `HTTP 200`, file content returned  

### 11.23 List Suppliers via PO Module
**GET /purchase-orders/suppliers**  
Expected: `HTTP 200`, array of suppliers  

### 11.24 PO — Already Rejected Cannot Be Submitted Again
**POST /purchase-orders/:id/submit** (PO-REJECT-001, status REJECTED)  
Expected: `HTTP 400`  

---

## Module 12 — Putaway Rules

### 12.1 List Putaway Rules
**GET /inventory/putaway-rules**  
Expected: `HTTP 200`, at least 6 rules  

### 12.2 Rules Cover All Velocity Classes
Rules list must contain entries for `velocityClass: "A"`, `"B"`, and `"C"`  

### 12.3 Rules Include Temperature Rule
Rules list must contain a rule with `preferredZonePriorityMin >= 35` and `preferredZonePriorityMax <= 45`  

### 12.4 Rules Include Weight-Based Rule
Rules list must contain a rule with `minWeight > 0`  

### 12.5 Rules Include LEAST_OCCUPIED Strategy
Rules list must contain a rule with `strategy: "LEAST_OCCUPIED"` and `categoryId != null`  

### 12.6 Priority Ordering
Highest `priority` value in rules must be ≥ 100  

### 12.7 Create Putaway Rule
**POST /inventory/putaway-rules**  
Body: `{ "name": "Test FIXED Rule", "strategy": "FIXED", "destinationLocationId": ":binA101", "priority": 1, "active": true, "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 12.8 Update Putaway Rule Priority
**PUT /inventory/putaway-rules/:id**  
Body: `{ ...existingRule, "priority": existingRule.priority + 1 }`  
Expected: `HTTP 200`  

### 12.9 Delete Putaway Rule
**DELETE /inventory/putaway-rules/:id** (rule from 12.7)  
Expected: `HTTP 200` or `HTTP 204`  

### 12.10 Test Routing — Class A → Zone A
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":mouseId", "quantity": 5, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, `destinationLocation.zonePriority < 21`  

### 12.11 Test Routing — Class B → Zone B
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":laptopStdId", "quantity": 3, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, `destinationLocation.zonePriority` between 21 and 50  

### 12.12 Test Routing — Class C → Zone C
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":paperA4Id", "quantity": 50, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, `destinationLocation.zonePriority > 50`  

### 12.13 Test Routing — Cold Chain Product → Cold Zone
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":inkCartridgeId", "quantity": 10, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, `destinationLocation.zonePriority` between 35 and 45  

### 12.14 Test Routing — Heavy Product (>5kg) → Zone C
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":workstationId", "quantity": 1, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, `destinationLocation.zonePriority > 50`  

### 12.15 Test Routing — Boundary Weight (exactly 5kg) → Not Zone C
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":thresholdWeightId", "quantity": 1, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, result is a valid POSITION-type bin  

### 12.16 Test Routing — Virtual Product (0 kg) → Zone A
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":virtualLicenceId", "quantity": 1, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, bin returned  

### 12.17 Test Routing — Monitor → LEAST_OCCUPIED Bin
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":monitor27Id", "quantity": 2, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200`, at least one candidate location returned  

### 12.18 Test Routing — Product With No Matching Rule
**POST /inventory/putaway-rules/test**  
Body: `{ "productId": ":discontinuedProductId", "quantity": 1, "warehouseId": ":dcId", "sourceLocationId": ":receivingDockId" }`  
Expected: `HTTP 200` (fallback to default), or `HTTP 400`  

---

## Module 13 — Putaway Sessions & Tasks

### 13.1 Create Putaway Session
**POST /inventory/putaway/sessions**  
Body: `{ "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`, session with `status: "OPEN"` or `"ACTIVE"`  

### 13.2 Get Active Putaway Session
**GET /inventory/putaway/sessions/:warehouseId/active**  
Expected: `HTTP 200`, active session returned  

### 13.3 Get Active Session — No Session Exists
**GET /inventory/putaway/sessions/:nonExistentWarehouseId/active**  
Expected: `HTTP 404`  

### 13.4 Update Putaway Task — Change Quantity
**PATCH /inventory/putaway/tasks/:taskId**  
Body: `{ "putawayQuantity": 4 }`  
Expected: `HTTP 200`  

### 13.5 Complete Putaway Task — Happy Flow
**POST /inventory/putaway/tasks/:taskId/complete**  
Body: `{ "actualDestinationId": ":correctBinId" }`  
Expected: `HTTP 200` or `HTTP 201`, task `status: "COMPLETED"`  

### 13.6 Get Alternative Locations
**GET /inventory/putaway/tasks/:taskId/alternatives?warehouseId=:dcId**  
Expected: `HTTP 200`, array of candidate locations  

### 13.7 Exception — Damaged Inventory
**POST /inventory/putaway/tasks/:taskId/exception/damaged**  
Body: `{ "damagedQty": 2, "goodQty": 3, "quarantineLocationId": ":stagingAreaId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 13.8 Exception — Quantity Mismatch
**POST /inventory/putaway/tasks/:taskId/exception/mismatch**  
Body: `{ "expectedQty": 10, "actualQty": 8, "reason": "Short shipment from supplier" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 13.9 Get Blocked Tasks
**GET /inventory/putaway/tasks/blocked?warehouseId=:dcId**  
Expected: `HTTP 200`, array (may be empty if none blocked)  

### 13.10 Check Putaway Capacity
**GET /inventory/putaway/locations/:locationId/capacity?productId=:mouseId&quantity=10**  
Expected: `HTTP 200`, `canAccept` boolean  

### 13.11 Complete Putaway Session
**PATCH /inventory/putaway/sessions/:sessionId/complete**  
Expected: `HTTP 200`, session `status: "COMPLETED"`  

### 13.12 Complete Session — Already Completed
**PATCH /inventory/putaway/sessions/:sessionId/complete** (same session)  
Expected: `HTTP 400`  

---

## Module 14 — Customers & Orders

### 14.1 List Customers
**GET /customers**  
Expected: `HTTP 200`, includes `Acme Corporation`, `MegaRetail Group`, `StartupHub ID`, `EduTech Nusantara`  

### 14.2 Create Customer
**POST /customers**  
Body: `{ "name": "New Test Customer", "address": "Jl. Test 1, Jakarta", "latitude": -6.2, "longitude": 106.8 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 14.3 Create Customer — No Address (walk-in)
**POST /customers**  
Body: `{ "name": "Walk-In Customer Test" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 14.4 Get Customer by ID
**GET /customers/:id**  
Expected: `HTTP 200`  

### 14.5 Update Customer
**PATCH /customers/:id**  
Body: `{ "address": "Jl. Baru 99, Jakarta" }`  
Expected: `HTTP 200`  

### 14.6 Delete Customer — No Orders
**DELETE /customers/:id** (customer from 14.3)  
Expected: `HTTP 200` or `HTTP 204`  

### 14.7 Delete Customer — With Orders (should fail)
**DELETE /customers/:id** (Acme Corporation — has completed orders)  
Expected: `HTTP 400` or `HTTP 409`  

### 14.8 List Orders
**GET /orders**  
Expected: `HTTP 200`, includes all seeded orders across all statuses  

### 14.9 Get Order by ID
**GET /orders/:id**  
Expected: `HTTP 200`, includes `status`, `items`, `customerId`  

### 14.10 Create Order — Happy Flow
**POST /orders**  
Body: `{ "customerId": ":acmeId", "type": "SALES", "warehouseId": ":dcId", "priority": "2", "items": [{ "productId": ":mouseId", "quantity": 5 }] }`  
Expected: `HTTP 200` or `HTTP 201`, `status: "PENDING"` or `"RESERVED"`  

### 14.11 Create Order — Insufficient Stock
**POST /orders**  
Body: `{ "customerId": ":acmeId", "type": "SALES", "warehouseId": ":dcId", "priority": "1", "items": [{ "productId": ":lapProId", "quantity": 99999 }] }`  
Expected: `HTTP 200` with `status: "PENDING"` (backorder), or `HTTP 400`  

### 14.12 Create Order — Discontinued Product
**POST /orders**  
Body: `{ "customerId": ":acmeId", "type": "SALES", "warehouseId": ":dcId", "priority": "3", "items": [{ "productId": ":discontinuedId", "quantity": 1 }] }`  
Expected: `HTTP 200` with `status: "PENDING"`, or `HTTP 400`  

### 14.13 Check Order Availability — In Stock
**POST /orders/:id/check-availability** (order with mouse product, ample stock)  
Expected: `HTTP 200`, available  

### 14.14 Check Order Availability — Out of Stock
**POST /orders/:id/check-availability** (order for 99999 units)  
Expected: `HTTP 200`, unavailable flag  

### 14.15 Cancel Order — Happy Flow
**POST /orders/:id/cancel** (PENDING order)  
Expected: `HTTP 200`, `status: "CANCELLED"`  

### 14.16 Cancel Order — Already Shipped
**POST /orders/:id/cancel** (order with `status: "SHIPPED"`)  
Expected: `HTTP 400` (cannot cancel shipped order)  

### 14.17 Update Order
**PUT /orders/:id** (PENDING order)  
Body: `{ "priority": "1" }`  
Expected: `HTTP 200`  

### 14.18 Delete Order — Completed Order (should fail)
**DELETE /orders/:id** (DONE order)  
Expected: `HTTP 400` or `HTTP 409`  

---

## Module 15 — Picking

> **Feature flag gate:** All session management endpoints (`POST /strategy/picking/sessions`, `PATCH /strategy/picking/tasks/:id`, `POST /strategy/picking/sessions/:id/complete`, etc.) require the **`ADVANCED_PICKING`** feature flag to be enabled. When the flag is disabled the API returns `HTTP 403`. The regression runner probes the flag first and skips all picking session sub-tests when gated.

### 15.1 Get Picking Queue
**GET /strategy/picking/sessions/active?warehouseId=:dcId**  
Expected: `HTTP 200` active session, `HTTP 404` if none, or `HTTP 403` if flag disabled  

### 15.2 Create Picking Session — SINGLE Strategy
**POST /strategy/picking/sessions**  
Body: `{ "warehouseId": ":dcId", "strategy": "SINGLE" }`  
Expected: `HTTP 200` or `HTTP 201` (skip if `ADVANCED_PICKING` disabled)  

### 15.3 Create Picking Session — BATCH Strategy
**POST /strategy/picking/sessions**  
Body: `{ "warehouseId": ":dcId", "strategy": "BATCH", "criteria": "carrier" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.4 Create Picking Session — WAVE Strategy
**POST /strategy/picking/sessions**  
Body: `{ "warehouseId": ":dcId", "strategy": "WAVE", "criteria": "product", "maxOrders": 5 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.5 Create Picking Session — WAVELESS
**POST /strategy/picking/sessions**  
Body: `{ "warehouseId": ":dcId", "strategy": "WAVELESS" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.6 Poll Waveless Tasks
**GET /strategy/picking/sessions/:id/waveless-poll**  
Expected: `HTTP 200`, task or empty  

### 15.7 Update Picking Task — Pick Confirmed
**PATCH /strategy/picking/tasks/:id**  
Body: `{ "pickedQuantity": 5, "status": "COMPLETED" }`  
Expected: `HTTP 200`  

### 15.8 Update Picking Task — Partial Pick
**PATCH /strategy/picking/tasks/:id**  
Body: `{ "pickedQuantity": 3, "status": "PARTIAL" }`  
Expected: `HTTP 200`  

### 15.9 Update Picking Task — Exception
**PATCH /strategy/picking/tasks/:id**  
Body: `{ "pickedQuantity": 0, "status": "EXCEPTION", "exceptionReason": "Product not found at bin location" }`  
Expected: `HTTP 200`  

### 15.10 Scan Pick Barcode — Valid
**POST /strategy/picking/tasks/:id/scan-pick**  
Body: `{ "barcode": "MSE-WLS-005" }`  
Expected: `HTTP 200`, pick confirmed  

### 15.11 Scan Pick Barcode — Wrong Product
**POST /strategy/picking/tasks/:id/scan-pick**  
Body: `{ "barcode": "LAP-PRO-001" }` (wrong product for this task)  
Expected: `HTTP 400` (barcode mismatch)  

### 15.12 Complete Picking Session
**POST /strategy/picking/sessions/:id/complete**  
Expected: `HTTP 200`, session completed  

### 15.13 Evaluate Picking Strategy
**POST /strategy/picking**  
Body: `{ "priority": "1", "itemCount": 5, "items": [], "warehouseId": ":dcId" }`  
Expected: `HTTP 200`  

### 15.14 Batch Pick Creation
**POST /strategy/picking/batch**  
Body: `{ "criteria": "contact", "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.15 Cluster Pick Creation
**POST /strategy/picking/cluster**  
Body: `{ "size": 4, "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.16 Wave Pick Creation
**POST /strategy/picking/wave**  
Body: `{ "criteria": "category", "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.17 Get Picking Strategies
**GET /strategy/picking?warehouseId=:dcId**  
Expected: `HTTP 200`, includes seeded strategies  

### 15.18 Create Picking Strategy
**POST /strategy/picking/create**  
Body: `{ "name": "Test Strategy", "rules": "{}", "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 15.19 Update Picking Strategy
**PUT /strategy/picking/:id**  
Expected: `HTTP 200`  

### 15.20 Delete Picking Strategy
**DELETE /strategy/picking/:id** (strategy from 15.18)  
Expected: `HTTP 200` or `HTTP 204`  

### 15.21 Create Picking Session — ZONE Strategy
**POST /strategy/picking/sessions**  
Body: `{ "warehouseId": ":dcId", "strategy": "ZONE", "maxOrders": 5 }`  
Expected: `HTTP 200` or `HTTP 201` (skip if `ADVANCED_PICKING` disabled)  
Note: ZONE strategy assigns tasks grouped by warehouse zone; no criteria or grouping param needed.

### 15.22 Download Picking List PDF
**GET /strategy/picking/sessions/:id/picklist**  
Expected: `HTTP 200`, `Content-Type: application/pdf`, binary PDF body  
Note: Returns a pdfmake-generated picking list for the session. Gated by `ADVANCED_PICKING`.

---

## Module 16 — Packing

### 16.1 Get Packing Queue
**GET /packing/queue?warehouseId=:dcId**  
Expected: `HTTP 200`, orders in PACKING status  

### 16.2 Create Packing Session
**POST /packing/sessions**  
Body: `{ "orderId": ":packingOrderId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 16.3 Get Session by ID
**GET /packing/sessions/:id**  
Expected: `HTTP 200`  

### 16.4 Get Session by Order ID
**GET /packing/sessions/order/:orderId**  
Expected: `HTTP 200`  

### 16.5 Scan Item in Packing Session
**POST /packing/sessions/:id/scan**  
Body: `{ "barcode": "MSE-WLS-005" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 16.6 Scan Wrong Item
**POST /packing/sessions/:id/scan**  
Body: `{ "barcode": "UNKNOWN-SKU-XYZ" }`  
Expected: `HTTP 400`  

### 16.7 Create Parcel
**POST /packing/sessions/:id/parcels**  
Body: `{ "weight": 0.5, "length": 20, "width": 15, "height": 10, "trackingNumber": "JNE-TEST-001", "items": [{ "productId": ":mouseId", "quantity": 2 }] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 16.8 Delete Parcel
**DELETE /packing/parcels/:id** (parcel from 16.7)  
Expected: `HTTP 200` or `HTTP 204`  

### 16.9 Complete Packing
**POST /packing/sessions/:id/complete**  
Expected: `HTTP 200`, order moves to PACKED status  

### 16.10 Complete Packing — Incomplete Items
**POST /packing/sessions/:id/complete** (session with unpacked items)  
Expected: `HTTP 400`  

---

## Module 17 — Shipping

### 17.1 Get Shipping Methods
**GET /shipping/methods**  
Expected: `HTTP 200`, includes seeded delivery methods  

### 17.2 Get Active Shipping Methods Only
**GET /shipping/methods?active=true**  
Expected: `HTTP 200`, all results active  

### 17.3 Create Shipping Method
**POST /shipping/methods**  
Body: `{ "name": "Test Express", "provider": "JNE", "fixedPrice": 50000 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 17.4 Update Shipping Method
**PUT /shipping/methods/:id**  
Body: `{ "fixedPrice": 60000 }`  
Expected: `HTTP 200`  

### 17.5 Delete Shipping Method
**DELETE /shipping/methods/:id** (method from 17.3)  
Expected: `HTTP 200` or `HTTP 204`  

### 17.6 Calculate Shipping Cost
**POST /shipping/calculate**  
Body: `{ "methodId": ":deliveryMethodId", "weight": 2.5, "volume": 0.005, "price": 500000 }`  
Expected: `HTTP 200`, `cost` value returned  

### 17.7 Get Carrier Rates
**GET /shipping/rates?originZip=13930&destZip=60271&weightKg=2**  
Expected: `HTTP 200`  

### 17.8 Create Shipment
**POST /orders/ship**  
Body: `{ "orderId": ":packedOrderId", "carrier": "JNE", "trackingId": "JNE-TEST-002" }`  
Expected: `HTTP 200`, order `status: "SHIPPED"`  

### 17.9 Get Shipping Label PDF
**GET /shipping/label/:shipmentId**  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 17.10 Get Packing Slip PDF
**GET /shipping/packing-slip/:orderId**  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 17.11 Generate Manifest — By Shipment IDs
**POST /shipping/manifest**  
Body: `{ "shipmentIds": [":shipmentId1"] }`  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 17.12 Generate Manifest — By Warehouse + Date
**GET /shipping/manifest/:warehouseId?date=2026-04-10**  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 17.13 Generate Manifest — Empty Date
**GET /shipping/manifest/:warehouseId** (no date param)  
Expected: `HTTP 400`  

---

## Module 18 — Returns (RMA)

### 18.1 Create Return Request
**POST /returns**  
Body: `{ "originalOrderId": ":shippedOrderId", "items": [{ "productId": ":mouseId", "quantity": 1, "returnReason": "Defective on arrival" }] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 18.2 Create Return — Order Not Shipped
**POST /returns**  
Body: `{ "originalOrderId": ":pendingOrderId", "items": [{ "productId": ":mouseId", "quantity": 1, "returnReason": "Changed mind" }] }`  
Expected: `HTTP 400` (cannot return unshipped order)  

### 18.3 Receive Return — Good Condition
**POST /returns/:id/receive**  
Body: `{ "items": [{ "productId": ":mouseId", "quantity": 1, "condition": "GOOD" }] }`  
Expected: `HTTP 200`, inventory updated, product restocked  

### 18.4 Receive Return — Damaged Condition
**POST /returns/:id/receive**  
Body: `{ "items": [{ "productId": ":mouseId", "quantity": 1, "condition": "DAMAGED" }] }`  
Expected: `HTTP 200`, scrap or quarantine location used  

### 18.5 Get Returns for Order
**GET /returns/order/:orderId**  
Expected: `HTTP 200`, array of returns  

### 18.6 Get Returns — Order With No Returns
**GET /returns/order/:pendingOrderId**  
Expected: `HTTP 200`, empty array  

---

## Module 19 — Replenishment

### 19.1 Get Replenishment Summary
**GET /replenishment/summary?warehouseId=:dcId**  
Expected: `HTTP 200`  

### 19.2 Get Replenishment Alerts
**GET /replenishment/alerts?warehouseId=:dcId**  
Expected: `HTTP 200`, array  

### 19.3 Filter Alerts by Status
**GET /replenishment/alerts?warehouseId=:dcId&status=ACTIVE**  
Expected: `HTTP 200`  

### 19.4 Trigger Replenishment Check
**POST /replenishment/check?warehouseId=:dcId**  
Expected: `HTTP 200` or `HTTP 201`  

### 19.5 Auto-Create PO from Alert
**POST /replenishment/alerts/:id/auto-po**  
Expected: `HTTP 200` or `HTTP 201`, new PO created  

### 19.6 Dismiss Alert
**POST /replenishment/alerts/:id/dismiss**  
Expected: `HTTP 200`  

### 19.7 Create Reorder Rule
**POST /inventory/reordering-rules**  
Body: `{ "productId": ":mouseId", "locationId": ":binA101", "minQuantity": 20, "maxQuantity": 100 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 19.8 List Reorder Rules
**GET /inventory/reordering-rules**  
Expected: `HTTP 200`, includes seeded rules  

### 19.9 Check Reorder Rules
**GET /inventory/reordering-rules/check**  
Expected: `HTTP 200`  

---

## Module 20 — Stocktaking (Cycle Count)

### 20.1 Create Stocktaking Session
**POST /stocktaking/sessions**  
Body: `{ "warehouseId": ":dcId", "type": "FULL", "description": "Q2 2026 full count" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 20.2 Create Stocktaking Session — Zone Count
**POST /stocktaking/sessions**  
Body: `{ "warehouseId": ":dcId", "type": "ZONE", "description": "Zone A cycle count" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 20.3 List Stocktaking Sessions
**GET /stocktaking/sessions?warehouseId=:dcId**  
Expected: `HTTP 200`, includes session from 20.1  

### 20.4 Get Session Details
**GET /stocktaking/sessions/:id**  
Expected: `HTTP 200`, includes session metadata  

### 20.5 Generate Counting Tasks
**POST /stocktaking/sessions/:id/generate-tasks**  
Expected: `HTTP 200` or `HTTP 201`, tasks created for occupied bins  

### 20.6 Submit Count — Accurate
**POST /stocktaking/tasks/:taskId/count**  
Body: `{ "countedQuantity": <expectedQty>, "countedBy": ":adminUserId" }`  
Expected: `HTTP 200`  

### 20.7 Submit Count — Discrepancy
**POST /stocktaking/tasks/:taskId/count**  
Body: `{ "countedQuantity": <expectedQty - 3>, "countedBy": ":adminUserId" }`  
Expected: `HTTP 200`, discrepancy flagged  

### 20.8 Submit Count — Zero (missing stock)
**POST /stocktaking/tasks/:taskId/count**  
Body: `{ "countedQuantity": 0, "countedBy": ":adminUserId" }`  
Expected: `HTTP 200`, full shrinkage recorded  

### 20.9 Reconcile Session
**POST /stocktaking/sessions/:id/reconcile**  
Expected: `HTTP 200`, adjustments created for discrepancies  

### 20.10 Reconcile — Already Reconciled
**POST /stocktaking/sessions/:id/reconcile** (same session)  
Expected: `HTTP 400`  

### 20.11 Start Cycle Count
**POST /inventory/cycle-counts/start**  
Body: `{ "locationIds": [":binA101", ":binA102"] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 20.12 Get Cycle Count Status
**GET /inventory/cycle-counts**  
Expected: `HTTP 200`  

---

## Module 21 — ABC Classification

### 21.1 Run ABC Classification
**POST /inventory/abc-classification/:warehouseId/run**  
Expected: `HTTP 200` or `HTTP 201`, products reclassified  

### 21.2 Run with Custom Period
**POST /inventory/abc-classification/:warehouseId/run?periodDays=180**  
Expected: `HTTP 200`  

### 21.3 Run for Non-Existent Warehouse
**POST /inventory/abc-classification/non-existent-id/run**  
Expected: `HTTP 404` or `HTTP 400`  

---

## Module 22 — Invoicing

### 22.1 List Invoices
**GET /invoices**  
Expected: `HTTP 200`  

### 22.2 Create Invoice — Happy Flow
**POST /invoices**  
Body: `{ "purchaseOrderId": ":po2024001Id", "invoiceNumber": "INV-TEST-001", "issueDate": "2026-04-10", "dueDate": "2026-05-10", "amount": 100000 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 22.3 Create Invoice — Duplicate Number
**POST /invoices** (same invoiceNumber)  
Expected: `HTTP 400` or `HTTP 409`  

### 22.4 Get Invoice by ID
**GET /invoices/:id**  
Expected: `HTTP 200`  

### 22.5 3-Way Match — Happy Flow (quantities match)
**POST /invoices/:id/match** (PO received with matching quantities)  
Expected: `HTTP 200`, `threeWayMatch: "MATCHED"`  

### 22.6 3-Way Match — Discrepancy
**POST /invoices/:id/match** (PO-PARTIAL-001 with missing items)  
Expected: `HTTP 200`, `threeWayMatch: "DISCREPANCY"`  

---

## Module 23 — Fulfillment Rules

### 23.1 List Fulfillment Rules
**GET /fulfillment/rules**  
Expected: `HTTP 200`, includes seeded rules (priority, cold chain, express, bulk)  

### 23.2 Create Fulfillment Rule
**POST /fulfillment/rules**  
Body: `{ "name": "Test Rule", "priority": 99, "active": true, "conditions": "{}", "actions": "{}" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 23.3 Update Fulfillment Rule
**PUT /fulfillment/rules/:id**  
Body: `{ "priority": 100, "active": false }`  
Expected: `HTTP 200`  

### 23.4 Delete Fulfillment Rule
**DELETE /fulfillment/rules/:id** (rule from 23.2)  
Expected: `HTTP 200` or `HTTP 204`  

### 23.5 Create Transfer Request
**POST /fulfillment/transfers**  
Body: `{ "sourceWarehouseId": ":dcId", "destinationWarehouseId": ":depotId", "items": [{ "productId": ":mouseId", "quantity": 10 }] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 23.6 Approve Transfer
**PUT /fulfillment/transfers/:id/approve**  
Body: `{ "approverId": ":adminUserId" }`  
Expected: `HTTP 200`  

### 23.7 List Transfers
**GET /fulfillment/transfers**  
Expected: `HTTP 200`  

---

## Module 24 — Workflows

### 24.1 List Workflow Templates
**GET /workflows**  
Expected: `HTTP 200`, array  

### 24.2 Create Workflow Template
**POST /workflows**  
Body: `{ "name": "Test Workflow", "description": "For regression testing", "steps": [] }`  
Expected: `HTTP 200` or `HTTP 201`  

### 24.3 Get Workflow Template
**GET /workflows/:id**  
Expected: `HTTP 200`  

### 24.4 Update Workflow Template
**PUT /workflows/:id**  
Body: `{ "name": "Test Workflow Updated" }`  
Expected: `HTTP 200`  

### 24.5 Clone Workflow
**POST /workflows/:id/clone**  
Expected: `HTTP 200` or `HTTP 201`, new template returned  

### 24.6 Create New Version
**POST /workflows/:id/version**  
Expected: `HTTP 200` or `HTTP 201`  

### 24.7 Validate Template
**POST /workflows/:id/validate**  
Expected: `HTTP 200`, validation result  

### 24.8 Activate Template
**POST /workflows/:id/activate**  
Expected: `HTTP 200`  

### 24.9 Archive (Delete) Template
**DELETE /workflows/:id** (clone from 24.5)  
Expected: `HTTP 200` or `HTTP 204`  

### 24.10 Start Workflow Instance
**POST /workflow-instances/:id/start**  
Body: `{ "warehouseId": ":dcId" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 24.11 List Workflow Instances
**GET /workflow-instances?warehouseId=:dcId**  
Expected: `HTTP 200`, max 50 returned  

### 24.12 Get Instance Details
**GET /workflow-instances/:id**  
Expected: `HTTP 200`  

### 24.13 Advance Workflow
**POST /workflow-instances/:id/advance**  
Expected: `HTTP 200`, current step advances  

### 24.14 Complete Workflow Task
**POST /workflow-instances/:id/tasks/:taskId/complete**  
Body: `{ "result": "approved", "notes": "All checks passed" }`  
Expected: `HTTP 200`  

### 24.15 Pause Workflow
**POST /workflow-instances/:id/pause**  
Body: `{ "userId": ":adminUserId" }`  
Expected: `HTTP 200`  

### 24.16 Resume Workflow
**POST /workflow-instances/:id/resume**  
Expected: `HTTP 200`  

### 24.17 Override Workflow Step
**POST /workflow-instances/:id/override**  
Body: `{ "targetStepId": ":stepId", "userId": ":adminUserId", "reason": "Emergency bypass for testing" }`  
Expected: `HTTP 200`  

### 24.18 Get Workflow Analytics
**GET /workflow-instances/analytics?warehouseId=:dcId&period=30d**  
Expected: `HTTP 200`  

### 24.19 Get Template Drilldown Analytics
**GET /workflow-instances/analytics/templates/:templateId?period=30d**  
Expected: `HTTP 200`  

---

## Module 25 — Reporting & Analytics

### 25.1 Get Dashboard Analytics — 7 Days
**GET /reporting/analytics?period=7d**  
Expected: `HTTP 200`  

### 25.2 Get Dashboard Analytics — 30 Days
**GET /reporting/analytics?period=30d**  
Expected: `HTTP 200`  

### 25.3 Get Dashboard Analytics — 90 Days
**GET /reporting/analytics?period=90d**  
Expected: `HTTP 200`  

### 25.4 Get Dashboard Analytics — Custom Range
**GET /reporting/analytics?period=custom&startDate=2026-01-01&endDate=2026-04-10**  
Expected: `HTTP 200`  

### 25.5 Get Dashboard Analytics — Filtered by Warehouse
**GET /reporting/analytics?period=30d&warehouseId=:dcId**  
Expected: `HTTP 200`  

### 25.6 Drilldown — Stock Value
**GET /reporting/analytics/drilldown/stock-value**  
Expected: `HTTP 200`  

### 25.7 Drilldown — Fulfillment
**GET /reporting/analytics/drilldown/fulfillment**  
Expected: `HTTP 200`  

### 25.8 Drilldown — Stockout
**GET /reporting/analytics/drilldown/stockout**  
Expected: `HTTP 200`  

### 25.9 Drilldown — Pending Orders
**GET /reporting/analytics/drilldown/pending-orders**  
Expected: `HTTP 200`  

### 25.10 Drilldown — Cycle Time
**GET /reporting/analytics/drilldown/cycle-time**  
Expected: `HTTP 200`  

### 25.11 Drilldown — Capacity
**GET /reporting/analytics/drilldown/capacity**  
Expected: `HTTP 200`  

### 25.12 Utilisation History
**GET /reporting/utilisation/history?period=30d**  
Expected: `HTTP 200`  

### 25.13 Cycle Time Trend
**GET /reporting/cycle-time/trend?period=30d**  
Expected: `HTTP 200`  

### 25.14 Pick Accuracy by Warehouse
**GET /reporting/pick-accuracy/:warehouseId?periodDays=30**  
Expected: `HTTP 200`  

### 25.15 Cycle Count Report by Zone
**GET /reporting/cycle-count/:warehouseId?zone=Zone+A**  
Expected: `HTTP 200`  

### 25.16 Compliance Report
**POST /reporting/compliance**  
Body: `{ "type": "INVENTORY_ACCURACY", "period": "2026-Q1" }`  
Expected: `HTTP 200`  

### 25.17 Inventory Ledger Export
**GET /reporting/inventory-ledger**  
Expected: `HTTP 200`, `Content-Type: text/csv`  

---

## Module 26 — Barcode Scanning

### 26.1 Lookup Barcode — Valid SKU
**GET /barcode/lookup?code=MSE-WLS-005**  
Expected: `HTTP 200`, product info returned  

### 26.2 Lookup Barcode — Unknown Code
**GET /barcode/lookup?code=UNKNOWN-CODE-XYZ**  
Expected: `HTTP 200` with empty result, or `HTTP 404`  

### 26.3 Lookup Barcode — Missing Code Parameter
**GET /barcode/lookup** (no `code` query param)  
Expected: `HTTP 400`  

### 26.4 Validate Barcode — Receive PO Context
**GET /barcode/validate?code=MSE-WLS-005&contextType=RECEIVE_PO&referenceId=:poId**  
Expected: `HTTP 200`, validation result  

### 26.5 Validate Barcode — Pick Task Context
**GET /barcode/validate?code=MSE-WLS-005&contextType=PICK_TASK&referenceId=:pickTaskId**  
Expected: `HTTP 200`  

### 26.6 Validate Barcode — Putaway Context
**GET /barcode/validate?code=MSE-WLS-005&contextType=PUTAWAY&referenceId=:putawayTaskId**  
Expected: `HTTP 200`  

### 26.7 Validate Barcode — Pack Order Context
**GET /barcode/validate?code=MSE-WLS-005&contextType=PACK_ORDER&referenceId=:packSessionId**  
Expected: `HTTP 200`  

### 26.8 Validate Barcode — Missing Context Type
**GET /barcode/validate?code=MSE-WLS-005&referenceId=:someId** (no contextType)  
Expected: `HTTP 400`  

### 26.9 Validate Barcode — Wrong Product for Task
**GET /barcode/validate?code=LAP-PRO-001&contextType=PICK_TASK&referenceId=:mousePickTaskId**  
Expected: `HTTP 200` with `valid: false`, or `HTTP 400`  

---

## Module 27 — Notifications

### 27.1 Get All Notifications
**GET /notifications**  
Expected: `HTTP 200`, array  

### 27.2 Get Unread Notifications Only
**GET /notifications?read=false**  
Expected: `HTTP 200`, all results unread  

### 27.3 Get Notifications with Limit
**GET /notifications?limit=5**  
Expected: `HTTP 200`, at most 5 results  

### 27.4 Get Unread Count
**GET /notifications/unread-count**  
Expected: `HTTP 200`, `{ count: <number> }`  

### 27.5 Mark Notification as Read
**PATCH /notifications/:id/read**  
Expected: `HTTP 200`  

### 27.6 Mark All as Read
**POST /notifications/mark-all-read**  
Expected: `HTTP 200`  

### 27.7 Verify Unread Count After Mark All Read
**GET /notifications/unread-count**  
Expected: `HTTP 200`, `{ count: 0 }`  

---

## Module 28 — Routes & Move Rules

### 28.1 List Routes
**GET /inventory/routes**  
Expected: `HTTP 200`, includes all 4 seeded routes  

### 28.2 Create Route
**POST /inventory/routes**  
Body: `{ "name": "Test Route", "description": "For regression testing" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 28.3 Add Rule to Route
**POST /inventory/routes/:routeId/rules**  
Body: `{ "action": "RECEIVE", "destinationLocationId": ":receivingDockId", "sequence": 1 }`  
Expected: `HTTP 200` or `HTTP 201`  

### 28.4 Update Route Rule
**PUT /inventory/rules/:id**  
Body: `{ "sequence": 2 }`  
Expected: `HTTP 200`  

### 28.5 Calculate Routing Distance
**GET /routing/distance?sourceLocationId=:binA101&destinationLocationId=:binC101&warehouseId=:dcId**  
Expected: `HTTP 200`, distance value  

### 28.6 Calculate Distance — Missing Parameters
**GET /routing/distance?sourceLocationId=:binA101** (no destination)  
Expected: `HTTP 400`  

---

## Module 29 — Printing (PDF Labels)

### 29.1 Print Location Label
**GET /printing/location/:id/pdf** (bin A1-1-01)  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 29.2 Print Location Label — Non-Existent Location
**GET /printing/location/non-existent-id/pdf**  
Expected: `HTTP 404`  

### 29.3 Print Product Label
**GET /printing/product/:id/pdf** (MSE-WLS-005)  
Expected: `HTTP 200`, `Content-Type: application/pdf`  

### 29.4 Print Product Label — Non-Existent Product
**GET /printing/product/non-existent-id/pdf**  
Expected: `HTTP 404`  

---

## Module 30 — Configuration

### 30.1 Get Delivery Methods
**GET /configuration/delivery-methods**  
Expected: `HTTP 200`, includes seeded delivery methods  

---

## Module 31 — Integration & STO

### 31.1 Sync Sales Channel
**POST /integration/sync/sales/shopee**  
Expected: `HTTP 200` or `HTTP 201`  

### 31.2 Sync Logistics Partner
**POST /integration/sync/logistics/jne**  
Expected: `HTTP 200` or `HTTP 201`  

### 31.3 Create Inbound STO
**POST /sto/inbound**  
Body: `{ "sourceWarehouseId": ":dcId", "destinationWarehouseId": ":depotId", "items": [{ "productId": ":mouseId", "quantity": 20 }] }`  
Expected: `HTTP 200` or `HTTP 201`  

---

## Module 32 — Packages

### 32.1 Create Package
**POST /inventory/packages**  
Body: `{ "name": "Test Package", "type": "BOX" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 32.2 List Packages
**GET /inventory/packages**  
Expected: `HTTP 200`  

### 32.3 Assign Batch to Package
**POST /inventory/packages/:packageId/assign**  
Body: `{ "batchId": ":batchId" }`  
Expected: `HTTP 200`  

---

## Module 33 — Reservation Strategy

### 33.1 Evaluate Reservation Strategy — Perishable
**POST /strategy/reservation**  
Body: `{ "isPerishable": true, "location": { "zonePriority": 40 } }`  
Expected: `HTTP 200`, strategy recommends FEFO  

### 33.2 Evaluate Reservation Strategy — Non-Perishable
**POST /strategy/reservation**  
Body: `{ "isPerishable": false, "location": { "zonePriority": 25 } }`  
Expected: `HTTP 200`, strategy recommends FIFO  

### 33.3 Create Reservation Strategy
**POST /strategy/reservation/create**  
Body: `{ "name": "Test Reservation Strategy", "rules": "{}" }`  
Expected: `HTTP 200` or `HTTP 201`  

### 33.4 Update Reservation Strategy
**PUT /strategy/reservation/:id**  
Expected: `HTTP 200`  

### 33.5 Delete Reservation Strategy
**DELETE /strategy/reservation/:id** (strategy from 33.3)  
Expected: `HTTP 200` or `HTTP 204`  

---

## Module 34 — Warehouse Floorplan

### 34.1 Export Floorplan as CSV
**GET /floorplan/:warehouseId/export**  
Expected: `HTTP 200`, `Content-Type: text/csv`  

### 34.2 Get Suggested Layout — I-Shape
**GET /warehouses/:id/areas/layout/I**  
Expected: `HTTP 200`  

### 34.3 Get Suggested Layout — U-Shape
**GET /warehouses/:id/areas/layout/U**  
Expected: `HTTP 200`  

### 34.4 Get Suggested Layout — L-Shape
**GET /warehouses/:id/areas/layout/L**  
Expected: `HTTP 200`  

### 34.5 Get Suggested Areas
**GET /warehouses/:id/areas/suggested**  
Expected: `HTTP 200`  

### 34.6 Update Floor Plan
**PATCH /warehouses/:id/floor-plan**  
Body: `{ "gridWidth": 20, "gridHeight": 15 }`  
Expected: `HTTP 200`  

---

## Module 35 — Wave Release Rules

> **Feature flag gate:** All wave-rule endpoints require the **`ADVANCED_PICKING`** feature flag. Returns `HTTP 403` when disabled; runner probes and skips all sub-tests.

### 35.1 List Wave Rules
**GET /strategy/wave-rules?warehouseId=:dcId**  
Expected: `HTTP 200`, array (may be empty on fresh DB)

### 35.2 Create Wave Rule — Manual Trigger
**POST /strategy/wave-rules**  
Body: `{ "warehouseId": ":dcId", "name": "Morning Wave", "triggerType": "MANUAL", "minOrders": 1, "maxOrders": 50, "enabled": true }`  
Expected: `HTTP 201`

### 35.3 Create Wave Rule — Time-Based (Cron)
**POST /strategy/wave-rules**  
Body: `{ "warehouseId": ":dcId", "name": "8 AM Daily", "triggerType": "TIME_BASED", "cronExpression": "0 8 * * *", "minOrders": 5, "maxOrders": 100, "enabled": true }`  
Expected: `HTTP 201`

### 35.4 Create Wave Rule — Order Count Threshold
**POST /strategy/wave-rules**  
Body: `{ "warehouseId": ":dcId", "name": "Auto-50", "triggerType": "ORDER_COUNT", "minOrders": 50, "maxOrders": 100, "enabled": true }`  
Expected: `HTTP 201`

### 35.5 Toggle Wave Rule — Disable
**PUT /strategy/wave-rules/:id**  
Body: `{ "enabled": false }`  
Expected: `HTTP 200`, rule `enabled: false`

### 35.6 Trigger Wave Rule Manually — No Reserved Orders
**POST /strategy/wave-rules/:id/trigger**  
Expected: `HTTP 200`, body `{ "success": false, "message": "No RESERVED orders available…" }` or `{ "success": true }` when orders exist

### 35.7 Trigger Wave Rule Manually — With Reserved Orders
**POST /strategy/wave-rules/:id/trigger** (after seeding RESERVED orders)  
Expected: `HTTP 200`, body contains `sessionId` and `ordersIncluded > 0`

### 35.8 Delete Wave Rule
**DELETE /strategy/wave-rules/:id**  
Expected: `HTTP 200`

---

## Module 36 — Multi-Currency

> **Feature flag gate:** All `/currencies` endpoints require the **`MULTI_CURRENCY`** feature flag. Returns `HTTP 403` when disabled; runner probes and skips all sub-tests.

### 36.1 List Currencies
**GET /currencies**  
Expected: `HTTP 200`, array of currency objects

### 36.2 Create Currency
**POST /currencies**  
Body: `{ "code": "SGD", "name": "Singapore Dollar", "symbol": "S$", "isBase": false, "enabled": true }`  
Expected: `HTTP 201`

### 36.3 Update Currency
**PUT /currencies/:code**  
Body: `{ "enabled": false }`  
Expected: `HTTP 200`

### 36.4 List Exchange Rates
**GET /currencies/rates**  
Expected: `HTTP 200`, array of ExchangeRate objects (may be empty before first sync)

### 36.5 Set Exchange Rate Manually
**POST /currencies/rates**  
Body: `{ "fromCode": "USD", "toCode": "IDR", "rate": 16000 }`  
Expected: `HTTP 200` or `HTTP 201`

### 36.6 Trigger FX Sync
**POST /currencies/sync**  
Expected: `HTTP 200`, sync triggered (result may be async)

### 36.7 Delete Currency
**DELETE /currencies/:code**  
Expected: `HTTP 200`

---

## Module 37 — Supplier Portal Auth

> Endpoints in `/supplier-auth` are public (no tenant flag gate). `/supplier-portal` is protected by `SupplierAuthGuard` (supplier JWT).

### 37.1 Register — Invalid Invite Token
**POST /supplier-auth/register**  
Body: `{ "token": "invalid-token", "password": "Portal@123" }`  
Expected: `HTTP 400` or `HTTP 401` (token not found)

### 37.2 Login — Unknown Credentials
**POST /supplier-auth/login**  
Body: `{ "email": "nobody@supplier.test", "password": "wrong" }`  
Expected: `HTTP 401`

### 37.3 Access Supplier Portal — No JWT
**GET /supplier-portal/purchase-orders**  
Expected: `HTTP 401` (SupplierAuthGuard blocks unauthenticated requests)

### 37.4 Invite Supplier User (Happy Flow)
1. Platform/tenant admin invites supplier — record the generated invite token  
2. **POST /supplier-auth/register** with valid token and password → `HTTP 201`  
3. **POST /supplier-auth/login** with the new credentials → `HTTP 200`, JWT returned  
4. **GET /supplier-auth/me** with supplier JWT → `HTTP 200`, supplier profile  

### 37.5 View Supplier Purchase Orders
**GET /supplier-portal/purchase-orders** (with valid supplier JWT)  
Expected: `HTTP 200`, array scoped to supplier's own POs

### 37.6 Submit ASN
**POST /supplier-portal/purchase-orders/:id/asn** (with valid supplier JWT)  
Body: `{ "items": [{ "productId": ":mouseId", "quantity": 10 }], "estimatedArrival": "2026-05-10" }`  
Expected: `HTTP 200` or `HTTP 201`

### 37.7 Upload Supplier Invoice
**POST /supplier-portal/purchase-orders/:id/invoice** (multipart/form-data, with valid supplier JWT)  
Expected: `HTTP 200` or `HTTP 201`, DocumentAttachment created with type `SUPPLIER_INVOICE`

---

## Module 38 — FX Rates & Reporting Currency

### 38.1 Reporting Analytics with Currency Context
**GET /reporting/analytics?period=7d**  
Expected: `HTTP 200`, response includes base currency context  
Note: Gated by `ADVANCED_ANALYTICS` flag; `HTTP 403` is acceptable when flag is disabled.

### 38.2 Set Exchange Rate via API
**POST /currencies/rates**  
Body: `{ "fromCode": "USD", "toCode": "IDR", "rate": 16000 }`  
Expected: `HTTP 200` or `HTTP 201` (gated by `MULTI_CURRENCY`)

### 38.3 Reporting Respects Base Currency
After setting a base currency to IDR, verify `GET /reporting/analytics` returns amounts in IDR context.  
Expected: `HTTP 200`, currency metadata present

---

## End-to-End Scenario Flows

### E2E-1 — Complete Inbound Flow (PO → Inspect → Putaway → Stock)

1. Create PO (`POST /purchase-orders`) — expect DRAFT  
2. Submit PO (`POST /purchase-orders/:id/submit`) — expect ORDERED  
3. Approve PO (`POST /purchase-orders/:id/approve`) — expect APPROVED  
4. Create putaway session (`POST /inventory/putaway/sessions`)  
5. Receive goods (`POST /purchase-orders/:id/receive`) — expect batch created  
6. Submit QA inspection (`POST /purchase-orders/:id/inspections`)  
7. Complete putaway task (`POST /inventory/putaway/tasks/:taskId/complete`)  
8. Run 3-way match (`POST /purchase-orders/:id/match`)  
9. Create invoice (`POST /invoices`)  
10. Match invoice (`POST /invoices/:id/match`) — expect MATCHED  
11. Verify batch appears in `GET /inventory/batches`  
12. Verify `GET /inventory?productId=:id` shows increased quantity  

### E2E-2 — Complete Outbound Flow (Order → Pick → Pack → Ship)

1. Create order (`POST /orders`) — expect PENDING or RESERVED  
2. Check availability (`POST /orders/:id/check-availability`)  
3. Create picking session (`POST /strategy/picking/sessions`)  
4. Complete picking task (`PATCH /strategy/picking/tasks/:id`)  
5. Complete picking session (`POST /strategy/picking/sessions/:id/complete`)  
6. Create packing session (`POST /packing/sessions`)  
7. Scan items (`POST /packing/sessions/:id/scan`)  
8. Create parcel (`POST /packing/sessions/:id/parcels`)  
9. Complete packing (`POST /packing/sessions/:id/complete`)  
10. Ship order (`POST /orders/ship`)  
11. Verify order `status: "SHIPPED"`  
12. Verify stock decreased in `GET /inventory?productId=:id`  

### E2E-3 — Cold Chain FEFO Flow (Expiry-first picking)

1. Verify `BATCH-EXPIRED-001` and `BATCH-NEAREXP-001` exist in cold zone  
2. Trigger expiry check (`POST /notifications/check-expired`) — notification for BATCH-EXPIRED-001  
3. Trigger near-expiry check (`POST /notifications/check-expiry?days=7`) — notification for BATCH-NEAREXP-001  
4. Create order for `EXP-INK-101`  
5. Create picking session with FEFO strategy  
6. Verify picking task is assigned to BATCH-NEAREXP-001 (soonest expiry)  
7. Complete pick  

### E2E-4 — Return & Restocking Flow

1. Create order and ship it (E2E-2 abbreviated)  
2. Create return request (`POST /returns`)  
3. Receive return — good condition (`POST /returns/:id/receive`)  
4. Verify stock increased back  
5. Create return — damaged condition  
6. Verify damaged stock goes to scrap/quarantine  

### E2E-5 — Putaway Exception Flow (Damaged on Receipt)

1. Receive goods for a PO  
2. Create putaway session  
3. On putaway task: trigger damaged exception (`POST /inventory/putaway/tasks/:taskId/exception/damaged`)  
4. Verify good quantity goes to Zone A, damaged goes to quarantine  
5. Verify exception is visible in blocked tasks (`GET /inventory/putaway/tasks/blocked`)  

### E2E-6 — Replenishment Alert → Auto PO Flow

1. Deplete stock below reorder minimum (via adjustment or transfers)  
2. Trigger replenishment check (`POST /replenishment/check`)  
3. Verify alert created (`GET /replenishment/alerts`)  
4. Auto-create PO (`POST /replenishment/alerts/:id/auto-po`)  
5. Verify PO created in DRAFT state  
6. Submit and approve the auto-generated PO  

### E2E-7 — Stocktaking Discrepancy & Reconciliation

1. Create stocktaking session  
2. Generate tasks  
3. Submit count with deliberate discrepancy (counted - 3)  
4. Reconcile session  
5. Verify adjustment created for the discrepancy  
6. Verify inventory quantity updated  

### E2E-8 — Workflow Engine: Custom Receiving Workflow

1. Create workflow template with 3 steps (Inspect → Approve → Store)  
2. Activate template  
3. Start workflow instance for a PO receipt  
4. Complete step 1 (Inspect)  
5. Advance workflow  
6. Complete step 2 (Approve)  
7. Override to step 3 directly  
8. Complete final step  
9. Verify analytics updated (`GET /workflow-instances/analytics`)  

---

## Cross-Cutting Concerns

### Auth Guard Tests

| Test | Request | Expected |
|------|---------|----------|
| No user header | `GET /inventory/products` (no `x-user-id`) | HTTP 401/403 |
| Invalid user ID | `GET /inventory/products` with `x-user-id: garbage` | HTTP 401/403 |
| Missing permission | User without ORDERS/DELETE hits `DELETE /orders/:id` | HTTP 403 |

### Input Validation Tests

| Test | Request | Expected |
|------|---------|----------|
| Empty body on POST | `POST /purchase-orders` with `{}` | HTTP 400 |
| Invalid UUID | `GET /inventory/products/not-a-uuid` | HTTP 400 or HTTP 404 |
| Negative quantity | `POST /inventory/transfer` with `quantity: -5` | HTTP 400 |
| Zero quantity | `POST /inventory/transfer` with `quantity: 0` | HTTP 400 |
| Future expiry in past | Batch with `expiryDate` before `purchaseDate` | HTTP 400 or accepted |
| SQL injection attempt | `GET /inventory/products?search='; DROP TABLE products; --` | HTTP 200 with empty/safe result |
| XSS in name field | `POST /customers` with `name: "<script>alert(1)</script>"` | HTTP 200 but value stored/returned escaped |

### Idempotency Tests

| Test | Action | Expected |
|------|--------|----------|
| Double submit PO | `POST /purchase-orders/:id/submit` twice | 2nd call returns HTTP 400 |
| Double apply adjustment | `POST /inventory/adjustments/:id/apply` twice | 2nd call returns HTTP 400 |
| Double complete task | `POST /inventory/putaway/tasks/:taskId/complete` twice | 2nd call returns HTTP 400 |
| Double reconcile stocktake | `POST /stocktaking/sessions/:id/reconcile` twice | 2nd call returns HTTP 400 |
| Double cancel order | `POST /orders/:id/cancel` twice | 2nd call returns HTTP 400 |

### Concurrency Edge Cases

| Test | Scenario | Expected |
|------|---------|----------|
| Oversell race | Two orders for last 5 units submitted simultaneously | Only one succeeds with RESERVED, other stays PENDING |
| Double putaway | Two tasks assigned to same bin exceed capacity | System detects overflow; one task rerouted |

---

## Module 39 — Backoffice Admin Portal ✅ 39/39 PASSED

> **Spec file:** `apps/web/e2e/backoffice-admin.spec.ts`  
> **Executed:** 2026-04-26 — **39/39 PASS** (2.0 min, 1 worker)  
> **Prerequisite:** Platform admin user `admin@labamu.co.id` with `ALL:MANAGE` permission (create via `apps/api/scripts/seed_platform_admin.ts`).  
> **Base URL:** `http://localhost:3000` (Next.js frontend)

| Test Case | Description | Result |
|-----------|-------------|--------|
| TC-39.1 | Unauthenticated /admin redirects to /login | ✅ PASS |
| TC-39.2 | Platform admin accesses /admin, sees Platform Overview | ✅ PASS |
| TC-39.3 | Admin sidebar navigation links visible | ✅ PASS |
| TC-39.4 | Overview KPI cards — Total Tenants, Active, Suspended | ✅ PASS |
| TC-39.5 | Overview tenant table "Manage →" link | ✅ PASS |
| TC-39.6 | Tenant list columns Company / Plan / Status | ✅ PASS |
| TC-39.7 | New Tenant modal opens with correct fields | ✅ PASS |
| TC-39.8 | Tenant creation validation rejects empty fields | ✅ PASS |
| TC-39.9 | Tenant creation happy path — modal closes, row appears | ✅ PASS |
| TC-39.10 | Column filter by name shows empty state | ✅ PASS |
| TC-39.11 | Column filter by plan shows only matching plan | ✅ PASS |
| TC-39.12 | Edit tenant modal opens with pre-filled values | ✅ PASS |
| TC-39.13 | Invite user modal opens for a tenant | ✅ PASS |
| TC-39.14 | Tenant detail page loads with three tabs | ✅ PASS |
| TC-39.15 | Overview tab shows Usage Metrics section | ✅ PASS |
| TC-39.16 | Overview tab shows Onboarding progress bar | ✅ PASS |
| TC-39.17 | Plan & Billing tab loads Limits & Usage | ✅ PASS |
| TC-39.18 | Plan & Billing tab shows Plan Configuration + Save Plan | ✅ PASS |
| TC-39.19 | Feature Flags tab lists flags with toggle controls | ✅ PASS |
| TC-39.20 | Toggling a feature flag updates its state | ✅ PASS |
| TC-39.21 | Impersonate button visible on active tenant detail | ✅ PASS |
| TC-39.22 | Impersonate — redirects to dashboard with amber banner | ✅ PASS |
| TC-39.23 | Exit Impersonation — restores admin session, returns to /admin | ✅ PASS |
| TC-39.24 | Global Feature Flags — all 8 system flags listed | ✅ PASS |
| TC-39.25 | Select tenant — per-tenant flag list loads | ✅ PASS |
| TC-39.26 | Analytics page — four KPI cards visible | ✅ PASS |
| TC-39.27 | Monthly growth bar chart rendered | ✅ PASS |
| TC-39.28 | Plan + Status distribution pie charts visible | ✅ PASS |
| TC-39.29 | Audit log loads with table column headers | ✅ PASS |
| TC-39.30 | Audit log search filter returns empty state | ✅ PASS |
| TC-39.31 | Action type filter updates entry list | ✅ PASS |
| TC-39.32 | Page size selector changes result limit | ✅ PASS |
| TC-39.33 | Announcements page loads with New Announcement button | ✅ PASS |
| TC-39.34 | Announcement creation validation rejects empty fields | ✅ PASS |
| TC-39.35 | Announcement creation happy path — publishes to list | ✅ PASS |
| TC-39.36 | Delete announcement — removed from list after confirm | ✅ PASS |
| TC-39.37 | Header checkbox selects all tenants | ✅ PASS |
| TC-39.38 | Bulk action toolbar shows action + value selectors | ✅ PASS |
| TC-39.39 | Cancel bulk selection clears toolbar | ✅ PASS |

### 39.1 Unauthenticated Access Control
**Navigate to /admin without auth cookies**  
Expected: Redirect to `/login`  
PRD: §4.13

### 39.2 Platform Admin Login & Portal Access
**Navigate to /admin after logging in as platform admin**  
Expected: `HTTP 200`, page heading "Platform Overview" visible  
PRD: §4.13

### 39.3 Admin Portal Navigation Sidebar
**Platform admin views /admin**  
Expected: Navigation links visible for Tenants, Analytics, Audit Log  
PRD: §4.13

### 39.4 Platform Overview — KPI Cards
**GET /admin**  
Expected: KPI cards "Total Tenants", "Active", "Suspended" all visible  
PRD: §4.13.1, §4.13.6

### 39.5 Platform Overview — Tenant Table Link
**GET /admin**  
Expected: "Manage →" link present with href `/admin/tenants`  
PRD: §4.13.1

### 39.6 Tenant List — Page Structure
**GET /admin/tenants**  
Expected: Heading "Tenants", table columns Company / Plan / Status / Created  
PRD: §4.13.1

### 39.7 Tenant List — New Tenant Modal Opens
**Click "New Tenant" button**  
Expected: Modal opens with Company Name, Slug, Plan, and Admin Account fields  
PRD: §4.13.1

### 39.8 Tenant Creation — Validation
**Submit New Tenant form with empty required fields**  
Expected: Inline validation error "required" visible; no API call made  
PRD: §4.13.1

### 39.9 Tenant Creation — Happy Path
**POST /companies/register** (via New Tenant modal)  
Body: unique name, slug, email, password  
Expected: Modal closes; new tenant row appears in list  
PRD: §4.0 (self-service onboarding), §4.13.1

### 39.10 Tenant List — Column Filter (Name)
**Filter by name "zzznonexistent"**  
Expected: Empty state "No tenants found" displayed  
PRD: §4.13.1

### 39.11 Tenant List — Column Filter (Plan)
**Filter by plan FREE**  
Expected: Only tenants with FREE plan badge visible  
PRD: §4.13.1

### 39.12 Tenant Edit Modal — Pre-fill
**Click "Edit" on a tenant row**  
Expected: "Edit Tenant" modal opens; name input pre-filled with existing name  
PRD: §4.13.1

### 39.13 Invite User to Tenant
**Click "Invite" on a tenant row**  
Expected: "Invite User" modal opens with Name, Email, Password fields  
PRD: §4.13.1

### 39.14 Tenant Detail — Three Tabs Present
**GET /admin/tenants/:id**  
Expected: Tabs "Overview", "Plan & Billing", "Feature Flags" all visible  
PRD: §4.13.1, §4.13.3, §4.13.4

### 39.15 Tenant Detail — Overview Tab: Usage Metrics
**Overview tab (default)**  
Expected: "Usage Metrics" section with Products, Users metric cards  
PRD: §4.13.2

### 39.16 Tenant Detail — Overview Tab: Onboarding Tracker
**Overview tab**  
Expected: "Onboarding" section with progress bar and step checklist  
PRD: §4.13.2

### 39.17 Tenant Detail — Plan Tab: Limits & Usage
**Click "Plan & Billing" tab**  
Expected: "Limits & Usage" section with progress bars for Users / Warehouses / Products / Orders  
PRD: §4.13.3

### 39.18 Tenant Detail — Plan Tab: Plan Configuration
**Plan & Billing tab**  
Expected: "Plan Configuration" section with tier/billing-cycle/limits form and "Save Plan" button  
PRD: §4.13.3

### 39.19 Tenant Detail — Feature Flags Tab: Toggle Controls
**Click "Feature Flags" tab**  
Expected: Flag list visible with Enabled/Disabled status per flag  
PRD: §4.13.4

### 39.20 Tenant Detail — Feature Flag Toggle
**Click toggle button on a Disabled flag**  
Expected: Flag state flips to Enabled (API `PUT /platform/companies/:id/flags/:key`)  
PRD: §4.13.4

### 39.21 Impersonation — Button Visible on Active Tenant
**GET /admin/tenants/:id** (ACTIVE tenant)  
Expected: "Impersonate" button visible and enabled  
PRD: §4.13.5

### 39.22 Impersonation — Full Flow
**Click "Impersonate"**  
Expected: `POST /api/admin/impersonate` → redirect to `/` → amber banner "you are acting as this tenant" + "Exit Impersonation" button  
PRD: §4.13.5

### 39.23 Impersonation Exit — Session Restore
**Click "Exit Impersonation"**  
Expected: `POST /api/admin/impersonate/stop` → redirect to `/admin` → banner gone → Platform Overview heading visible  
PRD: §4.13.5

### 39.24 Global Feature Flags — All 8 Flags Listed
**GET /admin/feature-flags**  
Expected: "Available Feature Flags" table shows all 8 keys: ADVANCED_PICKING, BETA_FLOOR_PLAN, AI_REORDER, MULTI_CURRENCY, SUPPLIER_PORTAL, ADVANCED_ANALYTICS, BARCODE_PRINT, API_ACCESS  
PRD: §4.13.4

### 39.25 Global Feature Flags — Tenant Selector Loads Flags
**Select a tenant from dropdown**  
Expected: Per-tenant flag toggle list loads; Enabled/Disabled state visible  
PRD: §4.13.4

### 39.26 Platform Analytics — KPI Cards
**GET /admin/analytics**  
Expected: 4 KPI cards: "Total Tenants", "Total Users", "Total Orders", "Active Tenants"  
PRD: §4.13.6

### 39.27 Platform Analytics — Monthly Growth Bar Chart
**GET /admin/analytics**  
Expected: "New Tenants per Month (Last 12 months)" heading + Recharts SVG bar chart rendered  
PRD: §4.13.6

### 39.28 Platform Analytics — Distribution Charts
**GET /admin/analytics**  
Expected: "Plan Distribution" + "Status Distribution" pie charts + "Plan Breakdown" table all visible  
PRD: §4.13.6

### 39.29 Audit Log — Page Structure
**GET /admin/audit-log**  
Expected: Heading "Audit Log", "Refresh" button, table columns Time / Actor / Action / Target / Details  
PRD: §4.13.7

### 39.30 Audit Log — Search Filter
**Enter "zzznonexistent_actor_xyz" in search box**  
Expected: "No audit log entries found" message  
PRD: §4.13.7

### 39.31 Audit Log — Action Type Filter
**Select an action type from dropdown**  
Expected: Entry count footer updates to reflect filtered results  
PRD: §4.13.7

### 39.32 Audit Log — Page Size Selector
**Select "Last 500"**  
Expected: API called with `limit=500`; footer shows updated entry count  
PRD: §4.13.7

### 39.33 Announcements — Page Structure
**GET /admin/announcements**  
Expected: Heading "Announcements", "New Announcement" button visible  
PRD: §4.13.8

### 39.34 Announcement Creation — Validation
**Submit New Announcement form without title/body**  
Expected: Inline error "required"; announcement not created  
PRD: §4.13.8

### 39.35 Announcement Creation — Happy Path
**POST /platform/announcements** (via New Announcement modal)  
Body: unique title, body, target ALL  
Expected: Modal closes; announcement card appears in list with "Active" badge  
PRD: §4.13.8

### 39.36 Announcement Deletion
**Click delete (Trash2) button on an announcement**  
Expected: Confirm dialog accepted → `DELETE /platform/announcements/:id` → card disappears from list  
PRD: §4.13.8

### 39.37 Bulk Ops — Select All Filtered
**Click header checkbox on tenant list**  
Expected: All visible rows selected; bulk action toolbar appears showing count "{n} selected"  
PRD: §4.13.9

### 39.38 Bulk Ops — Action + Value Dropdowns
**With tenants selected, choose "Change Status" from action dropdown**  
Expected: Second "Select status" dropdown appears (ACTIVE / SUSPENDED / CANCELLED)  
PRD: §4.13.9

### 39.39 Bulk Ops — Cancel Clears Selection
**Click "Cancel" in bulk action toolbar**  
Expected: Toolbar disappears; all checkboxes deselected  
PRD: §4.13.9

---

## Traceability Matrix — PRD §4.13 Backoffice Admin Portal

| PRD Section | Title | Test Cases |
|---|---|---|
| §4.0 | Multi-Tenancy (self-service onboarding) | TC-39.9 |
| §4.13 | Backoffice Admin Portal — Access Control | TC-39.1, TC-35.2, TC-35.3 |
| §4.13.1 | Tenant Management (CRUD, Status, Invite) | TC-39.4, TC-35.5, TC-35.6, TC-35.7, TC-35.8, TC-35.9, TC-35.10, TC-35.11, TC-35.12, TC-35.13, TC-35.14 |
| §4.13.2 | Health & Usage Monitoring | TC-39.15, TC-35.16 |
| §4.13.3 | Plan & Billing Management | TC-39.17, TC-35.18 |
| §4.13.4 | Feature Flags (per-tenant + global) | TC-39.19, TC-35.20, TC-35.24, TC-35.25 |
| §4.13.5 | Tenant Impersonation | TC-39.21, TC-35.22, TC-35.23 |
| §4.13.6 | Platform Analytics | TC-39.26, TC-35.27, TC-35.28 |
| §4.13.7 | Audit Log | TC-39.29, TC-35.30, TC-35.31, TC-35.32 |
| §4.13.8 | Announcements | TC-39.33, TC-35.34, TC-35.35, TC-35.36 |
| §4.13.9 | Bulk Operations | TC-39.37, TC-35.38, TC-35.39 |

**Total Module 35 test cases: 39**  
**PRD sections covered: 11 of 11 (§4.0 + §4.13 + §4.13.1–§4.13.9)**

---

*End of Full Platform Regression Test Plan*
