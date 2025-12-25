'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
    resource: string;
    action: string;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * PermissionGate component - conditionally renders children based on user permissions
 * 
 * @example
 * ```tsx
 * <PermissionGate resource="INVENTORY" action="CREATE">
 *   <Button>Create Product</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
    resource,
    action,
    children,
    fallback = null
}: PermissionGateProps) {
    const { hasPermission } = usePermission();

    if (!hasPermission(resource, action)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
