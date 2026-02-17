
import { PrismaClient } from '@labamu/database';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';

async function main() {
    console.log('Starting E2E Phase 3 API Test...');

    // 1. Fetch Context Data
    const admin = await prisma.user.findFirst({ where: { email: 'admin@labamu.co.id' } });
    if (!admin) throw new Error('Admin user not found');

    const supplier = await prisma.supplier.findFirst({ where: { name: 'TechSupplier Inc' } });
    if (!supplier) throw new Error('Supplier "TechSupplier Inc" not found');

    const product = await prisma.product.findFirst({ where: { name: 'Pro Laptop X' } });
    if (!product) throw new Error('Product "Pro Laptop X" not found');

    const receivingDock = await prisma.location.findFirst({ where: { name: 'Receiving Dock 1' } });
    if (!receivingDock) throw new Error('Location "Receiving Dock 1" not found');

    const bin01 = await prisma.location.findFirst({ where: { name: 'Bin 01' } });
    if (!bin01) throw new Error('Location "Bin 01" not found');

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': admin.id,
    };

    console.log('Context loaded:', {
        adminId: admin.id,
        supplierId: supplier.id,
        productId: product.id,
        dockId: receivingDock.id,
        binId: bin01.id
    });

    // 2. Create PO
    console.log('Creating PO...');
    const createRes = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            supplierId: supplier.id,
            orderDate: new Date(),
            items: [{ productId: product.id, quantity: 10, unitCost: 1000 }]
        })
    });

    if (!createRes.ok) throw new Error(`Failed to create PO: ${await createRes.text()}`);
    const po = await createRes.json() as any;
    console.log(`PO Created: ${po.poNumber} (${po.id})`);

    // 3. Submit PO
    console.log('Submitting PO...');
    const submitRes = await fetch(`${API_URL}/purchase-orders/${po.id}/submit`, {
        method: 'POST',
        headers
    });
    if (!submitRes.ok) throw new Error(`Failed to submit PO: ${await submitRes.text()}`);
    console.log('PO Submitted');

    // 4. Approve PO
    console.log('Approving PO...');
    const approveRes = await fetch(`${API_URL}/purchase-orders/${po.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: admin.id })
    });
    if (!approveRes.ok) throw new Error(`Failed to approve PO: ${await approveRes.text()}`);
    console.log('PO Approved');

    // Refresh PO to get Item IDs
    const poRes = await fetch(`${API_URL}/purchase-orders/${po.id}`, { headers });
    const updatedPO = await poRes.json() as any;
    const poItemId = updatedPO.items[0].id;

    // 5. Receive Goods
    console.log('Receiving Goods...');
    const receiveRes = await fetch(`${API_URL}/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            // destinationLocationId: receivingDock.id, // Let the backend decide (or use receivingDock.id if we want to force it, but backend logic overrides sometimes)
            itemsToReceive: [{ poItemId, quantity: 10 }]
        })
    });
    if (!receiveRes.ok) throw new Error(`Failed to receive goods: ${await receiveRes.text()}`);
    console.log('Goods Received at Dock');

    // Find where the stock actually went
    const stock = await prisma.productInventory.findFirst({
        where: { productId: product.id, quantity: { gte: 10 } }
    });
    if (!stock) throw new Error('Stock not found in inventory after receiving');
    console.log(`Stock found at location: ${stock.locationId}`);

    // 6. Putaway (Transfer)
    console.log('Executing Putaway (Transfer)...');
    const transferRes = await fetch(`${API_URL}/inventory/transfer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            productId: product.id,
            sourceLocationId: stock.locationId,
            destinationLocationId: bin01.id,
            quantity: 10,
            reason: 'E2E Putaway'
        })
    });
    if (!transferRes.ok) throw new Error(`Failed to transfer (putaway): ${await transferRes.text()}`);
    console.log('Putaway Complete (Moved to Bin 01)');

    console.log('SUCCESS: Phase 3 Completed via API');
}

main()
    .catch(e => {
        console.error('FAILED:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
