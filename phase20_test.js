const axios = require('axios');
const { PrismaClient } = require('@labamu/database');

const API_BASE_URL = 'http://localhost:3001';
const HEADERS = {
  'x-user-id': 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502', // admin user
};

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Phase 20 Analytics & Integrations Tests ---');

  try {
    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) throw new Error('No warehouse found');
    
    console.log(`\n[20.1] ABC Auto-Classification for Warehouse: ${warehouse.name}`);
    const res1 = await axios.post(`${API_BASE_URL}/inventory/abc-classification/${warehouse.id}/run`, { periodDays: 90 }, { headers: HEADERS });
    console.log('Response:', res1.status);
    if (res1.status !== 200 && res1.status !== 201) throw new Error(`Expected 200/201, got ${res1.status}`);
    console.log('✅ Scenario 20.1 Passed');

    console.log(`\n[20.2] Pick Accuracy Metrics for Warehouse: ${warehouse.id}`);
    const res2 = await axios.get(`${API_BASE_URL}/reporting/pick-accuracy/${warehouse.id}?periodDays=30`, { headers: HEADERS });
    console.log('Response:', res2.status, res2.data);
    if (!res2.data || res2.data.accuracyPercentage === undefined) throw new Error('Invalid response data');
    console.log('✅ Scenario 20.2 Passed');

    console.log(`\n[20.3] Zone-Scoped Cycle Count`);
    const res3 = await axios.get(`${API_BASE_URL}/reporting/cycle-count/${warehouse.id}?zone=Zone`, { headers: HEADERS });
    console.log('Response:', res3.status, `Records: ${res3.data.expectedCounts?.length || 0}`);
    console.log('✅ Scenario 20.3 Passed');

    console.log(`\n[20.4] Multi-Carrier Rate Comparison`);
    const res4 = await axios.get(`${API_BASE_URL}/shipping/rates?originZip=10110&destZip=10120&weightKg=2`, { headers: HEADERS });
    console.log('Response:', res4.status, `Rates: ${res4.data?.length || 0}`);
    console.log('✅ Scenario 20.4 Passed');

    console.log(`\n[20.5] Lalamove Integration (Existing)`);
    try {
      const res5 = await axios.get(`${API_BASE_URL}/lalamove/config/${warehouse.id}`, { headers: HEADERS });
      console.log('Response:', res5.status);
      console.log('✅ Scenario 20.5 Passed');
    } catch (err) {
      if (err.response && err.response.status === 404) {
         console.log('Lalamove config not found but endpoint is accessible (404)');
         console.log('✅ Scenario 20.5 Passed');
      } else {
         throw err;
      }
    }

  } catch (err) {
    console.error('❌ Tests Failed:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
