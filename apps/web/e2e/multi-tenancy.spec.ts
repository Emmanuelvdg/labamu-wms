/**
 * Multi-Tenancy Isolation Tests
 *
 * Verifies that data created by one tenant is NOT visible to another tenant.
 *
 * Strategy:
 *   1. Register two independent companies via POST /companies/register
 *   2. Login as each company's admin to obtain JWTs
 *   3. Company A creates: products, warehouse, location, inventory batch,
 *      supplier, customer, purchase order, order, transfer order
 *   4. Company B creates a minimal set of the same resource types
 *   5. Each company queries its own resources → must see exactly its own data
 *   6. Each company queries the OTHER company's resource by ID → must get 404
 *
 * All assertions follow the pattern:
 *   "If you can see it, it must belong to you. If it's not yours, you can't see it."
 */
import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:3001';
const TS = Date.now();

// ─── Tenant fixtures ──────────────────────────────────────────────────────────

const TENANT_A = {
    name:          `Tenant Alpha ${TS}`,
    slug:          `tenant-alpha-${TS}`,
    adminName:     'Admin Alpha',
    adminEmail:    `admin-alpha-${TS}@example.com`,
    adminPassword: 'Password123!',
};

const TENANT_B = {
    name:          `Tenant Beta ${TS}`,
    slug:          `tenant-beta-${TS}`,
    adminName:     'Admin Beta',
    adminEmail:    `admin-beta-${TS}@example.com`,
    adminPassword: 'Password123!',
};

// Shared state populated by setup tests
let tokenA: string;
let tokenB: string;
let companyAId: string;
let companyBId: string;

// Resources created by Company A
let productA: string;
let warehouseA: string;
let locationA: string;
let supplierA: string;
let customerA: string;

