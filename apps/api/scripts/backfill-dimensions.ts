
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from '../src/inventory/inventory.module';
import { PrismaService } from '../src/prisma.service';

const DEFAULTS = {
    POSITION: { w: 1200, d: 800, h: 1500, maxKg: 1000 }, // Standard Pallet Slot
    SHELF: { w: 2000, d: 600, h: 400, maxKg: 200 },     // Standard Shelf Level
    BIN: { w: 400, d: 300, h: 200, maxKg: 25 },         // Small Parts Bin
    BAY: { w: 2500, d: 1100, h: 6000, maxKg: 4000 },    // Pallet Racking Bay (4 slots high)
    ROW: { w: 50000, d: 2500, h: 10000, maxKg: 0 },     // Aisle
    ZONE: { w: 0, d: 0, h: 0, maxKg: 0 },
    ROOM: { w: 0, d: 0, h: 0, maxKg: 0 },
    WAREHOUSE: { w: 0, d: 0, h: 0, maxKg: 0 },
};

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(InventoryModule);
    const prisma = app.get(PrismaService);

    console.log('--- Starting Dimension Backfill ---');

    const locations = await prisma.location.findMany();
    let updatedCount = 0;

    for (const locObj of locations) {
        const loc = locObj as any;
        const type = loc.structuralType || 'BIN'; // Default if unknown
        const def = DEFAULTS[type] || DEFAULTS.BIN;

        // Determine Updates
        const updates: any = {};
        let needsUpdate = false;

        if (!loc.innerWidth) {
            updates.innerWidth = def.w;
            needsUpdate = true;
        }
        if (!loc.innerLength) {
            updates.innerLength = def.d; // Depth maps to Length in our canonical model usually
            needsUpdate = true;
        }
        if (!loc.innerHeight) {
            updates.innerHeight = def.h;
            needsUpdate = true;
        }

        // Migrate legacy maxWeight if exists, else use default
        if (loc.maxWeightKg === undefined || loc.maxWeightKg === null || loc.maxWeightKg === 0) {
            if (loc.maxWeight && loc.maxWeight > 0) {
                updates.maxWeightKg = loc.maxWeight;
            } else {
                updates.maxWeightKg = def.maxKg;
            }
            if (updates.maxWeightKg > 0) needsUpdate = true;
        }

        // Migrate legacy maxVolume if needed (Calculate from dims if missing)
        // Note: we usually prefer calculate on fly, but if schema has it, we can populate it.
        // Let's leave maxVolume alone unless it's strictly required by legacy code.

        if (needsUpdate) {
            await prisma.location.update({
                where: { id: loc.id },
                data: updates
            });
            console.log(`Updated ${loc.name} (${type}): ${JSON.stringify(updates)}`);
            updatedCount++;
        }
    }

    console.log(`--- Backfill Complete. Updated ${updatedCount} locations ---`);
    await app.close();
}

bootstrap();
