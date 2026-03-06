import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BarcodeValidatorService {
    private readonly logger = new Logger(BarcodeValidatorService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Look up any entity by barcode (could be SKU, location barcode, batch number, etc.)
     */
    async lookupBarcode(barcode: string) {
        // Try product by SKU
        const product = await this.prisma.product.findFirst({
            where: { OR: [{ sku: barcode }, { id: barcode }] },
        });
        if (product) return { type: 'PRODUCT', entity: product };

        // Try location by barcode
        const location = await this.prisma.location.findFirst({
            where: { OR: [{ code: barcode }, { id: barcode }] },
        });
        if (location) return { type: 'LOCATION', entity: location };

        // Try batch by batch number
        const batch = await this.prisma.inventoryBatch.findFirst({
            where: { OR: [{ batchNumber: barcode }, { id: barcode }] },
            include: { product: true },
        });
        if (batch) return { type: 'BATCH', entity: batch };

        throw new BadRequestException(`No product, location, or batch found for barcode: ${barcode}`);
    }

    /**
     * Validate a scanned barcode against an expected context.
     */
    async validateScan(barcode: string, context: {
        type: 'RECEIVE_PO' | 'PICK_TASK' | 'PACK_ORDER' | 'PUTAWAY';
        referenceId: string; // PO ID, task ID, order ID, etc.
    }) {
        const lookup = await this.lookupBarcode(barcode);
        const entityName = (lookup.entity as any).name || (lookup.entity as any).product?.name || barcode;

        switch (context.type) {
            case 'RECEIVE_PO': {
                // Verify product is in the PO
                const poItem = await this.prisma.purchaseOrderItem.findFirst({
                    where: { purchaseOrderId: context.referenceId, productId: lookup.entity.id },
                    include: { product: true },
                });
                if (!poItem) {
                    throw new BadRequestException(`Product ${entityName} is not in this purchase order`);
                }
                return { ...lookup, context: 'RECEIVE_PO', poItem, verified: true };
            }

            case 'PICK_TASK': {
                // Verify product matches the pick task
                const task = await this.prisma.pickingTask.findUnique({
                    where: { id: context.referenceId },
                    include: { product: true },
                });
                if (!task) throw new BadRequestException('Pick task not found');
                if (task.productId !== lookup.entity.id) {
                    throw new BadRequestException(`Expected product ${task.product.name}, but scanned ${entityName}`);
                }
                return { ...lookup, context: 'PICK_TASK', task, verified: true };
            }

            case 'PACK_ORDER': {
                // Verify product is in the order
                const orderItem = await this.prisma.orderItem.findFirst({
                    where: { orderId: context.referenceId, productId: lookup.entity.id },
                    include: { product: true },
                });
                if (!orderItem) {
                    throw new BadRequestException(`Product ${entityName} is not in this order`);
                }
                return { ...lookup, context: 'PACK_ORDER', orderItem, verified: true };
            }

            case 'PUTAWAY': {
                // For putaway, verify the scanned barcode is a valid location
                if (lookup.type !== 'LOCATION') {
                    throw new BadRequestException(`Expected a location barcode, but scanned a ${lookup.type}`);
                }
                return { ...lookup, context: 'PUTAWAY', verified: true };
            }

            default:
                return { ...lookup, verified: true };
        }
    }
}
