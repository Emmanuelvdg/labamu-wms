const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001';

async function verifyReservationUI() {
    try {
        console.log('--- Verifying Reservation Strategy UI Logic ---');

        // 1. Create Reservation Strategy with structured JSON (simulating UI)
        const rules = JSON.stringify({ method: 'before_date', daysBefore: 3 });

        const createRes = await fetch(`${API_URL}/strategy/reservation/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `UI Test Strategy ${Date.now()}`,
                rules: rules
            })
        });

        if (!createRes.ok) {
            console.error('Failed to create strategy:', await createRes.text());
            return;
        }

        const strategy = await createRes.json();
        console.log('Created Strategy:', strategy.name);
        console.log('Saved Rules:', strategy.rules);

        // Verify JSON parsing
        const parsedRules = JSON.parse(strategy.rules);
        if (parsedRules.method === 'before_date' && parsedRules.daysBefore === 3) {
            console.log('SUCCESS: Rules saved correctly as JSON.');
        } else {
            console.error('FAILURE: Rules mismatch.', parsedRules);
        }

        // Cleanup
        await fetch(`${API_URL}/strategy/reservation/${strategy.id}`, { method: 'DELETE' });
        console.log('Cleanup: Deleted test strategy.');

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyReservationUI();
