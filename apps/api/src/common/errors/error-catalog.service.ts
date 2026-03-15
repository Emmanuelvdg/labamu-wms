import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CatalogEntry {
    httpStatus: number;
    message: string;
    userMessage: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
}

export interface ResolvedError {
    httpStatus: number;
    code: string;
    message: string;
    userMessage: string;
    severity: string;
    category: string;
    details: Record<string, any>;
    timestamp: string;
}

@Injectable()
export class ErrorCatalogService {
    private readonly logger = new Logger(ErrorCatalogService.name);
    private catalog: Record<string, CatalogEntry> = {};

    constructor() {
        this.loadCatalog();
    }

    private loadCatalog(): void {
        try {
            const catalogPath = path.join(__dirname, 'error-catalog.json');
            this.logger.log(`Checking error catalog at: ${catalogPath}`);
            const raw = fs.readFileSync(catalogPath, 'utf-8');
            this.catalog = JSON.parse(raw);
            this.logger.log(`Loaded ${Object.keys(this.catalog).length} error codes from catalog`);
        } catch (err) {
            this.logger.error('Failed to load error catalog, using empty catalog', err);
            this.catalog = {};
        }
    }

    /**
     * Resolve an error code to a full error response.
     * Template variables in `message` are interpolated from `context`.
     * 
     * @param code - The error code (e.g. 'PRODUCT_NOT_FOUND')
     * @param context - Variables to interpolate into the message template
     */
    resolve(code: string, context: Record<string, any> = {}): ResolvedError {
        const entry = this.catalog[code];

        if (!entry) {
            // Unknown code — return generic 500
            return {
                httpStatus: 500,
                code: 'UNKNOWN_ERROR',
                message: code,
                userMessage: 'An unexpected error occurred. Please try again or contact support.',
                severity: 'error',
                category: 'system',
                details: context,
                timestamp: new Date().toISOString(),
            };
        }

        return {
            httpStatus: entry.httpStatus,
            code,
            message: this.interpolate(entry.message, context),
            userMessage: entry.userMessage,
            severity: entry.severity,
            category: entry.category,
            details: context,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Try to map a legacy Error message to a catalog code.
     * Used by the exception filter as a fallback for unconverted services.
     */
    resolveFromMessage(message: string): ResolvedError | null {
        const lowerMsg = message.toLowerCase();

        // Common patterns → codes
        const patterns: Array<{ pattern: RegExp | string; code: string }> = [
            { pattern: 'product not found', code: 'PRODUCT_NOT_FOUND' },
            { pattern: 'location not found', code: 'LOCATION_NOT_FOUND' },
            { pattern: 'parent location not found', code: 'PARENT_LOCATION_NOT_FOUND' },
            { pattern: 'order not found', code: 'ORDER_NOT_FOUND' },
            { pattern: 'purchase order not found', code: 'PO_NOT_FOUND' },
            { pattern: 'warehouse not found', code: 'WAREHOUSE_NOT_FOUND' },
            { pattern: 'batch not found', code: 'BATCH_NOT_FOUND' },
            { pattern: 'receipt not found', code: 'RECEIPT_NOT_FOUND' },
            { pattern: 'session not found', code: 'PICKING_SESSION_NOT_FOUND' },
            { pattern: 'move not found', code: 'STOCK_MOVE_NOT_FOUND' },
            { pattern: 'adjustment not found', code: 'ADJUSTMENT_NOT_FOUND' },
            { pattern: 'adjustment already applied', code: 'ADJUSTMENT_ALREADY_APPLIED' },
            { pattern: 'already exists', code: 'DUPLICATE_LOCATION' },
            { pattern: 'insufficient stock', code: 'INSUFFICIENT_STOCK' },
            { pattern: 'serial tracked', code: 'SERIAL_QUANTITY_ERROR' },
            { pattern: 'serial number is required', code: 'SERIAL_NUMBER_REQUIRED' },
            { pattern: 'must have a parent', code: 'PARENT_REQUIRED' },
            { pattern: 'cannot move a location inside itself', code: 'CANNOT_MOVE_INTO_SELF' },
            { pattern: 'cannot store stock in', code: 'CANNOT_STORE_IN_VIEW' },
            { pattern: 'cannot delete', code: 'CANNOT_DELETE_WAREHOUSE' },
            { pattern: 'cannot cancel', code: 'CANNOT_CANCEL_SHIPPED' },
            { pattern: 'no items to receive', code: 'NO_ITEMS_TO_RECEIVE' },
            { pattern: 'stock move already done', code: 'STOCK_MOVE_ALREADY_DONE' },
            { pattern: 'stock configuration missing', code: 'STOCK_CONFIG_MISSING' },
            { pattern: 'input location missing', code: 'INPUT_LOCATION_MISSING' },
            { pattern: 'quality control location missing', code: 'QC_LOCATION_MISSING' },
            { pattern: 'invalid csv', code: 'INVALID_CSV_FORMAT' },
            { pattern: 'no orders available', code: 'PICKING_NO_ORDERS' },
        ];

        for (const { pattern, code } of patterns) {
            if (typeof pattern === 'string' && lowerMsg.includes(pattern)) {
                return this.resolve(code);
            }
        }

        return null;
    }

    /**
     * Interpolate {{variables}} in a template string.
     */
    private interpolate(template: string, context: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = context[key];
            if (value === undefined || value === null) return match;
            // Format numbers for readability
            if (typeof value === 'number') {
                return Number.isInteger(value) ? value.toString() : value.toFixed(1);
            }
            return String(value);
        });
    }

    /**
     * Get all error codes (for documentation / admin UI).
     */
    getAllCodes(): Record<string, CatalogEntry> {
        return { ...this.catalog };
    }
}
