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
import Link from 'next/link';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newWarehouse, setNewWarehouse] = useState({
        name: '',
        shortName: '',
        address: '',
        companyId: '',
        location: '',
        type: 'PHYSICAL',
        incomingSteps: '1_step',
        outgoingSteps: '1_step',
        dropshipSubcontractors: false,
        resupplySubcontractors: false,
        manufactureToResupply: false,
        manufactureSteps: '1_step',
        buyToResupply: false,
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
            setNewWarehouse({
                name: '',
                shortName: '',
                address: '',
                companyId: '',
                location: '',
                type: 'PHYSICAL',
                incomingSteps: '1_step',
                outgoingSteps: '1_step',
                dropshipSubcontractors: false,
                resupplySubcontractors: false,
                manufactureToResupply: false,
                manufactureSteps: '1_step',
                buyToResupply: false,
            });
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
                        <Button data-testid="create-warehouse-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Warehouse
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Warehouse</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Warehouse Name</Label>
                                    <Input
                                        required
                                        value={newWarehouse.name}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                                        placeholder="e.g., Main Warehouse"
                                        data-testid="warehouse-name-input"
                                    />
                                </div>
                                <div>
                                    <Label>Short Name</Label>
                                    <Input
                                        required
                                        maxLength={5}
                                        value={newWarehouse.shortName}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, shortName: e.target.value })}
                                        placeholder="e.g., WH-01"
                                        data-testid="warehouse-shortname-input"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Address</Label>
                                <Input
                                    required
                                    value={newWarehouse.address}
                                    onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                                    placeholder="Full Address"
                                    data-testid="warehouse-address-input"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Company</Label>
                                    <Input
                                        required
                                        value={newWarehouse.companyId}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, companyId: e.target.value })}
                                        placeholder="Company Name/ID"
                                        data-testid="warehouse-company-input"
                                    />
                                </div>
                                <div>
                                    <Label>Type</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newWarehouse.type}
                                        onChange={(e) => setNewWarehouse({ ...newWarehouse, type: e.target.value })}
                                        data-testid="warehouse-type-select"
                                    >
                                        <option value="PHYSICAL">Physical</option>
                                        <option value="VIRTUAL">Virtual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="font-semibold mb-2">Warehouse Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Incoming Shipments</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-gray-200"
                                            value={newWarehouse.incomingSteps}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, incomingSteps: e.target.value })}
                                        >
                                            <option value="1_step">Receive goods directly (1 step)</option>
                                            <option value="2_steps">Receive goods in input and then stock (2 steps)</option>
                                            <option value="3_steps">Receive goods in input, then quality and then stock (3 steps)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Outgoing Shipments</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-gray-200"
                                            value={newWarehouse.outgoingSteps}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, outgoingSteps: e.target.value })}
                                        >
                                            <option value="1_step">Deliver goods directly (1 step)</option>
                                            <option value="2_steps">Send goods in output and then deliver (2 steps)</option>
                                            <option value="3_steps">Pack goods, send goods in output and then deliver (3 steps)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="buyToResupply"
                                            checked={newWarehouse.buyToResupply}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, buyToResupply: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="buyToResupply">Buy to Resupply</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="manufactureToResupply"
                                            checked={newWarehouse.manufactureToResupply}
                                            onChange={(e) => setNewWarehouse({ ...newWarehouse, manufactureToResupply: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="manufactureToResupply">Manufacture to Resupply</Label>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" data-testid="submit-warehouse-btn">Create Warehouse</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((warehouse) => (
                    <Link href={`/inventory/warehouses/${warehouse.id}`} key={warehouse.id}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex flex-col">
                                    <CardTitle className="text-xl font-bold">
                                        {warehouse.name}
                                    </CardTitle>
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 w-fit">
                                        {warehouse.shortName || 'N/A'}
                                    </span>
                                </div>
                                <Building className="h-5 w-5 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-gray-500 mt-2">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {warehouse.address || warehouse.location?.address || 'No address'}
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
                    </Link>
                ))}
            </div>
        </div>
    );
}
