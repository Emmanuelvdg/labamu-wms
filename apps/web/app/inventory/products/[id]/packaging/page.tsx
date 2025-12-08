
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Packaging {
    id: string;
    name: string;
    type: string;
    quantity: number;
    width?: number;
    height?: number;
    depth?: number;
    weight?: number;
    barcode?: string;
}

export default function ProductPackagingPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [packagingList, setPackagingList] = useState<Packaging[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPackaging, setNewPackaging] = useState<Partial<Packaging>>({
        type: 'BOX',
        quantity: 1
    });

    useEffect(() => {
        fetchPackaging();
    }, [productId]);

    const fetchPackaging = async () => {
        try {
            const res = await fetch(`${API_URL}/inventory/products/${productId}/packaging`);
            if (res.ok) {
                const data = await res.json();
                setPackagingList(data);
            }
        } catch (error) {
            console.error('Failed to fetch packaging', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newPackaging.name || !newPackaging.quantity) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/inventory/products/${productId}/packaging`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPackaging,
                    productId,
                    quantity: Number(newPackaging.quantity),
                    width: newPackaging.width ? Number(newPackaging.width) : undefined,
                    height: newPackaging.height ? Number(newPackaging.height) : undefined,
                    depth: newPackaging.depth ? Number(newPackaging.depth) : undefined,
                    weight: newPackaging.weight ? Number(newPackaging.weight) : undefined,
                })
            });

            if (!res.ok) throw new Error('Failed to create');

            toast.success('Packaging unit created');
            setNewPackaging({ type: 'BOX', quantity: 1 });
            fetchPackaging();
        } catch (error) {
            toast.error('Failed to create packaging unit');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Product
                </Button>
                <h1 className="text-2xl font-bold">Manage Packaging Units</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Create New Form */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Add New Unit</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder="e.g. Box of 12"
                                value={newPackaging.name || ''}
                                onChange={e => setNewPackaging({ ...newPackaging, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={newPackaging.type}
                                onValueChange={val => setNewPackaging({ ...newPackaging, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BOX">Box</SelectItem>
                                    <SelectItem value="PALLET">Pallet</SelectItem>
                                    <SelectItem value="UNIT">Unit (Bundle)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantity (Base Units)</Label>
                            <Input
                                type="number"
                                value={newPackaging.quantity}
                                onChange={e => setNewPackaging({ ...newPackaging, quantity: Number(e.target.value) })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Width (cm)</Label>
                                <Input
                                    type="number"
                                    value={newPackaging.width || ''}
                                    onChange={e => setNewPackaging({ ...newPackaging, width: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Height (cm)</Label>
                                <Input
                                    type="number"
                                    value={newPackaging.height || ''}
                                    onChange={e => setNewPackaging({ ...newPackaging, height: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Depth (cm)</Label>
                                <Input
                                    type="number"
                                    value={newPackaging.depth || ''}
                                    onChange={e => setNewPackaging({ ...newPackaging, depth: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Weight (kg)</Label>
                                <Input
                                    type="number"
                                    value={newPackaging.weight || ''}
                                    onChange={e => setNewPackaging({ ...newPackaging, weight: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Unit
                        </Button>
                    </CardContent>
                </Card>

                {/* List Existing */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Existing Units</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div>Loading...</div>
                        ) : packagingList.length === 0 ? (
                            <div className="text-muted-foreground">No packaging units defined.</div>
                        ) : (
                            <div className="space-y-4">
                                {packagingList.map(pkg => (
                                    <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <div className="font-medium">{pkg.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {pkg.type} • {pkg.quantity} items
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {pkg.width}x{pkg.height}x{pkg.depth}cm • {pkg.weight}kg
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
