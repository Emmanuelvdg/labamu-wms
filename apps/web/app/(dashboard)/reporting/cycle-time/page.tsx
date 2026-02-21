'use client';

import { useState, useEffect } from 'react';
import { fetchCycleTimeTrend, fetchOrders } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { format, subDays } from 'date-fns';

export default function CycleTimeReportPage() {
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [drillDownOrders, setDrillDownOrders] = useState<any[]>([]);
    const [loadingDrillDown, setLoadingDrillDown] = useState(false);

    useEffect(() => {
        loadTrend();
    }, [period]);

    useEffect(() => {
        if (selectedDate) {
            loadDrillDown(selectedDate);
        } else {
            setDrillDownOrders([]);
        }
    }, [selectedDate]);

    async function loadTrend() {
        setLoading(true);
        try {
            const data = await fetchCycleTimeTrend({ period });

            // Calculate Simple Moving Average (Trendline) - 3 period window
            const dataWithTrend = data.map((item: any, index: number, arr: any[]) => {
                let sum = 0;
                let count = 0;
                for (let i = Math.max(0, index - 2); i <= index; i++) {
                    sum += arr[i].averageCycleTime;
                    count++;
                }
                const trend = count > 0 ? Number((sum / count).toFixed(1)) : item.averageCycleTime;
                return { ...item, trend };
            });

            setTrendData(dataWithTrend);
            // Default select the last date if available so table isn't empty initially? 
            // Or leave empty. User instructions "when... selected (ie clicked)". Leave empty.
        } catch (error) {
            console.error('Failed to load cycle time trend:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadDrillDown(dateStr: string) {
        setLoadingDrillDown(true);
        try {
            // Fetch all orders and filter client side for MVP to match exact date
            // Optimization: In real app, create specific endpoint.
            // Here we assume /orders returns all, which is what we have.
            const allOrders = await fetchOrders();

            // Filter SHIPPED orders updated on this date
            const filtered = allOrders.filter((o: any) => {
                if (o.status !== 'SHIPPED') return false;
                const updateDate = new Date(o.updatedAt).toISOString().split('T')[0];
                return updateDate === dateStr;
            }).map((o: any) => {
                const created = new Date(o.createdAt).getTime();
                const shipped = new Date(o.updatedAt).getTime();
                const cycleTime = Number(((shipped - created) / (1000 * 60 * 60)).toFixed(1));
                return { ...o, cycleTime };
            });

            setDrillDownOrders(filtered);
        } catch (error) {
            console.error('Failed to load drill down:', error);
        } finally {
            setLoadingDrillDown(false);
        }
    }

    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const date = data.activePayload[0].payload.date;
            setSelectedDate(date === selectedDate ? null : date);
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cycle Time Trend</h1>
                    <p className="text-gray-500">Average time from order creation to shipment</p>
                </div>
                <div className="flex bg-white rounded-lg shadow-sm p-1">
                    {['7d', '30d', '90d'].map((p) => (
                        <button
                            key={p}
                            onClick={() => { setPeriod(p); setSelectedDate(null); }}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${period === p ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Last {p.replace('d', ' Days')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-500">Loading trend data...</div>
            ) : (
                <div className="space-y-6">
                    {/* Chart Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Cycle Time (Hours)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trendData} onClick={handleBarClick}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(new Date(val), 'MMM d')}
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
                                        unit="h"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 border shadow-lg rounded-lg">
                                                        <p className="font-semibold mb-2">{label ? format(new Date(label as string), 'MMM d, yyyy') : ''}</p>
                                                        <div className="space-y-1 text-sm">
                                                            <p className="text-blue-600">Avg: {payload[0].value}h</p>
                                                            <p className="text-orange-500">Trend: {payload.find(p => p.name === 'Trendline')?.value}h</p>
                                                            <p className="text-gray-500 text-xs mt-1">
                                                                {payload[0].payload.orderCount} orders
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-2 italic">Click bar to view orders</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="averageCycleTime"
                                        name="Average Cycle Time"
                                        fill="#2563eb"
                                        radius={[4, 4, 0, 0]}
                                        barSize={40}
                                        className="cursor-pointer hover:opacity-80"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="trend"
                                        name="Trendline"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Drill Down Table */}
                    {selectedDate && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <span>Orders for {format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
                                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                                    {drillDownOrders.length}
                                </span>
                            </h3>

                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipped</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loadingDrillDown ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading orders...</td>
                                            </tr>
                                        ) : drillDownOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No orders shipped on this date.</td>
                                            </tr>
                                        ) : (
                                            drillDownOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id.substring(0, 8)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(order.createdAt), 'MMM d, HH:mm')}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(order.updatedAt), 'MMM d, HH:mm')}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{order.cycleTime} h</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {order.customer?.name || order.destinationWarehouse?.name || order.customerId || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
