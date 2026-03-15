'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWorkflowInstances, pauseWorkflowInstance, resumeWorkflowInstance } from '@/lib/api';
import { Activity, Play, Pause, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowMonitorPage() {
    const [instances, setInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchWorkflowInstances();
            setInstances(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePause = async (id: string) => {
        try {
            await pauseWorkflowInstance(id, 'user-id-placeholder');
            loadData();
        } catch (error) {
            alert('Failed to pause workflow');
        }
    };

    const handleResume = async (id: string) => {
        try {
            await resumeWorkflowInstance(id);
            loadData();
        } catch (error) {
            alert('Failed to resume workflow');
        }
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'RUNNING': return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
            case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'PAUSED': return <Pause className="w-5 h-5 text-yellow-500" />;
            case 'FAILED': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center text-gray-900">
                        <Activity className="w-6 h-6 mr-2 text-indigo-600" />
                        Workflow Monitor
                    </h1>
                    <p className="text-gray-500">Live view of active and past workflow instances.</p>
                </div>
                <Button onClick={loadData} variant="outline">Refresh Data</Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : instances.length === 0 ? (
                <Card className="text-center py-12 bg-gray-50">
                    <CardContent>
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No active instances</h3>
                        <p className="text-gray-500 mb-4">You have no workflows currently running.</p>
                        <Link href="/workflows">
                            <Button>Go to Templates</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {instances.map(instance => (
                        <Card key={instance.id} className="border shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-gray-800 line-clamp-1">
                                            {instance.template?.name || 'Unknown Template'}
                                        </CardTitle>
                                        <div className="text-xs text-gray-500 mt-1 uppercase font-mono tracking-wider">
                                            {instance.id.substring(0, 8)}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 px-2 py-0.5 bg-gray-100 rounded">
                                            {instance.status}
                                        </span>
                                        <StatusIcon status={instance.status} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Started:</span>
                                        <span className="text-gray-800 tabular-nums">{new Date(instance.startedAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Current Step:</span>
                                        <span className="text-indigo-600 font-medium">
                                            {instance.currentStepId ? 'Processing' : 'Done'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                                    <Link href={`/workflows/monitor/${instance.id}`}>
                                        <Button variant="outline" size="sm" className="w-full">
                                            View Logs
                                        </Button>
                                    </Link>
                                    {instance.status === 'RUNNING' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                            onClick={() => handlePause(instance.id)}
                                        >
                                            <Pause className="w-4 h-4 mr-1" /> Pause
                                        </Button>
                                    )}
                                    {instance.status === 'PAUSED' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => handleResume(instance.id)}
                                        >
                                            <Play className="w-4 h-4 mr-1" /> Resume
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
