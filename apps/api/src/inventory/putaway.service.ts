import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

import { UtilisationService } from './utilisation.service';

@Injectable()
export class PutawayService {
    constructor(
        private prisma: PrismaService,
        private utilisationService: UtilisationService
    ) { }

    /**
     * PHASE 3: Find matching putaway rules based on comprehensive criteria
     * Matches on: product, category, velocity, ABC class, storage requirements, packaging, weight
     */
    private async findMatchingPutawayRules(params: {
        productId: string;
        category?: string;
        velocity?: string;
        abcClass?: string;
        productAttributeIds?: string[]; // IDs of product's attributes
        packagingType?: string;
        totalWeight?: number;
        sourceLocationId?: string;
        warehouseId: string;
    }) {
        const rules = await this.prisma.putawayRule.findMany({
            where: {
                active: true,
                OR: [
                    { warehouseId: params.warehouseId },
                    { warehouseId: null }
                ],

                // Combine all matching conditions with AND
                AND: [
                    // Product matching: specific product OR category OR global rules
                    {
                        OR: [
                            { productId: params.productId },
                            { categoryId: params.category },
                            { AND: [{ productId: null }, { categoryId: null }] }
                        ]
                    },
                    // Velocity matching
                    {
                        OR: [
                            { velocityClass: null },
                            { velocityClass: params.velocity }
                        ]
                    },
                    // ABC class matching
                    {
                        OR: [
                            { abcClass: null },
                            { abcClass: params.abcClass }
                        ]
                    },
                    // Source location matching
                    {
                        OR: [
                            { sourceLocationId: null },
                            { sourceLocationId: params.sourceLocationId }
                        ]
                    }
                ]
            },
            orderBy: { priority: 'desc' },
            // Load required attributes for matching
            include: {
                requiredAttributes: {
                    include: {
                        attributeDefinition: true
                    }
                }
            }
        });

        // Filter rules based on attribute requirements
        return rules.filter(rule => {
            // Storage requirements matching - check if product has ALL required attributes
            if (rule.requiredAttributes && rule.requiredAttributes.length > 0) {
                if (!params.productAttributeIds || params.productAttributeIds.length === 0) {
                    // Product has no attributes but rule requires them
                    return false;
                }

                // Check if product has ALL required attributes from rule
                const hasAllRequired = rule.requiredAttributes.every(reqAttr =>
                    (params.productAttributeIds || []).includes(reqAttr.attributeDefinitionId)
                );

                if (!hasAllRequired) return false;
            }

            // Packaging size matching
            if (rule.minPackagingSize || rule.maxPackagingSize) {
                const sizeOrder = ['INDIVIDUAL', 'BOX', 'PALLET'];
                const currentIdx = params.packagingType ? sizeOrder.indexOf(params.packagingType) : -1;

                if (currentIdx === -1) return true; // No packaging type specified, allow rule

                const minIdx = rule.minPackagingSize ? sizeOrder.indexOf(rule.minPackagingSize) : 0;
                const maxIdx = rule.maxPackagingSize ? sizeOrder.indexOf(rule.maxPackagingSize) : sizeOrder.length - 1;

                if (currentIdx < minIdx || currentIdx > maxIdx) return false;
            }

            return true;
        });
    }

