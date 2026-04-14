import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AbcClassificationService {
    private readonly logger = new Logger(AbcClassificationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Run ABC classification for products in a warehouse based on sales velocity
     * A = Top 80% of revenue (typically ~20% of items)
     * B = Next 15% of revenue (typically ~30% of items)
     * C = Bottom 5% of revenue (typically ~50% of items)
     */
    async runClassification(warehouseId: string, periodDays = 90) {
        this.logger.log(`Running ABC classification for warehouse ${warehouseId} over last ${periodDays} days`);

        const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
        if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Calculate sales velocity (outbound stock moves) per product
        // Using findMany instead of groupBy to avoid complex Prisma relational type inference errors
        const rawMoves = await this.prisma.stockMove.findMany({
            where: {
                destinationLocation: { warehouseId: { not: warehouseId } }, // Leaving the warehouse
                sourceLocation: { warehouseId }, // From this warehouse
                createdAt: { gte: startDate }
            },
            select: { productId: true, quantity: true }
        });

        // Group in memory
        const moveAggregated = rawMoves.reduce((acc, move) => {
            acc[move.productId] = (acc[move.productId] || 0) + move.quantity;
            return acc;
        }, {} as Record<string, number>);

        const moves = Object.keys(moveAggregated).map(productId => ({
            productId,
            _sum: { quantity: moveAggregated[productId] }
        }));

        // Get product costs to calculate revenue/value
        const products = await this.prisma.product.findMany({
            where: { id: { in: moves.map(m => m.productId) } },
            select: { id: true, price: true }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Calculate total value per product
        let totalValue = 0;
        const productStats = moves.map(m => {
            const product = productMap.get(m.productId);
            const price = product?.price || 0;
            const quantity = m._sum.quantity || 0;
            const value = price * quantity;
            totalValue += value;
            return { productId: m.productId, quantity, value };
        });

        // Sort by value descending
        productStats.sort((a, b) => b.value - a.value);

        let accumulatedValue = 0;
        const classifications = { A: 0, B: 0, C: 0 };

        // Assign classes and update products
        for (const stat of productStats) {
            accumulatedValue += stat.value;
            const percentage = (accumulatedValue / totalValue) * 100;

            let abcClass = 'C';
            if (percentage <= 80) {
                abcClass = 'A';
                classifications.A++;
            } else if (percentage <= 95) {
                abcClass = 'B';
                classifications.B++;
            } else {
                classifications.C++;
            }

            // Update in DB
            await this.prisma.product.update({
                where: { id: stat.productId },
                data: { abcClass }
            });
        }

        this.logger.log(`Classification complete. A: ${classifications.A}, B: ${classifications.B}, C: ${classifications.C}`);
        return {
            totalProductsAnalyzed: productStats.length,
            classifications,
            totalValue
        };
    }
}
