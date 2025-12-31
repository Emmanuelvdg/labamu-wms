import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StockMoveService {
    constructor(private prisma: PrismaService) { }

    // Helper to find location by type or name
    private async findLocation(warehouseId: string, name: string) {
        // Fallback search: name match or type match matching naming convention
        return this.prisma.location.findFirst({
            where: {
                warehouseId,
                OR: [
                    { name: name },
                    { type: 'INTERNAL', name: { contains: name } }
                ]
            }
        });
    }

    async createInboundTransferHeader(
        tx: any,
        data: {
            purchaseOrderId: string;
            warehouseId: string;
            userId: string;
            type: string;
        }
    ) {
        // Determine total steps based on Warehouse Config
        const warehouse = await tx.warehouse.findUnique({ where: { id: data.warehouseId } });
        const incomingSteps = warehouse?.incomingSteps || '1_step';
        const steps = incomingSteps === '3_steps' ? 3 : (incomingSteps === '2_steps' ? 2 : 1);

        return tx.transferOrder.create({
            data: {
                type: data.type,
                status: incomingSteps === '1_step' ? 'DONE' : 'PROCESSING',
                sourceWarehouseId: data.warehouseId,
                destinationWarehouseId: data.warehouseId,
                initiatorId: data.userId,
                purchaseOrderId: data.purchaseOrderId,
                totalSteps: steps,
                currentStep: incomingSteps === '1_step' ? 1 : 2,
            }
        });
    }

    async generateInboundMoves(
        tx: any,
        transferOrderId: string,
        data: {
            productId: string;
            quantity: number;
            warehouseId: string;
        }
    ) {
        const warehouse = await tx.warehouse.findUnique({ where: { id: data.warehouseId } });
        if (!warehouse) throw new Error('Warehouse not found');

        const incomingSteps = warehouse.incomingSteps || '1_step';

        const stockLoc = await this.findLocation(warehouse.id, 'Stock');
        const inputLoc = await this.findLocation(warehouse.id, 'Input');
        const qualityLoc = await this.findLocation(warehouse.id, 'Quality Control');

        if (!stockLoc) throw new Error(`Stock configuration missing for warehouse ${warehouse.name}`);
        if ((incomingSteps === '2_steps' || incomingSteps === '3_steps') && !inputLoc) {
            throw new Error(`Input location missing for multi-step receiving`);
        }
        if (incomingSteps === '3_steps' && !qualityLoc) {
            throw new Error(`Quality Control location missing for 3-step receiving`);
        }

        const moves: any[] = [];

        if (incomingSteps === '1_step') {
            moves.push({
                sequence: 1,
                sourceLocationId: null, // Vendor
                destinationLocationId: stockLoc.id,
                status: 'DONE',
                quantity: data.quantity,
                inputQuantity: data.quantity,
                outputQuantity: data.quantity
            });
        } else if (incomingSteps === '2_steps') {
            moves.push({
                sequence: 1,
                sourceLocationId: null,
                destinationLocationId: inputLoc!.id,
                status: 'DONE',
                quantity: data.quantity,
                inputQuantity: data.quantity,
                outputQuantity: data.quantity
            });
            moves.push({
                sequence: 2,
                sourceLocationId: inputLoc!.id,
                destinationLocationId: stockLoc.id,
                status: 'READY',
                quantity: data.quantity,
                inputQuantity: data.quantity
            });
        } else if (incomingSteps === '3_steps') {
            moves.push({
                sequence: 1,
                sourceLocationId: null,
                destinationLocationId: inputLoc!.id,
                status: 'DONE',
                quantity: data.quantity,
                inputQuantity: data.quantity,
                outputQuantity: data.quantity
            });
            moves.push({
                sequence: 2,
                sourceLocationId: inputLoc!.id,
                destinationLocationId: qualityLoc!.id,
                status: 'READY',
                quantity: data.quantity,
                inputQuantity: data.quantity
            });
            moves.push({
                sequence: 3,
                sourceLocationId: qualityLoc!.id,
                destinationLocationId: stockLoc.id,
                status: 'WAITING',
                quantity: data.quantity,
                inputQuantity: data.quantity
            });
        }

        let previousMoveId: string | null = null;
        for (const moveData of moves) {
            const move = await tx.stockMove.create({
                data: {
                    ...moveData,
                    productId: data.productId,
                    transferOrderId: transferOrderId,
                    ruleId: null,
                }
            });

            if (previousMoveId) {
                await tx.stockMove.update({
                    where: { id: previousMoveId },
                    data: { nextMoveId: move.id }
                });
            }
            previousMoveId = move.id;
        }
    }
    async completeMove(moveId: string, quantity: number, destinationLocationId: string, userId: string) {
        // 1. Get Move
        const move = await this.prisma.stockMove.findUnique({ where: { id: moveId }, include: { nextMove: true, transferOrder: true } });
        if (!move) throw new Error('Move not found');

        // 2. Exception Check
        const isException = (move.inputQuantity && quantity < move.inputQuantity) || (move.destinationLocationId && destinationLocationId !== move.destinationLocationId);

        // 3. Update Current Move
        await this.prisma.stockMove.update({
            where: { id: moveId },
            data: {
                status: 'DONE',
                outputQuantity: quantity,
                destinationLocationId: destinationLocationId,
            }
        });

        // 4. Handle Next Step
        if (move.nextMove) {
            if (isException) {
                // UNHAPPY PATH: Cancel next move
                await this.prisma.stockMove.update({
                    where: { id: move.nextMove.id },
                    data: { status: 'CANCELLED', exceptionReason: 'Previous step deviation' }
                });
            } else {
                // HAPPY PATH
                await this.prisma.stockMove.update({
                    where: { id: move.nextMove.id },
                    data: { status: 'READY' }
                });

                if (move.transferOrderId) {
                    await this.prisma.transferOrder.update({
                        where: { id: move.transferOrderId },
                        data: {
                            currentStep: { increment: 1 },
                            activeMoveId: move.nextMove.id
                        }
                    });
                }
            }
        } else {
            // End of Chain
            if (move.transferOrderId) {
                await this.prisma.transferOrder.update({
                    where: { id: move.transferOrderId },
                    data: { status: 'DONE', activeMoveId: null }
                });
            }
        }
    }
}
