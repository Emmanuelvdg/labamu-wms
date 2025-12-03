'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
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

export default function RouteDetailPage() {
    const params = useParams();
    const [route, setRoute] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [newRule, setNewRule] = useState({
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
            const [routesRes, locsRes] = await Promise.all([
                fetch(`${API_URL}/inventory/routes`),
                fetch(`${API_URL}/inventory/locations`)
            ]);
            const routesData = await routesRes.json();
            const locsData = await locsRes.json();

            const currentRoute = routesData.find((r: any) => r.id === params.id);
            setRoute(currentRoute);
            setLocations(locsData);
        } catch (err) {
            console.error(err);
        }
    }

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/inventory/routes/${params.id}/rules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newRule,
                    sourceLocationId: newRule.sourceLocationId || undefined,
                    destinationLocationId: newRule.destinationLocationId || undefined,
                    sequence: Number(newRule.sequence),
                }),
            });
            setOpen(false);
            setNewRule({ action: 'PULL', sourceLocationId: '', destinationLocationId: '', sequence: 0 });
            load();
        } catch (err) {
            console.error(err);
        }
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
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Rule</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateRule} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Action</Label>
                                <Select
                                    value={newRule.action}
                                    onValueChange={(val) => setNewRule({ ...newRule, action: val })}
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
                                <Label>Source Location</Label>
                                <Select
                                    value={newRule.sourceLocationId}
                                    onValueChange={(val) => setNewRule({ ...newRule, sourceLocationId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Source (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (External/Vendor)</SelectItem>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Destination Location</Label>
                                <Select
                                    value={newRule.destinationLocationId}
                                    onValueChange={(val) => setNewRule({ ...newRule, destinationLocationId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Destination (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (External/Customer)</SelectItem>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sequence</Label>
                                <Input
                                    type="number"
                                    value={newRule.sequence}
                                    onChange={(e) => setNewRule({ ...newRule, sequence: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit">Add Rule</Button>
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
                                        {locations.find(l => l.id === rule.sourceLocationId)?.name || 'External'}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">To:</span>
                                    <span className="font-medium">
                                        {locations.find(l => l.id === rule.destinationLocationId)?.name || 'External'}
                                    </span>
                                </div>
                            </div>
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
