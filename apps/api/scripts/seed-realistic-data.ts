/**
 * Realistic Seed Data — Labamu IMS
 * ============================================================
 * Populates a complete, testable dataset covering:
 *   - 2 Warehouses (Distribution Center + Secondary Depot)
 *   - Full location hierarchy with zone-based putaway structure
 *   - Location attribute definitions + cold-zone attribute values
 *   - Warehouse functional areas (Receiving → Staging → Putaway → Storage → Picking → Packing → Shipping)
 *   - 5 Product categories, 3 Suppliers, 4 Customers
 *   - 15 Products across categories with velocity/ABC classification
 *   - Product packaging configurations
 *   - Putaway rules covering velocity class, product type, and weight routing
 *   - Inventory batches placed into specific bins (FIFO-ready)
 *   - ProductInventory totals per warehouse
 *   - 4 Purchase Orders in varying approval/receipt states
 *   - 8 Sales Orders in varying fulfillment states
 *   - Rotation rules (FEFO, FIFO) and reorder rules
 *   - Delivery methods and routes
 *
 * HOW TO RUN:
 *   From the repo root:
 *     npx ts-node --project apps/api/tsconfig.json \
 *       -r tsconfig-paths/register \
 *       apps/api/scripts/seed-realistic-data.ts
 *
 *   Or from apps/api/:
 *     npx ts-node -r tsconfig-paths/register scripts/seed-realistic-data.ts
 *
 * SAFE TO RE-RUN: all entities are upserted / findOrCreate guarded.
 * Run against a fresh DB for cleanest results.
 * ============================================================
 */

import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

