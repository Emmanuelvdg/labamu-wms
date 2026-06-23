
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createUser, updateUser } from '@/lib/api';
import { toast } from 'sonner';

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: any; // If provided, we are editing
    roles: any[];
    warehouses: any[];
    onSuccess: () => Promise<void> | void;
}

export function UserDialog({ open, onOpenChange, user, roles, warehouses, onSuccess }: UserDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        roleIds: [] as string[],
        warehouseIds: [] as string[],
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Don't show password
                roleIds: user.roles?.map((r: any) => r.id) || [],
                warehouseIds: user.warehouses?.map((w: any) => w.id) || [],
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                roleIds: [],
                warehouseIds: [],
            });
        }
    }, [user, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (user) {
                // Update
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password; // Don't send empty password
                await updateUser(user.id, updateData);
                toast.success('User updated successfully');
            } else {
                // Create
                await createUser(formData);
                toast.success('User created successfully');
            }
            await onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save user');
        }
    };

    const toggleRole = (roleId: string) => {
        setFormData(prev => {
            const newRoleIds = prev.roleIds.includes(roleId)
                ? prev.roleIds.filter(id => id !== roleId)
                : [...prev.roleIds, roleId];
            return { ...prev, roleIds: newRoleIds };
        });
    };

    const toggleWarehouse = (warehouseId: string) => {
        setFormData(prev => {
            const newWarehouseIds = prev.warehouseIds.includes(warehouseId)
                ? prev.warehouseIds.filter(id => id !== warehouseId)
                : [...prev.warehouseIds, warehouseId];
            return { ...prev, warehouseIds: newWarehouseIds };
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{user ? 'Edit User' : 'New User'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            data-testid="user-name-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            data-testid="user-email-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Password {user && '(Leave blank to keep unchanged)'}</Label>
                        <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!user}
                            data-testid="user-password-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Roles</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                            {roles.map((role) => (
                                <div key={role.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`role-${role.id}`}
                                        checked={formData.roleIds.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                                        {role.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Warehouses (Optional)</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                            {warehouses.map((w) => (
                                <div key={w.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`warehouse-${w.id}`}
                                        checked={formData.warehouseIds.includes(w.id)}
                                        onChange={() => toggleWarehouse(w.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor={`warehouse-${w.id}`} className="font-normal cursor-pointer">
                                        {w.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" data-testid="save-user-btn">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
