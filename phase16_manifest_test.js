const axios = require('axios');
const { PrismaClient } = require('@labamu/database');

const API_BASE_URL = 'http://localhost:3001';
const HEADERS = {
  'x-user-id': 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502',
};

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Phase 16.3 Generate Manifest Tests ---');

  try {
    const warehouse = await prisma.warehouse.findFirst();
    const customer = await prisma.customer.findFirst();
    if (!warehouse) throw new Error('No warehouse found');
    
    // Create a dummy order and shipment for today
    const order = await prisma.order.create({
       data: {
           customerId: customer.id,
           warehouseId: warehouse.id,
           status: 'SHIPPED',
           priority: 'NORMAL',
           type: 'OUTBOUND',
       }
    });

    const shipment = await prisma.shipment.create({
       data: {
           orderId: order.id,
           carrier: 'Test Carrier',
           trackingId: 'TRK-12345',
           status: 'PENDING'
       }
    });

    console.log(`\n[16.3] Generate Manifest for Warehouse: ${warehouse.name}`);
    const res = await axios.get(`${API_BASE_URL}/shipping/manifest/${warehouse.id}`, { headers: HEADERS, responseType: 'arraybuffer' });
    console.log('Response:', res.status);
    console.log('Content-Type:', res.headers['content-type']);
    if (res.data) console.log('File size:', res.data.length);
    if (res.status === 200 && res.headers['content-type'].includes('application/pdf')) {
       console.log('✅ Scenario 16.3 Passed');
    } else {
       throw new Error('Did not return expected PDF');
    }
  } catch (err) {
    if (err.response) {
       console.error('❌ Tests Failed: Status', err.response.status, err.response.data.toString());
    } else {
       console.error('❌ Tests Failed:', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
