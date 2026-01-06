
// const bcrypt = require('bcryptjs'); 

async function testLogin() {
    try {
        const response = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Body:', data);
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testLogin();
