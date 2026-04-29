import { Controller, Post, Body, Get, Param, UseGuards, UseInterceptors, UploadedFile, Req, Res, StreamableFile, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PurchaseOrderService } from './purchase-order.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const uploadDir = join(process.cwd(), 'uploads', 'po-documents');

@Controller('purchase-orders')
@UseGuards(PermissionsGuard)
export class PurchaseOrderController {
    constructor(private readonly purchaseOrderService: PurchaseOrderService) { }

    @Post()
    @RequirePermission('PURCHASE_ORDERS', 'CREATE')
    create(@Body() data: CreatePurchaseOrderDto) {
        return this.purchaseOrderService.createPurchaseOrder(data);
    }

    @Get()
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    findAll() {
        return this.purchaseOrderService.getPurchaseOrders();
    }

    @Get('suppliers')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getSuppliers() {
        return this.purchaseOrderService.getSuppliers();
    }

    @Get(':id')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    async findOne(@Param('id') id: string) {
        const po = await this.purchaseOrderService.getPurchaseOrder(id);
        if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
        return po;
    }

    @Get(':id/receipts')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getReceipts(@Param('id') id: string) {
        return this.purchaseOrderService.getReceipts(id);
    }

    @Post(':id/receive')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    receive(@Param('id') id: string, @Body() data: ReceiveGoodsDto) {
        return this.purchaseOrderService.receiveGoods(id, data.locationId!, data.items || []);
    }

    @Post(':id/submit')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    submit(@Param('id') id: string) {
        return this.purchaseOrderService.submitForApproval(id);
    }

    @Post(':id/approve')
    @RequirePermission('PURCHASE_ORDERS', 'APPROVE')
    approve(@Param('id') id: string, @Body() data: { userId: string }) {
        return this.purchaseOrderService.approvePurchaseOrder(id, data.userId);
    }

    @Post(':id/reject')
    @RequirePermission('PURCHASE_ORDERS', 'APPROVE')
    reject(@Param('id') id: string, @Body() data: { userId: string; reason: string }) {
        return this.purchaseOrderService.rejectPurchaseOrder(id, data.userId, data.reason);
    }

    // ===== Document Attachments =====

    @Post(':id/documents')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: uploadDir,
            filename: (req, file, cb) => {
                const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }))
    uploadDocument(
        @Param('id') id: string,
        @UploadedFile() file: any,
        @Body() data: { documentType: string },
        @Req() req: any,
    ) {
        const userId = req.headers['x-user-id'] || null;
        return this.purchaseOrderService.attachDocument(id, {
            documentType: data.documentType,
            fileName: file.originalname,
            filePath: file.filename, // stored filename on disk
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedBy: userId,
        });
    }

    @Get(':id/documents')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getDocuments(@Param('id') id: string) {
        return this.purchaseOrderService.getDocuments(id);
    }

    @Get(':id/documents/:docId/download')
    // Can optionally use a permissions guard here or pass token in URL
    // @RequirePermission('PURCHASE_ORDERS', 'READ')
    async downloadDocument(
        @Param('id') poId: string,
        @Param('docId') docId: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        return this.purchaseOrderService.downloadDocument(poId, docId, res);
    }

    // ===== QA Inspection =====

    @Post(':id/inspections')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    submitInspection(
        @Param('id') id: string,
        @Body() data: {
            inspectorId?: string;
            notes?: string;
            results: { productId: string; receivedQty: number; acceptedQty: number; rejectedQty: number; rejectionReason?: string }[];
        },
        @Req() req: any,
    ) {
        const inspectorId = data.inspectorId || req.headers['x-user-id'] || null;
        return this.purchaseOrderService.submitInspection(id, { ...data, inspectorId });
    }

    @Get(':id/inspections')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getInspections(@Param('id') id: string) {
        return this.purchaseOrderService.getInspections(id);
    }

    // ===== 3-Way Match =====

    @Post(':id/match')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    verifyThreeWayMatch(@Param('id') id: string) {
        return this.purchaseOrderService.verifyThreeWayMatch(id);
    }

    @Post(':id/scan-receive')
    @RequirePermission('PURCHASE_ORDERS', 'UPDATE')
    scanReceive(@Param('id') id: string, @Body() data: { barcode: string; locationId?: string }) {
        return this.purchaseOrderService.scanReceive(id, data.barcode, data.locationId);
    }

    @Get(':id/asn')
    @RequirePermission('PURCHASE_ORDERS', 'READ')
    getAsn(@Param('id') id: string) {
        return this.purchaseOrderService.getAsn(id);
    }
}
