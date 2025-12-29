import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DrillDownService {
    constructor(private prisma: PrismaService) { }

    private parseDateRange(query?: any): { startDate: Date, endDate: Date } {
        const endDate = new Date();
        let startDate: Date;

        if (query?.period === 'custom' && query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate.setTime(new Date(query.endDate).getTime());
        } else {
            const days = query?.period === '30d' ? 30 : query?.period === '90d' ? 90 : 7;
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        return { startDate, endDate };
    }

    async getStockValueDetails(query?: any) {
        const { startDate, endDate } = this.parseDateRange(query);

        const inventory = await this.prisma.productInventory.findMany({
            where: {
                updatedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                product: {
                    select: {
                        sku: true,
                        name: true,
                        category: true,
                        averageCost: true
                    }
                },
                location: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                quantity: 'desc'
            }
        });

        return inventory.map(inv => ({
            productSku: inv.product.sku,
            productName: inv.product.name,
            category: inv.product.category || 'Uncategorized',
            location: inv.location.name,
            quantity: inv.quantity,
            unitCost: inv.product.averageCost,
            totalValue: inv.quantity * (inv.product.averageCost || 0),
            lastUpdated: inv.updatedAt
        }));
    }

    async getFulfillmentDetails(query?: any) {
        const { startDate, endDate } = this.parseDateRange(query);

        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                customer: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return orders.map(order => ({
            orderId: order.id,
            customerName: order.customer?.name || 'N/A',
            status: order.status,
            createdAt: order.createdAt,
            shippedAt: order.status === 'SHIPPED' ? order.updatedAt : null,
            fulfilled: order.status === 'SHIPPED'
        }));
    }

    async getStockoutDetails(query?: any) {
        const products = await this.prisma.product.findMany({
            where: {
                status: 'Active'
            },
            include: {
                inventory: true
            }
        });

        const outOfStock = products.filter(product => {
            const totalQty = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
            return totalQty <= 0;
        });

        return outOfStock.map(product => ({
            sku: product.sku,
            name: product.name,
            category: product.category || 'Uncategorized',
            reorderPoint: product.reorderPoint || 0,
            lastStockUpdate: product.updatedAt
        }));
    }

    async getPendingOrderDetails(query?: any) {
        const { startDate, endDate } = this.parseDateRange(query);

        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: ['PENDING', 'RESERVED', 'PICKING'] },
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                customer: {
                    select: {
                        name: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                sku: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return orders.map(order => ({
            orderId: order.id,
            customerName: order.customer?.name || 'N/A',
            status: order.status,
            itemCount: order.items.length,
            createdAt: order.createdAt,
            ageDays: Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }));
    }

    async getCycleTimeDetails(query?: any) {
        const { startDate, endDate } = this.parseDateRange(query);

        const orders = await this.prisma.order.findMany({
            where: {
                status: 'SHIPPED',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                customer: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return orders.map(order => {
            const createdTime = new Date(order.createdAt).getTime();
            const shippedTime = new Date(order.updatedAt).getTime();
            const cycleTimeHours = (shippedTime - createdTime) / (1000 * 60 * 60);

            return {
                orderId: order.id,
                customerName: order.customer?.name || 'N/A',
                createdAt: order.createdAt,
                shippedAt: order.updatedAt,
                cycleTimeHours: Number(cycleTimeHours.toFixed(1))
            };
        });
    }

    async getCapacityDetails(query?: any) {
        const locations = await this.prisma.location.findMany({
            where: { maxVolume: { not: null } },
            include: {
                inventory: {
                    include: {
                        product: {
                            select: {
                                sku: true,
                                name: true,
                                width: true,
                                height: true,
                                depth: true
                            }
                        }
                    }
                }
            }
        });

        return locations.map(loc => {
            let usedVolume = 0;
            const items: any[] = [];

            for (const inv of loc.inventory) {
                const p = inv.product;
                if (p.width && p.height && p.depth) {
                    const volumePerUnit = (p.width * p.height * p.depth) / 1000000; // cm³ to m³
                    const totalVolume = volumePerUnit * inv.quantity;
                    usedVolume += totalVolume;
                    items.push({
                        sku: p.sku,
                        name: p.name,
                        quantity: inv.quantity,
                        volumeM3: Number(totalVolume.toFixed(3))
                    });
                }
            }

            const utilization = loc.maxVolume ? (usedVolume / loc.maxVolume) * 100 : 0;

            return {
                locationName: loc.name,
                maxVolumeM3: loc.maxVolume || 0,
                usedVolumeM3: Number(usedVolume.toFixed(2)),
                utilizationPercent: Number(utilization.toFixed(1)),
                items
            };
        });
    }
}
