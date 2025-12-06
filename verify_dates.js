
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

async function verifyDates() {
    console.log('--- Testing Dashboard Date Labels ---');
    try {
        const res = await fetch(`${API_URL}/reporting/analytics`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (data.dailySales && Array.isArray(data.dailySales)) {
            const firstItem = data.dailySales[0];
            console.log('First Daily Sales Item:', firstItem);

            if (typeof firstItem === 'object' && 'date' in firstItem && 'count' in firstItem) {
                console.log('✅ Daily Sales Trend has correct structure: { date, count }');
                console.log('Sample Dates:', data.dailySales.map(i => i.date).join(', '));
            } else {
                console.error('❌ Daily Sales Trend has WRONG structure (expected object with date/count)');
            }
        } else {
            console.error('❌ Daily Sales Trend missing');
        }
    } catch (e) {
        console.error('❌ Failed to fetch analytics:', e.message);
    }
}

verifyDates();
