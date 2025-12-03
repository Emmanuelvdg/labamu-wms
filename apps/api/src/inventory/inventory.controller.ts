import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Product, Warehouse, ProductInventory } from '@labamu/database';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post('products')
    createProduct(@Body() data: any) {
        return this.inventoryService.createProduct(data);
    }

    @Get('products')
    getProducts() {
        return this.inventoryService.getProducts();
    }

    @Post('warehouses')
    createWarehouse(@Body() data: any) {
        return this.inventoryService.createWarehouse(data);
    }

    @Put('warehouses/:id')
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

    @Get('batch/:productId')
    getBatches(@Param('productId') productId: string) {
        return this.inventoryService.getBatches(productId);
    }

    @Get('transactions/:productId')
    getTransactions(@Param('productId') productId: string) {
        return this.inventoryService.getTransactions(productId);
    }

    @Post('adjustments')
    createAdjustment(@Body() data: any) {
        return this.inventoryService.createAdjustment(data);
    }

    @Put('adjustments/:id')
    updateAdjustment(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateAdjustment(id, data);
    }

    @Post('adjustments/:id/apply')
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

    @Get('locations')
    getLocations(@Query('warehouseId') warehouseId?: string) {
        return this.inventoryService.getLocations(warehouseId);
    }

    @Post('locations')
    createLocation(@Body() data: any) {
        return this.inventoryService.createLocation(data);
    }

    @Put('locations/:id/move')
    moveLocation(@Param('id') id: string, @Body() data: { newParentId: string | null }) {
        return this.inventoryService.moveLocation(id, data.newParentId);
    }

    @Post('putaway-rules')
    createPutawayRule(@Body() data: { productId?: string; categoryId?: string; locationId: string; priority: number }) {
        return this.inventoryService.createPutawayRule(data);
    }

    @Get('putaway-rules')
    getPutawayRules() {
        return this.inventoryService.getPutawayRules();
    }

    @Post('packages')
    createPackage(@Body() data: { name: string; type: string; locationId?: string }) {
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
}
