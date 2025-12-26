import { PrismaClient } from '@labamu/database';

/**
 * Migration Script: Recalculate Average Cost for All Products
 * 
 * This script recalculates the average cost for all products based on their existing batches.
 * Run this once to fix products that have batches but averageCost = 0.
 * 
 * Usage: npx tsx packages/database/recalculate_avg_cost.ts
 */

const prisma = new PrismaClient();

async function recalculateAverageCosts() {
    console.log('[RecalculateAvgCost] Starting recalculation for all products...');

    // Get all products
    const products = await prisma.product.findMany({
        include: {
            batches: {
                where: { status: 'Active' }
            }
        }
    });

    console.log(`[RecalculateAvgCost] Found ${products.length} products to process.`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
        if (product.batches.length === 0) {
            console.log(`[RecalculateAvgCost] Product ${product.id} (${product.name}) has no active batches. Skipping.`);
            skipped++;
            continue;
        }

        // Calculate average cost from batches
        const totalValue = product.batches.reduce((sum, batch) =>
            sum + (batch.currentQuantity * batch.costPerUnit), 0
        );
        const totalQty = product.batches.reduce((sum, batch) =>
            sum + batch.currentQuantity, 0
        );

        if (totalQty === 0) {
            console.log(`[RecalculateAvgCost] Product ${product.id} (${product.name}) has zero quantity in batches.Skipping.`);
            skipped++;
            continue;
        }

        const newAvgCost = totalValue / totalQty;

        // Round to 2 decimal places for currency display
        const roundedAvgCost = Math.round(newAvgCost * 100) / 100;

        console.log(`[RecalculateAvgCost] Product ${product.id} (${product.name}):`);
        console.log(`  - Batches: ${product.batches.length}`);
        console.log(`  - Total Qty: ${totalQty}`);
        console.log(`  - Total Value: ${totalValue}`);
        console.log(`  - Current Avg Cost: ${product.averageCost}`);
        console.log(`  - New Avg Cost: ${roundedAvgCost}`);

        // Update only if different (to avoid unnecessary writes)
        if (Math.abs((product.averageCost || 0) - roundedAvgCost) > 0.01) {
            await prisma.product.update({
                where: { id: product.id },
                data: { averageCost: roundedAvgCost }
            });
            console.log(`  ✅ Updated!`);
            updated++;
        } else {
            console.log(`  ⏭️  Already correct, skipped.`);
            skipped++;
        }
    }

    console.log(`\n[RecalculateAvgCost] Migration complete!`);
    console.log(`  - Products updated: ${updated} `);
    console.log(`  - Products skipped: ${skipped} `);
    console.log(`  - Total processed: ${products.length} `);

    await prisma.$disconnect();
}

recalculateAverageCosts()
    .then(() => {
        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
