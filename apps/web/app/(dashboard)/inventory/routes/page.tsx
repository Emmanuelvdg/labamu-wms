'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowRight, Route as RouteIcon } from 'lucide-react';
import Link from 'next/link';
import { fetchWorkflowTemplates, createWorkflowTemplate } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RoutesPage() {
    const router = useRouter();
    const [routes, setRoutes] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [newRoute, setNewRoute] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            setLoading(true);
            const data = await fetchWorkflowTemplates();
            // Filter to only display Route workflows
            const routeTemplates = data?.filter((t: any) => t.triggerType === 'ROUTE' && t.status !== 'ARCHIVED') || [];
            setRoutes(routeTemplates);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const created = await createWorkflowTemplate({
                name: newRoute.name,
                description: newRoute.description,
                triggerType: 'ROUTE'
            });
            setOpen(false);
            setNewRoute({ name: '', description: '' });
            router.push(`/inventory/routes/builder?id=${created.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create route template');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Routes (Workflows)</h1>
                    <p className="text-muted-foreground">Manage physical movement paths inside the warehouse using the visual workflow engine.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Route
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Route Strategy</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Route Name</Label>
                                <Input
                                    id="name"
                                    value={newRoute.name}
                                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={newRoute.description}
                                    onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit">Create & Edit Canvas</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : routes.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <RouteIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No custom routes found</h3>
                    <p className="text-gray-500 mb-4">Create your first spatial route to automate movement tasks.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {routes.map(route => (
                        <Link key={route.id} href={`/inventory/routes/builder?id=${route.id}`}>
                            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-blue-100 hover:border-blue-300">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            {route.name}
                                        </CardTitle>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${route.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {route.status}
                                        </span>
                                    </div>
                                    <span className="text-xs font-normal text-muted-foreground block mt-1">
                                        v{route.version}
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {route.description || 'No description provided.'}
                                    </p>
                                    <div className="flex justify-between mt-auto">
                                        <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded inline-block">
                                            Workflow Canvas
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
