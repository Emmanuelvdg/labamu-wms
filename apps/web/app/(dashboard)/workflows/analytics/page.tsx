'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, TrendingUp, Clock, AlertTriangle, Settings2 } from 'lucide-react';

export default function WorkflowAnalyticsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center text-gray-900">
                        <BarChart2 className="w-6 h-6 mr-2 text-teal-600" />
                        Workflow Analytics
                    </h1>
                    <p className="text-gray-500">Metrics, bottlenecks, and efficiency reports across workflows.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                            Total Runs (30d)
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,482</div>
                        <p className="text-xs text-green-600 mt-1">+12% from last month</p>
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
                        <div className="text-2xl font-bold">4h 12m</div>
                        <p className="text-xs text-green-600 mt-1">-45m from last month</p>
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
                        <div className="text-2xl font-bold">98.5%</div>
                        <p className="text-xs text-green-600 mt-1">+0.5% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex justify-between">
                            Bottlenecks
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">3</div>
                        <p className="text-xs text-gray-500 mt-1">QC Inspect heavily congested</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Execution Time by Step</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-200 m-4">
                        <p className="text-gray-400">Chart visualization placeholder</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Workflow Completion Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-200 m-4">
                        <p className="text-gray-400">Chart visualization placeholder</p>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <Settings2 className="w-5 h-5 mr-2 text-indigo-500" />
                            Suggested Optimisations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-4">
                                <div className="mt-1">
                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-orange-900">QC Inspect Step Bottleneck</h4>
                                    <p className="text-sm text-orange-800 mt-1">Average wait time for "QC Inspect" in the Standard Inbound workflow has increased by 45%. Consider assigning more workers or refining criteria.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-4">
                                <div className="mt-1">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-blue-900">Idle Time in Staging</h4>
                                    <p className="text-sm text-blue-800 mt-1">Items spend an average of 2 hours in staging before loading. Adjusting the wave picking schedule could reduce this by 30%.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
