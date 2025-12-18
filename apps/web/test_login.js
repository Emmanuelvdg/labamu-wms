
const fetch = require('node-fetch');

async function testLogin() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@labamu.co.id', password: 'admin' })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
        console.log('Cookies:', response.headers.get('set-cookie'));
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
