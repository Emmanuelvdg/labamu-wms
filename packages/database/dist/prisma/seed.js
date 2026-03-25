"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Seed Picking Strategies
    // Seed Picking Strategies (Temporarily commented out due to schema mismatch)
    /*
    const pickingStrategies = [
        { name: 'Single', rules: JSON.stringify({ description: 'Process one order at a time' }) },
        { name: 'Cluster', rules: JSON.stringify({ description: 'Group orders by zone' }) },
        { name: 'Wave', rules: JSON.stringify({ description: 'Collect orders in scheduled waves' }) },
        { name: 'Batch', rules: JSON.stringify({ description: 'Pick multiple orders simultaneously' }) },
    ];

    for (const strategy of pickingStrategies) {
        await prisma.pickingStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }

    // Seed Reservation Strategies
    const reservationStrategies = [
        { name: 'FIFO', rules: JSON.stringify({ description: 'First In, First Out' }) },
        { name: 'FEFO', rules: JSON.stringify({ description: 'First Expiry, First Out' }) },
        { name: 'Location', rules: JSON.stringify({ description: 'Prioritize specific warehouses' }) },
    ];

    for (const strategy of reservationStrategies) {
        await prisma.reservationStrategy.upsert({
            where: { name: strategy.name },
            update: {},
            create: strategy,
        });
    }
    */
    // Seed Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrator with full access',
        }
    });
    // Seed Permissions for Admin
    const permissions = [
        { resource: 'ALL', action: 'MANAGE', description: 'Full Access' },
        { resource: 'INVENTORY', action: 'READ', description: 'View Inventory' },
        { resource: 'INVENTORY', action: 'CREATE', description: 'Create Inventory' },
        { resource: 'INVENTORY', action: 'UPDATE', description: 'Update Inventory' },
        { resource: 'INVENTORY', action: 'DELETE', description: 'Delete Inventory' },
        { resource: 'ORDERS', action: 'READ', description: 'View Orders' },
        { resource: 'ORDERS', action: 'CREATE', description: 'Create Orders' },
        { resource: 'ORDERS', action: 'UPDATE', description: 'Update Orders' },
        { resource: 'ORDERS', action: 'DELETE', description: 'Delete Orders' },
        { resource: 'SETTINGS', action: 'READ', description: 'View Settings' },
        { resource: 'SETTINGS', action: 'UPDATE', description: 'Update Settings' },
        { resource: 'PURCHASE_ORDERS', action: 'READ', description: 'View Purchase Orders' },
        { resource: 'SUPPLIERS', action: 'READ', description: 'View Suppliers' },
        { resource: 'INVOICES', action: 'READ', description: 'View Invoices' },
        { resource: 'REPORTS', action: 'READ', description: 'View Reports' },
    ];
    for (const p of permissions) {
        await prisma.permission.upsert({
            where: {
                roleId_resource_action: {
                    roleId: adminRole.id,
                    resource: p.resource,
                    action: p.action
                }
            },
            update: {},
            create: {
                roleId: adminRole.id,
                resource: p.resource,
                action: p.action,
            },
        });
    }
    // Seed Admin User
    const adminEmail = 'admin@labamu.co.id';
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            roles: {
                connect: { id: adminRole.id }
            }
        },
        create: {
            name: 'Admin User',
            email: adminEmail,
            password: await bcrypt.hash('password123', 10),
            roles: {
                connect: { id: adminRole.id }
            }
        }
    });
    console.log('Seeding completed.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map