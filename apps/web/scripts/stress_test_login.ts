import axios from 'axios';

const API_URL = 'http://localhost:3001';
const CONCURRENCY = 20; // Try 20 parallel requests to force contention

async function stressTestLogin() {
    console.log(`🔥 Starting stress test with ${CONCURRENCY} concurrent logins...`);

    const requests = Array.from({ length: CONCURRENCY }).map(async (_, index) => {
        try {
            const start = Date.now();
            await axios.post(`${API_URL}/auth/login`, {
                email: 'admin@labamu.co.id',
                password: 'admin'
            });
            const duration = Date.now() - start;
            console.log(`✅ Request ${index + 1} succeeded in ${duration}ms`);
            return { status: 'success', duration };
        } catch (error: any) {
            console.error(`❌ Request ${index + 1} failed: ${error.message}`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, JSON.stringify(error.response.data));
            }
            return { status: 'failed', error: error.message };
        }
    });

    const results = await Promise.all(requests);
    const successes = results.filter(r => r.status === 'success');
    const failures = results.filter(r => r.status === 'failed');

    console.log('\n--- Summary ---');
    console.log(`Total: ${CONCURRENCY}`);
    console.log(`Success: ${successes.length}`);
    console.log(`Failed: ${failures.length}`);
}

stressTestLogin();
