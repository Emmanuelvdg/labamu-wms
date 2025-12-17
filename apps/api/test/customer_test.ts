import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CustomerService } from '../src/customer/customer.service';
import { PrismaClient } from '@labamu/database';

async function runTest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const customerService = app.get(CustomerService);
    const prisma = new PrismaClient();

    console.log('--- Starting Customer API Test ---');

    try {
        // 1. Create Customer
        const customerName = `Test Customer ${Date.now()}`;
        console.log(`1. Creating Customer "${customerName}"...`);
        const customer = await customerService.createCustomer({
            name: customerName,
            address: '123 Test St',
            latitude: 10.0,
            longitude: 20.0
        });
        console.log('   SUCCESS: Created Customer', customer.id);

        // 2. Get Customers
        console.log('2. Fetching all customers...');
        const customers = await customerService.getCustomers();
        const found = customers.find(c => c.id === customer.id);
        if (found) {
            console.log('   SUCCESS: Found created customer in list.');
        } else {
            console.error('   FAILURE: Created customer not found in list.');
        }

        // 3. Get Single Customer
        console.log('3. Fetching single customer...');
        const fetched = await customerService.getCustomer(customer.id);
        if (fetched && fetched.name === customerName) {
            console.log('   SUCCESS: Fetched correct customer details.');
        } else {
            console.error('   FAILURE: Fetched customer details mismatch.');
        }

    } catch (e) {
        console.error('Unexpected error during test execution:', e);
    } finally {
        await app.close();
        await prisma.$disconnect();
    }
}

runTest();
