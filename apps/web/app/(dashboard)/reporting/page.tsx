'use client';

import { useState, useEffect } from 'react';
import { fetchAnalytics } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function ReportingPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [advancedEnabled, setAdvancedEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        async function load() {
            // M5.5 — ADVANCED_ANALYTICS flag
            const flagRes = await fetch('/api/feature-flags').catch(() => null);
            if (flagRes?.ok) {
                const flags: Array<{ key: string; enabled: boolean }> = await flagRes.json();
                setAdvancedEnabled(flags.find(f => f.key === 'ADVANCED_ANALYTICS')?.enabled ?? false);
            } else {
                setAdvancedEnabled(false);
            }
            try {
                const res = await fetchAnalytics();
                setData(res);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!data) return <div className="p-8">Failed to load data</div>;

    // Prepare Category Data for Chart (Simple Bar for now)
    const categories = Object.keys(data.categoryValue || {});
    const maxVal = Math.max(...Object.values(data.categoryValue || {}) as number[], 1);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Warehouse Overview</h1>
                <div className="text-sm text-gray-500">Last 7 days</div>
            </div>

            {/* M5.5 — ADVANCED_ANALYTICS flag banner */}
            {advancedEnabled === false && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">Advanced Analytics not enabled</p>
                        <p className="text-sm text-amber-700 mt-1">Enable the <strong>Advanced Analytics</strong> feature flag in the admin portal to unlock cycle-time trends, utilisation history, and the inventory ledger.</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link href="/inventory" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Inventory Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.totalStockValue)}
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/orders" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Order Fulfillment Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.fulfillmentRate}%</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/inventory" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Stockout Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{data.stockoutRate}%</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/orders?status=PENDING" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Pending Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{data.pendingOrders}</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/reporting/cycle-time" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avg Cycle Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.avgCycleTime} hrs</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/reporting/utilisation" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Storage Capacity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{data.capacityUtilization}%</div>
                            <p className="text-xs text-muted-foreground">Used vs Available &rarr;</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/reporting/compliance" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Compliance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">VAT / SAF-T</div>
                            <p className="text-xs text-muted-foreground">Tax Reporting &rarr;</p>
                        </CardContent>
                    </Card>
                </Link>

                {advancedEnabled && (
                    <Link href="/reporting/inventory-ledger" className="block hover:opacity-80 transition-opacity">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Inventory Ledger</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-indigo-600">Movements</div>
                                <p className="text-xs text-muted-foreground">Full stock movement history &rarr;</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inventory Category Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory by Category (Value)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {categories.length === 0 ? (
                                <p className="text-gray-500 text-sm">No inventory data available.</p>
                            ) : (
                                categories.map((cat) => {
                                    const val = data.categoryValue[cat];
                                    const percent = (val / maxVal) * 100;
                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium">{cat}</span>
                                                <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-blue-600 h-2.5 rounded-full"
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Sales Trend */}
                {/* Daily Sales Trend */}
                <Link href="/orders" className="block hover:opacity-80 transition-opacity">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Sales Trend (Last 5 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-4 h-64 border-b border-l p-4">
                                {data.dailySales.map((item: any, index: number) => {
                                    // Handle both old (number) and new ({ date, count }) formats safely during transition
                                    const value = typeof item === 'number' ? item : item.count;
                                    const label = typeof item === 'number' ? `Day ${index + 1}` : item.date;
                                    const maxSales = Math.max(...data.dailySales.map((d: any) => typeof d === 'number' ? d : d.count), 1);

                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="relative w-full flex items-end justify-center h-full group">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap">
                                                    {value} orders
                                                </div>
                                                <div
                                                    className="w-full mx-1 bg-green-500 rounded-t opacity-80 hover:opacity-100 transition-all"
                                                    style={{ height: `${(value / maxSales) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
