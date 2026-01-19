
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRole, createRole, updateRole } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const RESOURCES = [
    'INVENTORY',
    'ORDERS',
    'PURCHASE_ORDERS',
    'PICKING',
    'SUPPLIERS',
    'CUSTOMERS',
    'REPORTS',
    'SETTINGS'
];

const ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'];

export default function RoleEditorPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState({
        name: '',
        description: '',
        permissions: [] as { resource: string; action: string }[]
    });

    useEffect(() => {
        if (!isNew) {
            loadRole();
        }
    }, [id]);

    async function loadRole() {
        try {
            const data = await getRole(id);
            setRole({
                name: data.name,
                description: data.description || '',
                permissions: data.permissions || []
            });
        } catch (error) {
            console.error('Failed to load role:', error);
            toast.error('Failed to load role');
        } finally {
            setLoading(false);
        }
    }

    function togglePermission(resource: string, action: string) {
        setRole(prev => {
            const exists = prev.permissions.some(p => p.resource === resource && p.action === action);
            let newPermissions;
            if (exists) {
                newPermissions = prev.permissions.filter(p => !(p.resource === resource && p.action === action));
            } else {
                newPermissions = [...prev.permissions, { resource, action }];
            }
            return { ...prev, permissions: newPermissions };
        });
    }

    function toggleRow(resource: string) {
        setRole(prev => {
            const allSelected = ACTIONS.every(action =>
                prev.permissions.some(p => p.resource === resource && p.action === action)
            );

            let newPermissions = [...prev.permissions];
            if (allSelected) {
                // Deselect all for this resource
                newPermissions = newPermissions.filter(p => p.resource !== resource);
            } else {
                // Select all for this resource
                ACTIONS.forEach(action => {
                    if (!newPermissions.some(p => p.resource === resource && p.action === action)) {
                        newPermissions.push({ resource, action });
                    }
                });
            }
            return { ...prev, permissions: newPermissions };
        });
    }

    async function handleSave() {
        if (!role.name) {
            toast.error('Role name is required');
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                await createRole(role);
                toast.success('Role created');
            } else {
                await updateRole(id, role);
                toast.success('Role updated');
            }
            router.push('/settings/roles');
        } catch (error) {
            console.error('Failed to save role:', error);
            toast.error('Failed to save role');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Loading role...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold">{isNew ? 'Create Role' : 'Edit Role'}</h1>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Role Name</Label>
                            <Input
                                id="name"
                                value={role.name}
                                onChange={(e) => setRole({ ...role, name: e.target.value })}
                                placeholder="e.g. Warehouse Manager"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={role.description}
                                onChange={(e) => setRole({ ...role, description: e.target.value })}
                                placeholder="Role description"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="text-left p-2 border-b">Resource</th>
                                        {ACTIONS.map(action => (
                                            <th key={action} className="text-center p-2 border-b text-sm font-medium text-gray-500">
                                                {action}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {RESOURCES.map(resource => (
                                        <tr key={resource} className="hover:bg-gray-50">
                                            <td className="p-3 border-b font-medium">
                                                <button
                                                    onClick={() => toggleRow(resource)}
                                                    className="hover:underline text-left"
                                                >
                                                    {resource.replace('_', ' ')}
                                                </button>
                                            </td>
                                            {ACTIONS.map(action => {
                                                const isChecked = role.permissions.some(
                                                    p => p.resource === resource && p.action === action
                                                );
                                                return (
                                                    <td key={action} className="text-center p-3 border-b">
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={() => togglePermission(resource, action)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Role'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
