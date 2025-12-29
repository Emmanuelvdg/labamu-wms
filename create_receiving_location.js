const http = require('http');

// Get Central DC warehouse ID
const warehouseId = 'e0c11168-cfb0-4553-8269-48b95295be82';

// Create a Receiving location
const data = JSON.stringify({
    name: 'Receiving Dock A',
    type: 'INTERNAL',
    warehouseId: warehouseId,
    maxWeight: 10000,
    maxVolume: 500,
    zonePriority: 999,  // Low priority for receiving areas
    putawaySequence: 1
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/inventory/locations',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Created Receiving location:');
        console.log(JSON.stringify(JSON.parse(body), null, 2));
    });
});

req.on('error', console.error);
req.write(data);
req.end();
