'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchStocktakeSession, submitStocktakeCount, generateStocktakeTasks } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Scan } from 'lucide-react';
import { toast } from 'sonner';

import * as React from 'react';

export default function StocktakeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = React.use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any | null>(null);
    const [scanQuery, setScanQuery] = useState('');
    const [tasks, setTasks] = useState<any[]>([]);

    // Counting state for selected task
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [countQty, setCountQty] = useState('');

    useEffect(() => {
        loadSession();
    }, []);

    async function loadSession() {
        try {
            const data = await fetchStocktakeSession(sessionId);
            setSession(data);
            setTasks(data.tasks || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateTasks() {
        setLoading(true);
        try {
            await generateStocktakeTasks(sessionId);
            toast.success('Tasks Generated');
            loadSession();
        } catch (err: any) {
            toast.error('Failed to generate tasks: ' + err.message);
            setLoading(false);
        }
    }

    async function handleSubmitCount() {
        if (!selectedTask || !countQty) return;
        try {
            await submitStocktakeCount(selectedTask.id, Number(countQty), 'MobileUser'); // TODO: Get user name
            toast.success('Count Submitted');
            // Optimistic update
            setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, countedQuantity: Number(countQty), status: 'COUNTED' } : t));
            setSelectedTask(null);
            setCountQty('');
        } catch (err: any) {
            toast.error('Failed to submit: ' + err.message);
        }
    }

    const filteredTasks = tasks.filter(t => {
        if (!scanQuery) return true;
        const q = scanQuery.toUpperCase();
        return t.location?.shortCode?.toUpperCase().includes(q) ||
            t.location?.name?.toUpperCase().includes(q) ||
            t.product?.sku?.toUpperCase().includes(q);
    });

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!session) return <div>Session not found</div>;

    if (tasks.length === 0) {
        return (
            <div className="p-4 space-y-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Session Empty</h1>
                <p>No tasks found. Generate tasks to begin counting.</p>
                <Button onClick={handleGenerateTasks} className="w-full">Generate Tasks from Inventory</Button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">{session.description}</h1>
                </div>
            </div>

            {/* Scan / Filter */}
            <div className="flex space-x-2">
                <Input
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Scan Location or Product"
                    className="border-blue-300"
                    autoFocus
                />
                <Button variant="outline" size="icon">
                    <Scan className="w-4 h-4" />
                </Button>
            </div>

            {/* Task List or Counting Form */}
            {selectedTask ? (
                <Card className="border-2 border-blue-500">
                    <CardContent className="p-4 space-y-4">
                        <h2 className="font-bold text-lg">Enter Count</h2>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <label className="text-gray-500">Location</label>
                                <div className="font-bold">{selectedTask.location.shortCode}</div>
                            </div>
                            <div>
                                <label className="text-gray-500">Product</label>
                                <div className="font-bold">{selectedTask.product.sku}</div>
                            </div>
                            <div>
                                <label className="text-gray-500">System Qty</label>
                                <div>{selectedTask.snapshotQuantity}</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-lg font-bold">Physical Count</label>
                            <div className="flex items-center space-x-2 mt-2">
                                <Input
                                    type="number"
                                    value={countQty}
                                    onChange={(e) => setCountQty(e.target.value)}
                                    className="text-2xl font-bold h-16 text-center"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setSelectedTask(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleSubmitCount}>Submit</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                    {filteredTasks.map(task => (
                        <Card
                            key={task.id}
                            onClick={() => { setSelectedTask(task); setCountQty(''); }}
                            className={`cursor-pointer ${task.status === 'COUNTED' ? 'bg-green-50 border-green-200' : 'hover:bg-blue-50'}`}
                        >
                            <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-lg">{task.location.shortCode}</div>
                                        <div className="text-sm text-gray-500">{task.product.sku}</div>
                                    </div>
                                    <div className="text-right">
                                        {task.status === 'COUNTED' ? (
                                            <span className="text-green-700 font-bold">{task.countedQuantity}</span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">To Count</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
