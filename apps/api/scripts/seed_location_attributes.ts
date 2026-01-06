import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function seedAttributes() {
    try {
        console.log('🌱 Seeding Location Attributes...');

        const attributes = [
            {
                name: 'Bin Type',
                type: 'SELECT',
                options: JSON.stringify(['Standard GMA', 'Euro Pallet', 'Half Pallet', 'Bulk Lane', 'Rack'])
            },
            {
                name: 'Max Pallets',
                type: 'NUMBER',
                options: null
            },
            {
                name: 'Clearance Height', // cm
                type: 'NUMBER',
                options: null
            }
        ];

        for (const attr of attributes) {
            const existing = await prisma.locationAttributeDefinition.findUnique({
                where: { name: attr.name }
            });

            if (!existing) {
                await prisma.locationAttributeDefinition.create({
                    data: attr
                });
                console.log(`✅ Created attribute: ${attr.name}`);
            } else {
                console.log(`ℹ️ Attribute exists: ${attr.name}`);
            }
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedAttributes();
