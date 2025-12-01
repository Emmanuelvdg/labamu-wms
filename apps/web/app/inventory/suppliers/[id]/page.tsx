"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupplier, updateSupplier, deleteSupplier, fetchSupplierOrders } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [supplier, setSupplier] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', contactInfo: '' });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [supplierData, ordersData] = await Promise.all([
                getSupplier(id),
                fetchSupplierOrders(id)
            ]);
            setSupplier(supplierData);
            setEditForm({ name: supplierData.name, contactInfo: supplierData.contactInfo || '' });
            setOrders(ordersData);
        } catch (error) {
            console.error('Failed to load supplier data:', error);
            toast.error('Failed to load supplier data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            await updateSupplier(id, editForm);
            toast.success('Supplier updated successfully');
            setIsEditing(false);
            loadData();
        } catch (error) {
            console.error('Failed to update supplier:', error);
            toast.error('Failed to update supplier');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
        try {
            await deleteSupplier(id);
            toast.success('Supplier deleted successfully');
            router.push('/inventory/suppliers');
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            toast.error('Failed to delete supplier');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!supplier) return <div className="p-8">Supplier not found</div>;

    return (
        <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold">{supplier.name}</h1>
                <div className="ml-auto flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleUpdate}>Save</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{supplier.stats?.totalOrders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${supplier.stats?.totalSpend?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items Purchased</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{supplier.stats?.totalItems || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="orders">Order History</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="contact">Contact Info</Label>
                                <Input
                                    id="contact"
                                    value={editForm.contactInfo}
                                    onChange={(e) => setEditForm({ ...editForm, contactInfo: e.target.value })}
                                    disabled={!isEditing}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                No orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                                                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{order.status}</TableCell>
                                                <TableCell>{order.totalItems}</TableCell>
                                                <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/inventory/purchases/${order.id}`}>
                                                            View
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
