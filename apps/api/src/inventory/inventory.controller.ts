import { Controller, Get, Post, Body, Param, Put, Query, Delete, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermission } from '../common/auth/permissions.decorator';
import { InventoryService } from './inventory.service';
import { PackagingService } from './packaging.service';
import { UtilisationService } from './utilisation.service';
import { Product, Warehouse, ProductInventory } from '@labamu/database';

import * as fs from 'fs';
import * as path from 'path';

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
    private log(message: string) {
        const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\debug_reservation.log';
        fs.appendFileSync(logPath, `[InventoryController] ${message}\n`);
    }

    constructor(
        private readonly inventoryService: InventoryService,
        private readonly packagingService: PackagingService,
        private readonly utilisationService: UtilisationService
    ) { }

    @Post('packaging')
    createPackaging(@Body() data: any) {
        return this.packagingService.createPackaging(data);
    }

    @Get('packaging/:productId')
    getPackaging(@Param('productId') productId: string) {
        return this.packagingService.getPackaging(productId);
    }

    @Delete('packaging/:id')
    @RequirePermission('INVENTORY', 'DELETE')
    deletePackaging(@Param('id') id: string) {
        return this.packagingService.deletePackaging(id);
    }

    @Post('products')
    @RequirePermission('INVENTORY', 'CREATE')
    createProduct(@Body() data: any) {
        return this.inventoryService.createProduct(data);
    }

    @Get('products')
    @RequirePermission('INVENTORY', 'READ')
    getProducts(
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('classification') classification?: string,
        @Query('warehouseId') warehouseId?: string,
    ) {
        return this.inventoryService.getProducts({ search, category, classification, warehouseId });
    }

    @Get('products/:id')
    @RequirePermission('INVENTORY', 'READ')
    getProduct(@Param('id') id: string) {
        return this.inventoryService.getProduct(id);
    }

    @Put('products/:id')
    @RequirePermission('INVENTORY', 'UPDATE')
    updateProduct(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateProduct(id, data);
    }

    @Post('warehouses')
    @RequirePermission('WAREHOUSE', 'CREATE')
    createWarehouse(@Body() data: any) {
        return this.inventoryService.createWarehouse(data);
    }

    @Put('warehouses/:id')
    @RequirePermission('WAREHOUSE', 'UPDATE')
    updateWarehouse(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateWarehouse(id, data);
    }

    @Get('warehouses')
    getWarehouses() {
        return this.inventoryService.getWarehouses();
    }
    @Post('batch')
    addBatch(@Body() data: any) {
        return this.inventoryService.addBatch({
            ...data,
            purchaseDate: new Date(data.purchaseDate),
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
            batchNumber: data.batchNumber,
        });
    }

    @Get('batches')
    getAllBatches(@Query('warehouseId') warehouseId?: string) {
        return this.inventoryService.getAllBatches(warehouseId);
    }

    @Get('batch/:productId')
    getBatches(@Param('productId') productId: string) {
        return this.inventoryService.getBatches(productId);
    }

    @Get('transactions/:productId')
    getTransactions(@Param('productId') productId: string) {
        return this.inventoryService.getTransactions(productId);
    }

    @Post('adjustments')
    @RequirePermission('ADJUSTMENTS', 'CREATE')
    async createAdjustment(@Body() data: any) {
        this.log(`createAdjustment called with ${JSON.stringify(data)}`);
        try {
            return await this.inventoryService.createAdjustment(data);
        } catch (e: any) {
            this.log(`Error in controller createAdjustment: ${e.message}`);
            throw e;
        }
    }

    @Put('adjustments/:id')
    @RequirePermission('ADJUSTMENTS', 'UPDATE')
    updateAdjustment(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateAdjustment(id, data);
    }

    @Post('adjustments/:id/apply')
    @RequirePermission('ADJUSTMENTS', 'APPLY')
    applyAdjustment(@Param('id') id: string) {
        return this.inventoryService.applyAdjustment(id);
    }

    @Get('adjustments')
    getAdjustments() {
        return this.inventoryService.getAdjustments();
    }

    @Post('scrap')
    createScrapOrder(@Body() data: { locationId: string; productId: string; quantity: number; reason: string }) {
        return this.inventoryService.createScrapOrder(data);
    }

    @Get('scrap')
    getScrapOrders() {
        return this.inventoryService.getScrapOrders();
    }

    @Post('transfer')
    createTransfer(@Body() data: { productId: string; sourceLocationId: string; destinationLocationId: string; quantity: number; reason?: string }) {
        return this.inventoryService.createTransfer(data);
    }

    @Post('reordering-rules')
    createReorderingRule(@Body() data: { productId: string; locationId: string; minQuantity: number; maxQuantity: number }) {
        return this.inventoryService.createReorderingRule(data);
    }

    @Get('reordering-rules')
    getReorderingRules() {
        return this.inventoryService.getReorderingRules();
    }

    @Get('reordering-rules/check')
    checkReorderingRules() {
        return this.inventoryService.checkReorderingRules();
    }

    @Get('valuation')
    getValuation() {
        return this.inventoryService.getValuation();
    }

    @Get('transactions')
    getStockTransactions() {
        return this.inventoryService.getStockTransactions();
    }

    @Post('moves')
    createStockMove(@Body() data: any) {
        return this.inventoryService.createStockMove(data);
    }

    @Get('moves')
    getStockMoves(@Query('status') status?: string) {
        return this.inventoryService.getStockMoves(status);
    }

    @Post('moves/:id/validate')
    validateStockMove(@Param('id') id: string) {
        return this.inventoryService.validateStockMove(id);
    }

    @Get('locations/tree')
    getLocationsTree(@Query('warehouseId') warehouseId?: string) {
        return this.inventoryService.getLocationsTree(warehouseId);
    }

    @Get('locations/:id/utilisation')
    getLocationUtilisation(@Param('id') id: string) {
        return this.utilisationService.getLocationUtilisation(id);
    }

    @Post('locations/utilisation-batch')
    getBatchUtilisation(@Body() data: { locationIds: string[]; metric?: 'UTILISATION' | 'VELOCITY' | 'CONGESTION' }) {
        return this.utilisationService.getBatchUtilisation(data.locationIds, data.metric);
    }

    @Get('locations')
    getLocations(@Query('warehouseId') warehouseId?: string) {
        return this.inventoryService.getLocations(warehouseId);
    }

    @Get('locations/export')
    async exportLocations(@Query('warehouseId') warehouseId: string) {
        return this.inventoryService.exportLocations(warehouseId);
    }

    @Post('locations/import')
    async importLocations(@Body() data: { csv: string; warehouseId: string }) {
        return this.inventoryService.importLocations(data.csv, data.warehouseId);
    }

    @Post('locations')
    @RequirePermission('LOCATIONS', 'CREATE')
    createLocation(@Body() data: any) {
        return this.inventoryService.createLocation(data);
    }

    @Get('locations/:id')
    getLocationDetails(@Param('id') id: string) {
        return this.inventoryService.getLocationDetails(id);
    }

    @Get('locations/:id/dependencies')
    checkLocationDependencies(@Param('id') id: string) {
        return this.inventoryService.checkLocationDependencies(id);
    }

    @Delete('locations/:id')
    @RequirePermission('LOCATIONS', 'DELETE')
    deleteLocation(@Param('id') id: string) {
        return this.inventoryService.deleteLocation(id);
    }

    @Put('locations/:id')
    @RequirePermission('LOCATIONS', 'UPDATE')
    updateLocation(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateLocation(id, data);
    }

    @Put('locations/:id/move')
    moveLocation(@Param('id') id: string, @Body() data: { newParentId: string | null }) {
        return this.inventoryService.moveLocation(id, data.newParentId);
    }


    @Post('putaway-rules')
    @RequirePermission('PUTAWAY_RULES', 'CREATE')
    createPutawayRule(@Body() data: {
        name: string;
        description?: string;
        productId?: string;
        categoryId?: string;
        locationId?: string;
        destinationLocationId?: string;
        sourceLocationId?: string;
        strategy: string;
        priority: number;
        warehouseId?: string;
    }) {
        return this.inventoryService.createPutawayRule(data);
    }

    @Get('putaway-rules')
    @RequirePermission('PUTAWAY_RULES', 'READ')
    getPutawayRules() {
        return this.inventoryService.getPutawayRules();
    }

    @Get('attributes/definitions')
    @RequirePermission('PUTAWAY_RULES', 'READ')
    getAttributeDefinitions() {
        return this.inventoryService.getAttributeDefinitions();
    }

    @Put('putaway-rules/:id')
    @RequirePermission('PUTAWAY_RULES', 'UPDATE')
    updatePutawayRule(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updatePutawayRule(id, data);
    }

    @Delete('putaway-rules/:id')
    @RequirePermission('PUTAWAY_RULES', 'DELETE')
    deletePutawayRule(@Param('id') id: string) {
        return this.inventoryService.deletePutawayRule(id);
    }

    @Post('putaway-rules/test')
    @RequirePermission('PUTAWAY_RULES', 'READ')
    async testPutawayRule(@Body() data: {
        productId: string;
        quantity: number;
        warehouseId: string;
        sourceLocationId?: string;
        packagingType?: string;
    }) {
        const result = await this.inventoryService.testPutawayRule(data);
        return result;
    }


    @Post('products/:id/packaging')
    createProductPackaging(@Param('id') id: string, @Body() data: any) {
        return this.packagingService.createPackaging({ ...data, productId: id });
    }

    @Get('products/:id/packaging')
    getProductPackaging(@Param('id') id: string) {
        return this.inventoryService.getProductPackaging(id);
    }

    @Post('packages')
    createPackage(@Body() data: { name: string; type: string; locationId?: string; packagingId?: string }) {
        return this.inventoryService.createPackage(data);
    }

    @Get('packages')
    getPackages() {
        return this.inventoryService.getPackages();
    }

    @Post('packages/:packageId/assign')
    assignBatchToPackage(@Param('packageId') packageId: string, @Body() data: { batchId: string }) {
        return this.inventoryService.assignBatchToPackage(data.batchId, packageId);
    }

    @Post('routes')
    createRoute(@Body() data: { name: string; description?: string }) {
        return this.inventoryService.createRoute(data);
    }

    @Get('routes')
    getRoutes() {
        return this.inventoryService.getRoutes();
    }

    @Post('routes/:routeId/rules')
    createRule(@Param('routeId') routeId: string, @Body() data: { action: string; sourceLocationId?: string; destinationLocationId?: string; sequence?: number }) {
        return this.inventoryService.createRule({ ...data, routeId });
    }

    @Put('rules/:id')
    updateRule(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateRule(id, data);
    }

    @Get('cycle-counts')
    async checkCycleCounts() {
        return this.inventoryService.checkCycleCounts();
    }

    @Post('cycle-counts/start')
    async startCycleCount(@Body() data: { locationIds: string[] }) {
        return this.inventoryService.createCycleCountAdjustments(data.locationIds);
    }

    @Get('transit')
    getTransitItems() {
        return this.inventoryService.getTransitItems();
    }

    @Get()
    getInventory(@Query('productId') productId?: string, @Query('locationId') locationId?: string) {
        return this.inventoryService.getInventory(productId, locationId);
    }
}
