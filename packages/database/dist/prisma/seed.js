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
    var _a, _b;
    // ── 1. Default Company ────────────────────────────────────────────────
    // This is the "platform owner" company used for the initial admin account.
    // All existing data in the DB will be associated with this company during migration.
    const defaultCompany = await prisma.company.upsert({
        where: { slug: 'labamu' },
        update: {},
        create: {
            name: 'Labamu',
            slug: 'labamu',
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
        },
    });
    console.log(`✓ Default company: ${defaultCompany.name} (${defaultCompany.id})`);
    // ── 2. Admin Role (scoped to default company) ─────────────────────────
    const adminRole = await prisma.role.upsert({
        where: { name_companyId: { name: 'Admin', companyId: defaultCompany.id } },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrator with full access',
            isSystem: true,
            companyId: defaultCompany.id,
        },
    });
    console.log(`✓ Admin role: ${adminRole.id}`);
    // ── 3. Permissions ────────────────────────────────────────────────────
    const permissions = [
        { resource: 'ALL', action: 'MANAGE' },
        { resource: 'INVENTORY', action: 'READ' },
        { resource: 'INVENTORY', action: 'CREATE' },
        { resource: 'INVENTORY', action: 'UPDATE' },
        { resource: 'INVENTORY', action: 'DELETE' },
        { resource: 'ORDERS', action: 'READ' },
        { resource: 'ORDERS', action: 'CREATE' },
        { resource: 'ORDERS', action: 'UPDATE' },
        { resource: 'ORDERS', action: 'DELETE' },
        { resource: 'SETTINGS', action: 'READ' },
        { resource: 'SETTINGS', action: 'UPDATE' },
        { resource: 'PURCHASE_ORDERS', action: 'READ' },
        { resource: 'SUPPLIERS', action: 'READ' },
        { resource: 'INVOICES', action: 'READ' },
        { resource: 'REPORTS', action: 'READ' },
    ];
    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { roleId_resource_action: { roleId: adminRole.id, resource: p.resource, action: p.action } },
            update: {},
            create: { roleId: adminRole.id, resource: p.resource, action: p.action },
        });
    }
    console.log(`✓ Seeded ${permissions.length} permissions`);
    // ── 4. Admin User ─────────────────────────────────────────────────────
    const adminEmail = 'admin@labamu.co.id';
    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            companyId: defaultCompany.id,
            roles: { connect: { id: adminRole.id } },
        },
        create: {
            name: 'Admin User',
            email: adminEmail,
            password: await bcrypt.hash('admin', 10),
            companyId: defaultCompany.id,
            roles: { connect: { id: adminRole.id } },
        },
    });
    console.log(`✓ Admin user: ${adminUser.email} (${adminUser.id})`);
    // ── 5. Backfill companyId for pre-existing data ───────────────────────
    // Assigns all unscoped records to the default company so existing data
    // continues to work after the migration.
    const companyId = defaultCompany.id;
    const warehouseCount = await prisma.warehouse.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${warehouseCount.count} warehouses`);
    const productCount = await prisma.product.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${productCount.count} products`);
    const supplierCount = await prisma.supplier.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${supplierCount.count} suppliers`);
    const customerCount = await prisma.customer.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${customerCount.count} customers`);
    const userCount = await prisma.user.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${userCount.count} users`);
    const roleCount = await prisma.role.updateMany({
        where: { companyId: null },
        data: { companyId },
    });
    console.log(`✓ Backfilled ${roleCount.count} roles`);
    // ── 6. Default Workflow Templates ─────────────────────────────────────
    const defaultTemplates = [
        {
            name: 'Default 1-Step Shipping',
            triggerType: 'OUTBOUND',
            status: 'ACTIVE',
            steps: [
                { type: 'WAVELESS_PICK', name: 'Pick', isStart: true, order: 1, positionX: 100, positionY: 100 },
                { type: 'SHIP', name: 'Ship', isEnd: true, order: 2, positionX: 300, positionY: 100 }
            ],
            transitions: [{ fromStepName: 'Pick', toStepName: 'Ship', order: 1 }]
        },
        {
            name: 'Default 3-Step QC Outbound',
            triggerType: 'OUTBOUND',
            status: 'ACTIVE',
            steps: [
                { type: 'BATCH_PICK', name: 'Pick', isStart: true, order: 1, positionX: 100, positionY: 100 },
                { type: 'QC_INSPECT', name: 'QC', order: 2, positionX: 300, positionY: 100 },
                { type: 'PACK', name: 'Pack', order: 3, positionX: 500, positionY: 100 },
                { type: 'SHIP', name: 'Ship', isEnd: true, order: 4, positionX: 700, positionY: 100 }
            ],
            transitions: [
                { fromStepName: 'Pick', toStepName: 'QC', order: 1 },
                { fromStepName: 'QC', toStepName: 'Pack', order: 2 },
                { fromStepName: 'Pack', toStepName: 'Ship', order: 3 }
            ]
        },
        {
            name: 'Default 1-Step Receipt',
            triggerType: 'ROUTE',
            status: 'ACTIVE',
            steps: [
                { type: 'PUTAWAY', name: 'Putaway', isStart: true, isEnd: true, order: 1, positionX: 100, positionY: 100 }
            ],
            transitions: []
        },
    ];
    for (const tpl of defaultTemplates) {
        const existing = await prisma.workflowTemplate.findFirst({ where: { name: tpl.name } });
        if (!existing) {
            const template = await prisma.workflowTemplate.create({
                data: { name: tpl.name, triggerType: tpl.triggerType, status: tpl.status },
            });
            const stepRecords = {};
            for (const step of tpl.steps) {
                stepRecords[step.name] = await prisma.workflowStep.create({
                    data: {
                        templateId: template.id,
                        type: step.type,
                        name: step.name,
                        isStart: (_a = step.isStart) !== null && _a !== void 0 ? _a : false,
                        isEnd: (_b = step.isEnd) !== null && _b !== void 0 ? _b : false,
                        order: step.order,
                        positionX: step.positionX,
                        positionY: step.positionY,
                    },
                });
            }
            for (const trans of tpl.transitions) {
                await prisma.workflowTransition.create({
                    data: {
                        templateId: template.id,
                        fromStepId: stepRecords[trans.fromStepName].id,
                        toStepId: stepRecords[trans.toStepName].id,
                        order: trans.order,
                        condition: '{}',
                    },
                });
            }
        }
    }
    console.log('✓ Workflow templates seeded');
    console.log('\n✅ Seeding complete.');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map