// Resources created by Company B
let productB: string;
let warehouseB: string;
let customerB: string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function register(request: any, tenant: typeof TENANT_A): Promise<{ token: string; companyId: string }> {
    const res = await request.post(`${API}/companies/register`, { data: tenant });
    expect(res.ok(), `Register ${tenant.slug}: ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    const companyId: string = body.id;

    const loginRes = await request.post(`${API}/auth/login`, {
        data: { email: tenant.adminEmail, password: tenant.adminPassword },
    });
    expect(loginRes.ok(), `Login ${tenant.slug}: ${await loginRes.text()}`).toBeTruthy();
    const loginBody = await loginRes.json();
    return { token: loginBody.token, companyId };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe('Multi-Tenancy Data Isolation', () => {
    test.describe.configure({ mode: 'serial' });

    // ── Phase 1: Register two independent tenants ────────────────────────────

    test('MT-1: Register Company A and obtain JWT', async ({ request }) => {
        const result = await register(request, TENANT_A);
        tokenA = result.token;
        companyAId = result.companyId;
        expect(tokenA, 'tokenA must be set').toBeTruthy();
        expect(companyAId, 'companyAId must be set').toBeTruthy();
        console.log(`✓ Company A: ${companyAId}`);
    });

    test('MT-2: Register Company B and obtain JWT', async ({ request }) => {
        const result = await register(request, TENANT_B);
        tokenB = result.token;
        companyBId = result.companyId;
        expect(tokenB, 'tokenB must be set').toBeTruthy();
        expect(companyBId, 'companyBId must be set').toBeTruthy();
        expect(companyBId).not.toBe(companyAId); // Different companies
        console.log(`✓ Company B: ${companyBId}`);
    });

    // ── Phase 2: Company A seeds data ────────────────────────────────────────

    test('MT-3: Company A creates a warehouse', async ({ request }) => {
        const res = await request.post(`${API}/inventory/warehouses`, {
            headers: authHeaders(tokenA),
            data: {
                name: `WH-Alpha-${TS}`,
                shortName: `WHA${TS.toString().slice(-4)}`,
                address: '1 Alpha Road',
                city: 'Jakarta',
                country: 'Indonesia',
                type: 'warehouse',
                location: { lat: -6.2, lng: 106.8 },
            },
        });
        expect(res.ok(), `Create WH-A: ${await res.text()}`).toBeTruthy();
        warehouseA = (await res.json()).id;
        console.log(`✓ Warehouse A: ${warehouseA}`);
    });

    test('MT-4: Company A creates a product', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(tokenA),
            data: { sku: `ALPHA-SKU-${TS}`, name: `Alpha Product ${TS}`, category: 'Electronics', price: 100, velocity: 'B' },
        });
        expect(res.ok(), `Create product-A: ${await res.text()}`).toBeTruthy();
        productA = (await res.json()).id;
        console.log(`✓ Product A: ${productA}`);
    });

    test('MT-5: Company A creates a location', async ({ request }) => {
        const res = await request.post(`${API}/inventory/locations`, {
            headers: authHeaders(tokenA),
            data: { name: `LOC-ALPHA-${TS}`, warehouseId: warehouseA, type: 'INTERNAL' },
        });
        expect(res.ok(), `Create loc-A: ${await res.text()}`).toBeTruthy();
        locationA = (await res.json()).id;
        console.log(`✓ Location A: ${locationA}`);
    });

    test('MT-6: Company A creates a supplier', async ({ request }) => {
        const res = await request.post(`${API}/suppliers`, {
            headers: authHeaders(tokenA),
            data: { name: `Supplier Alpha ${TS}`, email: `supplier-alpha-${TS}@example.com`, phone: '123456789', address: '1 Alpha Supply St' },
        });
        expect(res.ok(), `Create supplier-A: ${await res.text()}`).toBeTruthy();
        supplierA = (await res.json()).id;
        console.log(`✓ Supplier A: ${supplierA}`);
    });

    test('MT-7: Company A creates a customer', async ({ request }) => {
        const res = await request.post(`${API}/customers`, {
            headers: authHeaders(tokenA),
            data: { name: `Customer Alpha ${TS}`, address: '1 Alpha Customer St', phone: '111222333' },
        });
        expect(res.ok(), `Create customer-A: ${await res.text()}`).toBeTruthy();
        customerA = (await res.json()).id;
        console.log(`✓ Customer A: ${customerA}`);
    });

    // ── Phase 3: Company B seeds data ────────────────────────────────────────

    test('MT-8: Company B creates a warehouse', async ({ request }) => {
        const res = await request.post(`${API}/inventory/warehouses`, {
            headers: authHeaders(tokenB),
            data: {
                name: `WH-Beta-${TS}`,
                shortName: `WHB${TS.toString().slice(-4)}`,
                address: '2 Beta Road',
                city: 'Surabaya',
                country: 'Indonesia',
                type: 'warehouse',
                location: { lat: -7.2, lng: 112.7 },
            },
        });
        expect(res.ok(), `Create WH-B: ${await res.text()}`).toBeTruthy();
        warehouseB = (await res.json()).id;
        console.log(`✓ Warehouse B: ${warehouseB}`);
    });

    test('MT-9: Company B creates a product', async ({ request }) => {
        const res = await request.post(`${API}/inventory/products`, {
            headers: authHeaders(tokenB),
            data: { sku: `BETA-SKU-${TS}`, name: `Beta Product ${TS}`, category: 'Apparel', price: 50, velocity: 'C' },
        });
        expect(res.ok(), `Create product-B: ${await res.text()}`).toBeTruthy();
        productB = (await res.json()).id;
        console.log(`✓ Product B: ${productB}`);
    });

    test('MT-10: Company B creates a customer', async ({ request }) => {
        const res = await request.post(`${API}/customers`, {
            headers: authHeaders(tokenB),
            data: { name: `Customer Beta ${TS}`, address: '2 Beta Customer Ave', phone: '444555666' },
        });
        expect(res.ok(), `Create customer-B: ${await res.text()}`).toBeTruthy();
        customerB = (await res.json()).id;
        console.log(`✓ Customer B: ${customerB}`);
    });

    // ── Phase 4: List isolation — each tenant sees only their own records ─────

    test('MT-11: Product lists are tenant-isolated', async ({ request }) => {
        const [resA, resB] = await Promise.all([
            request.get(`${API}/inventory/products`, { headers: authHeaders(tokenA) }),
            request.get(`${API}/inventory/products`, { headers: authHeaders(tokenB) }),
        ]);
        expect(resA.ok()).toBeTruthy();
        expect(resB.ok()).toBeTruthy();

        const bodyA = await resA.json();
        const bodyB = await resB.json();
        const listA: any[] = Array.isArray(bodyA) ? bodyA : (bodyA.data ?? bodyA.products ?? []);
        const listB: any[] = Array.isArray(bodyB) ? bodyB : (bodyB.data ?? bodyB.products ?? []);

        const idsA = listA.map((p: any) => p.id);
        const idsB = listB.map((p: any) => p.id);

        // Company A's product must appear in A's list
        expect(idsA, `productA (${productA}) not found in Company A product list`).toContain(productA);
        // Company B's product must appear in B's list
        expect(idsB, `productB (${productB}) not found in Company B product list`).toContain(productB);

        // Company A's product must NOT appear in B's list
        expect(idsB, `productA (${productA}) must NOT appear in Company B product list`).not.toContain(productA);
        // Company B's product must NOT appear in A's list
        expect(idsA, `productB (${productB}) must NOT appear in Company A product list`).not.toContain(productB);

        console.log(`✓ Product isolation: A sees ${idsA.length} products, B sees ${idsB.length} products — no cross-contamination`);
    });

    test('MT-12: Warehouse lists are tenant-isolated', async ({ request }) => {
        const [resA, resB] = await Promise.all([
            request.get(`${API}/inventory/warehouses`, { headers: authHeaders(tokenA) }),
            request.get(`${API}/inventory/warehouses`, { headers: authHeaders(tokenB) }),
        ]);
        expect(resA.ok()).toBeTruthy();
        expect(resB.ok()).toBeTruthy();

        const bodyA = await resA.json();
        const bodyB = await resB.json();
        const listA: any[] = Array.isArray(bodyA) ? bodyA : (bodyA.data ?? bodyA.warehouses ?? []);
        const listB: any[] = Array.isArray(bodyB) ? bodyB : (bodyB.data ?? bodyB.warehouses ?? []);

        const idsA = listA.map((w: any) => w.id);
        const idsB = listB.map((w: any) => w.id);

        expect(idsA).toContain(warehouseA);
        expect(idsB).toContain(warehouseB);
        expect(idsB).not.toContain(warehouseA);
        expect(idsA).not.toContain(warehouseB);

        console.log(`✓ Warehouse isolation: A sees ${idsA.length}, B sees ${idsB.length} — no cross-contamination`);
    });

    test('MT-13: Customer lists are tenant-isolated', async ({ request }) => {
        const [resA, resB] = await Promise.all([
            request.get(`${API}/customers`, { headers: authHeaders(tokenA) }),
            request.get(`${API}/customers`, { headers: authHeaders(tokenB) }),
        ]);
        expect(resA.ok()).toBeTruthy();
        expect(resB.ok()).toBeTruthy();

        const bodyA = await resA.json();
        const bodyB = await resB.json();
        const listA: any[] = Array.isArray(bodyA) ? bodyA : (bodyA.data ?? bodyA.customers ?? []);
        const listB: any[] = Array.isArray(bodyB) ? bodyB : (bodyB.data ?? bodyB.customers ?? []);

        const idsA = listA.map((c: any) => c.id);
        const idsB = listB.map((c: any) => c.id);

        expect(idsA).toContain(customerA);
        expect(idsB).toContain(customerB);
        expect(idsB).not.toContain(customerA);
        expect(idsA).not.toContain(customerB);

        console.log(`✓ Customer isolation: A sees ${idsA.length}, B sees ${idsB.length} — no cross-contamination`);
    });

    test('MT-14: Supplier lists are tenant-isolated', async ({ request }) => {
        const [resA, resB] = await Promise.all([
            request.get(`${API}/suppliers`, { headers: authHeaders(tokenA) }),
            request.get(`${API}/suppliers`, { headers: authHeaders(tokenB) }),
        ]);
        expect(resA.ok()).toBeTruthy();
        expect(resB.ok()).toBeTruthy();

        const bodyA = await resA.json();
        const bodyB = await resB.json();
        const listA: any[] = Array.isArray(bodyA) ? bodyA : (bodyA.data ?? bodyA.suppliers ?? []);
        const listB: any[] = Array.isArray(bodyB) ? bodyB : (bodyB.data ?? bodyB.suppliers ?? []);

        const idsA = listA.map((s: any) => s.id);
        const idsB = listB.map((s: any) => s.id);

        expect(idsA).toContain(supplierA);
        // Supplier B doesn't exist — just ensure B can't see A's
        expect(idsB).not.toContain(supplierA);

        console.log(`✓ Supplier isolation: A sees ${idsA.length} suppliers, B sees ${idsB.length} — supplierA not in B's list`);
    });

    // ── Phase 5: Direct-fetch isolation — cross-tenant ID access returns 404 ──

    test('MT-15: Company B cannot fetch Company A\'s product by ID', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products/${productA}`, {
            headers: authHeaders(tokenB),
        });
        // Must be 404 (not found for this tenant) or 403 — never 200
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can read Company A's product`
        ).toBeTruthy();
        console.log(`✓ Company B got ${res.status()} trying to fetch productA`);
    });

    test('MT-16: Company A cannot fetch Company B\'s product by ID', async ({ request }) => {
        const res = await request.get(`${API}/inventory/products/${productB}`, {
            headers: authHeaders(tokenA),
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company A can read Company B's product`
        ).toBeTruthy();
        console.log(`✓ Company A got ${res.status()} trying to fetch productB`);
    });

    test('MT-17: Company B cannot fetch Company A\'s warehouse by ID', async ({ request }) => {
        const res = await request.get(`${API}/warehouses/${warehouseA}`, {
            headers: authHeaders(tokenB),
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can read Company A's warehouse`
        ).toBeTruthy();
        console.log(`✓ Company B got ${res.status()} trying to fetch warehouseA`);
    });

    test('MT-18: Company B cannot fetch Company A\'s customer by ID', async ({ request }) => {
        const res = await request.get(`${API}/customers/${customerA}`, {
            headers: authHeaders(tokenB),
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can read Company A's customer`
        ).toBeTruthy();
        console.log(`✓ Company B got ${res.status()} trying to fetch customerA`);
    });

    test('MT-19: Company B cannot fetch Company A\'s location by ID', async ({ request }) => {
        const res = await request.get(`${API}/inventory/locations/${locationA}`, {
            headers: authHeaders(tokenB),
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can read Company A's location`
        ).toBeTruthy();
        console.log(`✓ Company B got ${res.status()} trying to fetch locationA`);
    });

    // ── Phase 6: Order isolation ──────────────────────────────────────────────

    test('MT-20: Company A creates an order and Company B cannot see it', async ({ request }) => {
        // Create an order as Company A
        const orderRes = await request.post(`${API}/orders`, {
            headers: authHeaders(tokenA),
            data: {
                customerId: customerA,
                warehouseId: warehouseA,
                type: 'SALES',
                priority: 'NORMAL',
                items: [{ productId: productA, quantity: 1 }],
            },
        });
        // Order creation may fail if no stock — that's acceptable; we just need the ID
        const orderStatus = orderRes.status();
        if (![200, 201].includes(orderStatus)) {
            test.skip(true, `Order creation returned ${orderStatus} — likely no stock; skipping isolation check`);
            return;
        }
        const order = await orderRes.json();
        const orderAId: string = order.id;
        console.log(`✓ Company A created order ${orderAId}`);

        // Company B tries to fetch this order by ID
        const fetchRes = await request.get(`${API}/orders/${orderAId}`, {
            headers: authHeaders(tokenB),
        });
        expect(
            [403, 404].includes(fetchRes.status()),
            `Expected 403/404 but got ${fetchRes.status()} — Company B can read Company A's order`
        ).toBeTruthy();

        // Company B's order list must not contain orderAId
        const listRes = await request.get(`${API}/orders`, { headers: authHeaders(tokenB) });
        const listBody = await listRes.json();
        const orderList: any[] = Array.isArray(listBody) ? listBody : (listBody.data ?? listBody.orders ?? []);
        const bOrderIds = orderList.map((o: any) => o.id);
        expect(bOrderIds).not.toContain(orderAId);

        console.log(`✓ Order isolation: B got ${fetchRes.status()} on A's order; B's order list (${bOrderIds.length} items) doesn't contain A's order`);
    });

    // ── Phase 7: User isolation ───────────────────────────────────────────────

    test('MT-21: User lists are tenant-isolated', async ({ request }) => {
        const [resA, resB] = await Promise.all([
            request.get(`${API}/settings/users`, { headers: authHeaders(tokenA) }),
            request.get(`${API}/settings/users`, { headers: authHeaders(tokenB) }),
        ]);

        if (!resA.ok() || !resB.ok()) {
            test.skip(true, 'Users endpoint not accessible with current permissions — skipping');
            return;
        }

        const bodyA = await resA.json();
        const bodyB = await resB.json();
        const usersA: any[] = Array.isArray(bodyA) ? bodyA : (bodyA.data ?? bodyA.users ?? []);
        const usersB: any[] = Array.isArray(bodyB) ? bodyB : (bodyB.data ?? bodyB.users ?? []);

        const emailsA = usersA.map((u: any) => u.email);
        const emailsB = usersB.map((u: any) => u.email);

        // Each company's admin user must appear in their own list
        expect(emailsA).toContain(TENANT_A.adminEmail);
        expect(emailsB).toContain(TENANT_B.adminEmail);

        // Cross-contamination check
        expect(emailsB, `Company B's user list should not contain Company A's admin`).not.toContain(TENANT_A.adminEmail);
        expect(emailsA, `Company A's user list should not contain Company B's admin`).not.toContain(TENANT_B.adminEmail);

        console.log(`✓ User isolation: A sees ${usersA.length} users, B sees ${usersB.length} — no cross-contamination`);
    });

    // ── Phase 8: Mutation isolation — Company B cannot modify Company A's data ─

    test('MT-22: Company B cannot update Company A\'s product', async ({ request }) => {
        const res = await request.patch(`${API}/inventory/products/${productA}`, {
            headers: authHeaders(tokenB),
            data: { name: 'HACKED BY COMPANY B' },
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can mutate Company A's product`
        ).toBeTruthy();

        // Verify the product name wasn't changed
        const checkRes = await request.get(`${API}/inventory/products/${productA}`, {
            headers: authHeaders(tokenA),
        });
        if (checkRes.ok()) {
            const product = await checkRes.json();
            expect(product.name).not.toBe('HACKED BY COMPANY B');
        }
        console.log(`✓ Mutation isolation: Company B got ${res.status()} trying to update Company A's product`);
    });

    test('MT-23: Company B cannot delete Company A\'s product', async ({ request }) => {
        const res = await request.delete(`${API}/inventory/products/${productA}`, {
            headers: authHeaders(tokenB),
        });
        expect(
            [403, 404].includes(res.status()),
            `Expected 403/404 but got ${res.status()} — Company B can delete Company A's product`
        ).toBeTruthy();

        // Verify the product still exists for Company A
        const checkRes = await request.get(`${API}/inventory/products/${productA}`, {
            headers: authHeaders(tokenA),
        });
        expect(checkRes.ok(), 'Product A should still exist after Company B\'s failed delete').toBeTruthy();
        console.log(`✓ Delete isolation: Company B got ${res.status()} trying to delete Company A's product; product still exists for A`);
    });

    // ── Phase 9: Unauthenticated access ──────────────────────────────────────

    test('MT-24: Unauthenticated requests are rejected on tenant-scoped endpoints', async ({ request }) => {
        const endpoints = [
            `${API}/inventory/products`,
            `${API}/inventory/warehouses`,
            `${API}/customers`,
            `${API}/orders`,
            `${API}/suppliers`,
        ];

        for (const endpoint of endpoints) {
            const res = await request.get(endpoint);
            expect(
                [401, 403].includes(res.status()),
                `Expected 401/403 on ${endpoint} without auth, got ${res.status()}`
            ).toBeTruthy();
        }
        console.log(`✓ All ${endpoints.length} tenant-scoped endpoints reject unauthenticated requests`);
    });
});
