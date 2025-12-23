import { test, expect } from '@playwright/test';

test.describe('TC-03: Putaway Recommendation', () => {
    let apiContext;
    let warehouseId;
    let inputLocationId;
    let goldenZoneId;
    let backZoneId;
    let fastProductId;
    let slowProductId;

    test.beforeAll(async ({ playwright }) => {
        // 0. Login to get User ID
        const loginContext = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3001' });
        const loginRes = await loginContext.post('/auth/login', {
            data: { email: 'admin@labamu.co.id' }
        });
        expect(loginRes.ok()).toBeTruthy();
        const user = await loginRes.json();
        const userId = user.id;
        console.log('Logged in as:', userId);

        apiContext = await playwright.request.newContext({
            baseURL: 'http://127.0.0.1:3001',
            extraHTTPHeaders: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
        });

        // 1. Create Warehouse
        const whRes = await apiContext.post('/inventory/warehouses', {
            data: {
                name: `Putaway Test WH ${Date.now()}`,
                shortName: 'PTW',
                address: '123 Test St',
                companyId: 'TEST-CO',
                location: JSON.stringify({ lat: 0, lng: 0 }),
                type: 'PHYSICAL',
                incomingSteps: '1_step',
                outgoingSteps: '1_step'
            }
        });
        const wh = await whRes.json();
        warehouseId = wh.id;
        console.log('Created Warehouse:', warehouseId);

        // 1.5 Update Default 'Stock' location to have Priority 20 (Staging/Fast) so it doesn't conflict with Slow Mover logic (> 50)
        // We know 'Stock' is created by default.
        const locsRes = await apiContext.get(`/inventory/locations?warehouseId=${warehouseId}`);
        const locs = await locsRes.json();
        const stockLoc = locs.find(l => l.name === 'Stock');
        if (stockLoc) {
            await apiContext.put(`/inventory/locations/${stockLoc.id}`, {
                data: { zonePriority: 20 }
            });
            console.log('Updated default Stock priority to 20');
        }

        // 2. Create Locations
        // Input (Receiving)
        const inputRes = await apiContext.post('/inventory/locations', {
            data: {
                name: 'Input Area',
                warehouseId: warehouseId,
                parentId: wh.viewLocationId, // Use view location as parent
                type: 'INTERNAL',
                structuralType: 'ROOM',
                zonePriority: 20 // "Staging" - distinct from Golden(10) and Back(100)
            }
        });
        const inputLoc = await inputRes.json();
        inputLocationId = inputLoc.id;

        // Golden Zone (Priority 10)
        const goldenRes = await apiContext.post('/inventory/locations', {
            data: {
                name: 'Golden Zone',
                warehouseId: warehouseId,
                parentId: wh.viewLocationId,
                type: 'INTERNAL',
                structuralType: 'ROOM',
                zonePriority: 10 // Low Number = High Priority = Golden
            }
        });
        const goldenLoc = await goldenRes.json();
        goldenZoneId = goldenLoc.id;

        // Back Zone (Priority 100)
        const backRes = await apiContext.post('/inventory/locations', {
            data: {
                name: 'Back Zone',
                warehouseId: warehouseId,
                parentId: wh.viewLocationId,
                type: 'INTERNAL',
                structuralType: 'ROOM',
                zonePriority: 100 // High Number = Low Priority = Slow
            }
        });
        const backLoc = await backRes.json();
        backZoneId = backLoc.id;

        // 3. Create Products
        // Fast Mover
        const fastRes = await apiContext.post('/inventory/products', {
            data: {
                sku: `FAST-${Date.now()}`,
                name: 'Fast Mover Product',
                category: 'Test',
                velocity: 'A', // Fast
                type: 'Raw',
                unitOfMeasure: 'Unit',
                averageCost: 10,
                status: 'Active'
            }
        });
        const fastProd = await fastRes.json();
        fastProductId = fastProd.id;

        // Slow Mover
        const slowRes = await apiContext.post('/inventory/products', {
            data: {
                sku: `SLOW-${Date.now()}`,
                name: 'Slow Mover Product',
                category: 'Test',
                velocity: 'C', // Slow
                type: 'Raw',
                unitOfMeasure: 'Unit',
                averageCost: 10,
                status: 'Active'
            }
        });
        const slowProd = await slowRes.json();
        slowProductId = slowProd.id;
    });

    test('Receive Fast Mover -> Verify Golden Zone Recommendation', async () => {
        // Attempt to Receive Fast Mover into "Input Area"
        // The system should detect 'Velocity A' and redirect to 'Golden Zone'
        const response = await apiContext.post('/inventory/moves', {
            data: {
                productId: fastProductId,
                quantity: 10,
                sourceLocationId: null, // From Vendor
                destinationLocationId: inputLocationId, // Tried to put in Input
                type: 'IN',
                origin: 'PO-TEST-FAST'
            }
        });

        if (response.status() !== 201) {
            console.log('Error Response:', await response.text());
        }
        expect(response.status()).toBe(201);
        const move = await response.json();

        console.log('Fast Mover Redirected To:', move.destinationLocationId);

        // Assert it was redirected to Golden Zone
        expect(move.destinationLocationId).toBe(goldenZoneId);
        expect(move.destinationLocationId).not.toBe(inputLocationId);
    });

    test('Receive Slow Mover -> Verify Back Zone Recommendation', async () => {
        // Attempt to Receive Slow Mover into "Input Area"
        // The system should detect 'Velocity C' and redirect to 'Back Zone' (if logic prefers > 50)

        // My Logic for C: "Prefer deeper zones ... > 50"

        const response = await apiContext.post('/inventory/moves', {
            data: {
                productId: slowProductId,
                quantity: 10,
                sourceLocationId: null, // From Vendor
                destinationLocationId: inputLocationId, // Tried to put in Input
                type: 'IN',
                origin: 'PO-TEST-SLOW'
            }
        });

        if (response.status() !== 201) {
            console.log('Error Response:', await response.text());
        }
        expect(response.status()).toBe(201);
        const move = await response.json();

        console.log('Slow Mover Redirected To:', move.destinationLocationId);

        // Assert it was redirected to Back Zone
        // OR checks if it is simply NOT Golden Zone if multiple exist
        // With only Golden(10) and Back(100), it should pick Back(100) or at least not Golden if my logic is strict.
        // My logic: if (velocity == 'C') candidates = priority > 50.
        expect(move.destinationLocationId).toBe(backZoneId);
    });
});
