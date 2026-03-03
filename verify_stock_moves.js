async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/inventory/moves', {
            headers: { 'x-user-id': 'test' }
        });
        const text = await res.text();
        console.log('Status:', res.status);
    } catch (e) {
        console.error(e);
    }
}
test();
