'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { API_URL, fetchWithRetry } from '@/lib/api';
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
    const [routes, setRoutes] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [newRoute, setNewRoute] = useState({ name: '', description: '' });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchWithRetry(`${API_URL}/inventory/routes`);
            setRoutes(data);
        } catch (err) {
            console.error(err);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetchWithRetry(`${API_URL}/inventory/routes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRoute),
            });
            setOpen(false);
            setNewRoute({ name: '', description: '' });
            load();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
                    <p className="text-muted-foreground">Manage product movement paths and rules.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Route
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Route</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
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
                            <div className="flex justify-end">
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {routes.map(route => (
                    <Link key={route.id} href={`/inventory/routes/${route.id}`}>
                        <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {route.name}
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {route.description || 'No description'}
                                </p>
                                <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded inline-block">
                                    {route.rules?.length || 0} Rules
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
