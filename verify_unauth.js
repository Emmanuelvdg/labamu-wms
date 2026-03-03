async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/inventory/routes/df69d425-4ac7-49b2-9f53-07e3f34f2469/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PULL', sequence: 0 })
        });
        const text = await res.text();
        console.log('Status:', res.status, 'Body:', text);
    } catch (e) {
        console.error(e);
    }
}
test();
