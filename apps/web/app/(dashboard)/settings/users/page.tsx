
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchUsers, fetchRoles, fetchWarehouses, deleteUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { UserDialog } from '@/components/settings/UserDialog';
import { toast } from 'sonner';

export default function UsersPage() {
    const { data: users, mutate } = useSWR('users', fetchUsers);
    const { data: roles } = useSWR('roles', fetchRoles);
    const { data: warehouses } = useSWR('warehouses', fetchWarehouses);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await deleteUser(id);
            toast.success('User deleted');
            mutate();
        } catch (error: any) {
            toast.error('Failed to delete user');
        }
    };

    const handleSuccess = () => {
        mutate();
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">User Management</h1>
                <Button onClick={handleCreate} data-testid="create-user-btn"><Plus className="mr-2 h-4 w-4" /> New User</Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user: any) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.roles && user.roles.length > 0
                                        ? user.roles.map((r: any) => r.name).join(', ')
                                        : 'No Role'}
                                </TableCell>
                                <TableCell>
                                    {user.warehouses && user.warehouses.length > 0
                                        ? user.warehouses.map((w: any) => w.name).join(', ')
                                        : 'None'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(user.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {roles && warehouses && (
                <UserDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    user={selectedUser}
                    roles={roles}
                    warehouses={warehouses}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
