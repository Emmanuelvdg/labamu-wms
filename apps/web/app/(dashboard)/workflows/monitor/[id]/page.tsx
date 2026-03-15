'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, CheckCircle, AlertTriangle, Clock, List } from 'lucide-react';
import { fetchWorkflowInstances } from '@/lib/api'; // Temporary workaround, we'll fetch all and filter or write a specific fetcher if needed.
import { fetchWorkflowInstanceDetails } from '@/lib/api'; // We will ensure this exists in api.ts

export default function InstanceLogsPage() {
    const params = useParams();
    const router = useRouter();
    const instanceId = params.id as string;
    
    const [instance, setInstance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchWorkflowInstanceDetails(instanceId);
            setInstance(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (instanceId) {
            loadData();
        }
    }, [instanceId]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold">Instance not found</h2>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'RUNNING': return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
            case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'FAILED': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto font-sans">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Monitor
            </Button>
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center text-gray-900">
                        Instance Details
                    </h1>
                    <p className="text-gray-500 font-mono mt-1 text-sm">{instance.id}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-700">{instance.status}</span>
                    <StatusIcon status={instance.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Template</CardTitle></CardHeader>
                    <CardContent>
                        <p className="font-semibold">{instance.template?.name || 'Unknown'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Started</CardTitle></CardHeader>
                    <CardContent>
                        <p className="font-semibold tabular-nums">{new Date(instance.startedAt).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Completed</CardTitle></CardHeader>
                    <CardContent>
                        <p className="font-semibold tabular-nums">{instance.completedAt ? new Date(instance.completedAt).toLocaleString() : '---'}</p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4 border-b pb-2 flex items-center">
                <List className="w-5 h-5 mr-2" /> Execution Audit Logs
            </h2>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Step Details</th>
                                <th className="px-6 py-3">Payload / Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {instance.auditLogs?.map((log: any) => (
                                <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono tabular-nums whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-indigo-600">
                                        {log.action}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                        {log.stepId || 'SYSTEM'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs break-all max-w-sm">
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {(!instance.auditLogs || instance.auditLogs.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No logs available for this instance.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
