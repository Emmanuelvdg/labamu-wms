const API_URL = 'http://localhost:3001';

async function checkSuppliers() {
    try {
        console.log('Fetching suppliers from ' + API_URL + '/suppliers');
        const res = await fetch(API_URL + '/suppliers');
        if (!res.ok) {
            console.error('Failed to fetch:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response:', text);
            return;
        }
        const data = await res.json();
        console.log('Suppliers:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSuppliers();
