
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRoles, deleteRole } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function RolesPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoles();
    }, []);

    async function loadRoles() {
        try {
            const data = await fetchRoles();
            setRoles(data);
        } catch (error) {
            console.error('Failed to load roles:', error);
            toast.error('Failed to load roles');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await deleteRole(id);
            toast.success('Role deleted');
            loadRoles();
        } catch (error) {
            console.error('Failed to delete role:', error);
            toast.error('Failed to delete role');
        }
    }

    if (loading) return <div className="p-8">Loading roles...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Roles & Permissions
                    </h1>
                    <p className="text-gray-500">Manage user roles and access control.</p>
                </div>
                <Button onClick={() => router.push('/settings/roles/new')} data-testid="create-role-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                    <Card key={role.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">
                                {role.name}
                                {role.isSystem && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        System
                                    </span>
                                )}
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/settings/roles/${role.id}`)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                {!role.isSystem && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleDelete(role.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4">
                                {role.description || 'No description'}
                            </p>
                            <div className="text-sm text-gray-500">
                                <span className="font-medium text-gray-900">{role.permissions?.length || 0}</span> permissions configured
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                <span className="font-medium text-gray-900">{role._count?.users || 0}</span> users assigned
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
