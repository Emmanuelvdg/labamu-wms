
const fetch = require('node-fetch'); // Assuming node-fetch is available, or use global fetch if node 18+

const API_URL = 'http://localhost:3001';

async function testdashboard() {
    console.log('--- Testing Dashboard Analytics ---');
    try {
        const res = await fetch(`${API_URL}/reporting/analytics`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        console.log('Analytics Data:', JSON.stringify(data, null, 2));

        if (data.dailySales && Array.isArray(data.dailySales)) {
            console.log('✅ Daily Sales Trend is an array:', data.dailySales);
            const nonZero = data.dailySales.some(x => x > 0);
            if (nonZero) {
                console.log('✅ Found non-zero sales data (Hot reload might be working if you had data, or this is old data?)');
            } else {
                console.log('⚠️ Sales data is all zeros. This is expected if no orders were shipped today.');
            }
        } else {
            console.error('❌ Daily Sales Trend missing or invalid format');
        }
    } catch (e) {
        console.error('❌ Failed to fetch analytics:', e.message);
    }
}

async function testCompliance() {
    console.log('\n--- Testing Compliance Report (VAT) ---');
    try {
        const period = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await fetch(`${API_URL}/reporting/compliance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'VAT', period })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        console.log('VAT Report Data:', JSON.stringify(data, null, 2));

        if (data.type === 'VAT' && typeof data.totalVAT === 'number') {
            console.log('✅ VAT Report generated successfully with calculated fields.');
        } else {
            console.error('❌ VAT Report response invalid');
        }

    } catch (e) {
        console.error('❌ Failed to generate VAT report:', e.message);
    }
}

async function main() {
    await testdashboard();
    await testCompliance();
}

main();
