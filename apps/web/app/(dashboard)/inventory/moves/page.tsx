'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight } from 'lucide-react';
import { API_URL } from '@/lib/api';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

export default function StockMovesPage() {
    const [moves, setMoves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        load();
    }, [activeTab]);

    async function load() {
        setLoading(true);
        try {
            let url = `${API_URL}/inventory/moves`;
            if (activeTab !== 'all') {
                url += `?status=${activeTab.toUpperCase()}`;
            }
            const res = await fetch(url);
            const result = await res.json();
            setMoves(Array.isArray(result) ? result : (result?.data ?? []));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleValidate = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/inventory/moves/${id}/validate`, {
                method: 'POST',
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to validate move');
            }

            load();
        } catch (err: any) {
            alert(err.message || 'Failed to validate move');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500';
            case 'WAITING': return 'bg-yellow-500';
            case 'READY': return 'bg-blue-500';
            case 'DONE': return 'bg-green-500';
            case 'CANCELLED': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Stock Moves</h1>
                    <p className="text-muted-foreground">Process and track product movements.</p>
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="waiting">Waiting</TabsTrigger>
                    <TabsTrigger value="ready">Ready</TabsTrigger>
                    <TabsTrigger value="done">Done</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6 space-y-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : moves.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No moves found.</div>
                    ) : (
                        moves.map(move => (
                            <Card key={move.id}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center space-x-6">
                                        <Badge className={`${getStatusColor(move.status)} text-white`}>
                                            {move.status}
                                        </Badge>
                                        <div>
                                            <div className="font-medium text-lg">{move.product?.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Qty: {move.quantity}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <div className="bg-secondary px-3 py-1 rounded">
                                                {move.sourceLocation?.name || 'Vendor'}
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <div className="bg-secondary px-3 py-1 rounded">
                                                {move.destinationLocation?.name || 'Customer'}
                                            </div>
                                        </div>
                                        {move.origin && (
                                            <div className="text-xs text-muted-foreground border px-2 py-1 rounded">
                                                {move.origin}
                                            </div>
                                        )}
                                    </div>

                                    {(move.status === 'DRAFT' || move.status === 'READY' || move.status === 'WAITING') && (
                                        <Button
                                            onClick={() => handleValidate(move.id)}
                                            disabled={move.status === 'WAITING'} // Maybe allow forcing?
                                        >
                                            <Check className="mr-2 h-4 w-4" /> Validate
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
