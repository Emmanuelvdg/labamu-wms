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
}
