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

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contactInfo: '' };

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState(EMPTY_FORM);

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            setSuppliers(data);
        } catch {
            toast.error('Failed to load suppliers');
        }
    };

    const handleCreate = async () => {
        try {
            await createSupplier(newSupplier);
            toast.success('Supplier created successfully');
            setIsCreateOpen(false);
            setNewSupplier(EMPTY_FORM);
            loadSuppliers();
        } catch {
            toast.error('Failed to create supplier');
        }
    };

    const field = (key: keyof typeof EMPTY_FORM, label: string, type = 'text') => (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={key} className="text-right">{label}</Label>
            <Input
                id={key}
                type={type}
                value={newSupplier[key]}
                onChange={e => setNewSupplier({ ...newSupplier, [key]: e.target.value })}
                className="col-span-3"
                data-testid={key === 'name' ? 'supplier-name-input' : undefined}
            />
        </div>
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Suppliers</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button data-testid="add-supplier-btn">Add Supplier</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Supplier</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {field('name', 'Name')}
                            {field('email', 'Email', 'email')}
                            {field('phone', 'Phone')}
                            {field('address', 'Address')}
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={!newSupplier.name} data-testid="create-supplier-submit">
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
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
                                    <TableCell>{supplier.email || '-'}</TableCell>
                                    <TableCell>{supplier.phone || '-'}</TableCell>
                                    <TableCell>{supplier._count?.purchaseOrders || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/inventory/suppliers/${supplier.id}`}>View</Link>
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
