import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BarcodeService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(code: string) {
    // 1. Check Product (by sku)
    const product = await this.prisma.product.findUnique({
      where: { sku: code },
    });
    if (product) {
      return { type: 'PRODUCT', entity: product };
    }

    // 2. Check Location (by code)
    const location = await this.prisma.location.findFirst({
      where: { code },
    });
    if (location) {
      return { type: 'LOCATION', entity: location };
    }

    // 3. Check Batch (by batchNumber)
    const batch = await this.prisma.inventoryBatch.findUnique({
      where: { batchNumber: code },
    });
    if (batch) {
      return { type: 'BATCH', entity: batch };
    }

    throw new BadRequestException(`No product, location, or batch found for barcode: ${code}`);
  }
}
