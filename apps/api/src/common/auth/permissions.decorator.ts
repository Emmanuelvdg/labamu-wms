import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permission';

/**
 * Decorator to require specific permission for route access
 * @param resource - The resource being accessed (e.g., 'INVENTORY', 'ORDERS')
 * @param action - The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * 
 * @example
 * @RequirePermission('INVENTORY', 'CREATE')
 * async createProduct(@Body() data: CreateProductDto) { ... }
 */
export const RequirePermission = (resource: string, action: string) =>
    SetMetadata(PERMISSIONS_KEY, { resource, action });
