import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface RuleContext {
    customerId?: string;
    orderTypeId?: string;
    productId: string;
    categoryId?: string;
    warehouseId?: string;
}

@Injectable()
export class RotationRuleResolverService {
    constructor(private prisma: PrismaService) { }

    async resolveRule(context: RuleContext) {
        // 1. Fetch potential rules matching *any* of the context criteria
        // We fetch purely active rules that have *some* overlap with our context.
        const potentialRules = await this.prisma.rotationRule.findMany({
            where: {
                active: true,
                OR: [
                    { customerId: context.customerId },
                    { orderTypeId: context.orderTypeId },
                    { productId: context.productId },
                    { categoryId: context.categoryId },
                    { warehouseId: context.warehouseId }
                ]
            },
            orderBy: { priority: 'desc' } // Explicit priority tie-breaker
        });

        // 2. Score/Sort by Specificity (Precedence)
        // Hierarchy: Customer+OrderType > Customer > OrderType > SKU > Category > Warehouse
        const scoredRules = potentialRules.map(rule => {
            let score = 0;
            // Precedence Scores (Bitmask-ish approach or just high weights)
            if (rule.customerId && rule.orderTypeId && rule.customerId === context.customerId && rule.orderTypeId === context.orderTypeId) {
                score = 1000; // Highest: Specific Customer + Order Type
            } else if (rule.customerId && rule.customerId === context.customerId && !rule.orderTypeId) {
                score = 500; // Customer only
            } else if (rule.orderTypeId && rule.orderTypeId === context.orderTypeId && !rule.customerId) {
                score = 100; // Order Type only
            }

            // Product Specificity adds to the score (allows Customer rule to be specific to a SKU vs Global)
            // But we typically want Customer Policy to override SKU Policy generally?
            // Spec says: Customer > Order Type > SKU > Category > Warehouse

            // Let's refine based on the Spec's strict hierarchy:
            // 1. Customer (+OrderType)
            // 2. Customer
            // 3. Order Type
            // 4. SKU
            // 5. Category
            // 6. Warehouse

            // We'll enforce this by checking "Type" of rule.

            let level = 0;
            if (rule.customerId && rule.orderTypeId) level = 6;
            else if (rule.customerId) level = 5;
            else if (rule.orderTypeId) level = 4;
            else if (rule.productId) level = 3;
            else if (rule.categoryId) level = 2;
            else if (rule.warehouseId) level = 1;

            return { rule, level, priority: rule.priority };
        });

        // Filter out rules that don't actually match the context (e.g. we fetched OR warehouseId, but it might be a different warehouse?)
        // The query handled the "OR", but we need to ensure if a rule *specifies* a criterion, it matches.
        const matches = scoredRules.filter(item => {
            const r = item.rule;
            if (r.customerId && r.customerId !== context.customerId) return false;
            if (r.orderTypeId && r.orderTypeId !== context.orderTypeId) return false;
            if (r.productId && r.productId !== context.productId) return false;
            if (r.categoryId && r.categoryId !== context.categoryId) return false;
            if (r.warehouseId && r.warehouseId !== context.warehouseId) return false;
            return true;
        });

        // Sort by Level DESC, then Priority DESC
        matches.sort((a, b) => {
            if (a.level !== b.level) return b.level - a.level;
            return b.priority - a.priority;
        });

        if (matches.length > 0) {
            return matches[0].rule;
        }

        // Default Fallback
        return { policy: 'FIFO', minShelfLifeDays: null, missingExpiryAction: 'ALLOW' };
    }
}
