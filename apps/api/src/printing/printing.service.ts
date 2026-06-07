import { Injectable, NotFoundException } from '@nestjs/common';
import * as bwipjs from 'bwip-js';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/printer').default;

@Injectable()
export class PrintingService {
    private fonts = {
        Roboto: {
            normal: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
            bold: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
            italics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
            bolditalics: path.join(process.cwd(), '../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
        },
    };

    constructor(private readonly prisma: PrismaService) {}

    // ── Internals ─────────────────────────────────────────────────────────────

    private async generateBarcodeImage(text: string): Promise<string> {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer(
                { bcid: 'code128', text, scale: 3, height: 10, includetext: true, textxalign: 'center' },
                (err, png) => (err ? reject(err) : resolve(`data:image/png;base64,${png.toString('base64')}`)),
            );
        });
    }

    private renderPdf(docDefinition: object): Promise<Buffer> {
        const printer = new PdfPrinter(this.fonts);
        return new Promise((resolve, reject) => {
            const doc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.end();
        });
    }

    private readonly labelStyles = {
        header:       { fontSize: 10, bold: true },
        locationName: { fontSize: 18, bold: true },
        sku:          { fontSize: 14, bold: true },
        productName:  { fontSize: 10 },
        subtext:      { fontSize: 10 },
        small:        { fontSize: 8, italics: true },
    };

    // ── Location PDF ──────────────────────────────────────────────────────────

    async generateLocationLabel(locationId: string): Promise<Buffer> {
        const location = await this.prisma.location.findUnique({
            where: { id: locationId },
            include: { parent: true },
        });
        if (!location) throw new NotFoundException('Location not found');

        const barcodeDataURL = await this.generateBarcodeImage(location.id);

        return this.renderPdf({
            pageSize: { width: 288, height: 144 },
            pageMargins: [10, 10, 10, 10],
            content: [
                { text: 'LOCATION LABEL', style: 'header', alignment: 'center' },
                { text: location.name, style: 'locationName', alignment: 'center', margin: [0, 10, 0, 5] },
                { image: barcodeDataURL, width: 200, alignment: 'center' },
                { text: location.structuralType || 'LOCATION', style: 'subtext', alignment: 'center', margin: [0, 5, 0, 0] },
                { text: location.parent ? `Parent: ${location.parent.name}` : '', style: 'small', alignment: 'center' },
            ],
            styles: this.labelStyles,
            defaultStyle: { font: 'Roboto' },
        });
    }

    // ── Location ZPL ──────────────────────────────────────────────────────────

    async generateLocationZpl(locationId: string): Promise<string> {
        const location = await this.prisma.location.findUnique({
            where: { id: locationId },
            include: { parent: true },
        });
        if (!location) throw new NotFoundException('Location not found');

        return [
            '^XA',
            '^FO20,20^ADN,24,12^FDLocation^FS',
            `^FO20,50^ADN,36,20^FD${location.name}^FS`,
            location.parent ? `^FO20,90^ADN,18,10^FDParent: ${location.parent.name}^FS` : '',
            `^FO20,115^ADN,14,8^FD${location.structuralType ?? 'LOCATION'}^FS`,
            '^FO20,135^BCN,60,Y,N,N',
            `^FD${location.id}^FS`,
            '^XZ',
        ].filter(Boolean).join('\n');
    }

    // ── Product PDF ───────────────────────────────────────────────────────────

    async generateItemLabel(productId: string): Promise<Buffer> {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new NotFoundException('Product not found');

        const barcodeText = product.sku || product.id;
        const barcodeDataURL = await this.generateBarcodeImage(barcodeText);

        return this.renderPdf({
            pageSize: { width: 216, height: 144 },
            pageMargins: [10, 10, 10, 10],
            content: [
                { text: product.sku ?? '', style: 'sku', alignment: 'center' },
                { text: product.name, style: 'productName', alignment: 'center', margin: [0, 5, 0, 5], maxLines: 2 },
                { image: barcodeDataURL, width: 150, alignment: 'center' },
            ],
            styles: this.labelStyles,
            defaultStyle: { font: 'Roboto' },
        });
    }

    // ── Product ZPL ───────────────────────────────────────────────────────────

    async generateProductZpl(productId: string): Promise<string> {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new NotFoundException('Product not found');

        const barcodeValue = product.sku || product.id;
        const name = product.name.substring(0, 30);

        return [
            '^XA',
            `^FO20,20^ADN,24,12^FD${product.sku ?? ''}^FS`,
            `^FO20,50^ADN,18,10^FD${name}^FS`,
            '^FO20,75^BCN,60,Y,N,N',
            `^FD${barcodeValue}^FS`,
            '^XZ',
        ].join('\n');
    }

    // ── Batch printing ────────────────────────────────────────────────────────

    async generateBatchPdf(items: Array<{ type: 'product' | 'location'; id: string }>): Promise<Buffer> {
        const pages: object[] = [];

        for (const item of items) {
            if (item.type === 'product') {
                const product = await this.prisma.product.findUnique({ where: { id: item.id } });
                if (!product) continue;
                const barcodeDataURL = await this.generateBarcodeImage(product.sku || product.id);
                pages.push(
                    { text: product.sku ?? '', style: 'sku', alignment: 'center' },
                    { text: product.name, style: 'productName', alignment: 'center', margin: [0, 5, 0, 5], maxLines: 2 },
                    { image: barcodeDataURL, width: 150, alignment: 'center' },
                    { text: '', pageBreak: 'after' },
                );
            } else {
                const location = await this.prisma.location.findUnique({ where: { id: item.id }, include: { parent: true } });
                if (!location) continue;
                const barcodeDataURL = await this.generateBarcodeImage(location.id);
                pages.push(
                    { text: 'LOCATION LABEL', style: 'header', alignment: 'center' },
                    { text: location.name, style: 'locationName', alignment: 'center', margin: [0, 10, 0, 5] },
                    { image: barcodeDataURL, width: 200, alignment: 'center' },
                    { text: location.structuralType || 'LOCATION', style: 'subtext', alignment: 'center', margin: [0, 5, 0, 0] },
                    { text: '', pageBreak: 'after' },
                );
            }
        }

        // Remove trailing page break on the last item
        const last = pages[pages.length - 1] as any;
        if (last?.pageBreak) pages.pop();

        return this.renderPdf({
            pageSize: { width: 288, height: 144 },
            pageMargins: [10, 10, 10, 10],
            content: pages,
            styles: this.labelStyles,
            defaultStyle: { font: 'Roboto' },
        });
    }

    async generateBatchZpl(items: Array<{ type: 'product' | 'location'; id: string }>): Promise<string> {
        const labels: string[] = [];
        for (const item of items) {
            if (item.type === 'product') {
                labels.push(await this.generateProductZpl(item.id));
            } else {
                labels.push(await this.generateLocationZpl(item.id));
            }
        }
        return labels.join('\n');
    }

    // ── Lot (InventoryBatch) labels ───────────────────────────────────────────

    async generateLotLabel(batchId: string): Promise<Buffer> {
        const batch = await this.prisma.inventoryBatch.findUnique({
            where: { id: batchId },
            include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
        });
        if (!batch) throw new NotFoundException('Batch not found');

        const barcodeDataURL = await this.generateBarcodeImage(batch.batchNumber);

        return this.renderPdf({
            pageSize: { width: 288, height: 144 },
            pageMargins: [10, 10, 10, 10],
            content: [
                { text: 'LOT LABEL', style: 'header', alignment: 'center' },
                { text: batch.batchNumber, style: 'locationName', alignment: 'center', margin: [0, 5, 0, 5] },
                { image: barcodeDataURL, width: 200, alignment: 'center' },
                { text: batch.product.name, style: 'productName', alignment: 'center', margin: [0, 4, 0, 0] },
                { text: `SKU: ${batch.product.sku ?? ''} · Qty: ${batch.currentQuantity}`, style: 'small', alignment: 'center' },
                batch.expiryDate ? { text: `Exp: ${batch.expiryDate.toISOString().split('T')[0]}`, style: 'small', alignment: 'center' } : {},
            ],
            styles: this.labelStyles,
            defaultStyle: { font: 'Roboto' },
        });
    }

    async generateLotZpl(batchId: string): Promise<string> {
        const batch = await this.prisma.inventoryBatch.findUnique({
            where: { id: batchId },
            include: { product: { select: { name: true, sku: true } } },
        });
        if (!batch) throw new NotFoundException('Batch not found');

        return [
            '^XA',
            '^FO20,20^ADN,18,10^FDLot Label^FS',
            `^FO20,45^ADN,28,16^FD${batch.batchNumber}^FS`,
            `^FO20,80^ADN,14,8^FD${batch.product.name.substring(0, 30)}^FS`,
            batch.expiryDate ? `^FO20,98^ADN,12,7^FDExp: ${batch.expiryDate.toISOString().split('T')[0]}^FS` : '',
            '^FO20,115^BCN,50,Y,N,N',
            `^FD${batch.batchNumber}^FS`,
            '^XZ',
        ].filter(Boolean).join('\n');
    }

    // ── Print queue ───────────────────────────────────────────────────────────

    async processQueueJob(job: {
        entityType: 'product' | 'location' | 'lot';
        entityId: string;
        format?: 'pdf' | 'zpl' | 'png';
        printerId?: string;
        copies?: number;
    }): Promise<{ jobId: string; status: 'processed'; entityType: string; entityId: string; format: string; copies: number }> {
        const format = job.format ?? 'pdf';
        const copies = job.copies ?? 1;

        // Validate the entity exists by generating the label (throws NotFoundException if not found)
        if (job.entityType === 'product') {
            if (format === 'zpl') await this.generateProductZpl(job.entityId);
            else await this.generateItemLabel(job.entityId);
        } else if (job.entityType === 'location') {
            if (format === 'zpl') await this.generateLocationZpl(job.entityId);
            else await this.generateLocationLabel(job.entityId);
        } else {
            if (format === 'zpl') await this.generateLotZpl(job.entityId);
            else await this.generateLotLabel(job.entityId);
        }

        const jobId = `pj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return { jobId, status: 'processed', entityType: job.entityType, entityId: job.entityId, format, copies };
    }
}
