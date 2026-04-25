'use client';

import { useEffect, useState } from 'react';
import { getPlatformAnalytics } from '@/lib/admin-api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Building2, Users, ShoppingCart, TrendingUp } from 'lucide-react';

const PLAN_COLORS: Record<string, string> = {
    FREE: '#94a3b8',
    STARTER: '#60a5fa',
    PROFESSIONAL: '#a78bfa',
    ENTERPRISE: '#f59e0b',
};
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#22c55e',
    SUSPENDED: '#ef4444',
    CANCELLED: '#94a3b8',
};

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getPlatformAnalytics()
            .then(setData)
            .catch((e: any) => setError(e.message || 'Failed to load analytics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading analytics...</div>;
    if (error) return <div className="p-8"><div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div></div>;
    if (!data) return null;

    const activeTenants = data.statusDistribution?.find((s: any) => s.status === 'ACTIVE')?.count ?? 0;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Real-time overview of the Labamu platform</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Total Tenants" value={data.totalTenants} icon={Building2} color="text-slate-600 bg-slate-100" />
                <KpiCard label="Total Users" value={data.totalUsers} icon={Users} color="text-blue-600 bg-blue-100" />
                <KpiCard label="Total Orders" value={data.totalOrders} icon={ShoppingCart} color="text-green-600 bg-green-100" />
                <KpiCard label="Active Tenants" value={activeTenants} icon={TrendingUp} color="text-purple-600 bg-purple-100" />
            </div>

            {/* Monthly growth + Plan Distribution */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">New Tenants per Month (Last 12 months)</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.tenantsPerMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="New Tenants" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Plan Distribution</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data.planDistribution}
                                dataKey="count"
                                nameKey="plan"
                                cx="50%"
                                cy="50%"
                                outerRadius={75}
                            >
                                {data.planDistribution.map((entry: any) => (
                                    <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any, name: any, props: any) => [v, props.payload.plan]} />
                            <Legend
                                formatter={(value: any, entry: any) => entry.payload.plan}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status distribution + Plan table */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={data.statusDistribution}
                                dataKey="count"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                outerRadius={65}
                            >
                                {data.statusDistribution.map((entry: any) => (
                                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any, name: any, props: any) => [v, props.payload.status]} />
                            <Legend formatter={(value: any, entry: any) => entry.payload.status} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">Plan Breakdown</h2>
                    </div>
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                                <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Tenants</th>
                                <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.planDistribution.map((p: any) => (
                                <tr key={p.plan} className="hover:bg-gray-50">
                                    <td className="px-5 py-3">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[p.plan] ?? '#94a3b8' }} />
                                            {p.plan}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium">{p.count}</td>
                                    <td className="px-5 py-3 text-right text-gray-500">
                                        {data.totalTenants > 0 ? Math.round((p.count / data.totalTenants) * 100) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
