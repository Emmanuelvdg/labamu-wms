async function main() {
    const res = await fetch('http://127.0.0.1:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'admin123' })
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);

    const res2 = await fetch('http://127.0.0.1:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'password123' })
    });
    console.log(res2.status);
    const text2 = await res2.text();
    console.log(text2);
}

main().catch(console.error);
