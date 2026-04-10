'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, LineChart, Line, Legend
} from 'recharts';
import { BarChart2, TrendingUp, Clock, AlertTriangle, Settings2, CheckCircle, ChevronRight } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Kpis {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    successRate: number;
    avgCycleTimeMinutes: number | null;
    slaBreachCount: number;
}

interface StepTime {
    stepName: string;
    stepType: string;
    avgMinutes: number;
    taskCount: number;
    severity: 'HIGH' | 'MEDIUM' | null;
}

interface VolumePoint {
    date: string;
    count: number;
}

interface Suggestion {
    type: 'WARNING' | 'INFO';
    title: string;
    body: string;
}

interface TemplateEntry {
    templateId: string;
    templateName: string;
    totalRuns: number;
    completedRuns: number;
    avgMinutes: number | null;
}

interface DrilldownStep {
    stepName: string;
    stepType: string;
    avgMinutes: number;
    minMinutes: number;
    maxMinutes: number;
    taskCount: number;
    severity: 'HIGH' | 'MEDIUM' | null;
}

interface DrilldownData {
    template: { id: string; name: string; description?: string; triggerType?: string };
    totalRuns: number;
    completedRuns: number;
    successRate: number;
    statusBreakdown: Record<string, number>;
    cycleTimeByDay: { date: string; avgMinutes: number; runCount: number }[];
    steps: DrilldownStep[];
}

interface AnalyticsData {
    kpis: Kpis;
    stepExecutionTimes: StepTime[];
    completionVolume: VolumePoint[];
    optimisations: Suggestion[];
    templateList: TemplateEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    });

