import { Controller, Get, Post, Body, Param, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { SupplierAuthGuard } from './supplier-auth.guard';
import { PrismaService } from '../prisma.service';
import { NotificationService } from '../notifications/notification.service';

const uploadDir = join(process.cwd(), 'uploads', 'po-documents');

@Controller('supplier-portal')
@UseGuards(SupplierAuthGuard)
export class SupplierPortalController {
    constructor(private prisma: PrismaService, private notifications: NotificationService) { }

    @Get('purchase-orders')
    async listPurchaseOrders(@Request() req: any) {
        return this.prisma.purchaseOrder.findMany({
            where: {
                supplierId: req.user.supplierId,
                status: { in: ['PENDING', 'APPROVED', 'RECEIVED', 'PARTIALLY_RECEIVED'] },
            },
            include: { supplier: true, items: { include: { product: true } } },
            orderBy: { orderDate: 'desc' },
        });
    }

    @Get('purchase-orders/:id')
    async getPurchaseOrder(@Param('id') id: string, @Request() req: any) {
        return this.prisma.purchaseOrder.findFirstOrThrow({
            where: { id, supplierId: req.user.supplierId },
            include: { supplier: true, items: { include: { product: true } }, documents: true },
        });
    }

    @Get('purchase-orders/:id/documents')
    async getPurchaseOrderDocuments(@Param('id') id: string, @Request() req: any) {
        await this.prisma.purchaseOrder.findFirstOrThrow({ where: { id, supplierId: req.user.supplierId } });
        return this.prisma.documentAttachment.findMany({ where: { purchaseOrderId: id } });
    }

    @Post('purchase-orders/:id/invoice')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: uploadDir,
            filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
        }),
    }))
    async uploadInvoice(@Param('id') id: string, @Request() req: any, @UploadedFile() file: Express.Multer.File) {
        const po = await this.prisma.purchaseOrder.findFirstOrThrow({ where: { id, supplierId: req.user.supplierId } });

        const doc = await this.prisma.documentAttachment.create({
            data: {
                purchaseOrderId: id,
                documentType: 'SUPPLIER_INVOICE',
                fileName: file.originalname,
                filePath: file.path,
                mimeType: file.mimetype,
                fileSize: file.size,
                uploadedBy: req.user.supplierUserId,
            },
        });

        await this.notifications.createNotification({
            type: 'SUPPLIER_INVOICE_UPLOADED',
            title: 'Supplier Invoice Received',
            body: `Supplier uploaded an invoice for PO ${po.poNumber}`,
            link: `/inventory/purchases/${id}`,
            metadata: { purchaseOrderId: id, documentId: doc.id },
        });

        return doc;
    }

    @Post('purchase-orders/:id/asn')
    async submitAsn(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { estimatedArrival: string; trackingNumber?: string; notes?: string; items: { productId: string; quantity: number }[] },
    ) {
        await this.prisma.purchaseOrder.findFirstOrThrow({ where: { id, supplierId: req.user.supplierId } });
        return this.prisma.advancedShippingNotice.create({
            data: {
                purchaseOrderId: id,
                supplierId: req.user.supplierId,
                estimatedArrival: new Date(body.estimatedArrival),
                trackingNumber: body.trackingNumber,
                notes: body.notes,
                items: { create: body.items.map(i => ({ productId: i.productId, quantity: i.quantity })) },
            },
            include: { items: true },
        });
    }

    @Get('purchase-orders/:id/asn')
    async getAsn(@Param('id') id: string, @Request() req: any) {
        await this.prisma.purchaseOrder.findFirstOrThrow({ where: { id, supplierId: req.user.supplierId } });
        return this.prisma.advancedShippingNotice.findMany({
            where: { purchaseOrderId: id },
            include: { items: { include: { product: true } } },
        });
    }
}
