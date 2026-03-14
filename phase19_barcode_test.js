const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';
const HEADERS = {
  'x-user-id': 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502',
};

async function runTests() {
  console.log('--- Phase 19 Barcode Lookup Tests ---');

  try {
    console.log('\n[19.1] Universal Barcode Lookup - Product (LAP-X)');
    const res1 = await axios.get(`${API_BASE_URL}/barcode/lookup?code=LAP-X`, { headers: HEADERS });
    console.log('Response:', res1.status, JSON.stringify(res1.data, null, 2));
    if (res1.data.type !== 'PRODUCT') throw new Error('Expected type PRODUCT');
    console.log('✅ Scenario 19.1 Passed');
  } catch (err) {
    console.error('❌ Scenario 19.1 Failed:', err.response?.data || err.message);
  }

  try {
    console.log('\n[19.2] Barcode Lookup - Location (BIN-01)');
    const res2 = await axios.get(`${API_BASE_URL}/barcode/lookup?code=BIN-01`, { headers: HEADERS });
    console.log('Response:', res2.status, JSON.stringify(res2.data, null, 2));
    if (res2.data.type !== 'LOCATION') throw new Error('Expected type LOCATION');
    console.log('✅ Scenario 19.2 Passed');
  } catch (err) {
    console.error('❌ Scenario 19.2 Failed:', err.response?.data || err.message);
  }

  try {
    console.log('\n[19.3] Barcode Lookup - Unknown');
    const res3 = await axios.get(`${API_BASE_URL}/barcode/lookup?code=INVALID-999`, { headers: HEADERS });
    console.log('Response:', res3.status, JSON.stringify(res3.data, null, 2));
    console.error('❌ Scenario 19.3 Failed (Should have thrown 400)');
  } catch (err) {
    console.log('Exception caught as expected:', err.response?.status, err.response?.data);
    if (err.response?.status === 400) {
      console.log('✅ Scenario 19.3 Passed');
    } else {
      console.error('❌ Scenario 19.3 Failed:', err.message);
    }
  }
}

runTests();
