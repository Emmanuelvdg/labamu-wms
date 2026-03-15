
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStoDto } from './sto.dto';

@Injectable()
export class StoService {
    constructor(private prisma: PrismaService) { }

    async createInboundSto(data: CreateStoDto) {
        console.log('STO Data received:', data);
        // 1. Validate Destination Warehouse
        const destWarehouse = await this.prisma.warehouse.findUnique({
            where: { id: data.destinationWarehouseId }
        });
        if (!destWarehouse) throw new NotFoundException(`Destination Warehouse ${data.destinationWarehouseId} not found`);

        // 2. Resolve Products by SKU
        const items = [];
        for (const item of data.items) {
            const product = await this.prisma.product.findUnique({
                where: { sku: item.sku }
            });
            if (!product) throw new NotFoundException(`Product with SKU ${item.sku} not found`);
            items.push({
                productId: product.id,
                quantity: item.quantity
            });
        }

        // 3. Determine Source Warehouse (or use a Virtual/External one)
        let sourceWarehouseId = data.sourceWarehouseId;
        if (!sourceWarehouseId) {
            // Find or create a virtual warehouse for the external system
            const systemName = `External: ${data.sourceSystem}`;
            let externalWarehouse = await this.prisma.warehouse.findFirst({
                where: { name: systemName }
            });

            if (!externalWarehouse) {
                // Create View Location first
                const viewLoc = await this.prisma.location.create({
                    data: { name: systemName, type: 'VIEW', structuralType: 'WAREHOUSE' }
                });

                externalWarehouse = await this.prisma.warehouse.create({
                    data: {
                        name: systemName,
                        type: 'EXTERNAL',
                        location: JSON.stringify({ lat: 0, lng: 0 }),
                        viewLocationId: viewLoc.id
                    }
                });
            }
            sourceWarehouseId = externalWarehouse.id;
        }

        // 3.5 Ensure Initiator exists
        let initiatorId = 'SYSTEM';
        const systemUser = await this.prisma.user.findUnique({ where: { id: 'SYSTEM' } });
        if (!systemUser) {
            const admin = await this.prisma.user.findFirst({
                where: { roles: { some: { name: 'Admin' } } }
            });
            if (admin) {
                initiatorId = admin.id;
            } else {
                // Fallback to any user
                const anyUser = await this.prisma.user.findFirst();
                if (anyUser) initiatorId = anyUser.id;
            }
        }

        // 4. Create Transfer Order
        const transfer = await this.prisma.transferOrder.create({
            data: {
                sourceWarehouseId: sourceWarehouseId,
                destinationWarehouseId: data.destinationWarehouseId,
                status: 'PLANNED',
                initiatorId: initiatorId,
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        receivedQuantity: 0
                    }))
                },
            },
            include: { items: true }
        });

        return {
            message: 'STO Created Successfully',
            transferId: transfer.id,
            status: transfer.status
        };
    }
}
