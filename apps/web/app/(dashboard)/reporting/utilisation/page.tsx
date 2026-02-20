'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { fetchWarehouses, fetchLocations, fetchUtilisationHistory } from '@/lib/api';
import { Loader2, RefreshCw, Warehouse, Box, Layers } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

export default function UtilisationReportPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    // Filters
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [selectedLocationId, setSelectedLocationId] = useState<string>('all'); // 'all' or specific ID
    const [period, setPeriod] = useState<string>('30d');

    // Data
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) {
            loadLocations(selectedWarehouseId);
        } else {
            setLocations([]);
        }
    }, [selectedWarehouseId]);

    useEffect(() => {
        if (selectedWarehouseId) {
            loadReport();
        }
    }, [selectedWarehouseId, selectedLocationId, period]);

    async function loadWarehouses() {
        try {
            const res = await fetchWarehouses();
            setWarehouses(res);
            if (res.length > 0 && !selectedWarehouseId) {
                setSelectedWarehouseId(res[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLocations(warehouseId: string) {
        try {
            const res = await fetchLocations(warehouseId);
            setLocations(res);
        } catch (err) {
            console.error(err);
        }
    }

    async function loadReport() {
        setLoading(true);
        try {
            const locId = selectedLocationId === 'all' ? undefined : selectedLocationId;
            const res = await fetchUtilisationHistory({
                warehouseId: selectedWarehouseId,
                locationId: locId,
                period
            });
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Prepare data for chart
    const chartData = useMemo(() => {
        if (!data?.history) return [];
        return data.history.map((d: any) => ({
            ...d,
            // Format date for display
            dateShort: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        }));
    }, [data]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Storage Utilisation</h1>
                <p className="text-muted-foreground">Monitor capacity usage over time across warehouses and locations.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Warehouse:</label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Location:</label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Entire Warehouse</SelectItem>
                            {/* Simple flat list for now, ideally search/tree */}
                            {locations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                    {l.name} <span className="text-muted-foreground text-xs">({l.path || 'Root'})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 3 Months</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={loadReport} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Utilisation</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.current?.utilization || 0}%</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.current?.usedVolume?.toFixed(2)} / {data?.current?.maxVolume?.toFixed(2)} m³
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume Used</CardTitle>
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.current?.usedVolume?.toFixed(2)} m³</div>
                        <p className="text-xs text-muted-foreground">Current stored volume</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Max Capacity</CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.current?.maxVolume?.toFixed(2)} m³</div>
                        <p className="text-xs text-muted-foreground">Total available capacity</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Utilisation Trend</CardTitle>
                    <CardDescription>Volume utilisation over the selected period</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[400px] w-full">
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="dateShort"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}%`}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: number) => [`${value}%`, 'Utilisation']}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="utilization"
                                        stroke="#2563eb"
                                        fillOpacity={1}
                                        fill="url(#colorUtil)"
                                        name="Utilisation %"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                No data available for the selected period.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
