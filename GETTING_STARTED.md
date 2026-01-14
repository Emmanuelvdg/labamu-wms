# Getting Started with Labamu IMS

Welcome to Labamu Inventory Management System (IMS). This guide outlines the recommended sequence of activities to set up your environment and start using the platform effectively.

## 1. Initial Setup

### Login
- Access the application at the provided URL (e.g., `http://localhost:3000`).
- Login with your administrator credentials (e.g., `admin@labamu.co.id`).

### Dashboard
- Upon login, you will land on the **Dashboard**. This provides a high-level overview of your inventory value, low stock alerts, and recent activity.

---

## 2. Organization Structure (The Foundation)

Before adding products, you must define *where* they will be stored.

### Create a Warehouse
1.  Navigate to **Inventory > Warehouses**.
2.  Click **+ Add Warehouse**.
3.  Enter details (Name, Code, Address) and Save.
    *   *Tip: A "View" and "Stock" location are automatically created for each warehouse.*

### Define Storage Locations
Create a hierarchy to organize your physical space (e.g., Warehouse -> Zone -> Aisle -> Shelf).
1.  Navigate to **Inventory > Locations**.
2.  Click **+ Add Location**.
3.  Select the **Parent Location** (e.g., the Warehouse you just created).
4.  Define the **Type** (View, Internal, Customer, Vendor) and **Structural Type** (Room, Row, Shelf).

---

## 3. Product Catalog

### Manage Categories
1.  Navigate to **Settings > Categories**.
2.  Create categories (e.g., "Electronics", "Raw Materials") to organize your items.

### Create Products
1.  Navigate to **Inventory > Products**.
2.  Click **+ New Item**.
3.  Fill in the details:
    *   **SKU**: Unique identifier.
    *   **Name**: Product name.
    *   **Category**: Select from the list.
    *   **Unit of Measure**: e.g., Piece, kg, Liter.
    *   **Tracking**: None, By Lot, or By Serial Number.
4.  Save the product.

---

## 4. Initializing Inventory

Once products and locations exist, you can add stock.

### Opening Stock (Add Batch)
1.  Go to **Inventory > Products** and select a product.
2.  Go to the **Stock Batches** tab.
3.  Click **+ Add Batch**.
4.  Enter the Quantity, Cost per Unit, and select the specific **Storage Location**.

### Inventory Adjustments
Use this for corrections (shrinkage, damage, found stock).
1.  Navigate to **Inventory > Adjustments**.
2.  Create a new adjustment for a specific location and product.
3.  **Apply** the adjustment to update stock levels.

---

## 5. Sales & Fulfillment Flow

### Create a Customer
1.  Navigate to **Partners > Customers**.
2.  Add a new customer profile.

### Create a Sales Order
1.  Navigate to **Orders > Sales Orders**.
2.  Click **+ New Order**.
3.  Select the Customer and add Items (Products & Quantities).
4.  Select a **Delivery Method**.
5.  **Confirm** the order. Status becomes `PENDING`.

### Allocated Stock
1.  Open the confirmed Order.
2.  Click **Check Availability**.
3.  The system reserves stock from the best available location. Status updates to `RESERVED` or `ALLOCATED`.

### Picking & Shipping
1.  Navigate to **Operations > Picking**.
2.  Create a **Picking Session** for your warehouse.
3.  The system generates tasks for all allocated orders.
4.  Execute tasks (mark items as picked) and **Complete** the session.
5.  The Order is now ready to ship available stock.

---

## 6. Procurement (Restocking)

1.  Navigate to **Purchasing > Purchase Orders**.
2.  Create a new PO for a Vendor.
3.  **Confirm** the order.
4.  **Receive Products**: When goods arrive, process the receipt to add them to inventory.

---

## 7. Reports
Check **Reporting** for:
-   **Inventory Valuation**: Total value of stock on hand.
-   **Stock Moves**: Detailed history of all goods movements.
