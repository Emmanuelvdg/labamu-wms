async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/inventory/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // We might need to send a fake admin token or similar if there's an auth guard
                // But let's first see what the response says exactly.
                'Authorization': 'Bearer admin_token', // The auth guard checks this?
                'x-user-id': 'admin'
            },
            body: JSON.stringify({ name: 'Test Route from script', description: 'Test' })
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
test();