    /**
     * PHASE 3: Check if a location is compatible with product requirements
     * Verifies: storage attributes, temperature, packaging support, capacity
     */
    private async isLocationCompatible(
        location: any,
        product: any,
        quantity: number,
        packagingType?: string
    ): Promise<boolean> {
        try {
            // Phase 3B: Load location with dynamic attributes
            const locationWithAttrs = await this.prisma.location.findUnique({
                where: { id: location.id },
                include: {
                    dynamicAttributes: {
                        include: {
                            definition: true
                        }
                    }
                }
            });

            if (!locationWithAttrs) return false;

            // Check storage requirements - location must have ALL required product attributes
            if (product.attributes && product.attributes.length > 0) {
                const locationAttrIds = locationWithAttrs.dynamicAttributes.map(
                    attr => attr.definitionId
                );
                const productAttrIds = product.attributes.map(
                    (attr: any) => attr.attributeDefinitionId
                );

                // Location must support ALL product attribute requirements
                const hasAllAttributes = productAttrIds.every((reqId: any) =>
                    locationAttrIds.includes(reqId)
                );

                if (!hasAllAttributes) return false;
            }

            // Parse legacy location attributes JSON for temperature and packaging
            const locationAttrs = location.attributes ? JSON.parse(location.attributes) : {};

            // Check temperature compatibility
            if (product.temperatureMin !== null || product.temperatureMax !== null) {
                const locTempMin = locationAttrs.temperatureMin;
                const locTempMax = locationAttrs.temperatureMax;

                if (locTempMin === undefined || locTempMax === undefined) {
                    return false; // Location doesn't specify temperature range
                }

                // Location range must encompass product range
                if (product.temperatureMin && locTempMin > product.temperatureMin) return false;
                if (product.temperatureMax && locTempMax < product.temperatureMax) return false;
            }

            // Check packaging support
            if (packagingType && location.supportedPackaging) {
                const supportedPackaging = JSON.parse(location.supportedPackaging);
                if (!supportedPackaging.includes(packagingType)) return false;
            }

            // Check capacity
            const capacityCheck = await this.checkLocationCapacity(location.id, product.id, quantity);
            if (!capacityCheck.available) return false;

            return true;
        } catch (error) {
            console.error('Error checking location compatibility:', error);
            return false;
        }
    }

    /**
     * PHASE 3: Apply selection strategy to choose optimal location from candidates
     * Strategies: FIXED, ZONE_PRIORITY, CLOSEST, LEAST_OCCUPIED, BALANCED
     */
    private applyStrategy(
        strategy: string,
        candidateLocations: any[],
        product: any
    ): any | null {
        if (candidateLocations.length === 0) return null;

        switch (strategy) {
            case 'FIXED':
                // Already filtered to single location by rule
                return candidateLocations[0];

            case 'ZONE_PRIORITY':
                // Sort by zonePriority (lower = better), then putawaySequence
                return candidateLocations.sort((a, b) => {
                    if (a.zonePriority !== b.zonePriority) {
                        return a.zonePriority - b.zonePriority;
                    }
                    return a.putawaySequence - b.putawaySequence;
                })[0];

            case 'CLOSEST':
                // Use putawaySequence as proxy for distance (lower = closer)
                return candidateLocations.sort((a, b) =>
                    a.putawaySequence - b.putawaySequence
                )[0];

            case 'LEAST_OCCUPIED':
                // Select location with fewest current inventory items
                return candidateLocations.sort((a, b) =>
                    (a.inventory?.length || 0) - (b.inventory?.length || 0)
                )[0];

            case 'BALANCED':
                // Distribute across zones to avoid hotspots (random selection)
                return candidateLocations[
                    Math.floor(Math.random() * candidateLocations.length)
                ];

            default:
                // Default: zone priority
                return candidateLocations.sort((a, b) => {
                    if (a.zonePriority !== b.zonePriority) {
                        return a.zonePriority - b.zonePriority;
                    }
                    return a.putawaySequence - b.putawaySequence;
                })[0];
        }
    }