function daysFromNow(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

async function findOrCreateLocation(
    data: {
        name: string;
        warehouseId: string;
        parentId?: string | null;
        type: string;
        structuralType: string;
        code?: string;
        zonePriority?: number;
        putawaySequence?: number;
        maxWeight?: number;
        maxVolume?: number;
        innerHeight?: number;
        innerLength?: number;
        innerWidth?: number;
    }
) {
    const existing = await prisma.location.findFirst({
        where: { warehouseId: data.warehouseId, name: data.name, parentId: data.parentId ?? null }
    });
    if (existing) return existing;

    // Prisma v5 runtime rejects `parentId` as a direct scalar on Location creates —
    // the generated client only accepts the `parent: { connect }` relation form.
    const { parentId, ...rest } = data;
    return prisma.location.create({
        data: {
            ...rest,
            ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
        }
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🌱  Labamu IMS — Realistic Seed Data\n');

    // =========================================================================
    // 1. CATEGORIES
    // =========================================================================
    console.log('── 1. Categories');
    const categoryNames = [
        'Laptops & Computers',
        'Peripherals & Accessories',
        'Monitors & Displays',
        'Office Supplies',
        'Printing & Imaging',
    ];
    const categories: Record<string, string> = {};
    for (const name of categoryNames) {
        const cat = await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name, description: `${name} product category` },
        });
        categories[name] = cat.id;
        console.log(`   ✅ ${name}`);
    }

    // =========================================================================
    // 2. SUPPLIERS
    // =========================================================================
    console.log('── 2. Suppliers');
    const supplierData = [
        { name: 'TechSupply Co.',     contactInfo: 'sales@techsupply.co | +62 21 5551001 | Sudirman Tower, Jakarta' },
        { name: 'OfficeWorld Ltd.',   contactInfo: 'orders@officeworld.id | +62 21 5552002 | Tanah Abang, Jakarta' },
        { name: 'GlobalImport Inc.',  contactInfo: 'trade@globalimport.sg | +65 6553003 | Jurong East, Singapore' },
    ];
    const suppliers: Record<string, string> = {};
    for (const s of supplierData) {
        const sup = await prisma.supplier.upsert({
            where: { name: s.name },
            update: { contactInfo: s.contactInfo },
            create: s,
        });
        suppliers[s.name] = sup.id;
        console.log(`   ✅ ${s.name}`);
    }

    // =========================================================================
    // 3. CUSTOMERS
    // =========================================================================
    console.log('── 3. Customers');
    const customerData = [
        { name: 'Acme Corporation',  address: 'Jl. Gatot Subroto No. 51',  city: 'Jakarta',   state: 'DKI Jakarta', country: 'ID', postalCode: '12950', phone: '+62 21 5554001' },
        { name: 'StartupHub ID',     address: 'Jl. Kebon Jeruk No. 12',    city: 'Jakarta',   state: 'DKI Jakarta', country: 'ID', postalCode: '11530', phone: '+62 21 5554002' },
        { name: 'MegaRetail Group',  address: 'Jl. Raya Darmo No. 88',     city: 'Surabaya',  state: 'Jawa Timur',  country: 'ID', postalCode: '60264', phone: '+62 31 5554003' },
        { name: 'EduTech Nusantara', address: 'Jl. Diponegoro No. 22',     city: 'Bandung',   state: 'Jawa Barat',  country: 'ID', postalCode: '40115', phone: '+62 22 5554004' },
    ];
    const customers: Record<string, string> = {};
    for (const c of customerData) {
        let cust = await prisma.customer.findFirst({ where: { name: c.name } });
        if (!cust) cust = await prisma.customer.create({ data: c });
        customers[c.name] = cust.id;
        console.log(`   ✅ ${c.name}`);
    }

    // =========================================================================
    // 4. DELIVERY METHODS
    // =========================================================================
    console.log('── 4. Delivery Methods');
    const deliveryMethodData = [
        { name: 'Standard Delivery',  provider: 'JNE',      carrier: 'JNE',      fixedPrice: 25000.0 },
        { name: 'Express Delivery',   provider: 'J&T',      carrier: 'J&T',      fixedPrice: 45000.0 },
        { name: 'Same-Day Delivery',  provider: 'Lalamove', carrier: 'Lalamove', fixedPrice: 75000.0 },
    ];
    const deliveryMethods: Record<string, string> = {};
    for (const dm of deliveryMethodData) {
        let method = await prisma.deliveryMethod.findFirst({ where: { name: dm.name } });
        if (!method) method = await prisma.deliveryMethod.create({ data: { ...dm, active: true } });
        deliveryMethods[dm.name] = method.id;
        console.log(`   ✅ ${dm.name}`);
    }

    // =========================================================================
    // 5. LOCATION ATTRIBUTE DEFINITIONS
    // =========================================================================
    console.log('── 5. Location Attribute Definitions');
    const attrDefData = [
        { name: 'Zone Type',            type: 'SELECT',  options: JSON.stringify(['Fast-Moving', 'Medium-Moving', 'Slow-Moving', 'Bulk', 'Cold Storage', 'Hazmat']) },
        { name: 'Temperature Min (°C)', type: 'NUMBER',  options: null },
        { name: 'Temperature Max (°C)', type: 'NUMBER',  options: null },
        { name: 'Humidity Max (%)',      type: 'NUMBER',  options: null },
        { name: 'Bin Type',             type: 'SELECT',  options: JSON.stringify(['Standard Rack', 'Pallet Ground', 'Cantilever', 'Flow Rack', 'Cold Rack']) },
        { name: 'Max Pallets',          type: 'NUMBER',  options: null },
        { name: 'Clearance Height (cm)',type: 'NUMBER',  options: null },
        { name: 'Supports Cold Chain',  type: 'SELECT',  options: JSON.stringify(['Yes', 'No']) },
        { name: 'Flammable Safe',       type: 'SELECT',  options: JSON.stringify(['Yes', 'No']) },
    ];
    const attrDefs: Record<string, string> = {};
    for (const def of attrDefData) {
        const existing = await prisma.locationAttributeDefinition.findUnique({ where: { name: def.name } });
        const record = existing ?? await prisma.locationAttributeDefinition.create({ data: def });
        attrDefs[def.name] = record.id;
        console.log(`   ✅ ${def.name}`);
    }

    // =========================================================================
    // 6. WAREHOUSE 1 — Distribution Center Jakarta (3-step in, 3-step out)
    // =========================================================================
    console.log('── 6. Distribution Center Jakarta (DC-JKT)');

    let dc = await prisma.warehouse.findFirst({ where: { name: 'Distribution Center Jakarta' } });

    // Create view/root location first so we can link it
    let dcView = dc?.viewLocationId
        ? await prisma.location.findUnique({ where: { id: dc.viewLocationId } })
        : null;

    if (!dc) {
        // Temporarily create warehouse without viewLocationId
        dc = await prisma.warehouse.create({
            data: {
                name:           'Distribution Center Jakarta',
                shortName:      'DC-JKT',
                type:           'PHYSICAL',
                status:         'Enabled',
                address:        'Jl. Raya Bekasi KM 18',
                city:           'Jakarta',
                state:          'DKI Jakarta',
                postalCode:     '13930',
                country:        'ID',
                phone:          '+62 21 4601000',
                incomingSteps:  '3_steps',
                outgoingSteps:  '3_steps',
                gridEnabled:    true,
                gridSize:       1.0,
                floorPlanWidth:  100.0,
                floorPlanHeight: 60.0,
            }
        });
        console.log(`   ✅ Warehouse created (ID: ${dc.id})`);
    } else {
        console.log(`   ✅ Warehouse exists (ID: ${dc.id})`);
    }

    if (!dcView) {
        dcView = await prisma.location.create({
            data: {
                name:           'Distribution Center Jakarta',
                type:           'INTERNAL',
                structuralType: 'WAREHOUSE',
                warehouseId:    dc.id,
                code:           'DC-JKT',
            } as any
        });
        await prisma.warehouse.update({ where: { id: dc.id }, data: { viewLocationId: dcView.id } });
        console.log(`   ✅ View location created`);
    }

    // ── 6a. Functional Areas for DC
    const dcFunctionalAreaData = [
        { areaType: 'RECEIVING',    name: 'Receiving Dock',   color: '#3B82F6', sequence: 1 },
        { areaType: 'STAGING',      name: 'Staging Area',     color: '#F59E0B', sequence: 2 },
        { areaType: 'PUTAWAY_LANE', name: 'Putaway Lane',     color: '#8B5CF6', sequence: 3 },
        { areaType: 'STORAGE',      name: 'Storage',          color: '#10B981', sequence: 4 },
        { areaType: 'PICKING',      name: 'Picking Zone',     color: '#EC4899', sequence: 5 },
        { areaType: 'PACKING',      name: 'Packing Area',     color: '#F97316', sequence: 6 },
        { areaType: 'SHIPPING',     name: 'Shipping Dock',    color: '#06B6D4', sequence: 7 },
    ];
    const dcAreas: Record<string, string> = {};
    for (const area of dcFunctionalAreaData) {
        let fa = await prisma.warehouseFunctionalArea.findFirst({
            where: { warehouseId: dc.id, areaType: area.areaType }
        });
        if (!fa) {
            fa = await prisma.warehouseFunctionalArea.create({
                data: {
                    warehouseId: dc.id,
                    name:        area.name,
                    areaType:    area.areaType,
                    color:       area.color,
                    sequence:    area.sequence,
                    active:      true,
                    shapeType:   'rectangle',
                    x: (area.sequence - 1) * 14,
                    y: 0,
                    width:  12,
                    height: 8,
                }
            });
        }
        dcAreas[area.areaType] = fa.id;
    }
    console.log('   ✅ Functional areas (7)');

    // ── 6b. Operational locations (linked to functional areas)
    const dcReceivingDock = await findOrCreateLocation({
        name: 'Receiving Dock', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'RCV',
        zonePriority: 0, putawaySequence: 0,
    });
    const dcStagingArea = await findOrCreateLocation({
        name: 'Staging Area', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'STG',
        zonePriority: 0, putawaySequence: 0,
    });
    const dcPutawayLane = await findOrCreateLocation({
        name: 'Putaway Lane', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'PUT',
        zonePriority: 0, putawaySequence: 0,
    });
    const dcPickingZone = await findOrCreateLocation({
        name: 'Picking Zone', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'PCK',
        zonePriority: 0, putawaySequence: 0,
    });
    const dcPackingArea = await findOrCreateLocation({
        name: 'Packing Area', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'PKG',
        zonePriority: 0, putawaySequence: 0,
    });
    const dcShippingDock = await findOrCreateLocation({
        name: 'Shipping Dock', warehouseId: dc.id, parentId: dcView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'SHP',
        zonePriority: 0, putawaySequence: 0,
    });

    // Link operational locations → functional areas
    const areaLocationLinks: Array<[string, string]> = [
        [dcAreas['RECEIVING'],    dcReceivingDock.id],
        [dcAreas['STAGING'],      dcStagingArea.id],
        [dcAreas['PUTAWAY_LANE'], dcPutawayLane.id],
        [dcAreas['PICKING'],      dcPickingZone.id],
        [dcAreas['PACKING'],      dcPackingArea.id],
        [dcAreas['SHIPPING'],     dcShippingDock.id],
    ];
    for (const [faId, locId] of areaLocationLinks) {
        await prisma.warehouseFunctionalArea.update({
            where: { id: faId },
            data: { linkedLocationId: locId }
        });
    }
    console.log('   ✅ Operational locations linked');

    // ── 6c. Storage Location Hierarchy
    //
    // Zone A — Fast-Moving  (zonePriority: 10) → Class A products (electronics, peripherals)
    //   Aisle A1 → Shelves A1-1..A1-3 → Bins A1-1-01..A1-1-05 (per shelf)
    //   Aisle A2 → Shelves A2-1..A2-3 → Bins A2-1-01..A2-1-05 (per shelf)
    //
    // Zone B — Medium-Moving (zonePriority: 30) → Class B products (monitors, printers)
    //   Aisle B1 → Shelves B1-1..B1-4 → Bins B1-1-01..B1-1-04 (per shelf)
    //   Aisle B2 → Shelves B2-1..B2-4 → Bins B2-1-01..B2-1-04 (per shelf)
    //
    // Zone C — Slow/Bulk     (zonePriority: 60) → Class C (office supplies, bulk)
    //   Aisle C1 → Shelves C1-1..C1-3 → Bins C1-1-01..C1-1-03 (per shelf)
    //   Aisle C2 → Shelves C2-1..C2-2 → Bins C2-1-01..C2-1-03 (per shelf)
    //
    // Zone COLD — Cold Chain (zonePriority: 40) → Temperature-sensitive (ink, photo media)
    //   Aisle F1 → Shelves F1-1..F1-2 → Bins F1-1-01..F1-1-04 (per shelf)

    interface ZoneDef {
        name: string; code: string; zonePriority: number;
        aisles: Array<{
            name: string; code: string; putawaySeq: number;
            shelves: Array<{
                name: string; code: string; putawaySeq: number;
                bins: Array<{ name: string; code: string; putawaySeq: number }>;
            }>;
        }>;
    }

    const zoneDefs: ZoneDef[] = [
        {
            name: 'Zone A — Fast Moving', code: 'ZA', zonePriority: 10,
            aisles: [
                {
                    name: 'Aisle A1', code: 'A1', putawaySeq: 10,
                    shelves: [
                        { name: 'Shelf A1-1', code: 'A1-1', putawaySeq: 11,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A1-1-0${n}`, code: `A1-1-0${n}`, putawaySeq: 110 + n })) },
                        { name: 'Shelf A1-2', code: 'A1-2', putawaySeq: 12,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A1-2-0${n}`, code: `A1-2-0${n}`, putawaySeq: 120 + n })) },
                        { name: 'Shelf A1-3', code: 'A1-3', putawaySeq: 13,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A1-3-0${n}`, code: `A1-3-0${n}`, putawaySeq: 130 + n })) },
                    ]
                },
                {
                    name: 'Aisle A2', code: 'A2', putawaySeq: 20,
                    shelves: [
                        { name: 'Shelf A2-1', code: 'A2-1', putawaySeq: 21,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A2-1-0${n}`, code: `A2-1-0${n}`, putawaySeq: 210 + n })) },
                        { name: 'Shelf A2-2', code: 'A2-2', putawaySeq: 22,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A2-2-0${n}`, code: `A2-2-0${n}`, putawaySeq: 220 + n })) },
                        { name: 'Shelf A2-3', code: 'A2-3', putawaySeq: 23,
                          bins: [1,2,3,4,5].map(n => ({ name: `Bin A2-3-0${n}`, code: `A2-3-0${n}`, putawaySeq: 230 + n })) },
                    ]
                },
            ]
        },
        {
            name: 'Zone B — Medium Moving', code: 'ZB', zonePriority: 30,
            aisles: [
                {
                    name: 'Aisle B1', code: 'B1', putawaySeq: 100,
                    shelves: [
                        { name: 'Shelf B1-1', code: 'B1-1', putawaySeq: 101,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B1-1-0${n}`, code: `B1-1-0${n}`, putawaySeq: 1010 + n })) },
                        { name: 'Shelf B1-2', code: 'B1-2', putawaySeq: 102,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B1-2-0${n}`, code: `B1-2-0${n}`, putawaySeq: 1020 + n })) },
                        { name: 'Shelf B1-3', code: 'B1-3', putawaySeq: 103,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B1-3-0${n}`, code: `B1-3-0${n}`, putawaySeq: 1030 + n })) },
                        { name: 'Shelf B1-4', code: 'B1-4', putawaySeq: 104,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B1-4-0${n}`, code: `B1-4-0${n}`, putawaySeq: 1040 + n })) },
                    ]
                },
                {
                    name: 'Aisle B2', code: 'B2', putawaySeq: 110,
                    shelves: [
                        { name: 'Shelf B2-1', code: 'B2-1', putawaySeq: 111,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B2-1-0${n}`, code: `B2-1-0${n}`, putawaySeq: 1110 + n })) },
                        { name: 'Shelf B2-2', code: 'B2-2', putawaySeq: 112,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B2-2-0${n}`, code: `B2-2-0${n}`, putawaySeq: 1120 + n })) },
                        { name: 'Shelf B2-3', code: 'B2-3', putawaySeq: 113,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B2-3-0${n}`, code: `B2-3-0${n}`, putawaySeq: 1130 + n })) },
                        { name: 'Shelf B2-4', code: 'B2-4', putawaySeq: 114,
                          bins: [1,2,3,4].map(n => ({ name: `Bin B2-4-0${n}`, code: `B2-4-0${n}`, putawaySeq: 1140 + n })) },
                    ]
                },
            ]
        },
        {
            name: 'Zone C — Bulk / Slow Moving', code: 'ZC', zonePriority: 60,
            aisles: [
                {
                    name: 'Aisle C1', code: 'C1', putawaySeq: 200,
                    shelves: [
                        { name: 'Shelf C1-1', code: 'C1-1', putawaySeq: 201,
                          bins: [1,2,3].map(n => ({ name: `Bin C1-1-0${n}`, code: `C1-1-0${n}`, putawaySeq: 2010 + n })) },
                        { name: 'Shelf C1-2', code: 'C1-2', putawaySeq: 202,
                          bins: [1,2,3].map(n => ({ name: `Bin C1-2-0${n}`, code: `C1-2-0${n}`, putawaySeq: 2020 + n })) },
                        { name: 'Shelf C1-3', code: 'C1-3', putawaySeq: 203,
                          bins: [1,2,3].map(n => ({ name: `Bin C1-3-0${n}`, code: `C1-3-0${n}`, putawaySeq: 2030 + n })) },
                    ]
                },
                {
                    name: 'Aisle C2', code: 'C2', putawaySeq: 210,
                    shelves: [
                        { name: 'Shelf C2-1', code: 'C2-1', putawaySeq: 211,
                          bins: [1,2,3].map(n => ({ name: `Bin C2-1-0${n}`, code: `C2-1-0${n}`, putawaySeq: 2110 + n })) },
                        { name: 'Shelf C2-2', code: 'C2-2', putawaySeq: 212,
                          bins: [1,2,3].map(n => ({ name: `Bin C2-2-0${n}`, code: `C2-2-0${n}`, putawaySeq: 2120 + n })) },
                    ]
                },
            ]
        },
        {
            name: 'Zone COLD — Cold Chain Storage', code: 'ZCLD', zonePriority: 40,
            aisles: [
                {
                    name: 'Aisle F1', code: 'F1', putawaySeq: 150,
                    shelves: [
                        { name: 'Shelf F1-1', code: 'F1-1', putawaySeq: 151,
                          bins: [1,2,3,4].map(n => ({ name: `Bin F1-1-0${n}`, code: `F1-1-0${n}`, putawaySeq: 1510 + n })) },
                        { name: 'Shelf F1-2', code: 'F1-2', putawaySeq: 152,
                          bins: [1,2,3,4].map(n => ({ name: `Bin F1-2-0${n}`, code: `F1-2-0${n}`, putawaySeq: 1520 + n })) },
                    ]
                },
            ]
        },
    ];

    // Collect all bin IDs for later batch placement
    const allBins: Record<string, { id: string; zonePriority: number; zone: string }> = {};
    let totalLocations = 0;

    for (const zone of zoneDefs) {
        const zoneRoot = await findOrCreateLocation({
            name: zone.name, warehouseId: dc.id, parentId: dcView.id,
            type: 'INTERNAL', structuralType: 'ROOM', code: zone.code,
            zonePriority: zone.zonePriority, putawaySequence: zone.zonePriority,
        });
        totalLocations++;

        // Link STORAGE zone root to functional area
        if (zone.code === 'ZA') {
            await prisma.warehouseFunctionalArea.update({
                where: { id: dcAreas['STORAGE'] },
                data: { linkedLocationId: zoneRoot.id }
            });
        }

        // Apply Zone Type attribute to zone root
        const zoneTypeLabel = zone.zonePriority <= 20 ? 'Fast-Moving'
            : zone.zonePriority <= 50 ? (zone.code === 'ZCLD' ? 'Cold Storage' : 'Medium-Moving')
            : 'Slow-Moving';

        const existingZoneAttr = await prisma.locationAttribute.findFirst({
            where: { locationId: zoneRoot.id, definitionId: attrDefs['Zone Type'] }
        });
        if (!existingZoneAttr) {
            await prisma.locationAttribute.create({
                data: { locationId: zoneRoot.id, definitionId: attrDefs['Zone Type'], value: zoneTypeLabel }
            });
        }

        for (const aisle of zone.aisles) {
            const aisleNode = await findOrCreateLocation({
                name: aisle.name, warehouseId: dc.id, parentId: zoneRoot.id,
                type: 'INTERNAL', structuralType: 'ROW', code: aisle.code,
                zonePriority: zone.zonePriority, putawaySequence: aisle.putawaySeq,
            });
            totalLocations++;

            for (const shelf of aisle.shelves) {
                const shelfNode = await findOrCreateLocation({
                    name: shelf.name, warehouseId: dc.id, parentId: aisleNode.id,
                    type: 'INTERNAL', structuralType: 'SHELF', code: shelf.code,
                    zonePriority: zone.zonePriority, putawaySequence: shelf.putawaySeq,
                    maxWeight: 500, innerHeight: 50, innerLength: 120, innerWidth: 80,
                });
                totalLocations++;

                for (const bin of shelf.bins) {
                    const binNode = await findOrCreateLocation({
                        name: bin.name, warehouseId: dc.id, parentId: shelfNode.id,
                        type: 'INTERNAL', structuralType: 'POSITION', code: bin.code,
                        zonePriority: zone.zonePriority, putawaySequence: bin.putawaySeq,
                        maxWeight: 100, maxVolume: 0.08,
                        innerHeight: 45, innerLength: 60, innerWidth: 40,
                    });
                    allBins[bin.code] = { id: binNode.id, zonePriority: zone.zonePriority, zone: zone.code };
                    totalLocations++;

                    // Annotate cold bins
                    if (zone.code === 'ZCLD') {
                        for (const [attrName, attrVal] of [
                            ['Temperature Min (°C)', '2'],
                            ['Temperature Max (°C)', '18'],
                            ['Supports Cold Chain',  'Yes'],
                            ['Bin Type',             'Cold Rack'],
                        ] as [string, string][]) {
                            const existingAttr = await prisma.locationAttribute.findFirst({
                                where: { locationId: binNode.id, definitionId: attrDefs[attrName] }
                            });
                            if (!existingAttr) {
                                await prisma.locationAttribute.create({
                                    data: { locationId: binNode.id, definitionId: attrDefs[attrName], value: attrVal }
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    console.log(`   ✅ Storage hierarchy — ${totalLocations} locations across 4 zones`);

    // =========================================================================
    // 7. WAREHOUSE 2 — Secondary Depot Surabaya (1-step in, 1-step out)
    // =========================================================================
    console.log('── 7. Secondary Depot Surabaya (DEP-SBY)');

    let dep = await prisma.warehouse.findFirst({ where: { name: 'Secondary Depot Surabaya' } });
    let depView: any = dep?.viewLocationId
        ? await prisma.location.findUnique({ where: { id: dep.viewLocationId } })
        : null;

    if (!dep) {
        dep = await prisma.warehouse.create({
            data: {
                name:           'Secondary Depot Surabaya',
                shortName:      'DEP-SBY',
                type:           'PHYSICAL',
                status:         'Enabled',
                address:        'Jl. Rungkut Industri No. 9',
                city:           'Surabaya',
                state:          'Jawa Timur',
                postalCode:     '60293',
                country:        'ID',
                phone:          '+62 31 8471001',
                incomingSteps:  '1_step',
                outgoingSteps:  '1_step',
                gridEnabled:    false,
                floorPlanWidth:  40.0,
                floorPlanHeight: 25.0,
            }
        });
        console.log(`   ✅ Warehouse created (ID: ${dep.id})`);
    } else {
        console.log(`   ✅ Warehouse exists (ID: ${dep.id})`);
    }

    if (!depView) {
        depView = await prisma.location.create({
            data: {
                name: 'Secondary Depot Surabaya', type: 'INTERNAL',
                structuralType: 'WAREHOUSE', warehouseId: dep.id, code: 'DEP-SBY',
            } as any
        });
        await prisma.warehouse.update({ where: { id: dep.id }, data: { viewLocationId: depView.id } });
    }

    // Minimal functional areas for 1-step warehouse
    for (const area of [
        { areaType: 'RECEIVING', name: 'Receiving', color: '#3B82F6', sequence: 1 },
        { areaType: 'STORAGE',   name: 'Storage',   color: '#10B981', sequence: 2 },
        { areaType: 'SHIPPING',  name: 'Shipping',  color: '#06B6D4', sequence: 3 },
    ]) {
        const fa = await prisma.warehouseFunctionalArea.findFirst({
            where: { warehouseId: dep.id, areaType: area.areaType }
        });
        if (!fa) {
            await prisma.warehouseFunctionalArea.create({
                data: { warehouseId: dep.id, ...area, active: true, shapeType: 'rectangle', x: 0, y: 0, width: 12, height: 8 }
            });
        }
    }

    // Simple location structure for DEP-SBY: Receiving + 2 zones + Shipping
    const depReceiving = await findOrCreateLocation({
        name: 'Receiving', warehouseId: dep.id, parentId: depView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'DEP-RCV',
        zonePriority: 0, putawaySequence: 0,
    });
    const depZoneMain = await findOrCreateLocation({
        name: 'Zone Main', warehouseId: dep.id, parentId: depView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'DEP-ZM', zonePriority: 20, putawaySequence: 10,
    });
    const depZoneBulk = await findOrCreateLocation({
        name: 'Zone Bulk', warehouseId: dep.id, parentId: depView.id,
        type: 'INTERNAL', structuralType: 'ROOM', code: 'DEP-ZB', zonePriority: 50, putawaySequence: 50,
    });

    const depBins: Record<string, string> = {};
    for (const [zoneName, zoneId, prefix, priority] of [
        ['Zone Main', depZoneMain.id, 'M', 20],
        ['Zone Bulk', depZoneBulk.id, 'B', 50],
    ] as [string, string, string, number][]) {
        for (let r = 1; r <= 2; r++) {
            const row = await findOrCreateLocation({
                name: `Row ${prefix}${r}`, warehouseId: dep.id, parentId: zoneId,
                type: 'INTERNAL', structuralType: 'ROW', code: `DEP-${prefix}${r}`,
                zonePriority: priority, putawaySequence: priority + r,
            });
            for (let b = 1; b <= 3; b++) {
                const binCode = `DEP-${prefix}${r}-0${b}`;
                const binNode = await findOrCreateLocation({
                    name: `Bin ${prefix}${r}-0${b}`, warehouseId: dep.id, parentId: row.id,
                    type: 'INTERNAL', structuralType: 'POSITION', code: binCode,
                    zonePriority: priority, putawaySequence: priority + r * 10 + b,
                    maxWeight: 120, maxVolume: 0.1,
                });
                depBins[binCode] = binNode.id;
            }
        }
    }
    console.log('   ✅ Depot structure created');

    // =========================================================================
    // 8. PRODUCTS (15)
    // =========================================================================
    console.log('── 8. Products (15)');

    // velocity: 'A' | 'B' | 'C'  |  abcClass: 'A' | 'B' | 'C'  |  tracking: 'none' | 'lot' | 'serial'
    const productDefs = [
        // ── Laptops & Computers (high-value, serial tracked)
        { sku: 'LAP-PRO-001', name: 'Pro Laptop X15',        category: 'Laptops & Computers',      type: 'Finished', uom: 'Unit',  velocity: 'A', abc: 'A', weight: 2.1, w: 36, h: 3,  d: 25, price: 18500000, tracking: 'serial', tempMin: null, tempMax: null },
        { sku: 'LAP-STD-002', name: 'Standard Laptop 14"',   category: 'Laptops & Computers',      type: 'Finished', uom: 'Unit',  velocity: 'B', abc: 'B', weight: 1.8, w: 33, h: 2,  d: 23, price: 8900000,  tracking: 'serial', tempMin: null, tempMax: null },
        { sku: 'DKT-WRK-003', name: 'Workstation Desktop',   category: 'Laptops & Computers',      type: 'Finished', uom: 'Unit',  velocity: 'B', abc: 'B', weight: 9.5, w: 20, h: 42, d: 45, price: 22000000, tracking: 'serial', tempMin: null, tempMax: null },
        // ── Peripherals & Accessories (medium velocity, lot tracked)
        { sku: 'KBD-MEC-004', name: 'Mechanical Keyboard TKL', category: 'Peripherals & Accessories', type: 'Finished', uom: 'Unit', velocity: 'B', abc: 'B', weight: 0.9, w: 36, h: 4, d: 14, price: 850000,  tracking: 'lot',    tempMin: null, tempMax: null },
        { sku: 'MSE-WLS-005', name: 'Wireless Mouse Ergonomic', category: 'Peripherals & Accessories', type: 'Finished', uom: 'Unit', velocity: 'A', abc: 'A', weight: 0.1, w: 12, h: 4, d: 7,  price: 350000,  tracking: 'none',   tempMin: null, tempMax: null },
        { sku: 'USB-HUB-006', name: 'USB-C Hub 7-Port',       category: 'Peripherals & Accessories', type: 'Finished', uom: 'Unit', velocity: 'A', abc: 'A', weight: 0.2, w: 14, h: 3, d: 6,  price: 275000,  tracking: 'none',   tempMin: null, tempMax: null },
        { sku: 'CAM-WEB-007', name: 'Webcam HD 1080p',         category: 'Peripherals & Accessories', type: 'Finished', uom: 'Unit', velocity: 'A', abc: 'A', weight: 0.3, w: 10, h: 8, d: 6,  price: 450000,  tracking: 'none',   tempMin: null, tempMax: null },
        { sku: 'HDR-BT-008',  name: 'Bluetooth Headset Pro',   category: 'Peripherals & Accessories', type: 'Finished', uom: 'Unit', velocity: 'A', abc: 'A', weight: 0.3, w: 20, h: 18, d: 8, price: 650000,  tracking: 'none',   tempMin: null, tempMax: null },
        // ── Monitors & Displays (heavy/bulky, B-class)
        { sku: 'MON-27F-009', name: '27" FHD Monitor',         category: 'Monitors & Displays',       type: 'Finished', uom: 'Unit', velocity: 'B', abc: 'B', weight: 5.2, w: 62, h: 42, d: 22, price: 2800000, tracking: 'serial', tempMin: null, tempMax: null },
        { sku: 'MON-32C-010', name: '32" Curved QHD Monitor',  category: 'Monitors & Displays',       type: 'Finished', uom: 'Unit', velocity: 'B', abc: 'B', weight: 8.1, w: 74, h: 52, d: 28, price: 5200000, tracking: 'serial', tempMin: null, tempMax: null },
        // ── Office Supplies (slow/bulk, no tracking)
        { sku: 'PPR-A4-011',  name: 'A4 Paper 80gsm (Ream)',   category: 'Office Supplies',           type: 'Consumable', uom: 'Ream', velocity: 'C', abc: 'C', weight: 2.5, w: 30, h: 5,  d: 21, price: 65000,   tracking: 'none',   tempMin: null, tempMax: null },
        { sku: 'PEN-BLU-012', name: 'Ballpoint Pen Blue (Box)', category: 'Office Supplies',          type: 'Consumable', uom: 'Box',  velocity: 'C', abc: 'C', weight: 0.5, w: 15, h: 5,  d: 3,  price: 45000,   tracking: 'none',   tempMin: null, tempMax: null },
        { sku: 'NTB-A5-013',  name: 'Hardcover Notebook A5',   category: 'Office Supplies',           type: 'Consumable', uom: 'Piece', velocity: 'C', abc: 'C', weight: 0.3, w: 15, h: 2, d: 21, price: 35000,   tracking: 'none',   tempMin: null, tempMax: null },
        // ── Printing & Imaging (temperature-sensitive, lot tracked)
        { sku: 'INK-CTR-014', name: 'Ink Cartridge Set (CMYK)', category: 'Printing & Imaging',       type: 'Consumable', uom: 'Set',  velocity: 'B', abc: 'B', weight: 0.4, w: 18, h: 8,  d: 5,  price: 320000,  tracking: 'lot', tempMin: 5, tempMax: 25 },
        { sku: 'PHT-PPR-015', name: 'Photo Paper A4 Glossy (Pack)', category: 'Printing & Imaging',   type: 'Consumable', uom: 'Pack', velocity: 'B', abc: 'B', weight: 0.8, w: 22, h: 4,  d: 30, price: 95000,   tracking: 'lot', tempMin: 5, tempMax: 25 },
    ];

    const products: Record<string, string> = {};
    for (const p of productDefs) {
        const prod = await prisma.product.upsert({
            where: { sku: p.sku },
            update: {
                name: p.name, category: p.category, status: 'Active',
                velocity: p.velocity, abcClass: p.abc,
            },
            create: {
                sku:          p.sku,
                name:         p.name,
                category:     p.category,
                type:         p.type,
                unitOfMeasure: p.uom,
                isStockable:  true,
                status:       'Active',
                velocity:     p.velocity,
                abcClass:     p.abc,
                classification: p.abc,
                weight:       p.weight,
                width:        p.w,
                height:       p.h,
                depth:        p.d,
                averageCost:  p.price,
                tracking:     p.tracking,
                stackable:    true,
                ...(p.tempMin != null ? { temperatureMin: p.tempMin } : {}),
                ...(p.tempMax != null ? { temperatureMax: p.tempMax } : {}),
                description:  `${p.name} — stocked product`,
            }
        });
        products[p.sku] = prod.id;
    }
    console.log(`   ✅ ${productDefs.length} products upserted`);

    // ── Product Packaging
    const packagingDefs = [
        { sku: 'LAP-PRO-001',  name: 'Pro Laptop X15 — Box',          unitType: 'UNIT',  qty: 1,  barcode: '8990001001' },
        { sku: 'MSE-WLS-005',  name: 'Wireless Mouse — Retail Pack',   unitType: 'UNIT',  qty: 1,  barcode: '8990005001' },
        { sku: 'USB-HUB-006',  name: 'USB-C Hub — Retail Pack',        unitType: 'UNIT',  qty: 1,  barcode: '8990006001' },
        { sku: 'PPR-A4-011',   name: 'A4 Paper — Pallet (40 reams)',   unitType: 'PALLET', qty: 40, barcode: '8990011002' },
        { sku: 'INK-CTR-014',  name: 'Ink Cartridge — Inner Box (6)',  unitType: 'BOX',   qty: 6,  barcode: '8990014001' },
    ];
    for (const pk of packagingDefs) {
        const existing = await prisma.productPackaging.findFirst({
            where: { name: pk.name, productId: products[pk.sku] }
        });
        if (!existing) {
            await prisma.productPackaging.create({
                data: {
                    productId: products[pk.sku],
                    name:      pk.name,
                    unitType:  pk.unitType,
                    quantity:  pk.qty,
                    barcode:   pk.barcode,
                    weight:    0, width: 0, height: 0, length: 0,
                }
            });
        }
    }
    console.log(`   ✅ ${packagingDefs.length} product packaging configs`);

    // =========================================================================
    // 9. PUTAWAY RULES
    // =========================================================================
    console.log('── 9. Putaway Rules');

    // Clean existing rules for DC to avoid duplicates on re-run
    const existingRuleCount = await prisma.putawayRule.count({ where: { warehouseId: dc.id } });
    if (existingRuleCount === 0) {
        const putawayRules = [
            {
                name:             'Class A → Zone A (Fast-Moving)',
                description:      'Route velocity-A products to Zone A for fast picking access',
                velocityClass:    'A',
                strategy:         'ZONE_PRIORITY',
                preferredZonePriorityMin: 0,
                preferredZonePriorityMax: 20,
                priority:         100,
                active:           true,
                warehouseId:      dc.id,
            },
            {
                name:             'Class B → Zone B (Medium-Moving)',
                description:      'Route velocity-B products to Zone B',
                velocityClass:    'B',
                strategy:         'ZONE_PRIORITY',
                preferredZonePriorityMin: 21,
                preferredZonePriorityMax: 50,
                priority:         80,
                active:           true,
                warehouseId:      dc.id,
            },
            {
                name:             'Class C → Zone C (Slow/Bulk)',
                description:      'Route velocity-C products to bulk Zone C storage',
                velocityClass:    'C',
                strategy:         'ZONE_PRIORITY',
                preferredZonePriorityMin: 51,
                preferredZonePriorityMax: 100,
                priority:         60,
                active:           true,
                warehouseId:      dc.id,
            },
            {
                name:             'Temperature-Sensitive → Cold Zone',
                description:      'Route Printing & Imaging products (ink, photo paper) to Cold Chain zone (2–18°C)',
                categoryId:       categories['Printing & Imaging'],
                strategy:         'ZONE_PRIORITY',
                preferredZonePriorityMin: 35,
                preferredZonePriorityMax: 45,
                priority:         120,   // Higher priority — evaluated before velocity rules
                active:           true,
                warehouseId:      dc.id,
            },
            {
                name:             'Heavy Items → Zone C Ground Level',
                description:      'Route items over 5kg to bulk zone for ground-floor pallet placement',
                minWeight:        5.0,
                strategy:         'ZONE_PRIORITY',
                preferredZonePriorityMin: 51,
                preferredZonePriorityMax: 100,
                priority:         90,
                active:           true,
                warehouseId:      dc.id,
            },
            {
                name:             'Monitors → Least Occupied Bin',
                description:      'Distribute monitor stock evenly across available bins',
                categoryId:       categories['Monitors & Displays'],
                strategy:         'LEAST_OCCUPIED',
                priority:         110,
                active:           true,
                warehouseId:      dc.id,
            },
        ];

        for (const rule of putawayRules) {
            await prisma.putawayRule.create({ data: rule as any });
        }
        console.log(`   ✅ ${putawayRules.length} putaway rules created`);
    } else {
        console.log(`   ✅ Putaway rules already exist (${existingRuleCount})`);
    }

    // =========================================================================
    // 10. INVENTORY BATCHES + PRODUCT INVENTORY
    // =========================================================================
    console.log('── 10. Inventory Batches');

    // Placed stock: realistic distribution across bins
    // Format: [batchNumber, sku, binCode, qty, costPerUnit, purchaseDate, expiryDate|null, vendor]
    type BatchDef = [string, string, string, number, number, Date, Date | null, string];

    const batchDefs: BatchDef[] = [
        // Zone A — Fast-Moving (LAP-PRO, MSE-WLS, USB-HUB, CAM-WEB, HDR-BT)
        ['BTH-2024-001', 'LAP-PRO-001', 'A1-1-01', 20,  17200000, daysAgo(60),  null,           'TechSupply Co.'],
        ['BTH-2024-002', 'LAP-PRO-001', 'A1-1-02', 15,  17200000, daysAgo(30),  null,           'TechSupply Co.'],
        ['BTH-2024-003', 'MSE-WLS-005', 'A1-2-01', 150, 310000,   daysAgo(45),  null,           'TechSupply Co.'],
        ['BTH-2024-004', 'MSE-WLS-005', 'A1-2-02', 100, 310000,   daysAgo(20),  null,           'TechSupply Co.'],
        ['BTH-2024-005', 'USB-HUB-006', 'A1-3-01', 80,  245000,   daysAgo(55),  null,           'GlobalImport Inc.'],
        ['BTH-2024-006', 'USB-HUB-006', 'A2-1-01', 60,  245000,   daysAgo(15),  null,           'GlobalImport Inc.'],
        ['BTH-2024-007', 'CAM-WEB-007', 'A2-2-01', 40,  395000,   daysAgo(40),  null,           'TechSupply Co.'],
        ['BTH-2024-008', 'HDR-BT-008',  'A2-3-01', 55,  580000,   daysAgo(35),  null,           'TechSupply Co.'],
        // Zone B — Medium-Moving (LAP-STD, DKT-WRK, KBD-MEC, INK, PHT)
        ['BTH-2024-009', 'LAP-STD-002', 'B1-1-01', 25,  8200000,  daysAgo(50),  null,           'TechSupply Co.'],
        ['BTH-2024-010', 'LAP-STD-002', 'B1-1-02', 10,  8200000,  daysAgo(18),  null,           'TechSupply Co.'],
        ['BTH-2024-011', 'DKT-WRK-003', 'B1-2-01', 8,   20500000, daysAgo(70),  null,           'TechSupply Co.'],
        ['BTH-2024-012', 'KBD-MEC-004', 'B1-3-01', 45,  780000,   daysAgo(42),  null,           'GlobalImport Inc.'],
        ['BTH-2024-013', 'KBD-MEC-004', 'B2-1-01', 30,  780000,   daysAgo(12),  null,           'GlobalImport Inc.'],
        ['BTH-2024-014', 'MON-27F-009', 'B2-2-01', 18,  2600000,  daysAgo(60),  null,           'TechSupply Co.'],
        ['BTH-2024-015', 'MON-32C-010', 'B2-3-01', 10,  4900000,  daysAgo(55),  null,           'TechSupply Co.'],
        // Zone C — Slow/Bulk (PPR, PEN, NTB)
        ['BTH-2024-016', 'PPR-A4-011',  'C1-1-01', 200, 58000,    daysAgo(90),  null,           'OfficeWorld Ltd.'],
        ['BTH-2024-017', 'PPR-A4-011',  'C1-1-02', 180, 60000,    daysAgo(30),  null,           'OfficeWorld Ltd.'],
        ['BTH-2024-018', 'PEN-BLU-012', 'C1-2-01', 300, 40000,    daysAgo(120), null,           'OfficeWorld Ltd.'],
        ['BTH-2024-019', 'NTB-A5-013',  'C2-1-01', 150, 30000,    daysAgo(80),  null,           'OfficeWorld Ltd.'],
        // Zone COLD — Temperature-sensitive (INK, PHT) — expiry-tracked (FEFO)
        ['BTH-2024-020', 'INK-CTR-014', 'F1-1-01', 60,  290000,   daysAgo(50),  daysFromNow(365), 'GlobalImport Inc.'],
        ['BTH-2024-021', 'INK-CTR-014', 'F1-1-02', 40,  295000,   daysAgo(20),  daysFromNow(450), 'GlobalImport Inc.'],
        ['BTH-2024-022', 'PHT-PPR-015', 'F1-2-01', 80,  85000,    daysAgo(60),  daysFromNow(730), 'GlobalImport Inc.'],
        ['BTH-2024-023', 'PHT-PPR-015', 'F1-2-02', 50,  88000,    daysAgo(25),  daysFromNow(800), 'GlobalImport Inc.'],
        // DEP-SBY — smaller stock footprint
        ['BTH-2024-024', 'MSE-WLS-005', 'DEP-M1-01', 30, 310000,  daysAgo(30),  null,           'TechSupply Co.'],
        ['BTH-2024-025', 'USB-HUB-006', 'DEP-M1-02', 20, 245000,  daysAgo(28),  null,           'GlobalImport Inc.'],
        ['BTH-2024-026', 'PPR-A4-011',  'DEP-B1-01', 50, 60000,   daysAgo(45),  null,           'OfficeWorld Ltd.'],
    ];

    // Merge allBins and depBins
    const allBinMap: Record<string, string> = {};
    for (const [code, info] of Object.entries(allBins)) allBinMap[code] = info.id;
    for (const [code, id] of Object.entries(depBins)) allBinMap[code] = id;

    // Accumulate per-warehouse totals for ProductInventory
    const inventoryTotals: Record<string, Record<string, number>> = {};   // warehouseId → productId → qty

    for (const [batchNum, sku, binCode, qty, cost, purchaseDate, expiry, vendor] of batchDefs) {
        const productId = products[sku];
        const locationId = allBinMap[binCode];
        if (!locationId) { console.warn(`   ⚠️  Bin not found: ${binCode}, skipping batch ${batchNum}`); continue; }

        const warehouseId = binCode.startsWith('DEP-') ? dep!.id : dc.id;

        const existing = await prisma.inventoryBatch.findFirst({ where: { batchNumber: batchNum } });
        if (!existing) {
            await prisma.inventoryBatch.create({
                data: {
                    batchNumber:     batchNum,
                    productId,
                    warehouseId,
                    locationId,
                    initialQuantity: qty,
                    currentQuantity: qty,
                    reserved:        0,
                    costPerUnit:     cost,
                    purchaseDate,
                    status:          'Active',
                    vendor,
                    ...(expiry ? { expiryDate: expiry } : {}),
                }
            });
        }

        if (!inventoryTotals[warehouseId]) inventoryTotals[warehouseId] = {};
        inventoryTotals[warehouseId][productId] = (inventoryTotals[warehouseId][productId] ?? 0) + qty;
    }
    console.log(`   ✅ ${batchDefs.length} inventory batches placed`);

    // ── ProductInventory totals
    for (const [warehouseId, prodMap] of Object.entries(inventoryTotals)) {
        for (const [productId, quantity] of Object.entries(prodMap)) {
            const existing = await prisma.productInventory.findFirst({ where: { productId, warehouseId } });
            if (!existing) {
                await prisma.productInventory.create({ data: { productId, warehouseId, quantity, reserved: 0 } });
            } else {
                await prisma.productInventory.update({
                    where: { id: existing.id },
                    data: { quantity }
                });
            }
        }
    }
    console.log(`   ✅ ProductInventory totals synced`);

    // =========================================================================
    // 11. PURCHASE ORDERS (4 — Draft, Pending, Approved, Received)
    // =========================================================================
    console.log('── 11. Purchase Orders');

    // PO-2024-001 — RECEIVED (electronics from TechSupply, fully received 30 days ago)
    let po1 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-001' } });
    if (!po1) {
        po1 = await prisma.purchaseOrder.create({
            data: {
                poNumber:         'PO-2024-001',
                supplierId:       suppliers['TechSupply Co.'],
                status:           'RECEIVED',
                approvalStatus:   'APPROVED',
                approvedAt:       daysAgo(40),
                orderDate:        daysAgo(45),
                expectedDate:     daysAgo(35),
                asnExpectedDate:  daysAgo(35),
                threeWayMatch:    'MATCHED',
                buyerName:        'Warehouse Manager',
                buyerAddress:     'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:     'wm@labamu.co.id',
                shipToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:     'NET30',
                deliveryTerms:    'FOB Destination',
                taxAmount:        5220000,
                shippingCost:     500000,
                totalAmount:      58170000,
                notes:            'Regular quarterly electronics replenishment',
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: po1.id, productId: products['LAP-PRO-001'], quantity: 20, unitCost: 17200000 },
                { purchaseOrderId: po1.id, productId: products['MSE-WLS-005'], quantity: 150, unitCost: 310000 },
                { purchaseOrderId: po1.id, productId: products['USB-HUB-006'], quantity: 80, unitCost: 245000 },
            ]
        });
        // Receipt for PO1
        const receipt1 = await prisma.receipt.create({
            data: {
                purchaseOrderId:     po1.id,
                status:              'DONE',
                receivedAt:          daysAgo(30),
                destinationLocationId: dcReceivingDock.id,
                grnNumber:           'GRN-2024-001',
                notes:               'Full receipt, no discrepancies',
            }
        });
        const po1Items = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: po1.id } });
        await prisma.receiptItem.createMany({
            data: po1Items.map(item => ({
                receiptId: receipt1.id,
                productId: item.productId,
                quantity:  item.quantity,
                poItemId:  item.id,
            }))
        });
        console.log('   ✅ PO-2024-001 RECEIVED (electronics, TechSupply)');
    }

    // PO-2024-002 — APPROVED (office supplies from OfficeWorld, due in 7 days)
    let po2 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-002' } });
    if (!po2) {
        po2 = await prisma.purchaseOrder.create({
            data: {
                poNumber:         'PO-2024-002',
                supplierId:       suppliers['OfficeWorld Ltd.'],
                status:           'APPROVED',
                approvalStatus:   'APPROVED',
                approvedAt:       daysAgo(3),
                orderDate:        daysAgo(5),
                expectedDate:     daysFromNow(7),
                asnExpectedDate:  daysFromNow(7),
                threeWayMatch:    'PENDING',
                buyerName:        'Procurement Team',
                buyerAddress:     'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:     'procurement@labamu.co.id',
                shipToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:     'NET45',
                deliveryTerms:    'EXW Supplier Warehouse',
                taxAmount:        390000,
                shippingCost:     200000,
                totalAmount:      4340000,
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: po2.id, productId: products['PPR-A4-011'],  quantity: 200, unitCost: 60000 },
                { purchaseOrderId: po2.id, productId: products['PEN-BLU-012'], quantity: 100, unitCost: 42000 },
                { purchaseOrderId: po2.id, productId: products['NTB-A5-013'],  quantity: 80,  unitCost: 32000 },
            ]
        });
        console.log('   ✅ PO-2024-002 APPROVED (office supplies, OfficeWorld — arriving in 7 days)');
    }

    // PO-2024-003 — PENDING approval (printing consumables from GlobalImport)
    let po3 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-003' } });
    if (!po3) {
        po3 = await prisma.purchaseOrder.create({
            data: {
                poNumber:         'PO-2024-003',
                supplierId:       suppliers['GlobalImport Inc.'],
                status:           'PENDING',
                approvalStatus:   'PENDING',
                orderDate:        daysAgo(2),
                expectedDate:     daysFromNow(21),
                asnExpectedDate:  daysFromNow(21),
                threeWayMatch:    'PENDING',
                buyerName:        'Procurement Team',
                buyerAddress:     'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:     'procurement@labamu.co.id',
                shipToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:     'NET30',
                deliveryTerms:    'CIF Jakarta',
                taxAmount:        480000,
                shippingCost:     350000,
                totalAmount:      5630000,
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: po3.id, productId: products['INK-CTR-014'], quantity: 60, unitCost: 295000 },
                { purchaseOrderId: po3.id, productId: products['PHT-PPR-015'], quantity: 80, unitCost: 88000 },
            ]
        });
        console.log('   ✅ PO-2024-003 PENDING approval (printing supplies, GlobalImport)');
    }

    // PO-2024-004 — DRAFT (workstations + monitors, TechSupply)
    let po4 = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-2024-004' } });
    if (!po4) {
        po4 = await prisma.purchaseOrder.create({
            data: {
                poNumber:         'PO-2024-004',
                supplierId:       suppliers['TechSupply Co.'],
                status:           'DRAFT',
                approvalStatus:   'PENDING',
                orderDate:        daysAgo(1),
                expectedDate:     daysFromNow(30),
                asnExpectedDate:  daysFromNow(30),
                threeWayMatch:    'PENDING',
                buyerName:        'Procurement Team',
                buyerAddress:     'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:     'procurement@labamu.co.id',
                shipToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:    'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:     'NET30',
                deliveryTerms:    'DAP Jakarta',
                taxAmount:        3960000,
                shippingCost:     1500000,
                totalAmount:      47460000,
                notes:            'Q2 workstation refresh — awaiting budget approval',
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: po4.id, productId: products['DKT-WRK-003'], quantity: 5,  unitCost: 20500000 },
                { purchaseOrderId: po4.id, productId: products['MON-27F-009'], quantity: 10, unitCost: 2600000  },
                { purchaseOrderId: po4.id, productId: products['MON-32C-010'], quantity: 5,  unitCost: 4900000  },
            ]
        });
        console.log('   ✅ PO-2024-004 DRAFT (workstation refresh, TechSupply)');
    }

    // =========================================================================
    // 12. SALES ORDERS (8 — mix of statuses)
    // =========================================================================
    console.log('── 12. Sales Orders');

    type OrderItemDef = { sku: string; qty: number };
    type OrderDef = {
        status: string; priority: string; customerId: string;
        items: OrderItemDef[]; expectedDate?: Date;
    };

    const orderDefs: OrderDef[] = [
        // DONE — completed orders (historical)
        { status: 'DONE',     priority: '1', customerId: customers['Acme Corporation'],
          items: [{ sku: 'LAP-PRO-001', qty: 3 }, { sku: 'MSE-WLS-005', qty: 3 }, { sku: 'USB-HUB-006', qty: 3 }],
          expectedDate: daysAgo(20) },
        { status: 'DONE',     priority: '1', customerId: customers['MegaRetail Group'],
          items: [{ sku: 'PPR-A4-011', qty: 50 }, { sku: 'PEN-BLU-012', qty: 50 }],
          expectedDate: daysAgo(15) },
        // SHIPPED — in transit
        { status: 'SHIPPED',  priority: '2', customerId: customers['StartupHub ID'],
          items: [{ sku: 'LAP-STD-002', qty: 5 }, { sku: 'KBD-MEC-004', qty: 5 }, { sku: 'MSE-WLS-005', qty: 5 }],
          expectedDate: daysFromNow(1) },
        // PACKING — currently being packed
        { status: 'PACKING',  priority: '2', customerId: customers['EduTech Nusantara'],
          items: [{ sku: 'MON-27F-009', qty: 5 }, { sku: 'LAP-PRO-001', qty: 5 }],
          expectedDate: daysFromNow(2) },
        // PICKING — currently being picked
        { status: 'PICKING',  priority: '3', customerId: customers['Acme Corporation'],
          items: [{ sku: 'USB-HUB-006', qty: 20 }, { sku: 'CAM-WEB-007', qty: 10 }, { sku: 'HDR-BT-008', qty: 10 }],
          expectedDate: daysFromNow(3) },
        { status: 'PICKING',  priority: '1', customerId: customers['MegaRetail Group'],
          items: [{ sku: 'INK-CTR-014', qty: 12 }, { sku: 'PHT-PPR-015', qty: 20 }],
          expectedDate: daysFromNow(2) },
        // RESERVED — stock allocated, not yet picking
        { status: 'RESERVED', priority: '2', customerId: customers['StartupHub ID'],
          items: [{ sku: 'KBD-MEC-004', qty: 8 }, { sku: 'MSE-WLS-005', qty: 8 }, { sku: 'HDR-BT-008', qty: 4 }],
          expectedDate: daysFromNow(5) },
        // PENDING — new order
        { status: 'PENDING',  priority: '3', customerId: customers['EduTech Nusantara'],
          items: [{ sku: 'LAP-PRO-001', qty: 10 }, { sku: 'LAP-STD-002', qty: 5 }],
          expectedDate: daysFromNow(7) },
    ];

    const fulfillmentMap: Record<string, string> = {
        'DONE':     'ALLOCATED',
        'SHIPPED':  'ALLOCATED',
        'PACKING':  'ALLOCATED',
        'PICKING':  'ALLOCATED',
        'RESERVED': 'ALLOCATED',
        'PENDING':  'UNALLOCATED',
    };

    let orderCount = 0;
    for (const [i, od] of orderDefs.entries()) {
        const orderNum = `ORD-2024-${String(i + 1).padStart(3, '0')}`;
        const existingOrder = await prisma.order.findFirst({ where: { customerId: od.customerId, status: od.status } });
        if (!existingOrder) {
            const order = await prisma.order.create({
                data: {
                    customerId:        od.customerId,
                    status:            od.status,
                    fulfillmentStatus: fulfillmentMap[od.status],
                    priority:          od.priority,
                    type:              'SALES',
                    warehouseId:       dc.id,
                    totalAmount:       0,   // Simplified — no price calc
                    shippingCost:      25000,
                    expectedDate:      od.expectedDate,
                }
            });

            for (const item of od.items) {
                await prisma.orderItem.create({
                    data: {
                        orderId:   order.id,
                        productId: products[item.sku],
                        quantity:  item.qty,
                    }
                });
            }
            orderCount++;
        }
    }
    console.log(`   ✅ ${orderCount} new sales orders created (8 total)`);

    // =========================================================================
    // 13. ROTATION RULES
    // =========================================================================
    console.log('── 13. Rotation Rules');

    const rotationRuleDefs = [
        // FEFO for temperature-sensitive products
        { policy: 'FEFO', productId: products['INK-CTR-014'], warehouseId: dc.id, priority: 1, active: true, minShelfLifeDays: 30, missingExpiryAction: 'FAIL' },
        { policy: 'FEFO', productId: products['PHT-PPR-015'], warehouseId: dc.id, priority: 1, active: true, minShelfLifeDays: 30, missingExpiryAction: 'FAIL' },
        // FIFO for all other products (global rule for DC)
        { policy: 'FIFO', productId: null, warehouseId: dc.id, priority: 10, active: true },
        // FIFO for depot
        { policy: 'FIFO', productId: null, warehouseId: dep!.id, priority: 10, active: true },
    ];

    for (const rule of rotationRuleDefs) {
        const existing = await prisma.rotationRule.findFirst({
            where: { policy: rule.policy, productId: rule.productId ?? null, warehouseId: rule.warehouseId }
        });
        if (!existing) await prisma.rotationRule.create({ data: rule as any });
    }
    console.log(`   ✅ ${rotationRuleDefs.length} rotation rules (FEFO for cold products, FIFO for rest)`);

    // =========================================================================
    // 14. REORDER RULES
    // =========================================================================
    console.log('── 14. Reorder Rules');

    type ReorderDef = { sku: string; binCode: string; min: number; max: number };
    const reorderDefs: ReorderDef[] = [
        { sku: 'LAP-PRO-001', binCode: 'A1-1-01', min: 10,  max: 50  },
        { sku: 'MSE-WLS-005', binCode: 'A1-2-01', min: 50,  max: 200 },
        { sku: 'USB-HUB-006', binCode: 'A1-3-01', min: 30,  max: 150 },
        { sku: 'PPR-A4-011',  binCode: 'C1-1-01', min: 100, max: 500 },
        { sku: 'INK-CTR-014', binCode: 'F1-1-01', min: 20,  max: 100 },
    ];
    for (const rd of reorderDefs) {
        const locationId = allBinMap[rd.binCode];
        if (!locationId) continue;
        const existing = await prisma.reorderingRule.findFirst({
            where: { productId: products[rd.sku], locationId }
        });
        if (!existing) {
            await prisma.reorderingRule.create({
                data: { productId: products[rd.sku], locationId, minQuantity: rd.min, maxQuantity: rd.max, active: true }
            });
        }
    }
    console.log(`   ✅ ${reorderDefs.length} reorder rules`);

    // =========================================================================
    // 15. ROUTES (stock movement routes for inbound/outbound)
    // =========================================================================
    console.log('── 15. Routes');

    const routeDefs = [
        { name: '3-Step Inbound (Receive → Stage → Putaway)', description: 'Standard inbound: receiving dock → staging → storage bins', skus: ['LAP-PRO-001', 'LAP-STD-002', 'MSE-WLS-005', 'USB-HUB-006'] },
        { name: 'Cold Chain Inbound',                          description: 'Temperature-controlled inbound to cold zone', skus: ['INK-CTR-014', 'PHT-PPR-015'] },
        { name: '3-Step Outbound (Pick → Pack → Ship)',        description: 'Standard outbound: pick → pack → shipping dock', skus: ['LAP-PRO-001', 'MSE-WLS-005', 'USB-HUB-006', 'CAM-WEB-007'] },
        { name: '1-Step Outbound (Pick & Ship)',               description: 'Express outbound for small items', skus: ['PEN-BLU-012', 'NTB-A5-013'] },
    ];

    for (const rd of routeDefs) {
        const existing = await prisma.route.findFirst({ where: { name: rd.name } });
        if (!existing) {
            const route = await prisma.route.create({
                data: {
                    name:        rd.name,
                    description: rd.description,
                    products: {
                        connect: rd.skus.map(sku => ({ id: products[sku] })).filter(p => p.id)
                    }
                }
            });
            // Add stock-move rules to the route
            const ruleSequences = [
                { action: 'RECEIVE', srcId: null, dstId: dcReceivingDock.id, seq: 1 },
                { action: 'PUTAWAY', srcId: dcReceivingDock.id, dstId: dcStagingArea.id, seq: 2 },
                { action: 'STORE',   srcId: dcStagingArea.id,   dstId: null,              seq: 3 },
            ];
            for (const rs of ruleSequences) {
                await prisma.rule.create({
                    data: {
                        routeId:             route.id,
                        action:              rs.action,
                        sourceLocationId:    rs.srcId,
                        destinationLocationId: rs.dstId,
                        sequence:            rs.seq,
                        conditions:          '{}',
                    }
                });
            }
        }
    }
    console.log(`   ✅ ${routeDefs.length} routes with stock-move rules`);

    // =========================================================================
    // 16. EDGE-CASE PRODUCTS (for negative/boundary testing)
    // =========================================================================
    console.log('── 16. Edge-Case Products');

    const edgeProductDefs = [
        // Zero-weight / virtual product — tests weight-check bypass
        { sku: 'VRT-LIC-099', name: 'Software Licence (Virtual)',       category: 'Laptops & Computers', velocity: 'A', abc: 'A', weight: 0,    w: 0,   h: 0,  d: 0,   price: 750000,     tempMin: null, tempMax: null, description: 'Digital licence key — no physical dimensions' },
        // Near-threshold weight product (exactly 5 kg = boundary of heavy rule)
        { sku: 'THR-WGT-100', name: 'Threshold Weight Item (5.0 kg)',   category: 'Laptops & Computers', velocity: 'B', abc: 'B', weight: 5.0,  w: 300, h: 200, d: 100, price: 1500000,   tempMin: null, tempMax: null, description: 'Exactly at the heavy-item weight boundary' },
        // Perishable with very short shelf life — FEFO edge case
        { sku: 'EXP-INK-101', name: 'Short-Life Ink Cartridge (7-day)', category: 'Printing & Imaging',  velocity: 'C', abc: 'C', weight: 0.2,  w: 80,  h: 60,  d: 40,  price: 220000,    tempMin: 2,    tempMax: 18,  description: 'Nearly expired batch for FEFO testing' },
        // Discontinued product — for cancel/unavailable order testing
        { sku: 'DSC-CAM-102', name: 'Discontinued Webcam HD720 (Legacy)', category: 'Laptops & Computers', velocity: 'C', abc: 'C', weight: 0.18, w: 100, h: 80, d: 50,  price: 0,          tempMin: null, tempMax: null, description: 'End-of-life product, no active stock' },
        // Oversized / heavy item (30 kg) — triggers zone C and weight exception
        { sku: 'HVY-SRV-103', name: 'Rack Server 2U (30 kg)',           category: 'Laptops & Computers', velocity: 'C', abc: 'C', weight: 30,   w: 445, h: 88,  d: 600, price: 110000000, tempMin: null, tempMax: null, description: 'Data centre rack-mount server — requires forklift' },
    ];

    for (const pd of edgeProductDefs) {
        await prisma.product.upsert({
            where: { sku: pd.sku },
            update: { name: pd.name, category: pd.category, velocity: pd.velocity, abcClass: pd.abc },
            create: {
                sku:           pd.sku,
                name:          pd.name,
                description:   pd.description,
                category:      pd.category,
                type:          'Finished',
                unitOfMeasure: 'Unit',
                isStockable:   true,
                status:        'Active',
                velocity:      pd.velocity,
                abcClass:      pd.abc,
                classification: pd.abc,
                weight:        pd.weight,
                width:         pd.w,
                height:        pd.h,
                depth:         pd.d,
                averageCost:   pd.price,
                tracking:      'none',
                stackable:     true,
                ...(pd.tempMin != null ? { temperatureMin: pd.tempMin } : {}),
                ...(pd.tempMax != null ? { temperatureMax: pd.tempMax } : {}),
            }
        });
    }
    console.log(`   ✅ ${edgeProductDefs.length} edge-case products (virtual, boundary-weight, near-expired, discontinued, oversized)`);

    // =========================================================================
    // 17. EDGE-CASE INVENTORY BATCHES (expired, near-expiry, zero-stock)
    // =========================================================================
    console.log('── 17. Edge-Case Inventory Batches');

    const edgeProducts: Record<string, string> = {};
    for (const ep of edgeProductDefs) {
        const p = await prisma.product.findUnique({ where: { sku: ep.sku } });
        if (p) edgeProducts[ep.sku] = p.id;
    }

    const coldBinForEdge = allBinMap['F1-1-01'] ?? allBinMap['F1-1-02'];
    const zoneCBinForEdge = allBinMap['C1-1-01'] ?? allBinMap['C1-1-02'];
    const zoneABinForEdge = allBinMap['A1-1-01'];

    type EdgeBatchDef = {
        sku: string; binCode: string | null; qty: number;
        batchNumber: string; purchaseDaysAgo: number; expiryDaysFromNow: number | null;
    };

    const edgeBatchDefs: EdgeBatchDef[] = [
        // Already-expired batch of EXP-INK-101 — for FEFO rejection / notification tests
        { sku: 'EXP-INK-101', binCode: 'F1-1-01', qty: 10,  batchNumber: 'BATCH-EXPIRED-001', purchaseDaysAgo: 60, expiryDaysFromNow: -5 },
        // Near-expiry batch (3 days) — triggers expiry notification
        { sku: 'EXP-INK-101', binCode: 'F1-1-02', qty: 15,  batchNumber: 'BATCH-NEAREXP-001', purchaseDaysAgo: 55, expiryDaysFromNow: 3  },
        // Valid batch of EXP-INK-101 — for FEFO correct-pick test
        { sku: 'EXP-INK-101', binCode: 'F1-2-01', qty: 30,  batchNumber: 'BATCH-VALID-001',   purchaseDaysAgo: 10, expiryDaysFromNow: 90 },
        // Threshold-weight item — small qty in Zone B (exactly at boundary)
        { sku: 'THR-WGT-100', binCode: 'B1-1-01', qty: 5,   batchNumber: 'BATCH-THR-001',     purchaseDaysAgo: 5,  expiryDaysFromNow: null },
        // Oversized server — zone C
        { sku: 'HVY-SRV-103', binCode: 'C1-1-01', qty: 2,   batchNumber: 'BATCH-SRV-001',     purchaseDaysAgo: 3,  expiryDaysFromNow: null },
        // Virtual licence — zone A (weightless)
        { sku: 'VRT-LIC-099', binCode: 'A1-1-01', qty: 100, batchNumber: 'BATCH-LIC-001',     purchaseDaysAgo: 1,  expiryDaysFromNow: null },
    ];

    for (const bd of edgeBatchDefs) {
        const productId = edgeProducts[bd.sku];
        if (!productId) continue;
        const locationId = bd.binCode ? allBinMap[bd.binCode] : zoneABinForEdge;
        if (!locationId) continue;

        const existing = await prisma.inventoryBatch.findFirst({ where: { productId, batchNumber: bd.batchNumber } });
        if (!existing) {
            await prisma.inventoryBatch.create({
                data: {
                    batchNumber:     bd.batchNumber,
                    productId,
                    warehouseId:     dc.id,
                    locationId,
                    initialQuantity: bd.qty,
                    currentQuantity: bd.qty,
                    reserved:        0,
                    costPerUnit:     0,
                    purchaseDate:    daysAgo(bd.purchaseDaysAgo),
                    status:          'Active',
                    ...(bd.expiryDaysFromNow != null ? { expiryDate: daysFromNow(bd.expiryDaysFromNow) } : {}),
                }
            });
            // Update ProductInventory
            const existingPi = await prisma.productInventory.findFirst({ where: { productId, warehouseId: dc.id } });
            if (!existingPi) {
                await prisma.productInventory.create({ data: { productId, warehouseId: dc.id, quantity: bd.qty, reserved: 0 } });
            } else {
                await prisma.productInventory.update({ where: { id: existingPi.id }, data: { quantity: { increment: bd.qty } } });
            }
        }
    }
    console.log(`   ✅ ${edgeBatchDefs.length} edge-case batches (expired, near-expiry, boundary-weight, oversized, virtual)`);

    // =========================================================================
    // 18. EDGE-CASE PURCHASE ORDERS
    // =========================================================================
    console.log('── 18. Edge-Case Purchase Orders');

    // PO-REJECT-001 — submitted and rejected
    let poRejected = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-REJECT-001' } });
    if (!poRejected) {
        poRejected = await prisma.purchaseOrder.create({
            data: {
                poNumber:        'PO-REJECT-001',
                supplierId:      suppliers['OfficeWorld Ltd.'],
                status:          'REJECTED',
                approvalStatus:  'REJECTED',
                orderDate:       daysAgo(10),
                expectedDate:    daysFromNow(20),
                asnExpectedDate: daysFromNow(20),
                threeWayMatch:   'PENDING',
                buyerName:       'Procurement Team',
                buyerAddress:    'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:    'procurement@labamu.co.id',
                shipToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:    'NET30',
                deliveryTerms:   'DAP Jakarta',
                taxAmount:       110000,
                shippingCost:    50000,
                totalAmount:     1210000,
                notes:           'Rejected: budget exceeded for Q1',
            }
        });
        await prisma.purchaseOrderItem.create({
            data: { purchaseOrderId: poRejected.id, productId: products['PPR-A4-011'], quantity: 200, unitCost: 5000 }
        });
        console.log('   ✅ PO-REJECT-001 (rejected PO for unhappy-flow tests)');
    }

    // PO-PARTIAL-001 — received partially (some items missing)
    let poPartial = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-PARTIAL-001' } });
    if (!poPartial) {
        poPartial = await prisma.purchaseOrder.create({
            data: {
                poNumber:        'PO-PARTIAL-001',
                supplierId:      suppliers['TechSupply Co.'],
                status:          'PARTIALLY_RECEIVED',
                approvalStatus:  'APPROVED',
                orderDate:       daysAgo(14),
                expectedDate:    daysAgo(3),
                asnExpectedDate: daysAgo(3),
                threeWayMatch:   'DISCREPANCY',
                buyerName:       'Procurement Team',
                buyerAddress:    'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:    'procurement@labamu.co.id',
                shipToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:    'NET30',
                deliveryTerms:   'DAP Jakarta',
                taxAmount:       1980000,
                shippingCost:    500000,
                totalAmount:     23730000,
                notes:           'Partial receipt — 5 of 10 laptops arrived; 5 backordered by supplier',
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: poPartial.id, productId: products['LAP-STD-002'], quantity: 10, unitCost: 10750000 },
                { purchaseOrderId: poPartial.id, productId: products['KBD-MEC-004'], quantity: 10, unitCost: 850000  },
            ]
        });
        console.log('   ✅ PO-PARTIAL-001 (partially received, discrepancy 3-way match)');
    }

    // PO-OVERDUE-001 — approved but expected date passed (overdue)
    let poOverdue = await prisma.purchaseOrder.findFirst({ where: { poNumber: 'PO-OVERDUE-001' } });
    if (!poOverdue) {
        poOverdue = await prisma.purchaseOrder.create({
            data: {
                poNumber:        'PO-OVERDUE-001',
                supplierId:      suppliers['GlobalImport Inc.'],
                status:          'ORDERED',
                approvalStatus:  'APPROVED',
                orderDate:       daysAgo(30),
                expectedDate:    daysAgo(7),
                asnExpectedDate: daysAgo(7),
                threeWayMatch:   'PENDING',
                buyerName:       'Procurement Team',
                buyerAddress:    'Jl. Raya Bekasi KM 18, Jakarta',
                buyerContact:    'procurement@labamu.co.id',
                shipToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                billToAddress:   'Jl. Raya Bekasi KM 18, Jakarta 13930',
                paymentTerms:    'NET60',
                deliveryTerms:   'DAP Jakarta',
                taxAmount:       550000,
                shippingCost:    200000,
                totalAmount:     6050000,
                notes:           'Overdue — supplier delayed shipment, chasing for ETA',
            }
        });
        await prisma.purchaseOrderItem.createMany({
            data: [
                { purchaseOrderId: poOverdue.id, productId: products['INK-CTR-014'], quantity: 50, unitCost: 110000 },
                { purchaseOrderId: poOverdue.id, productId: products['PHT-PPR-015'], quantity: 20, unitCost: 85000  },
            ]
        });
        console.log('   ✅ PO-OVERDUE-001 (overdue approved PO, expected date in past)');
    }

    // =========================================================================
    // 19. EDGE-CASE SALES ORDERS
    // =========================================================================
    console.log('── 19. Edge-Case Sales Orders');

    const edgeOrderDefs = [
        // Cancelled order — for cancel unhappy flow
        { status: 'CANCELLED', priority: '2', customerId: customers['Acme Corporation'],
          items: [{ sku: 'CAM-WEB-007', qty: 3 }], expectedDate: daysAgo(2) },
        // Overdue order — expected date in the past, still PENDING
        { status: 'PENDING',   priority: '1', customerId: customers['MegaRetail Group'],
          items: [{ sku: 'HDR-BT-008', qty: 5 }, { sku: 'USB-HUB-006', qty: 5 }], expectedDate: daysAgo(3) },
        // High-priority order (priority 1 + large qty, tests reservation contention)
        { status: 'PENDING',   priority: '1', customerId: customers['StartupHub ID'],
          items: [{ sku: 'LAP-PRO-001', qty: 50 }], expectedDate: daysFromNow(1) },
        // Order with discontinued product — should fail availability check
        { status: 'PENDING',   priority: '3', customerId: customers['EduTech Nusantara'],
          items: [{ sku: 'DSC-CAM-102', qty: 2 }], expectedDate: daysFromNow(5) },
    ] as Array<{ status: string; priority: string; customerId: string; items: { sku: string; qty: number }[]; expectedDate: Date }>;

    let edgeOrderCount = 0;
    for (const [i, od] of edgeOrderDefs.entries()) {
        const orderNum = `ORD-EDGE-${String(i + 1).padStart(3, '0')}`;
        const existingOrder = await prisma.order.findFirst({ where: { customerId: od.customerId, status: od.status, priority: od.priority } });
        if (!existingOrder) {
            const order = await prisma.order.create({
                data: {
                    customerId:        od.customerId,
                    status:            od.status,
                    fulfillmentStatus: od.status === 'CANCELLED' ? 'CANCELLED' : 'UNALLOCATED',
                    priority:          od.priority,
                    type:              'SALES',
                    warehouseId:       dc.id,
                    totalAmount:       0,
                    shippingCost:      25000,
                    expectedDate:      od.expectedDate,
                }
            });
            for (const item of od.items) {
                const pid = products[item.sku] ?? edgeProducts[item.sku];
                if (pid) {
                    await prisma.orderItem.create({ data: { orderId: order.id, productId: pid, quantity: item.qty } });
                }
            }
            edgeOrderCount++;
        }
    }
    console.log(`   ✅ ${edgeOrderCount} edge-case sales orders (cancelled, overdue, oversell, discontinued product)`);

    // =========================================================================
    // 20. ADDITIONAL FULFILLMENT RULES (priority + region)
    // =========================================================================
    console.log('── 20. Fulfillment Rules');

    const fulfillmentRuleDefs = [
        { name: 'Priority Fulfillment — Class A Products',      strategy: 'ZONE_PRIORITY',  priority: 10, active: true, actionIfUnavailable: 'NEXT_RULE' },
        { name: 'Cold Chain Fulfillment — Temperature Sensitive', strategy: 'ZONE_PRIORITY', priority: 20, active: true, actionIfUnavailable: 'NEXT_RULE' },
        { name: 'Express Fulfillment — Priority 1 Orders',      strategy: 'WAVELESS',       priority: 5,  active: true, actionIfUnavailable: 'NEXT_RULE' },
        { name: 'Bulk Fulfillment — Office Supply Category',    strategy: 'BATCH',          priority: 30, active: true, actionIfUnavailable: 'NEXT_RULE' },
    ];

    for (const frd of fulfillmentRuleDefs) {
        const existing = await prisma.fulfillmentRule.findFirst({ where: { name: frd.name } });
        if (!existing) {
            await prisma.fulfillmentRule.create({ data: frd });
        }
    }
    console.log(`   ✅ ${fulfillmentRuleDefs.length} fulfillment rules (priority, cold chain, express, bulk)`);

    // =========================================================================
    // 21. ADDITIONAL CUSTOMERS (edge-case profiles)
    // =========================================================================
    console.log('── 21. Edge-Case Customers');

    const edgeCustomerData = [
        { name: 'International Buyer (SG)',     address: '1 Raffles Place, Singapore 048616',  latitude: 1.2847, longitude: 103.8519 },
        { name: 'Walk-In Customer (No Address)', address: '',                                    latitude: null,   longitude: null   },
    ];

    for (const cd of edgeCustomerData) {
        const existing = await prisma.customer.findFirst({ where: { name: cd.name } });
        if (!existing) {
            await prisma.customer.create({
                data: { name: cd.name, address: cd.address, latitude: cd.latitude, longitude: cd.longitude }
            });
        }
    }
    console.log(`   ✅ ${edgeCustomerData.length} edge-case customers (international, walk-in)`);

    // =========================================================================
    // 22. PICKING STRATEGIES (seeded for strategy module tests)
    // =========================================================================
    console.log('── 22. Picking Strategies');

    const pickingStrategyDefs = [
        { name: 'FIFO Single Pick',    rules: JSON.stringify({ rotation: 'FIFO', batchSize: 1 }),  warehouseId: dc.id },
        { name: 'FEFO Cold Chain Pick', rules: JSON.stringify({ rotation: 'FEFO', zone: 'COLD' }), warehouseId: dc.id },
        { name: 'Batch Office Supplies', rules: JSON.stringify({ category: 'Office Supplies', maxOrders: 10 }), warehouseId: dc.id },
    ];

    for (const ps of pickingStrategyDefs) {
        const existing = await prisma.pickingStrategy.findFirst({ where: { name: ps.name, warehouseId: ps.warehouseId } });
        if (!existing) {
            await prisma.pickingStrategy.create({ data: ps as any });
        }
    }
    console.log(`   ✅ ${pickingStrategyDefs.length} picking strategies`);

    // =========================================================================
    // Done
    // =========================================================================
    console.log('\n✅  Seed complete. Summary:');
    console.log(`     Categories        : ${categoryNames.length}`);
    console.log(`     Suppliers         : ${supplierData.length}`);
    console.log(`     Customers         : ${customerData.length + edgeCustomerData.length}`);
    console.log(`     Delivery Methods  : ${deliveryMethodData.length}`);
    console.log(`     Attr Definitions  : ${attrDefData.length}`);
    console.log(`     Warehouses        : 2  (DC-JKT 3-step, DEP-SBY 1-step)`);
    console.log(`     Storage Locations : ${totalLocations}+ (4 zones, Zone A/B/C/COLD)`);
    console.log(`     Products          : ${productDefs.length} core + ${edgeProductDefs.length} edge-case`);
    console.log(`     Putaway Rules     : 6  (velocity, temperature, weight, category)`);
    console.log(`     Inventory Batches : ${batchDefs.length} core + ${edgeBatchDefs.length} edge-case`);
    console.log(`     Purchase Orders   : 4 core + 3 edge-case (rejected, partial, overdue)`);
    console.log(`     Sales Orders      : 8 core + ${edgeOrderCount} edge-case (cancelled, overdue, oversell)`);
    console.log(`     Rotation Rules    : ${rotationRuleDefs.length}  (FEFO cold, FIFO global)`);
    console.log(`     Reorder Rules     : ${reorderDefs.length}`);
    console.log(`     Routes            : ${routeDefs.length}`);
    console.log(`     Fulfillment Rules : ${fulfillmentRuleDefs.length}`);
    console.log(`     Picking Strategies: ${pickingStrategyDefs.length}`);
    console.log('');
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