function formatMinutes(mins: number | null): string {
    if (mins === null || mins === undefined) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

const PERIOD_LABELS: Record<string, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' };

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function KpiSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2"><Skeleton className="h-4 w-28" /></CardHeader>
                    <CardContent><Skeleton className="h-8 w-20 mb-2" /><Skeleton className="h-3 w-24" /></CardContent>
                </Card>
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkflowAnalyticsPage() {
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    const { data, error, isLoading } = useSWR<AnalyticsData>(
        `/api/workflow-instances/analytics?period=${period}`,
        fetcher,
        { keepPreviousData: true }
    );

    const { data: drilldown, isLoading: drilldownLoading } = useSWR<DrilldownData | null>(
        selectedTemplateId
            ? `/api/workflow-instances/analytics/templates/${selectedTemplateId}?period=${period}`
            : null,
        fetcher,
        { keepPreviousData: true }
    );

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center text-gray-900">
                        <BarChart2 className="w-6 h-6 mr-2 text-teal-600" />
                        Workflow Analytics
                    </h1>
                    <p className="text-gray-500">Metrics, bottlenecks, and efficiency reports across workflows.</p>
                </div>
                <div className="flex bg-white rounded-lg shadow-sm p-1 border">
                    {(['7d', '30d', '90d'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${period === p
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    Failed to load analytics data. Please try again.
                </div>
            )}

            {/* KPI Cards */}
            {isLoading && !data ? (
                <KpiSkeleton />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                                Total Runs ({PERIOD_LABELS[period]})
                                <TrendingUp className="w-4 h-4 text-teal-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.kpis.totalRuns.toLocaleString() ?? '—'}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                {data ? `${data.kpis.completedRuns} completed · ${data.kpis.failedRuns} failed` : ''}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                                Avg Cycle Time
                                <Clock className="w-4 h-4 text-blue-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data ? formatMinutes(data.kpis.avgCycleTimeMinutes) : '—'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Per completed workflow run</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                                Success Rate
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${data && data.kpis.successRate < 95 ? 'text-orange-600' : 'text-green-600'}`}>
                                {data ? `${data.kpis.successRate}%` : '—'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Completed vs total runs</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                                SLA Breaches
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${data && data.kpis.slaBreachCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {data?.kpis.slaBreachCount ?? '—'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Tasks past their deadline</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Step Execution Times */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Execution Time by Step</CardTitle>
                        <p className="text-sm text-gray-500">Average minutes per completed task</p>
                    </CardHeader>
                    <CardContent className="h-72">
                        {isLoading && !data ? (
                            <div className="h-full flex items-center justify-center">
                                <Skeleton className="w-full h-full" />
                            </div>
                        ) : !data?.stepExecutionTimes.length ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No completed task data for this period.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.stepExecutionTimes.slice(0, 10)}
                                    layout="vertical"
                                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        unit="m"
                                        stroke="#888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="stepName"
                                        width={110}
                                        stroke="#888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload as StepTime;
                                            return (
                                                <div className="bg-white p-3 border shadow-lg rounded-lg text-sm">
                                                    <p className="font-semibold mb-1">{d.stepName}</p>
                                                    <p className="text-gray-600">Type: {d.stepType}</p>
                                                    <p className="text-blue-600">Avg: {d.avgMinutes} min</p>
                                                    <p className="text-gray-500">{d.taskCount} task(s)</p>
                                                    {d.severity && (
                                                        <p className={`mt-1 font-medium ${d.severity === 'HIGH' ? 'text-orange-600' : 'text-yellow-600'}`}>
                                                            ⚠ {d.severity} bottleneck
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar
                                        dataKey="avgMinutes"
                                        radius={[0, 4, 4, 0]}
                                        label={false}
                                    >
                                        {data.stepExecutionTimes.slice(0, 10).map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.severity === 'HIGH' ? '#ea580c' : entry.severity === 'MEDIUM' ? '#ca8a04' : '#0d9488'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Completion Volume */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Workflow Completion Volume</CardTitle>
                        <p className="text-sm text-gray-500">Completed runs per day</p>
                    </CardHeader>
                    <CardContent className="h-72">
                        {isLoading && !data ? (
                            <div className="h-full flex items-center justify-center">
                                <Skeleton className="w-full h-full" />
                            </div>
                        ) : !data?.completionVolume.length ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No completions recorded for this period.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={data.completionVolume}
                                    margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                                >
                                    <defs>
                                        <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDate}
                                        stroke="#888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        stroke="#888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <div className="bg-white p-3 border shadow-lg rounded-lg text-sm">
                                                    <p className="font-semibold">{label ? formatDate(label as string) : ''}</p>
                                                    <p className="text-teal-600">{payload[0].value} completed</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#0d9488"
                                        strokeWidth={2}
                                        fill="url(#volumeGradient)"
                                        dot={false}
                                        activeDot={{ r: 4, fill: '#0d9488' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Template Selector */}
                {(data?.templateList?.length ?? 0) > 0 && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <BarChart2 className="w-5 h-5 mr-2 text-teal-500" />
                                Template Performance
                            </CardTitle>
                            <p className="text-sm text-gray-500">Click a template to view detailed drilldown</p>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y">
                                {data!.templateList.map((t) => (
                                    <button
                                        key={t.templateId}
                                        onClick={() => setSelectedTemplateId(
                                            selectedTemplateId === t.templateId ? null : t.templateId
                                        )}
                                        className={`w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors ${selectedTemplateId === t.templateId
                                                ? 'bg-teal-50 text-teal-900'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{t.templateName}</p>
                                            <p className="text-xs text-gray-500">
                                                {t.totalRuns} runs · {t.completedRuns} completed
                                                {t.avgMinutes != null && ` · avg ${formatMinutes(t.avgMinutes)}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                                {t.totalRuns > 0 ? `${((t.completedRuns / t.totalRuns) * 100).toFixed(0)}%` : '—'}
                                            </span>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedTemplateId === t.templateId ? 'rotate-90 text-teal-600' : 'text-gray-400'
                                                }`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Per-Template Drilldown Panel */}
                {selectedTemplateId && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">
                                        {drilldown?.template.name ?? 'Loading…'} — Drilldown
                                    </CardTitle>
                                    {drilldown && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            {drilldown.totalRuns} runs · {drilldown.successRate}% success rate
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedTemplateId(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {drilldownLoading && !drilldown ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-48 w-full" />
                                    <Skeleton className="h-48 w-full" />
                                </div>
                            ) : drilldown ? (
                                <div className="space-y-6">
                                    {/* Cycle-Time Line Chart */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Avg Cycle Time by Day</h4>
                                        {drilldown.cycleTimeByDay.length === 0 ? (
                                            <p className="text-sm text-gray-400">No completed runs in this period.</p>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <LineChart
                                                    data={drilldown.cycleTimeByDay}
                                                    margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={formatDate}
                                                        stroke="#888"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis
                                                        stroke="#888"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        unit="m"
                                                    />
                                                    <Tooltip
                                                        content={({ active, payload, label }) => {
                                                            if (!active || !payload?.length) return null;
                                                            return (
                                                                <div className="bg-white p-3 border shadow-lg rounded-lg text-sm">
                                                                    <p className="font-semibold">{label ? formatDate(label as string) : ''}</p>
                                                                    <p className="text-teal-600">{formatMinutes(payload[0].value as number)}</p>
                                                                    <p className="text-gray-500">{payload[1]?.value} run(s)</p>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                    <Legend formatter={(v) => v === 'avgMinutes' ? 'Avg cycle time' : 'Runs'} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="avgMinutes"
                                                        stroke="#0d9488"
                                                        strokeWidth={2}
                                                        dot={false}
                                                        activeDot={{ r: 4 }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="runCount"
                                                        stroke="#6366f1"
                                                        strokeWidth={1.5}
                                                        strokeDasharray="4 2"
                                                        dot={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>

                                    {/* Step Breakdown Table */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Step Breakdown</h4>
                                        {drilldown.steps.length === 0 ? (
                                            <p className="text-sm text-gray-400">No completed step data yet.</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-xs text-gray-500 border-b">
                                                            <th className="pb-2 pr-4">Step</th>
                                                            <th className="pb-2 pr-4">Type</th>
                                                            <th className="pb-2 pr-4 text-right">Avg</th>
                                                            <th className="pb-2 pr-4 text-right">Min</th>
                                                            <th className="pb-2 pr-4 text-right">Max</th>
                                                            <th className="pb-2 text-right">Tasks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {drilldown.steps.map((s, i) => (
                                                            <tr key={i} className="py-2">
                                                                <td className="py-2 pr-4 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        {s.stepName}
                                                                        {s.severity && (
                                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.severity === 'HIGH'
                                                                                    ? 'bg-orange-100 text-orange-700'
                                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                                }`}>
                                                                                {s.severity}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 pr-4 text-gray-500 text-xs">{s.stepType}</td>
                                                                <td className="py-2 pr-4 text-right tabular-nums">{formatMinutes(s.avgMinutes)}</td>
                                                                <td className="py-2 pr-4 text-right tabular-nums text-gray-400">{formatMinutes(s.minMinutes)}</td>
                                                                <td className="py-2 pr-4 text-right tabular-nums text-gray-400">{formatMinutes(s.maxMinutes)}</td>
                                                                <td className="py-2 text-right tabular-nums text-gray-500">{s.taskCount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}

                {/* Suggested Optimisations */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <Settings2 className="w-5 h-5 mr-2 text-indigo-500" />
                            Suggested Optimisations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && !data ? (
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(data?.optimisations ?? []).map((s, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-lg flex gap-4 border ${s.type === 'WARNING'
                                            ? 'bg-orange-50 border-orange-100'
                                            : 'bg-blue-50 border-blue-100'
                                            }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {s.type === 'WARNING' ? (
                                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className={`font-semibold ${s.type === 'WARNING' ? 'text-orange-900' : 'text-blue-900'}`}>
                                                {s.title}
                                            </h4>
                                            <p className={`text-sm mt-1 ${s.type === 'WARNING' ? 'text-orange-800' : 'text-blue-800'}`}>
                                                {s.body}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
