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

    constructor(private prisma: PrismaService) { }

    private async generateBarcodeImage(text: string): Promise<string> {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer({
                bcid: 'code128',       // Barcode type
                text: text,            // Text to encode
                scale: 3,              // 3x scaling factor
                height: 10,            // Bar height, in millimeters
                includetext: true,     // Show human-readable text
                textxalign: 'center',  // Always good to align text
            }, (err, png) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(`data:image/png;base64,${png.toString('base64')}`);
                }
            });
        });
    }

    async generateLocationLabel(locationId: string): Promise<Buffer> {
        try {
            const location = await this.prisma.location.findUnique({
                where: { id: locationId },
                include: { parent: true }
            });

            if (!location) throw new NotFoundException('Location not found');

            const barcodeDataURL = await this.generateBarcodeImage(location.id);

            const docDefinition: any = {
                pageSize: { width: 288, height: 144 }, // 4x2 inches approx
                pageMargins: [10, 10, 10, 10],
                content: [
                    { text: 'LOCATION LABEL', style: 'header', alignment: 'center' },
                    { text: location.name, style: 'locationName', alignment: 'center', margin: [0, 10, 0, 5] },
                    {
                        image: barcodeDataURL,
                        width: 200,
                        alignment: 'center'
                    },
                    { text: location.structuralType || 'LOCATION', style: 'subtext', alignment: 'center', margin: [0, 5, 0, 0] },
                    { text: location.parent ? `Parent: ${location.parent.name}` : '', style: 'small', alignment: 'center' }
                ],
                styles: {
                    header: { fontSize: 10, bold: true },
                    locationName: { fontSize: 18, bold: true },
                    subtext: { fontSize: 10 },
                    small: { fontSize: 8, italics: true }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };

            const printer = new PdfPrinter(this.fonts);
            return new Promise(async (resolve, reject) => {
                const pdfDoc = await printer.createPdfKitDocument(docDefinition);
                const chunks: any[] = [];
                pdfDoc.on('data', (chunk) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err) => reject(err));
                pdfDoc.end();
            });
        } catch (e: any) {
            console.error('generateLocationLabel ERROR:', e);
            throw new NotFoundException(`Printing Error: ${e.message}`);
        }
    }

    async generateItemLabel(productId: string): Promise<Buffer> {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id: productId }
            });

            if (!product) throw new NotFoundException('Product not found');

            const barcodeText = product.sku || product.id;
            if (!barcodeText) {
                throw new Error('Product has no SKU or ID for barcode generation');
            }
            const barcodeDataURL = await this.generateBarcodeImage(barcodeText);

            const docDefinition: any = {
                pageSize: { width: 216, height: 144 }, // 3x2 inches
                pageMargins: [10, 10, 10, 10],
                content: [
                    { text: product.sku, style: 'sku', alignment: 'center' },
                    { text: product.name, style: 'productName', alignment: 'center', margin: [0, 5, 0, 5], maxLines: 2 },
                    {
                        image: barcodeDataURL,
                        width: 150,
                        alignment: 'center'
                    }
                ],
                styles: {
                    sku: { fontSize: 14, bold: true },
                    productName: { fontSize: 10 },
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };

            const printer = new PdfPrinter(this.fonts);
            return new Promise(async (resolve, reject) => {
                const pdfDoc = await printer.createPdfKitDocument(docDefinition);
                const chunks: any[] = [];
                pdfDoc.on('data', (chunk) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err) => reject(err));
                pdfDoc.end();
            });
        } catch (e: any) {
            console.error('generateItemLabel ERROR:', e);
            throw new NotFoundException(`Printing Error: ${e.message}`);
        }
    }

    generateZPL(data: { id: string, name: string, subtext?: string }): string {
        // Simple ZPL Template
        return `
^XA
^FO50,50^ADN,36,20^FD${data.name}^FS
^FO50,100^BCN,100,Y,N,N
^FD${data.id}^FS
^FO50,220^ADN,18,10^FD${data.subtext || ''}^FS
^XZ
        `.trim();
    }
}
