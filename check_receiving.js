const http = require('http');

const req = http.request(
    {
        hostname: 'localhost',
        port: 3001,
        path: '/inventory/locations',
        method: 'GET'
    },
    (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            const locs = JSON.parse(body);
            const receiving = locs.filter(l =>
                l.name && (
                    l.name.includes('Receiv') ||
                    l.name.includes('RECEIV') ||
                    l.name.includes('Staging') ||
                    l.name.includes('STAGING')
                )
            );
            console.log('Receiving/Staging locations:');
            console.log(JSON.stringify(receiving, null, 2));

            console.log('\nAll locations for Central DC:');
            const centralDC = locs.filter(l => l.warehouseId === 'e0c11168-cfb0-4553-8269-48b95295be82');
            centralDC.forEach(l => console.log(`- ${l.name} (Type: ${l.type})`));
        });
    }
);

req.on('error', console.error);
req.end();