    /**
     * PHASE 3 ENHANCED: Finds the best location using putaway rules
     * Falls back to velocity-based logic if no rules match
     */
    async findBestLocation(
        productId: string,
        quantity: number,
        warehouseId: string,
        sourceLocationId?: string,
        packagingType?: string
    ) {
        // 1. Get Product Details with Phase 3 dynamic attributes
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
                attributes: {
                    include: {
                        attributeDefinition: true
                    }
                }
            }
        });

        if (!product) throw new Error('Product not found');

        const totalWeight = product.weight ? product.weight * quantity : 0;

        // Extract attribute definition IDs from product
        const productAttributeIds = product.attributes.map(attr => attr.attributeDefinitionId);

        // 2. Find matching putaway rules
        const matchingRules = await this.findMatchingPutawayRules({
            productId,
            category: product.category,
            velocity: product.velocity ?? undefined,
            abcClass: product.abcClass ?? undefined,
            productAttributeIds, // Pass attribute IDs instead of JSON
            packagingType,
            totalWeight,
            sourceLocationId,
            warehouseId
        });

        // 3. Try each matching rule in priority order
        for (const rule of matchingRules) {
            let candidateLocations: any[];

            if (rule.strategy === 'FIXED' && rule.destinationLocationId) {
                // Fixed destination strategy
                candidateLocations = await this.prisma.location.findMany({
                    where: { id: rule.destinationLocationId },
                    include: { inventory: true }
                });
            } else if (rule.strategy === 'ZONE_PRIORITY') {
                // Zone-based selection
                candidateLocations = await this.prisma.location.findMany({
                    where: {
                        warehouseId,
                        type: 'INTERNAL',
                        zonePriority: {
                            gte: rule.preferredZonePriorityMin || 0,
                            lte: rule.preferredZonePriorityMax || 999
                        }
                    },
                    include: { inventory: true },
                    orderBy: [{ zonePriority: 'asc' }, { putawaySequence: 'asc' }]
                });
            } else {
                // Other strategies: get all storage locations
                candidateLocations = await this.prisma.location.findMany({
                    where: {
                        warehouseId,
                        type: 'INTERNAL',
                        NOT: {
                            OR: [
                                { name: { contains: 'RECEIVING' } },
                                { name: { contains: 'Receiving' } },
                                { name: { contains: 'STAGING' } },
                                { name: { contains: 'Staging' } }
                            ]
                        }
                    },
                    include: { inventory: true }
                });
            }

            // 4. Filter by compatibility
            const compatibleLocations = [];
            for (const loc of candidateLocations) {
                if (await this.isLocationCompatible(loc, product, quantity, packagingType)) {
                    compatibleLocations.push(loc);
                }
            }

            // 5. Apply strategy to select best location
            const selected = this.applyStrategy(rule.strategy, compatibleLocations, product);

            if (selected) {
                console.log(`✅ Selected location via rule "${rule.name}" (strategy: ${rule.strategy})`);
                return selected;
            }
        }

        // 6. Fallback to default velocity-based heuristic
        console.log('⚠️  No matching rules, falling back to velocity-based selection');
        return this.defaultLocationSelection(product, quantity, warehouseId);
    }

    /**
     * Default location selection based on velocity (fallback when no rules match)
     */
    private async defaultLocationSelection(product: any, quantity: number, warehouseId: string) {
        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                type: 'INTERNAL',
            },
            include: {
                inventory: true,
            },
            orderBy: [
                { zonePriority: 'asc' },
                { putawaySequence: 'asc' }
            ]
        });

        if (locations.length === 0) return null;

        let candidateLocations = locations;

        if (product.velocity === 'A') {
            candidateLocations = locations.filter(l => l.zonePriority <= 20);
            if (candidateLocations.length === 0) candidateLocations = locations;
        } else if (product.velocity === 'C') {
            const slowZones = locations.filter(l => l.zonePriority > 50);
            if (slowZones.length > 0) candidateLocations = slowZones;
        }

        for (const location of candidateLocations) {
            const capacityCheck = await this.checkLocationCapacity(location.id, product.id, quantity);
            if (capacityCheck.available) {
                return location;
            }
        }

        return candidateLocations[0];
    }

    /**
     * Check if a location has capacity for the given product/quantity
     * Uses centralized UtilisationService
     */
    async checkLocationCapacity(
        locationId: string,
        productId: string,
        quantity: number
    ): Promise<{ available: boolean; reason?: string }> {
        const check = await this.utilisationService.canAccept(locationId, productId, quantity);
        return { available: check.allowed, reason: check.reason };
    }

    /**
     * Find alternative locations excluding a specific location
     */
    async findAlternativeLocations(
        productId: string,
        quantity: number,
        warehouseId: string,
        excludeLocationId: string
    ) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                type: 'INTERNAL',
                id: { not: excludeLocationId }
            },
            include: {
                inventory: true,
                parent: {
                    include: {
                        parent: {
                            include: {
                                parent: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { zonePriority: 'asc' },
                { putawaySequence: 'asc' }
            ]
        });

        // Filter by capacity and return top 3
        const availableLocations = [];
        for (const location of locations) {
            const capacityCheck = await this.checkLocationCapacity(location.id, productId, quantity);
            if (capacityCheck.available) {
                availableLocations.push(location);
                if (availableLocations.length >= 3) break;
            }
        }

        return availableLocations;
    }

    /**
     * Find receiving location IDs for a warehouse
     * Uses WarehouseFunctionalArea with fallback to naming convention
     */
    private async getReceivingLocationIds(warehouseId: string): Promise<string[]> {
        // Try functional areas first (preferred method)
        const functionalAreas = await this.prisma.warehouseFunctionalArea.findMany({
            where: {
                warehouseId,
                areaType: { in: ['RECEIVING', 'STAGING'] },
                active: true,
                linkedLocationId: { not: null }
            }
        });

        if (functionalAreas.length > 0) {
            return functionalAreas
                .map(area => area.linkedLocationId)
                .filter(id => id !== null) as string[];
        }

        // Fallback to naming convention (INTERNAL locations only)
        const locations = await this.prisma.location.findMany({
            where: {
                warehouseId,
                type: 'INTERNAL', // ✅ INTERNAL not VENDOR
                OR: [
                    { name: { contains: 'RECEIVING' } },
                    { name: { contains: 'Receiving' } },
                    { name: { contains: 'receiving' } },
                    { name: { contains: 'STAGING' } },
                    { name: { contains: 'Staging' } },
                    { name: { contains: 'staging' } }
                ]
            }
        });

        return locations.map(l => l.id);
    }

    /**
     * Create a putaway session for a warehouse
     * Works for all inbound flows: PO, IWT, STO, Production
     */
    async createSession(warehouseId: string, workerId?: string) {
        // Find receiving/staging location IDs
        const receivingLocationIds = await this.getReceivingLocationIds(warehouseId);

        if (receivingLocationIds.length === 0) {
            // Get warehouse name for better error context
            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: warehouseId },
                select: { name: true }
            });

            throw new HttpException(
                {
                    message: `No receiving or staging areas found for warehouse "${warehouse?.name || warehouseId}"`,
                    error: 'MISSING_RECEIVING_LOCATIONS',
                    details: {
                        warehouseId,
                        warehouseName: warehouse?.name || 'Unknown',
                        receivingLocationsFound: 0,
                        explanation: 'Putaway operations require designated receiving or staging locations where inbound inventory arrives before being stored.'
                    },
                    remediation: {
                        steps: [
                            '1. Navigate to Inventory > Locations',
                            '2. Click "New Location" to create a receiving area',
                            '3. Set the location type to "INTERNAL"',
                            '4. Name it "Receiving Dock A" or "Staging Area" (must include "Receiving" or "Staging" in the name)',
                            '5. Select your warehouse as the parent',
                            '6. Alternatively, configure WarehouseFunctionalArea entries with areaType "RECEIVING" or "STAGING"'
                        ],
                        quickFix: 'Create at least one INTERNAL location with "Receiving" or "Staging" in its name'
                    }
                },
                HttpStatus.BAD_REQUEST
            );
        }

        // Get recent receipts at receiving locations
        const receipts = await this.prisma.receipt.findMany({
            where: {
                destinationLocationId: { in: receivingLocationIds },
                status: 'DONE'
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                destinationLocation: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to recent receipts
        });

        if (receipts.length === 0) {
            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: warehouseId },
                select: { name: true }
            });

            throw new HttpException(
                {
                    message: `No items available for putaway in warehouse "${warehouse?.name || warehouseId}"`,
                    error: 'NO_PUTAWAY_ITEMS',
                    details: {
                        warehouseId,
                        warehouseName: warehouse?.name || 'Unknown',
                        receivingLocationsChecked: receivingLocationIds.length,
                        receiptsFound: 0,
                        explanation: 'No recent receipts found at receiving/staging locations. Items must be received before they can be put away.'
                    },
                    remediation: {
                        steps: [
                            '1. Navigate to Purchase Orders',
                            '2. Create and confirm a purchase order',
                            '3. Navigate to Procurement > Receive Products',
                            '4. Select the purchase order and receive items to a receiving/staging location',
                            '5. Return to Putaway and create a new session'
                        ],
                        quickFix: 'Receive a purchase order to a receiving or staging location first'
                    }
                },
                HttpStatus.NOT_FOUND
            );
        }

        // Create session
        const session = await this.prisma.putawaySession.create({
            data: {
                warehouseId,
                workerId,
                status: 'PLANNED'
            }
        });

        // Create tasks for each receipt item
        for (const receipt of receipts) {
            for (const item of receipt.items) {
                // Find best location
                const destinationLocation = await this.findBestLocation(
                    item.productId,
                    item.quantity,
                    warehouseId
                );

                if (!destinationLocation) continue;

                await this.prisma.putawayTask.create({
                    data: {
                        sessionId: session.id,
                        receiptId: receipt.id,
                        productId: item.productId,
                        sourceLocationId: receipt.destinationLocationId,
                        destinationLocationId: destinationLocation.id,
                        quantity: item.quantity,
                        originalQuantity: item.quantity,
                        status: 'PENDING'
                    }
                });
            }
        }

        return this.getActiveSession(warehouseId);
    }

    /**
     * Create putaway tasks for a specific manual batch
     * Called from InventoryService.addBatch
     */
    async createTasksForBatch(
        batchId: string,
        warehouseId: string
    ) {
        console.log(`[PutawayService] Creating tasks for manual batch ${batchId}`);

        const batch = await this.prisma.inventoryBatch.findUnique({
            where: { id: batchId },
            include: { product: true, location: true }
        });

        if (!batch) throw new Error('Batch not found');

        // Check active session
        let session = await this.prisma.putawaySession.findFirst({
            where: {
                warehouseId,
                status: { in: ['PLANNED', 'IN_PROGRESS'] }
            }
        });

        if (!session) {
            session = await this.prisma.putawaySession.create({
                data: { warehouseId, status: 'PLANNED' }
            });
        }

        // Find best location
        const destinationLocation = await this.findBestLocation(
            batch.productId,
            batch.currentQuantity,
            warehouseId,
            batch.locationId || undefined
        );

        if (destinationLocation) {
            // Check if we are already AT the best location (e.g. direct putaway)
            if (batch.locationId === destinationLocation.id) {
                console.log(`[PutawayService] Batch ${batchId} already at optimal location ${destinationLocation.name}. No task needed.`);
                return;
            }

            await this.prisma.putawayTask.create({
                data: {
                    sessionId: session.id,
                    productId: batch.productId,
                    sourceLocationId: batch.locationId!, // Manual batch has initial location
                    destinationLocationId: destinationLocation.id,
                    quantity: batch.currentQuantity,
                    originalQuantity: batch.currentQuantity,
                    status: 'PENDING',
                    // receiptId is optional now, so we can omit it
                }
            });
            console.log(`[PutawayService] Created pending task for batch ${batchId} -> ${destinationLocation.name}`);
        }
    }

    /**
     * Create putaway tasks for a specific receipt
     * Called automatically after PO receiving to generate putaway tasks
     * Auto-creates a PutawaySession to group the tasks
     */
    async createTasksForReceipt(
        tx: any,
        params: { receiptId: string; warehouseId: string }
    ) {
        console.log(`[PutawayService] Auto-creating putaway tasks for receipt ${params.receiptId}`);

        const receipt = await tx.receipt.findUnique({
            where: { id: params.receiptId },
            include: {
                items: { include: { product: true } },
                destinationLocation: true
            }
        });

        if (!receipt) {
            console.error(`[PutawayService] Receipt ${params.receiptId} not found`);
            throw new Error('Receipt not found');
        }

        console.log(`[PutawayService] Processing ${receipt.items.length} items from receipt at ${receipt.destinationLocation.name}`);

        // Check if there's an active session for this warehouse
        let session = await tx.putawaySession.findFirst({
            where: {
                warehouseId: params.warehouseId,
                status: { in: ['PLANNED', 'IN_PROGRESS'] }
            }
        });

        // If no active session, create one
        if (!session) {
            console.log(`[PutawayService] Creating new putaway session for warehouse ${params.warehouseId}`);
            session = await tx.putawaySession.create({
                data: {
                    warehouseId: params.warehouseId,
                    status: 'PLANNED'
                }
            });
        }

        // Create putaway tasks for each receipt item
        let tasksCreated = 0;
        for (const item of receipt.items) {
            // Find best location using putaway rules
            const destinationLocation = await this.findBestLocation(
                item.productId,
                item.quantity,
                params.warehouseId,
                receipt.destinationLocationId
            );

            if (!destinationLocation) {
                console.warn(`[PutawayService] No destination found for product ${item.product.name} - skipping`);
                continue;
            }

            console.log(`[PutawayService] Creating task: ${item.product.name} → ${destinationLocation.name}`);

            await tx.putawayTask.create({
                data: {
                    sessionId: session.id, // Link task to session
                    receiptId: receipt.id,
                    productId: item.productId,
                    sourceLocationId: receipt.destinationLocationId,
                    destinationLocationId: destinationLocation.id,
                    quantity: item.quantity,
                    originalQuantity: item.quantity,
                    status: 'PENDING'
                }
            });

            tasksCreated++;
        }

        console.log(`[PutawayService] Created ${tasksCreated} putaway tasks for receipt ${params.receiptId}`);
        return tasksCreated;
    }


    /**
     * Get active putaway session for a warehouse
     */
    async getActiveSession(warehouseId: string) {
        // Validate warehouseId
        if (!warehouseId || warehouseId === 'undefined') {
            console.log('[PutawayService] Invalid warehouseId provided to getActiveSession');
            return null;
        }

        try {
            const session = await this.prisma.putawaySession.findFirst({
                where: {
                    warehouseId,
                    status: { in: ['PLANNED', 'IN_PROGRESS'] }
                },
                include: {
                    tasks: {
                        include: {
                            product: true,
                            sourceLocation: {
                                include: {
                                    parent: {
                                        include: {
                                            parent: {
                                                include: {
                                                    parent: true
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            destinationLocation: {
                                include: {
                                    parent: {
                                        include: {
                                            parent: {
                                                include: {
                                                    parent: true
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            receipt: true
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            return session;
        } catch (error) {
            console.error('[PutawayService] Error getting active session:', error);
            throw new HttpException(
                'Failed to get active session',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Update a putaway task
     */
    async updateTask(
        taskId: string,
        data: {
            putawayQuantity?: number;
            status?: string;
            exceptionType?: string;
            exceptionReason?: string;
            actualQuantity?: number;
            alternativeLocationId?: string;
            requiresSupervisorReview?: boolean;
        }
    ) {
        const task = await this.prisma.putawayTask.findUnique({
            where: { id: taskId },
            include: { product: true, destinationLocation: true }
        });

        if (!task) {
            throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
        }

        // If task is being completed, update inventory
        if (data.status === 'COMPLETED' && data.putawayQuantity) {
            await this.moveInventory(
                task.productId,
                task.sourceLocationId,
                data.alternativeLocationId || task.destinationLocationId,
                data.putawayQuantity
            );
        }

        return this.prisma.putawayTask.update({
            where: { id: taskId },
            data
        });
    }

    /**
     * Move inventory from source to destination
     */
    private async moveInventory(
        productId: string,
        sourceLocationId: string,
        destinationLocationId: string,
        quantity: number
    ) {
        // Decrease source inventory
        await this.prisma.productInventory.updateMany({
            where: {
                productId,
                locationId: sourceLocationId
            },
            data: {
                quantity: { decrement: quantity }
            }
        });

        // Increase or create destination inventory
        const existingInventory = await this.prisma.productInventory.findFirst({
            where: {
                productId,
                locationId: destinationLocationId
            }
        });

        if (existingInventory) {
            await this.prisma.productInventory.update({
                where: { id: existingInventory.id },
                data: {
                    quantity: { increment: quantity }
                }
            });
        } else {
            // Get warehouse ID from location
            const location = await this.prisma.location.findUnique({
                where: { id: destinationLocationId }
            });

            await this.prisma.productInventory.create({
                data: {
                    productId,
                    locationId: destinationLocationId,
                    warehouseId: location!.warehouseId!,
                    quantity
                }
            });
        }
    }

    /**
     * Complete a putaway session
     */
    async completeSession(sessionId: string) {
        const session = await this.prisma.putawaySession.findUnique({
            where: { id: sessionId },
            include: { tasks: true }
        });

        if (!session) {
            throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
        }

        // Check if all tasks are completed
        const incompleteTasks = session.tasks.filter(t =>
            !['COMPLETED', 'FAILED', 'BLOCKED'].includes(t.status)
        );

        if (incompleteTasks.length > 0) {
            throw new HttpException(
                `Cannot complete session: ${incompleteTasks.length} tasks still pending`,
                HttpStatus.BAD_REQUEST
            );
        }

        return this.prisma.putawaySession.update({
            where: { id: sessionId },
            data: { status: 'COMPLETED' }
        });
    }

    /**
     * Handle damaged inventory exception
     */
    async handleDamagedInventory(
        taskId: string,
        damagedQty: number,
        goodQty: number,
        quarantineLocationId?: string
    ) {
        const task = await this.prisma.putawayTask.findUnique({
            where: { id: taskId },
            include: { product: true, sourceLocation: true }
        });

        if (!task) throw new HttpException('Task not found', HttpStatus.NOT_FOUND);

        // Create scrap order for damaged quantity
        if (damagedQty > 0) {
            await this.prisma.scrapOrder.create({
                data: {
                    locationId: task.sourceLocationId,
                    productId: task.productId,
                    quantity: damagedQty,
                    maxQuantity: damagedQty,
                    active: true
                }
            });

            // Create inventory adjustment for the loss
            await this.prisma.inventoryAdjustment.create({
                data: {
                    locationId: task.sourceLocationId,
                    productId: task.productId,
                    countedQuantity: task.quantity - damagedQty,
                    currentQuantity: task.quantity,
                    quantity: -damagedQty,
                    reason: `Damaged during receiving - Task ${taskId}`,
                    status: 'APPLIED'
                }
            });
        }

        // Update task
        // Update task with reduced quantity and exception info
        await this.prisma.putawayTask.update({
            where: { id: taskId },
            data: {
                quantity: goodQty,
                actualQuantity: task.quantity,
                exceptionType: 'DAMAGED',
                exceptionReason: `${damagedQty} units damaged, ${goodQty} units available for putaway`,
                status: goodQty > 0 ? 'IN_PROGRESS' : 'FAILED'
            }
        });

        return this.prisma.putawayTask.findUnique({ where: { id: taskId } });
    }

    /**
     * Handle quantity mismatch exception
     */
    async handleQuantityMismatch(
        taskId: string,
        expectedQty: number,
        actualQty: number,
        reason: string
    ) {
        const task = await this.prisma.putawayTask.findUnique({
            where: { id: taskId }
        });

        if (!task) throw new HttpException('Task not found', HttpStatus.NOT_FOUND);

        const difference = actualQty - expectedQty;

        // Create inventory adjustment
        await this.prisma.inventoryAdjustment.create({
            data: {
                locationId: task.sourceLocationId,
                productId: task.productId,
                countedQuantity: actualQty,
                currentQuantity: expectedQty,
                quantity: difference,
                reason: `Quantity mismatch: ${reason}`,
                status: 'APPLIED'
            }
        });

        await this.prisma.putawayTask.update({
            where: { id: taskId },
            data: {
                quantity: actualQty,
                actualQuantity: actualQty,
                originalQuantity: expectedQty,
                exceptionType: difference < 0 ? 'SHORT_RECEIPT' : 'OVERAGE',
                exceptionReason: reason,
                status: actualQty > 0 ? 'IN_PROGRESS' : 'FAILED'
            }
        });

        return this.prisma.putawayTask.findUnique({ where: { id: taskId } });
    }

    /**
     * Get blocked tasks requiring supervisor review
     */
    async getBlockedTasks(warehouseId: string) {
        return this.prisma.putawayTask.findMany({
            where: {
                session: { warehouseId },
                status: 'BLOCKED',
                requiresSupervisorReview: true,
                resolvedAt: null
            },
            include: {
                product: true,
                sourceLocation: true,
                destinationLocation: true,
                session: true
            }
        });
    }
}
