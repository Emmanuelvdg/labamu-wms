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

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contactInfo: '' };

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [supplier, setSupplier] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [supplierData, ordersData] = await Promise.all([
                getSupplier(id),
                fetchSupplierOrders(id),
            ]);
            setSupplier(supplierData);
            setEditForm({
                name: supplierData.name || '',
                email: supplierData.email || '',
                phone: supplierData.phone || '',
                address: supplierData.address || '',
                contactInfo: supplierData.contactInfo || '',
            });
            setOrders(ordersData);
        } catch {
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
        } catch {
            toast.error('Failed to update supplier');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
        try {
            await deleteSupplier(id);
            toast.success('Supplier deleted successfully');
            router.push('/inventory/suppliers');
        } catch {
            toast.error('Failed to delete supplier');
        }
    };

    const field = (key: keyof typeof EMPTY_FORM, label: string, type = 'text') => (
        <div className="grid w-full max-w-lg items-center gap-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
                id={key}
                type={type}
                value={editForm[key]}
                onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                disabled={!isEditing}
            />
        </div>
    );

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
                            <Button variant="outline" onClick={() => setShowInviteModal(true)}>
                                Invite to Portal
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
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
                            {field('name', 'Name')}
                            {field('email', 'Email', 'email')}
                            {field('phone', 'Phone')}
                            {field('address', 'Address')}
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
                                                        <Link href={`/inventory/purchases/${order.id}`}>View</Link>
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

            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-1">Invite to Supplier Portal</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Send an invitation link so this supplier can log in and view their purchase orders.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder={supplier.email || 'supplier@example.com'}
                                />
                            </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!inviteEmail || inviting}
                                onClick={async () => {
                                    setInviting(true);
                                    try {
                                        const res = await fetch(`/api/suppliers/${id}/invite`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email: inviteEmail }),
                                        });
                                        if (res.ok) {
                                            toast.success('Invitation sent successfully');
                                            setShowInviteModal(false);
                                            setInviteEmail('');
                                        } else {
                                            const err = await res.json().catch(() => ({}));
                                            toast.error(err.message || 'Failed to send invitation');
                                        }
                                    } finally {
                                        setInviting(false);
                                    }
                                }}
                            >
                                {inviting ? 'Sending…' : 'Send Invite'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
