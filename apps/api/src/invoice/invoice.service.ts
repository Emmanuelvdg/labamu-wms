import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { getCurrentCompanyId } from '../common/tenant/tenant-storage';

@Injectable()
export class InvoiceService {
    constructor(private prisma: PrismaService) { }

    async createInvoice(data: {
        invoiceNumber: string;
        vendorId: string;
        purchaseOrderId?: string;
        issueDate: Date;
        dueDate: Date;
        items: {
            description: string;
            quantity: number;
            unitPrice: number;
            productId?: string;
            poItemId?: string;
            receiptItemId?: string;
        }[];
    }) {
        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        return this.prisma.invoice.create({
            data: {
                invoiceNumber: data.invoiceNumber,
                vendorId: data.vendorId,
                purchaseOrderId: data.purchaseOrderId,
                issueDate: data.issueDate,
                dueDate: data.dueDate,
                totalAmount,
                items: {
                    create: data.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                        productId: item.productId,
                        poItemId: item.poItemId,
                        receiptItemId: item.receiptItemId,
                    }))
                }
            },
            include: { items: true }
        });
    }

    async getInvoices() {
        const companyId = getCurrentCompanyId();
        return this.prisma.invoice.findMany({
            where: companyId ? { vendor: { companyId } } : {},
            include: { vendor: true, purchaseOrder: true, items: true }
        });
    }

    async getInvoice(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: { vendor: true, purchaseOrder: true, items: true }
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    async matchInvoice(id: string) {
        const invoice = await this.getInvoice(id);
        const results = [];

        for (const item of invoice.items) {
            const matchResult = {
                invoiceItemId: item.id,
                description: item.description,
                status: 'MATCHED',
                discrepancies: [] as string[]
            };

            // 1. Match against PO Item
            if (item.poItemId) {
                const poItem = await this.prisma.purchaseOrderItem.findUnique({
                    where: { id: item.poItemId }
                });
                if (poItem) {
                    // Price Check
                    if (item.unitPrice !== poItem.unitCost) {
                        matchResult.status = 'VARIANCE';
                        matchResult.discrepancies.push(`Price Variance: Invoice ${item.unitPrice} vs PO ${poItem.unitCost}`);
                    }
                    // Quantity Check (vs Ordered)
                    // Note: Invoice qty might differ from Ordered if partial shipment, so this is just a warning usually
                    if (item.quantity > poItem.quantity) {
                        matchResult.discrepancies.push(`Qty Variance: Invoice ${item.quantity} > PO Ordered ${poItem.quantity}`);
                    }
                }
            }

            // 2. Match against Receipt Item (Proof of Delivery)
            // If linked directly:
            if (item.receiptItemId) {
                const receiptItem = await this.prisma.receiptItem.findUnique({
                    where: { id: item.receiptItemId }
                });
                if (receiptItem) {
                    if (item.quantity !== receiptItem.quantity) {
                        matchResult.status = 'VARIANCE';
                        matchResult.discrepancies.push(`Qty Variance: Invoice ${item.quantity} vs Received ${receiptItem.quantity}`);
                    }
                }
            } else if (item.poItemId) {
                // Try to find receipts for this PO Item
                const receiptItems = await this.prisma.receiptItem.findMany({
                    where: { poItemId: item.poItemId }
                });
                const totalReceived = receiptItems.reduce((sum, ri) => sum + ri.quantity, 0);

                // Simple check: Invoice Qty shouldn't exceed Total Received for that line
                if (item.quantity > totalReceived) {
                    matchResult.status = 'VARIANCE';
                    matchResult.discrepancies.push(`Qty Variance: Invoice ${item.quantity} > Total Received ${totalReceived}`);
                }
            }

            results.push(matchResult);
        }

        const hasVariance = results.some(r => r.status === 'VARIANCE');
        const status = hasVariance ? 'VARIANCE' : 'MATCHED';

        // Update Invoice status if changed (optional, or just return analysis)
        // await this.prisma.invoice.update({ where: { id }, data: { status } }); // Maybe keep as DRAFT/POSTED but add a matchStatus field?
        // For now, just return the analysis.

        return {
            invoiceId: id,
            overallStatus: status,
            items: results
        };
    }
}
