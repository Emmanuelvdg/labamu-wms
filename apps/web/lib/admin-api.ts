/**
 * Admin API helpers — all calls require ALL:MANAGE permission.
 * Backed by the /companies/* endpoints on the NestJS API.
 */
import { fetchWithRetry, API_URL } from './api';

// ── Tenants ─────────────────────────────────────────────────────────────────

export function fetchTenants() {
    return fetchWithRetry(`${API_URL}/admin/companies`);
}

export function getTenant(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}`);
}

export function registerTenant(data: {
    name: string;
    slug: string;
    plan: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}) {
    return fetchWithRetry(`${API_URL}/companies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function updateTenant(id: string, data: { name?: string; slug?: string; plan?: string }) {
    return fetchWithRetry(`${API_URL}/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    return fetchWithRetry(`${API_URL}/companies/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
}

export function inviteUserToTenant(companyId: string, data: { name: string; email: string; password: string }) {
    return fetchWithRetry(`${API_URL}/companies/${companyId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// ── Metrics (Phase 2) ────────────────────────────────────────────────────────

export function getTenantMetrics(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/metrics`);
}

// ── Health (Phase 3) ─────────────────────────────────────────────────────────

export function getTenantHealth(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/health`);
}

// ── Onboarding (Phase 4) ─────────────────────────────────────────────────────

export function getTenantOnboarding(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/onboarding`);
}

// ── Plan & Limits (Phase 5) ──────────────────────────────────────────────────

export function getTenantPlan(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/plan`);
}

export function getTenantLimits(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/plan/limits`);
}

export function upsertTenantPlan(id: string, data: Record<string, any>) {
    return fetchWithRetry(`${API_URL}/companies/${id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// ── Audit Log (Phase 6) ──────────────────────────────────────────────────────

export function getAuditLog(limit = 200) {
    return fetchWithRetry(`${API_URL}/platform/audit-log?limit=${limit}`);
}

// ── Impersonation (Phase 6) ───────────────────────────────────────────────────

export function impersonateTenant(id: string) {
    return fetchWithRetry(`${API_URL}/companies/${id}/impersonate`, { method: 'POST' });
}

// ── Feature Flags (Phase 7) ───────────────────────────────────────────────────

export function getAvailableFlags() {
    return fetchWithRetry(`${API_URL}/admin/companies/feature-flags/available`);
}

export function getTenantFlags(id: string) {
    return fetchWithRetry(`${API_URL}/admin/companies/${id}/feature-flags`);
}

export function setTenantFlag(id: string, key: string, enabled: boolean, notes?: string) {
    return fetchWithRetry(`${API_URL}/admin/companies/${id}/feature-flags/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, notes }),
    });
}

export function getAiReorderReadiness(companyId: string) {
    return fetchWithRetry(`${API_URL}/replenishment/forecast/readiness?companyId=${companyId}`);
}

// ── Platform Analytics (Phase 8) ─────────────────────────────────────────────

export function getPlatformAnalytics() {
    return fetchWithRetry(`${API_URL}/platform/analytics`);
}

// ── Announcements (Phase 9) ───────────────────────────────────────────────────

export function listAnnouncements() {
    return fetchWithRetry(`${API_URL}/platform/announcements`);
}

export function createAnnouncement(data: {
    title: string;
    body: string;
    targetType?: string;
    targetValue?: string;
    startsAt?: string;
    endsAt?: string;
}) {
    return fetchWithRetry(`${API_URL}/platform/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export function deleteAnnouncement(id: string) {
    return fetchWithRetry(`${API_URL}/platform/announcements/${id}`, { method: 'DELETE' });
}

// ── Bulk Operations (Phase 9) ─────────────────────────────────────────────────

export function bulkStatusChange(companyIds: string[], status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    return fetchWithRetry(`${API_URL}/companies/bulk/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds, status }),
    });
}

export function bulkPlanChange(companyIds: string[], plan: string) {
    return fetchWithRetry(`${API_URL}/companies/bulk/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds, plan }),
    });
}
