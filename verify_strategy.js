const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3001';

async function verifyStrategyCRUD() {
    try {
        console.log('--- Verifying Strategy CRUD ---');

        // 0. Check GET
        const getRes = await fetch(`${API_URL}/strategy/picking`);
        console.log('GET /strategy/picking status:', getRes.status);
        if (getRes.ok) {
            const strategies = await getRes.json();
            console.log('Existing strategies:', strategies.length);
        } else {
            console.error('GET failed:', await getRes.text());
        }

        // 1. Create Picking Strategy
        const createRes = await fetch(`${API_URL}/strategy/picking/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Test Strategy ${Date.now()}`,
                rules: JSON.stringify({ test: true })
            })
        });

        if (!createRes.ok) {
            console.error('Failed to create strategy:', await createRes.text());
            return;
        }

        const strategy = await createRes.json();
        console.log('Created Strategy:', strategy.name);

        // 2. Update Strategy
        const updateRes = await fetch(`${API_URL}/strategy/picking/${strategy.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `${strategy.name} Updated`,
                active: false
            })
        });

        if (!updateRes.ok) {
            console.error('Failed to update strategy:', await updateRes.text());
            return;
        }

        const updated = await updateRes.json();
        console.log('Updated Strategy:', updated.name, 'Active:', updated.active);

        // 3. Delete Strategy
        const deleteRes = await fetch(`${API_URL}/strategy/picking/${strategy.id}`, {
            method: 'DELETE'
        });

        if (!deleteRes.ok) {
            console.error('Failed to delete strategy:', await deleteRes.text());
            return;
        }

        console.log('Deleted Strategy:', strategy.id);
        console.log('SUCCESS: Strategy CRUD verified!');

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyStrategyCRUD();
