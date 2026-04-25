'use client';

import { useEffect, useState } from 'react';
import { fetchTenants } from '@/lib/admin-api';
import Link from 'next/link';
import { Building2, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

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

export default function AdminOverviewPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenants()
            .then(data => setTenants(Array.isArray(data) ? data : []))
            .catch(() => setTenants([]))
            .finally(() => setLoading(false));
    }, []);

    const active = tenants.filter(t => t.status === 'ACTIVE').length;
    const suspended = tenants.filter(t => t.status === 'SUSPENDED').length;
    const total = tenants.length;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
                <p className="text-sm text-gray-500 mt-1">Labamu IMS — Operations Dashboard</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2.5 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Total Tenants</p>
                            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2.5 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Active</p>
                            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2.5 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Suspended</p>
                            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : suspended}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenant list summary */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">All Tenants</h2>
                    <Link href="/admin/tenants" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Manage →
                    </Link>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-400">Loading...</div>
                ) : tenants.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-400">No tenants yet.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tenants.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="font-medium text-sm text-gray-900">{t.name}</div>
                                        <div className="text-xs text-gray-400">{t.slug}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planBadge[t.plan] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[t.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-gray-500">
                                        {new Date(t.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <Link href={`/admin/tenants/${t.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
