import { getProduct } from '../apps/web/lib/api';

// Mock fetch for Node environment if needed, or rely on the fact that api.ts uses fetch which is available in Node 18+
// However, api.ts imports from relative paths which might be an issue if running as standalone script.
// Better to just use fetch directly to test the API endpoint.

async function verify() {
    const productId = '56ce97c5-c386-4ed7-af0b-ccc7c15881b8'; // The ID user reported
    console.log(`Fetching product ${productId}...`);

    try {
        const response = await fetch(`http://localhost:3001/inventory/products/${productId}`);

        if (response.status === 404) {
            console.log('Product not found (404). This might be expected if the ID is invalid, but the endpoint is reachable.');
        } else if (response.ok) {
            const data = await response.json();
            console.log('Product found:', data);
        } else {
            console.log(`Error: ${response.status} ${response.statusText}`);
        }

        // Also try fetching a known existing product if possible, or list products to get a valid ID
        const listResponse = await fetch('http://localhost:3001/inventory/products');
        const products = await listResponse.json();
        if (products.length > 0) {
            const validId = products[0].id;
            console.log(`Fetching valid product ${validId}...`);
            const validResponse = await fetch(`http://localhost:3001/inventory/products/${validId}`);
            if (validResponse.ok) {
                console.log('Valid product fetch SUCCESS');
            } else {
                console.log('Valid product fetch FAILED');
            }
        } else {
            console.log('No products in database to test with.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
