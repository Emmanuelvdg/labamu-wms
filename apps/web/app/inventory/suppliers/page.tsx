"use client"

import { useState, useEffect } from 'react';
import { fetchSuppliers, createSupplier } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Link from 'next/link';
import { toast } from 'sonner';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', contactInfo: '' });

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            toast.error('Failed to load suppliers');
        }
    };

    const handleCreate = async () => {
        try {
            await createSupplier(newSupplier);
            toast.success('Supplier created successfully');
            setIsCreateOpen(false);
            setNewSupplier({ name: '', contactInfo: '' });
            loadSuppliers();
        } catch (error) {
            console.error('Failed to create supplier:', error);
            toast.error('Failed to create supplier');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Suppliers</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Supplier</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Supplier</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={newSupplier.name}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contact" className="text-right">
                                    Contact Info
                                </Label>
                                <Input
                                    id="contact"
                                    value={newSupplier.contactInfo}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, contactInfo: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No suppliers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/inventory/suppliers/${supplier.id}`} className="hover:underline">
                                            {supplier.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{supplier.contactInfo || '-'}</TableCell>
                                    <TableCell>{supplier._count?.purchaseOrders || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/inventory/suppliers/${supplier.id}`}>
                                                View
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
