import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as bwipjs from 'bwip-js';
import * as path from 'path';
import { PrismaService } from '../prisma.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/printer').default;

@Injectable()
export class ShippingDocsService {
    private readonly logger = new Logger(ShippingDocsService.name);
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
            bwipjs.toBuffer(
                {
                    bcid: 'code128',
                    text,
                    scale: 3,
                    height: 10,
                    includetext: true,
                    textxalign: 'center',
                },
                (err, png) => {
                    if (err) reject(err);
                    else resolve(`data:image/png;base64,${png.toString('base64')}`);
                },
            );
        });
    }

    private generatePdf(docDefinition: any): Promise<Buffer> {
        const printer = new PdfPrinter(this.fonts);
        return new Promise((resolve, reject) => {
            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }

    /**
     * Generate a shipping label for a shipment.
     */
    async generateShippingLabel(shipmentId: string): Promise<Buffer> {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: {
                order: {
                    include: { customer: true, warehouse: true },
                },
            },
        });
        if (!shipment) throw new NotFoundException('Shipment not found');

        const trackingBarcode = await this.generateBarcodeImage(shipment.trackingId || shipment.id);

        const docDefinition: any = {
            pageSize: { width: 288, height: 432 }, // 4x6 inches (standard shipping label)
            pageMargins: [15, 15, 15, 15],
            content: [
                // From
                { text: 'FROM:', style: 'label', margin: [0, 0, 0, 2] },
                { text: shipment.order?.warehouse?.name || 'Warehouse', style: 'addressBold' },
                { text: shipment.order?.warehouse?.address || '', style: 'address' },
                { text: ' ', margin: [0, 5] },

                // To
                { text: 'TO:', style: 'label', margin: [0, 0, 0, 2] },
                { text: shipment.order?.customer?.name || 'Customer', style: 'addressBold' },
                { text: shipment.order?.customer?.address || '', style: 'address' },
                { text: shipment.order?.customer?.city || '', style: 'address' },
                { text: ' ', margin: [0, 10] },

                // Carrier & Service
                {
                    columns: [
                        { text: `Carrier: ${shipment.carrier || 'Standard'}`, style: 'detail' },
                        { text: `Date: ${new Date((shipment as any).createdAt).toLocaleDateString()}`, style: 'detail', alignment: 'right' },
                    ],
                },
                { text: ' ', margin: [0, 10] },

                // Tracking barcode
                { image: trackingBarcode, width: 220, alignment: 'center' },
                { text: shipment.trackingId || shipment.id, style: 'tracking', alignment: 'center', margin: [0, 5, 0, 0] },

                // Order reference
                { text: `Order: #${shipment.orderId.substring(0, 8).toUpperCase()}`, style: 'detail', alignment: 'center', margin: [0, 10, 0, 0] },
            ],
            styles: {
                label: { fontSize: 8, bold: true, color: '#666' },
                addressBold: { fontSize: 12, bold: true },
                address: { fontSize: 10 },
                detail: { fontSize: 9, color: '#444' },
                tracking: { fontSize: 10, bold: true },
            },
            defaultStyle: { font: 'Roboto' },
        };

        return this.generatePdf(docDefinition);
    }

    /**
     * Generate a packing slip for an order.
     */
    async generatePackingSlip(orderId: string): Promise<Buffer> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                customer: true,
                warehouse: true,
            },
        });
        if (!order) throw new NotFoundException('Order not found');

        const docDefinition: any = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            content: [
                // Header
                { text: 'PACKING SLIP', style: 'title', alignment: 'center', margin: [0, 0, 0, 20] },

                // Order Info
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: 'Order Details', style: 'sectionHeader' },
                                { text: `Order #: ${order.id.substring(0, 8).toUpperCase()}`, style: 'info' },
                                { text: `Date: ${new Date(order.createdAt).toLocaleDateString()}`, style: 'info' },
                                { text: `Status: ${order.status}`, style: 'info' },
                            ],
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: 'Ship To', style: 'sectionHeader' },
                                { text: order.customer?.name || 'N/A', style: 'infoBold' },
                                { text: order.customer?.address || '', style: 'info' },
                                { text: order.customer?.phone || '', style: 'info' },
                            ],
                        },
                    ],
                },

                { text: ' ', margin: [0, 15] },

                // Items Table
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 80, 60, 80],
                        body: [
                            [
                                { text: 'Product', style: 'tableHeader' },
                                { text: 'SKU', style: 'tableHeader' },
                                { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                                { text: 'Status', style: 'tableHeader', alignment: 'center' },
                            ],
                            ...order.items.map(item => [
                                { text: item.product.name, style: 'tableCell' },
                                { text: item.product.sku, style: 'tableCell' },
                                { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
                                { text: '☐ Verified', style: 'tableCell', alignment: 'center' },
                            ]),
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#ddd',
                        vLineColor: () => '#ddd',
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        paddingTop: () => 4,
                        paddingBottom: () => 4,
                    },
                },

                { text: ' ', margin: [0, 20] },

                // Footer
                {
                    columns: [
                        { text: `Packed by: _________________`, style: 'info' },
                        { text: `Date: _________________`, style: 'info', alignment: 'right' },
                    ],
                },
                { text: `Warehouse: ${order.warehouse?.name || 'N/A'}`, style: 'info', margin: [0, 10, 0, 0] },
            ],
            styles: {
                title: { fontSize: 20, bold: true },
                sectionHeader: { fontSize: 12, bold: true, margin: [0, 0, 0, 5], color: '#333' },
                info: { fontSize: 10, margin: [0, 2, 0, 0] },
                infoBold: { fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
                tableHeader: { fontSize: 9, bold: true, fillColor: '#f3f4f6' },
                tableCell: { fontSize: 9 },
            },
            defaultStyle: { font: 'Roboto' },
        };

        return this.generatePdf(docDefinition);
    }

    /**
     * Generate a shipping manifest (batch of shipments for carrier pickup).
     */
    async generateManifest(shipmentIds: string[]): Promise<Buffer> {
        const shipments = await this.prisma.shipment.findMany({
            where: { id: { in: shipmentIds } },
            include: {
                order: { include: { customer: true, items: true } },
            },
        });

        if (shipments.length === 0) throw new NotFoundException('No shipments found');

        const docDefinition: any = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30],
            content: [
                { text: 'SHIPPING MANIFEST', style: 'title', alignment: 'center', margin: [0, 0, 0, 10] },
                { text: `Generated: ${new Date().toLocaleString()}`, style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 20] },
                { text: `Total Shipments: ${shipments.length}`, style: 'info', margin: [0, 0, 0, 15] },

                {
                    table: {
                        headerRows: 1,
                        widths: [60, '*', 80, 80, 60, 80],
                        body: [
                            [
                                { text: '#', style: 'tableHeader' },
                                { text: 'Customer', style: 'tableHeader' },
                                { text: 'Tracking', style: 'tableHeader' },
                                { text: 'Carrier', style: 'tableHeader' },
                                { text: 'Items', style: 'tableHeader', alignment: 'center' },
                                { text: 'Status', style: 'tableHeader' },
                            ],
                            ...shipments.map((s, i) => [
                                { text: `${i + 1}`, style: 'tableCell' },
                                { text: s.order?.customer?.name || 'N/A', style: 'tableCell' },
                                { text: s.trackingId || s.id.substring(0, 8), style: 'tableCell' },
                                { text: s.carrier || 'Standard', style: 'tableCell' },
                                { text: `${s.order?.items?.length || 0}`, style: 'tableCell', alignment: 'center' },
                                { text: s.status || 'PENDING', style: 'tableCell' },
                            ]),
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#ddd',
                        vLineColor: () => '#ddd',
                        paddingLeft: () => 4,
                        paddingRight: () => 4,
                        paddingTop: () => 3,
                        paddingBottom: () => 3,
                    },
                },

                { text: ' ', margin: [0, 20] },
                {
                    columns: [
                        { text: `Prepared by: _________________`, style: 'info' },
                        { text: `Carrier signature: _________________`, style: 'info', alignment: 'right' },
                    ],
                },
            ],
            styles: {
                title: { fontSize: 18, bold: true },
                subtitle: { fontSize: 10, color: '#666' },
                info: { fontSize: 10 },
                tableHeader: { fontSize: 8, bold: true, fillColor: '#f3f4f6' },
                tableCell: { fontSize: 8 },
            },
            defaultStyle: { font: 'Roboto' },
        };

        return this.generatePdf(docDefinition);
    }
}
