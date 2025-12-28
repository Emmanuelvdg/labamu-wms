import { PrismaClient } from '../../../packages/database/node_modules/.prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script to convert Location JSON attributes to LocationAttribute relations
 * This completes Phase 3B of the dynamic attribute system
 */
async function migrateLocationAttributes() {
    console.log('Starting Location attribute migration...\n');

    try {
        // Get all locations with JSON attributes
        const locations = await prisma.location.findMany({
            where: {
                attributes: {
                    not: null
                }
            }
        });

        console.log(`Found ${locations.length} locations with JSON attributes to migrate\n`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const location of locations) {
            try {
                if (!location.attributes) continue;

                console.log(`Processing location: ${location.name} (${location.id})`);

                const attributesJson = JSON.parse(location.attributes);
                const attributeKeys = attributesJson.attributes || [];

                console.log(`  Found attributes: ${JSON.stringify(attributeKeys)}`);

                // For each attribute key in the JSON array
                for (const attrKey of attributeKeys) {
                    // Normalize the key to match attribute definition names
                    // e.g., "refrigerated" -> "Refrigerated"
                    const normalizedKey = attrKey
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                    // Find or create the attribute definition
                    let attributeDef = await prisma.locationAttributeDefinition.findUnique({
                        where: { name: normalizedKey }
                    });

                    if (!attributeDef) {
                        // Try case-insensitive search
                        const allDefs = await prisma.locationAttributeDefinition.findMany();
                        attributeDef = allDefs.find(
                            def => def.name.toLowerCase() === normalizedKey.toLowerCase()
                        );
                    }

                    if (!attributeDef) {
                        console.log(`  ⚠️  Attribute definition not found: ${normalizedKey}, skipping...`);
                        continue;
                    }

                    // Create LocationAttribute record
                    const existingAttr = await prisma.locationAttribute.findUnique({
                        where: {
                            locationId_definitionId: {
                                locationId: location.id,
                                definitionId: attributeDef.id
                            }
                        }
                    });

                    if (existingAttr) {
                        console.log(`  ✓ Attribute already exists: ${attributeDef.name}`);
                        continue;
                    }

                    await prisma.locationAttribute.create({
                        data: {
                            locationId: location.id,
                            definitionId: attributeDef.id,
                            value: 'true' // Boolean attributes default to true if present
                        }
                    });

                    console.log(`  ✓ Created LocationAttribute: ${attributeDef.name}`);
                }

                migratedCount++;
                console.log(`✓ Successfully migrated location: ${location.name}\n`);

            } catch (error) {
                errorCount++;
                console.error(`✗ Error migrating location ${location.name}:`, error);
                console.log('');
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log('Migration Summary:');
        console.log(`Total locations processed: ${locations.length}`);
        console.log(`Successfully migrated: ${migratedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('═══════════════════════════════════════\n');

        console.log('✓ Migration complete!');
        console.log('Note: Original JSON attributes are preserved in Location.attributes field');
        console.log('      You can remove them after verifying the migration.\n');

    } catch (error) {
        console.error('Fatal error during migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateLocationAttributes()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
