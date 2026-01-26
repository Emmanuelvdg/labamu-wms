import { fetchInventory } from '../src/inventory/inventory.service'; // No, I can't import service in script easily without nest context.
// Use fetch instead.
import { api } from '../apps/web/lib/api'; // Can't import from web lib in root script easily? 

// Let's use standard fetch in a simple node script.
const fetch = require('node-fetch');

async function checkPrice() {
    try {
        const response = await fetch('http://localhost:3001/inventory/products?search=Price%20Test%20GPU');
        const products = await response.json();
        console.log('Products found:', products.length);
        if (products.length > 0) {
            console.log('First Product:', JSON.stringify(products[0], null, 2));
            if (products[0].price === undefined) {
                console.error('FAIL: price field is missing');
            } else {
                console.log('PASS: price field is present:', products[0].price);
            }
        } else {
            console.log('No products found with that name');
        }
    } catch (e) {
        console.error('Error fetching products:', e);
    }
}

checkPrice();
