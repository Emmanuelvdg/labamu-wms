/**
 * test-utils.ts — Shared test framework and API helpers
 * Used by all test scripts in this directory.
 */

import { PrismaClient } from '@labamu/database';

export const API_URL = process.env.API_URL ?? 'http://localhost:3001';
export const prisma = new PrismaClient();

// ─── Console colours ──────────────────────────────────────────────────────────
const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    grey:   '\x1b[90m',
    blue:   '\x1b[34m',
};

// ─── Test state ───────────────────────────────────────────────────────────────
export const results: { suite: string; name: string; passed: boolean; error?: string }[] = [];
let currentSuite = 'General';

// ─── Framework ────────────────────────────────────────────────────────────────
export function describe(suiteName: string, fn: () => void | Promise<void>) {
    currentSuite = suiteName;
    console.log(`\n${C.bold}${C.blue}▶ ${suiteName}${C.reset}`);
    return fn();
}

export async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        results.push({ suite: currentSuite, name, passed: true });
        console.log(`  ${C.green}✓${C.reset} ${name}`);
    } catch (e: any) {
        const msg = e?.message ?? String(e);
        results.push({ suite: currentSuite, name, passed: false, error: msg });
        console.log(`  ${C.red}✗${C.reset} ${name}`);
        console.log(`    ${C.red}${msg}${C.reset}`);
    }
}

export function printSummary() {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total  = results.length;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${C.bold}Results: ${C.green}${passed} passed${C.reset}${C.bold}, ${failed > 0 ? C.red : C.grey}${failed} failed${C.reset}${C.bold}, ${total} total${C.reset}`);

    if (failed > 0) {
        console.log(`\n${C.red}${C.bold}Failures:${C.reset}`);
        for (const r of results.filter(r => !r.passed)) {
            console.log(`  ${C.red}✗${C.reset} [${r.suite}] ${r.name}`);
            console.log(`    ${C.grey}${r.error}${C.reset}`);
        }
    }
    console.log('');
    return failed;
}

// ─── Assertions ───────────────────────────────────────────────────────────────
export function expect(actual: any) {
    return {
        toBe(expected: any) {
            if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toEqual(expected: any) {
            if (JSON.stringify(actual) !== JSON.stringify(expected))
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toBeOneOf(values: any[]) {
            if (!values.includes(actual)) throw new Error(`Expected one of [${values.join(', ')}], got ${JSON.stringify(actual)}`);
        },
        toContain(value: any) {
            if (!actual?.includes?.(value) && !actual?.some?.((v: any) => v === value))
                throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(value)}`);
        },
        toBeGreaterThan(n: number) {
            if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
        },
        toBeGreaterThanOrEqual(n: number) {
            if (!(actual >= n)) throw new Error(`Expected ${actual} >= ${n}`);
        },
        toBeLessThan(n: number) {
            if (!(actual < n)) throw new Error(`Expected ${actual} < ${n}`);
        },
        toBeLessThanOrEqual(n: number) {
            if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
        },
        toBeTruthy() {
            if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
        },
        toBeFalsy() {
            if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
        },
        toBeDefined() {
            if (actual === undefined || actual === null)
                throw new Error(`Expected defined value, got ${actual}`);
        },
        toHaveProperty(key: string) {
            if (!(key in Object(actual))) throw new Error(`Expected object to have property "${key}"`);
        },
    };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
let _adminUser: { id: string; email: string } | null = null;

export async function getAdminUser() {
    if (_adminUser) return _adminUser;
    const user = await prisma.user.findFirst({ where: { email: 'admin@labamu.co.id' } });
    if (!user) throw new Error('Admin user not found — run the base seed first (packages/database/prisma/seed.ts)');
    _adminUser = { id: user.id, email: user.email };
    return _adminUser;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
export async function api(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
): Promise<{ status: number; ok: boolean; data: any; text: string }> {
    const admin = await getAdminUser();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': admin.id,
        ...extraHeaders,
    };

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }

    return { status: res.status, ok: res.ok, data, text };
}

export async function apiExpect(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    expectedStatus = 200
) {
    const r = await api(method, path, body);
    if (r.status !== expectedStatus) {
        throw new Error(`${method} ${path} → HTTP ${r.status} (expected ${expectedStatus})\n    Body: ${r.text.slice(0, 300)}`);
    }
    return r.data;
}

// ─── DB lookup helpers ────────────────────────────────────────────────────────
export async function getWarehouse(name: string) {
    const wh = await prisma.warehouse.findFirst({ where: { name } });
    if (!wh) throw new Error(`Warehouse "${name}" not found — run seed-realistic-data.ts first`);
    return wh;
}

export async function getProduct(sku: string) {
    const p = await prisma.product.findUnique({ where: { sku } });
    if (!p) throw new Error(`Product "${sku}" not found — run seed-realistic-data.ts first`);
    return p;
}

export async function getPurchaseOrder(poNumber: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { poNumber } });
    if (!po) throw new Error(`Purchase order "${poNumber}" not found`);
    return po;
}

export async function getLocation(name: string, warehouseId: string) {
    const loc = await prisma.location.findFirst({ where: { name, warehouseId } });
    if (!loc) throw new Error(`Location "${name}" in warehouse ${warehouseId} not found`);
    return loc;
}

export async function getLocationByCode(code: string, warehouseId: string) {
    const loc = await prisma.location.findFirst({ where: { code, warehouseId } });
    if (!loc) throw new Error(`Location code "${code}" in warehouse ${warehouseId} not found`);
    return loc;
}

// ─── Server connectivity check ────────────────────────────────────────────────
export async function checkServerReachable() {
    try {
        const res = await fetch(`${API_URL}/inventory/warehouses`, { signal: AbortSignal.timeout(3000) });
        return res.ok || res.status < 500;
    } catch {
        return false;
    }
}

export async function requireServer() {
    const ok = await checkServerReachable();
    if (!ok) {
        console.error(`\n${C.red}${C.bold}✗ API server not reachable at ${API_URL}${C.reset}`);
        console.error(`  Start it with: cd apps/api && npm run dev\n`);
        process.exit(1);
    }
}
