import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

// Standard attributes that map to the old hard-coded values
const STANDARD_ATTRIBUTES = [
    { name: 'Refrigerated', key: 'refrigerated', dataType: 'BOOLEAN' },
    { name: 'Climate Controlled', key: 'climate_controlled', dataType: 'BOOLEAN' },
    { name: 'Hazmat Certified', key: 'hazmat_certified', dataType: 'BOOLEAN' },
    { name: 'Fragile Items', key: 'fragile', dataType: 'BOOLEAN' },
    { name: 'Heavy Duty', key: 'heavy_duty', dataType: 'BOOLEAN' },
    { name: 'Ground Floor', key: 'ground_floor', dataType: 'BOOLEAN' },
    { name: 'Dry Storage', key: 'dry', dataType: 'BOOLEAN' },
    { name: 'Frozen', key: 'frozen', dataType: 'BOOLEAN' },
];

async function migrateStorageRequirements() {
    console.log('🔄 Starting storage requirements migration...\n');

    try {
        // Step 1: Create standard attribute definitions if they don't exist
        console.log('Step 1: Creating standard attribute definitions...');
        const attributeMap = new Map<string, string>(); // key -> id mapping

        for (const attr of STANDARD_ATTRIBUTES) {
            let definition = await prisma.locationAttributeDefinition.findUnique({
                where: { name: attr.name }
            });

            if (!definition) {
                definition = await prisma.locationAttributeDefinition.create({
                    data: {
                        name: attr.name,
                        type: attr.dataType,
                    }
                });
                console.log(`  ✨ Created attribute: ${attr.name}`);
            } else {
                console.log(`  ✅ Attribute exists: ${attr.name}`);
            }

            attributeMap.set(attr.key, definition.id);
        }
        console.log('');

        // Step 2: Migrate PutawayRule.requiredAttributes → PutawayRuleAttribute
        console.log('Step 2: Migrating putaway rule attributes...');
        let migratedRules = 0;
        let skippedRules = 0;

        // Note: The schema still has requiredAttributes field until we run the migration
        // We're accessing the old JSON field that will be removed
        const rules = await prisma.$queryRaw`
            SELECT id, name, requiredAttributes 
            FROM PutawayRule 
            WHERE requiredAttributes IS NOT NULL
        ` as Array<{ id: string; name: string; requiredAttributes: string | null }>;

        for (const rule of rules) {
            if (!rule.requiredAttributes) {
                skippedRules++;
                continue;
            }

            try {
                const requirements = JSON.parse(rule.requiredAttributes);

                if (!Array.isArray(requirements) || requirements.length === 0) {
                    skippedRules++;
                    continue;
                }

                for (const reqKey of requirements) {
                    const attrDefId = attributeMap.get(reqKey);

                    if (!attrDefId) {
                        console.log(`  ⚠️  Unknown attribute key "${reqKey}" in rule "${rule.name}", skipping`);
                        continue;
                    }

                    // Check if already exists
                    const existing = await prisma.putawayRuleAttribute.findUnique({
                        where: {
                            putawayRuleId_attributeDefinitionId: {
                                putawayRuleId: rule.id,
                                attributeDefinitionId: attrDefId
                            }
                        }
                    });

                    if (!existing) {
                        await prisma.putawayRuleAttribute.create({
                            data: {
                                putawayRuleId: rule.id,
                                attributeDefinitionId: attrDefId,
                                requiredValue: 'true'
                            }
                        });
                    }
                }

                migratedRules++;
                console.log(`  ✅ Migrated rule: ${rule.name} (${requirements.length} attributes)`);
            } catch (error) {
                console.error(`  ❌ Error migrating rule "${rule.name}":`, error);
            }
        }

        console.log(`\n  📊 Putaway Rules: ${migratedRules} migrated, ${skippedRules} skipped\n`);

        // Step 3: Migrate Product.storageRequirements → ProductAttribute
        console.log('Step 3: Migrating product attributes...');
        let migratedProducts = 0;
        let skippedProducts = 0;

        const products = await prisma.$queryRaw`
            SELECT id, name, sku, storageRequirements 
            FROM Product 
            WHERE storageRequirements IS NOT NULL
        ` as Array<{ id: string; name: string; sku: string; storageRequirements: string | null }>;

        for (const product of products) {
            if (!product.storageRequirements) {
                skippedProducts++;
                continue;
            }

            try {
                const requirements = JSON.parse(product.storageRequirements);

                if (!Array.isArray(requirements) || requirements.length === 0) {
                    skippedProducts++;
                    continue;
                }

                for (const reqKey of requirements) {
                    const attrDefId = attributeMap.get(reqKey);

                    if (!attrDefId) {
                        console.log(`  ⚠️  Unknown attribute key "${reqKey}" for product "${product.sku}", skipping`);
                        continue;
                    }

                    // Check if already exists
                    const existing = await prisma.productAttribute.findUnique({
                        where: {
                            productId_attributeDefinitionId: {
                                productId: product.id,
                                attributeDefinitionId: attrDefId
                            }
                        }
                    });

                    if (!existing) {
                        await prisma.productAttribute.create({
                            data: {
                                productId: product.id,
                                attributeDefinitionId: attrDefId,
                                value: 'true'
                            }
                        });
                    }
                }

                migratedProducts++;
                console.log(`  ✅ Migrated product: ${product.sku} (${requirements.length} attributes)`);
            } catch (error) {
                console.error(`  ❌ Error migrating product "${product.sku}":`, error);
            }
        }

        console.log(`\n  📊 Products: ${migratedProducts} migrated, ${skippedProducts} skipped\n`);

        // Step 4: Summary
        console.log('═'.repeat(60));
        console.log('✅ Migration Complete!\n');
        console.log('Summary:');
        console.log(`  • Attribute Definitions: ${STANDARD_ATTRIBUTES.length} ensured`);
        console.log(`  • Putaway Rules Migrated: ${migratedRules}`);
        console.log(`  • Products Migrated: ${migratedProducts}`);
        console.log('═'.repeat(60));
        console.log('\n⚠️  IMPORTANT: The old JSON fields still exist in the database.');
        console.log('   They will be removed in a future migration after verification.');
        console.log('   For now, both old and new data coexist.\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migrateStorageRequirements()
    .then(() => {
        console.log('🎉 Migration script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    });
