'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { API_URL, fetchLocationsTree } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LocationSelector } from '@/components/inventory/LocationSelector';

export default function RouteDetailPage() {
    const params = useParams();
    const [route, setRoute] = useState<any>(null);
    const [locationsTree, setLocationsTree] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [formData, setFormData] = useState({
        action: 'PULL',
        sourceLocationId: '',
        destinationLocationId: '',
        sequence: 0,
    });

    useEffect(() => {
        load();
    }, [params.id]);

    async function load() {
        try {
            const [routesRes, locsData] = await Promise.all([
                fetch(`${API_URL}/inventory/routes`),
                fetchLocationsTree()
            ]);
            const routesData = await routesRes.json();

            const currentRoute = routesData.find((r: any) => r.id === params.id);
            setRoute(currentRoute);
            setLocationsTree(locsData);
        } catch (err) {
            console.error(err);
        }
    }

    const handleOpenDialog = (rule?: any) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                action: rule.action,
                sourceLocationId: rule.sourceLocationId || '',
                destinationLocationId: rule.destinationLocationId || '',
                sequence: rule.sequence,
            });
        } else {
            setEditingRule(null);
            setFormData({
                action: 'PULL',
                sourceLocationId: '',
                destinationLocationId: '',
                sequence: 0,
            });
        }
        setOpen(true);
    };

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingRule
                ? `${API_URL}/inventory/rules/${editingRule.id}`
                : `${API_URL}/inventory/routes/${params.id}/rules`;

            const method = editingRule ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    sourceLocationId: formData.sourceLocationId || undefined,
                    destinationLocationId: formData.destinationLocationId || undefined,
                    sequence: Number(formData.sequence),
                }),
            });
            setOpen(false);
            load();
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to find location name in tree (recursive)
    const findLocationName = (nodes: any[], id: string): string | null => {
        for (const node of nodes) {
            if (node.id === id) return node.name;
            if (node.children) {
                const found = findLocationName(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const getLocationName = (id?: string) => {
        if (!id) return 'External';
        return findLocationName(locationsTree, id) || 'Unknown Location';
    };

    if (!route) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center space-x-4 mb-6">
                <Link href="/inventory/routes">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{route.name}</h1>
                    <p className="text-muted-foreground">{route.description}</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Rules</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Add Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveRule} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Action</Label>
                                <Select
                                    value={formData.action}
                                    onValueChange={(val) => setFormData({ ...formData, action: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PULL">PULL (Replenish)</SelectItem>
                                        <SelectItem value="PUSH">PUSH (Move To)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="mb-1 block">Source Location</Label>
                                <LocationSelector
                                    locations={locationsTree}
                                    value={formData.sourceLocationId}
                                    onChange={(id) => setFormData({ ...formData, sourceLocationId: id })}
                                    placeholder="Select Source (Optional)"
                                />
                                <p className="text-xs text-muted-foreground">Leave empty for External/Vendor source.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="mb-1 block">Destination Location</Label>
                                <LocationSelector
                                    locations={locationsTree}
                                    value={formData.destinationLocationId}
                                    onChange={(id) => setFormData({ ...formData, destinationLocationId: id })}
                                    placeholder="Select Destination (Optional)"
                                />
                                <p className="text-xs text-muted-foreground">Leave empty for External/Customer destination.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Sequence</Label>
                                <Input
                                    type="number"
                                    value={formData.sequence}
                                    onChange={(e) => setFormData({ ...formData, sequence: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit">{editingRule ? 'Save Changes' : 'Add Rule'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {route.rules?.sort((a: any, b: any) => a.sequence - b.sequence).map((rule: any) => (
                    <Card key={rule.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm font-mono">
                                    {rule.sequence}
                                </div>
                                <div className="font-medium text-blue-600">
                                    {rule.action}
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-muted-foreground">From:</span>
                                    <span className="font-medium">
                                        {getLocationName(rule.sourceLocationId)}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">To:</span>
                                    <span className="font-medium">
                                        {getLocationName(rule.destinationLocationId)}
                                    </span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(rule)}>
                                Edit
                            </Button>
                        </CardContent>
                    </Card>
                ))}
                {(!route.rules || route.rules.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                        No rules defined for this route.
                    </div>
                )}
            </div>
        </div>
    );
}
