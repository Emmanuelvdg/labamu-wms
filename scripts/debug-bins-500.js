const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Fetching all warehouses to pick one...");
        const warehouses = await prisma.warehouse.findMany();
        if (warehouses.length === 0) {
            console.log("No warehouses found.");
            return;
        }

        const warehouseId = warehouses[0].id;
        console.log(`Testing getBinUtilization for warehouse: ${warehouseId}`);

        const bins = await prisma.location.findMany({
            where: {
                warehouseId: warehouseId,
                OR: [
                    { structuralType: 'POSITION' },
                    { structuralType: 'BIN' },
                    { structuralType: 'SHELF' }
                ]
            },
            include: {
                batches: {
                    where: { currentQuantity: { gt: 0 } },
                    include: {
                        product: {
                            select: {
                                sku: true,
                                name: true,
                                weight: true
                            }
                        }
                    }
                },
                parent: {
                    include: {
                        parent: {
                            include: {
                                parent: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${bins.length} bins. Processing...`);

        function buildLocationPath(location) {
            const parts = [];
            let current = location;

            while (current) {
                if (current.name) {
                    parts.unshift(current.name);
                }
                current = current.parent;
            }

            return parts.join(' > ');
        }
        let success = 0;
        for (const bin of bins) {
            try {
                const currentWeight = bin.batches.reduce((sum, batch) => {
                    const productWeight = batch.product?.weight || 0;
                    return sum + (productWeight * batch.currentQuantity);
                }, 0);

                const currentItems = bin.batches.reduce((sum, batch) =>
                    sum + batch.currentQuantity, 0
                );

                const maxWeight = bin.maxWeight || bin.maxWeightKg || 0;
                const maxVolume = bin.maxVolume || 0;

                const weightUtilization = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
                const volumeUtilization = 0;
                const itemUtilization = 0;

                const overallUtilization = Math.max(weightUtilization, volumeUtilization, itemUtilization);

                const locationPath = buildLocationPath(bin);
                success++;
            } catch (err) {
                console.error(`Error processing bin ${bin.id} (${bin.name}):`, err);
            }
        }
        console.log(`Processing finished. Successfully processed ${success}/${bins.length} bins.`);

    } catch (e) {
        console.error("Top level error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
