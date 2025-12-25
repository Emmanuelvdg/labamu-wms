'use client';

import { useMemo } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface Permission {
    resource: string;
    action: string;
}

interface Role {
    id: string;
    name: string;
    permissions: Permission[];
}

interface User {
    id: string;
    email: string;
    name: string;
    roles: Role[];
}

export function usePermission() {
    const router = useRouter();

    // Get user from cookie
    const userStr = Cookies.get('user_data');
    const user: User | null = useMemo(() => {
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }, [userStr]);

    const permissions = useMemo(() => {
        if (!user || !user.roles) return [];

        const allPermissions: Permission[] = [];
        user.roles.forEach(role => {
            if (role.permissions) {
                allPermissions.push(...role.permissions);
            }
        });

        return allPermissions;
    }, [user]);

    const hasPermission = (resource: string, action: string): boolean => {
        if (!permissions || permissions.length === 0) return false;

        // Check for wildcard permissions (*:*)
        const hasWildcard = permissions.some(
            p => (p.resource === '*' && p.action === '*')
        );
        if (hasWildcard) return true;

        // Check for resource wildcard (ALL:action or *:action)
        const hasResourceWildcard = permissions.some(
            p => (p.resource === '*' || p.resource === 'ALL') && p.action === action
        );
        if (hasResourceWildcard) return true;

        // Check for action wildcard (resource:ALL or resource:*)
        const hasActionWildcard = permissions.some(
            p => p.resource === resource && (p.action === '*' || p.action === 'ALL' || p.action === 'MANAGE')
        );
        if (hasActionWildcard) return true;

        // Check for exact match
        return permissions.some(
            p => p.resource === resource && p.action === action
        );
    };

    const requirePermission = (resource: string, action: string) => {
        if (!hasPermission(resource, action)) {
            router.push('/unauthorized');
        }
    };

    return {
        hasPermission,
        requirePermission,
        user,
        permissions,
        isAuthenticated: !!user,
    };
}
