// Native fetch used

async function verify() {
    const API_URL = 'http://localhost:3001';

    console.log('1. Creating Warehouse D...');
    const createRes = await fetch(`${API_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: "Warehouse D",
            shortName: "WH-D",
            address: "101 Route Rd",
            companyId: "Test Co",
            location: { lat: 0, lng: 0 },
            type: "PHYSICAL",
            incomingSteps: "2_steps",
            outgoingSteps: "2_steps"
        })
    });

    if (!createRes.ok) {
        console.error('Failed to create warehouse:', await createRes.text());
        return;
    }
    const warehouse = await createRes.json();
    console.log('Warehouse created:', warehouse.id);

    console.log('2. Fetching Locations...');
    const locRes = await fetch(`${API_URL}/inventory/locations`);
    const locations = await locRes.json();

    console.log('3. Verifying Locations for WH-D...');
    const whLocations = locations.filter(l => l.name.includes('WH-D') || (l.warehouseView && l.warehouseView.shortName === 'WH-D'));

    // Check for View Location
    const viewLoc = locations.find(l => l.name === 'WH-D' && l.type === 'VIEW');
    if (viewLoc) {
        console.log('SUCCESS: View Location "WH-D" found.');

        // Check children
        const children = locations.filter(l => l.parentId === viewLoc.id);
        const names = children.map(c => c.name);
        console.log('Children of WH-D:', names);

        const hasInput = names.includes('Input');
        const hasOutput = names.includes('Output');
        const hasStock = names.includes('Stock');

        if (hasInput && hasOutput && hasStock) {
            console.log('SUCCESS: All expected locations (Input, Output, Stock) found.');
        } else {
            console.error('FAILURE: Missing locations. Found:', names);
        }
    } else {
        console.error('FAILURE: View Location "WH-D" not found.');
    }
}

verify().catch(console.error);
