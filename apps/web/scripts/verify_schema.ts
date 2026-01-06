import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log('Checking schema...');
        // We can't easily check columns via Prisma client API directly without raw query or just creating a record
        // Let's try to query with raw SQL to see table info or just create a packaging with ti/hi

        console.log('Attempting to create ProductPackaging record with ti/hi...');
        // First get a product to attach to
        let product = await prisma.product.findFirst();
        if (!product) {
            product = await prisma.product.create({
                data: {
                    sku: 'SCHEMA-TEST-' + Date.now(),
                    name: 'Schema Test Product',
                    category: 'TEST'
                }
            });
        }

        const pkg = await prisma.productPackaging.create({
            data: {
                name: 'Test Pallet',
                unitType: 'PALLET',
                productId: product.id,
                quantity: 100,
                ti: 10,
                hi: 5
            }
        });

        console.log('✅ Successfully created ProductPackaging with ti/hi:', pkg);

        // Clean up
        await prisma.productPackaging.delete({ where: { id: pkg.id } });
        console.log('Cleaned up test record.');

    } catch (error) {
        console.error('❌ Schema verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
