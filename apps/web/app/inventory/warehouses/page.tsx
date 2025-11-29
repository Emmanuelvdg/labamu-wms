'use client';

import { useState, useEffect } from 'react';
import { fetchWarehouses, createWarehouse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, MapPin, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newWarehouse, setNewWarehouse] = useState({
        name: '',
        location: '',
        type: 'PHYSICAL',
    });

    useEffect(() => {
        loadWarehouses();
    }, []);

    async function loadWarehouses() {
        try {
            const data = await fetchWarehouses();
            setWarehouses(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await createWarehouse({
                ...newWarehouse,
                location: { address: newWarehouse.location }, // Simple location object for now
            });
            toast.success('Warehouse created successfully');
            setOpen(false);
            setNewWarehouse({ name: '', location: '', type: 'PHYSICAL' });
            loadWarehouses();
        } catch (err) {
            toast.error('Failed to create warehouse');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
                    <p className="text-gray-500">Manage your physical and virtual warehouses.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Warehouse
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Warehouse</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <Input
                                    required
                                    value={newWarehouse.name}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                                    placeholder="e.g., Main Warehouse"
                                />
                            </div>
                            <div>
                                <Label>Location (Address)</Label>
                                <Input
                                    required
                                    value={newWarehouse.location}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                                    placeholder="e.g., 123 Storage Lane"
                                />
                            </div>
                            <div>
                                <Label>Type</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newWarehouse.type}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, type: e.target.value })}
                                >
                                    <option value="PHYSICAL">Physical</option>
                                    <option value="VIRTUAL">Virtual</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full">Create Warehouse</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((warehouse) => (
                    <Card key={warehouse.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold">
                                {warehouse.name}
                            </CardTitle>
                            <Building className="h-5 w-5 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-gray-500 mt-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {warehouse.location?.address || 'No address'}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${warehouse.type === 'PHYSICAL'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                    {warehouse.type}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
