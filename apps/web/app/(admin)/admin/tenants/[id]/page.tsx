'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getTenant, getTenantMetrics, getTenantOnboarding, getTenantHealth,
    getTenantPlan, getTenantLimits, getTenantFlags, setTenantFlag, upsertTenantPlan,
} from '@/lib/admin-api';
import Link from 'next/link';
import {
    ArrowLeft, Users, Building2, Package, Truck, ShoppingCart,
    Warehouse, CheckCircle2, Circle, Activity, UserCog, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const planBadge: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-600',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
};
const statusBadge: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
};

type MetricCard = { label: string; key: string; icon: any; color: string };
const metricCards: MetricCard[] = [
    { label: 'Warehouses', key: 'warehouseCount', icon: Warehouse, color: 'text-slate-600 bg-slate-50' },
    { label: 'Products',   key: 'productCount',   icon: Package,   color: 'text-blue-600 bg-blue-50' },
    { label: 'Suppliers',  key: 'supplierCount',  icon: Truck,     color: 'text-purple-600 bg-purple-50' },
    { label: 'Customers',  key: 'customerCount',  icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
    { label: 'Users',      key: 'userCount',      icon: Users,     color: 'text-green-600 bg-green-50' },
    { label: 'Orders',     key: 'orderCount',     icon: Building2, color: 'text-rose-600 bg-rose-50' },
];

type Tab = 'overview' | 'plan' | 'flags';

export default function TenantDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('overview');

    // Overview data
    const [tenant, setTenant] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [onboarding, setOnboarding] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Plan tab
    const [plan, setPlan] = useState<any>(null);
    const [limits, setLimits] = useState<any>(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planForm, setPlanForm] = useState<Record<string, any>>({});
    const [savingPlan, setSavingPlan] = useState(false);

    // Flags tab
    const [flags, setFlags] = useState<any[]>([]);
    const [flagsLoading, setFlagsLoading] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);

    // Impersonation
    const [impersonating, setImpersonating] = useState(false);

    useEffect(() => {
        Promise.all([getTenant(id), getTenantMetrics(id), getTenantOnboarding(id), getTenantHealth(id)])
            .then(([t, m, o, h]) => { setTenant(t); setMetrics(m); setOnboarding(o); setHealth(h); })
            .catch((e: any) => setError(e.message || 'Failed to load tenant'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (tab === 'plan' && !plan) {
            setPlanLoading(true);
            Promise.all([getTenantPlan(id), getTenantLimits(id)])
                .then(([p, l]) => {
                    setPlan(p);
                    setLimits(l);
                    setPlanForm({
                        tier: p.tier ?? '',
                        billingCycle: p.billingCycle ?? 'MONTHLY',
                        maxUsers: p.maxUsers ?? '',
                        maxWarehouses: p.maxWarehouses ?? '',
                        maxProducts: p.maxProducts ?? '',
                        maxOrders: p.maxOrders ?? '',
                        trialEndsAt: p.trialEndsAt ? p.trialEndsAt.slice(0, 10) : '',
                        notes: p.notes ?? '',
                    });
                })
                .catch((e: any) => setError(e.message || 'Failed to load plan'))
                .finally(() => setPlanLoading(false));
        }
    }, [tab]);

    useEffect(() => {
        if (tab === 'flags' && flags.length === 0) {
            setFlagsLoading(true);
            getTenantFlags(id)
                .then((f: any[]) => setFlags(Array.isArray(f) ? f : []))
                .catch((e: any) => setError(e.message || 'Failed to load flags'))
                .finally(() => setFlagsLoading(false));
        }
    }, [tab]);

    const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
        setToggling(key);
        try {
            await setTenantFlag(id, key, !currentEnabled);
            setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentEnabled } : f));
        } catch (e: any) {
            alert(e.message || 'Failed to toggle flag');
        } finally {
            setToggling(null);
        }
    };

    const handleSavePlan = async () => {
        setSavingPlan(true);
        try {
            const payload: any = { ...planForm };
            if (payload.trialEndsAt) payload.trialEndsAt = new Date(payload.trialEndsAt).toISOString();
            else delete payload.trialEndsAt;
            if (payload.maxUsers) payload.maxUsers = Number(payload.maxUsers);
            if (payload.maxWarehouses) payload.maxWarehouses = Number(payload.maxWarehouses);
            if (payload.maxProducts) payload.maxProducts = Number(payload.maxProducts);
            if (payload.maxOrders) payload.maxOrders = Number(payload.maxOrders);
            const updated = await upsertTenantPlan(id, payload);
            setPlan(updated);
            // Reload limits
            getTenantLimits(id).then(setLimits).catch(() => {});
            alert('Plan saved');
        } catch (e: any) {
            alert(e.message || 'Failed to save plan');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleImpersonate = async () => {
        setImpersonating(true);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: id }),
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Impersonation failed');
                return;
            }
            router.push('/');
        } catch (e: any) {
            alert(e.message || 'Impersonation failed');
        } finally {
            setImpersonating(false);
        }
    };

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading...</div>;
    if (error) return <div className="p-8"><div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div></div>;
    if (!tenant) return null;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'plan', label: 'Plan & Billing' },
        { key: 'flags', label: 'Feature Flags' },
    ];

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div>
                <Link href="/admin/tenants" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back to Tenants
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
                        <p className="text-sm text-gray-400 mt-0.5 font-mono">{tenant.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planBadge[tenant.plan] || 'bg-gray-100 text-gray-600'}`}>
                            {tenant.plan}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge[tenant.status] || 'bg-gray-100 text-gray-600'}`}>
                            {tenant.status}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleImpersonate}
                            disabled={impersonating || tenant.status !== 'ACTIVE'}
                        >
                            <UserCog className="w-3.5 h-3.5 mr-1.5" />
                            {impersonating ? 'Opening...' : 'Impersonate'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Health */}
                    {health && (
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total Users', value: health.totalUsers, icon: Users, color: 'text-slate-600 bg-slate-50' },
                                { label: 'Active (30d)', value: health.activeUserCount, icon: Activity, color: health.activeUserCount > 0 ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50' },
                                { label: 'Last Login', value: health.lastLoginAt ? new Date(health.lastLoginAt).toLocaleDateString() : 'Never', icon: Activity, color: 'text-blue-600 bg-blue-50', small: true },
                                { label: 'Days Inactive', value: health.daysSinceLastActivity ?? '—', icon: Activity, color: health.daysSinceLastActivity === null ? 'text-gray-400 bg-gray-50' : health.daysSinceLastActivity > 30 ? 'text-red-600 bg-red-50' : health.daysSinceLastActivity > 7 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50' },
                            ].map(({ label, value, icon: Icon, color, small }: any) => (
                                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs text-gray-500">{label}</span>
                                    </div>
                                    <div className={`font-bold text-gray-900 ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Usage Metrics */}
                    <div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Usage Metrics</h2>
                        <div className="grid grid-cols-6 gap-3">
                            {metricCards.map(({ label, key, icon: Icon, color }) => (
                                <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                    <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}><Icon className="w-4 h-4" /></div>
                                    <div className="text-2xl font-bold text-gray-900">{metrics ? metrics[key] : '—'}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Onboarding Progress */}
                    {onboarding && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Onboarding</h2>
                                <span className="text-sm font-medium text-gray-700">{onboarding.completedSteps}/{onboarding.totalSteps} steps</span>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${onboarding.percentComplete}%` }} />
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {onboarding.steps.map((step: any) => (
                                        <div key={step.key} className="flex items-center gap-2">
                                            {step.done ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                                            <span className={`text-xs ${step.done ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Company Details + Users */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Details</span>
                            </div>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">ID</dt>
                                    <dd className="text-gray-700 font-mono text-xs">{tenant.id.slice(0, 16)}...</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Created</dt>
                                    <dd className="text-gray-700">{new Date(tenant.createdAt).toLocaleDateString()}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Updated</dt>
                                    <dd className="text-gray-700">{new Date(tenant.updatedAt).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>

                        {tenant.users && tenant.users.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Users ({tenant.users.length})</span>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                    {tenant.users.map((u: any) => (
                                        <div key={u.id} className="px-5 py-2.5 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles?.map((r: any) => (
                                                    <span key={r.name} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{r.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Plan & Billing Tab ── */}
            {tab === 'plan' && (
                <div className="space-y-6">
                    {planLoading ? (
                        <div className="text-sm text-gray-500">Loading plan...</div>
                    ) : (
                        <>
                            {/* Current limits vs usage */}
                            {limits && (
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Limits & Usage</h2>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Users', used: limits.users?.current ?? 0, max: limits.users?.max },
                                            { label: 'Warehouses', used: limits.warehouses?.current ?? 0, max: limits.warehouses?.max },
                                            { label: 'Products', used: limits.products?.current ?? 0, max: limits.products?.max },
                                            { label: 'Orders', used: limits.orders?.current ?? 0, max: limits.orders?.max },
                                        ].map(({ label, used, max }) => {
                                            const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
                                            return (
                                                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-gray-500">{label}</span>
                                                        <span className="text-xs font-medium text-gray-700">{used} / {max ?? '∞'}</span>
                                                    </div>
                                                    {max && (
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Plan editor */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-4">Plan Configuration</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Plan Tier</label>
                                        <select
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                                            value={planForm.tier}
                                            onChange={e => setPlanForm(p => ({ ...p, tier: e.target.value }))}
                                        >
                                            <option value="">— Default —</option>
                                            <option value="FREE">FREE</option>
                                            <option value="STARTER">STARTER</option>
                                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Billing Cycle</label>
                                        <select
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                                            value={planForm.billingCycle}
                                            onChange={e => setPlanForm(p => ({ ...p, billingCycle: e.target.value }))}
                                        >
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="ANNUAL">Annual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Trial Ends At</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                                            value={planForm.trialEndsAt}
                                            onChange={e => setPlanForm(p => ({ ...p, trialEndsAt: e.target.value }))}
                                        />
                                    </div>
                                    {[
                                        { key: 'maxUsers', label: 'Max Users' },
                                        { key: 'maxWarehouses', label: 'Max Warehouses' },
                                        { key: 'maxProducts', label: 'Max Products' },
                                        { key: 'maxOrders', label: 'Max Orders' },
                                    ].map(({ key, label }) => (
                                        <div key={key}>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">{label} <span className="text-gray-400">(blank = unlimited)</span></label>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                                                value={planForm[key]}
                                                onChange={e => setPlanForm(p => ({ ...p, [key]: e.target.value }))}
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                    ))}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                                        <textarea
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                                            rows={2}
                                            value={planForm.notes}
                                            onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                                            placeholder="Internal notes about this plan..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <Button onClick={handleSavePlan} disabled={savingPlan}>
                                        {savingPlan ? 'Saving...' : 'Save Plan'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Feature Flags Tab ── */}
            {tab === 'flags' && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature Flags for {tenant.name}</h2>
                    {flagsLoading ? (
                        <div className="text-sm text-gray-500">Loading flags...</div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {flags.map(flag => (
                                <div key={flag.key} className="px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{flag.label}</div>
                                        <div className="text-xs text-gray-400">{flag.description}</div>
                                        {flag.notes && <div className="text-xs text-amber-600 mt-0.5">Note: {flag.notes}</div>}
                                    </div>
                                    <button
                                        onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                                        disabled={toggling === flag.key}
                                        className="flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {flag.enabled ? (
                                            <ToggleRight className="w-8 h-8 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-gray-300" />
                                        )}
                                        <span className={`text-xs font-medium w-14 ${flag.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                            {flag.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
