export * from '@prisma/client';

export enum LocationType {
    VIEW = 'VIEW',
    INTERNAL = 'INTERNAL',
    VENDOR = 'VENDOR',
    CUSTOMER = 'CUSTOMER',
    INVENTORY_LOSS = 'INVENTORY_LOSS',
    PRODUCTION = 'PRODUCTION',
    TRANSIT = 'TRANSIT',
}
