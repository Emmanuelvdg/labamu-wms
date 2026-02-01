export { };
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying System Utilisation & Inventory Integrity...');

    // 1. Get Current Total Inventory (Quantity & Volume)
    const inventory = await prisma.productInventory.findMany({
        include: { product: true }
    });

    let currentCalculatedQty = 0;

    for (const inv of inventory) {
        currentCalculatedQty += inv.quantity;
    }

    // 2. Sum All Stock Moves
    // Assuming 'IN', 'ADJUSTMENT' (positive/negative), 'OUT' types
    // We need to check exact types in DB
    const moves = await prisma.stockMove.findMany({
        include: { product: true }
    });

    let historyCalculatedQty = 0;

    // Group by Move Type
    const movesByType: Record<string, number> = {};

    for (const move of moves) {
        // Source/Dest logic? Or just simple In/Out?
        // StockMove usually has sourceLocationId and destinationLocationId

        // If it moved from NULL to Location -> IN
        // If it moved from Location to NULL -> OUT
        // If it moved Location to Location -> INTERNAL (Net 0 for total)

        let qtyChange = 0;
        const isSourceInternal = !!move.sourceLocationId;
        const isDestInternal = !!move.destinationLocationId;

        if (!isSourceInternal && isDestInternal) {
            qtyChange = move.quantity; // Receipt
        } else if (isSourceInternal && !isDestInternal) {
            qtyChange = -move.quantity; // Shipment
        } else if (isSourceInternal && isDestInternal) {
            qtyChange = 0; // Internal Move
        }

        historyCalculatedQty += qtyChange;

        const key = `${isSourceInternal ? 'LOC' : 'NULL'}->${isDestInternal ? 'LOC' : 'NULL'}`;
        movesByType[key] = (movesByType[key] || 0) + move.quantity;
    }

    console.log('--- Inventory Integrity Check ---');
    console.log(`Current Total Inventory Qty: ${currentCalculatedQty}`);
    console.log(`History Derived Qty (Net Moves): ${historyCalculatedQty}`);
    console.log(`Difference: ${currentCalculatedQty - historyCalculatedQty}`);

    console.log('--- Moves Breakdown ---');
    console.log(movesByType);

    if (currentCalculatedQty !== historyCalculatedQty) {
        console.warn('MISMATCH DETECTED: Historical moves do not sum up to current inventory.');
        console.warn('This explains why reverse walking from Current -> Past creates negative values.');
    } else {
        console.log('Data Integrity OK. (This is unexpected if negative graph exists).');
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
