const axios = require('axios');

const API_URL = 'http://localhost:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502'; // From check-data.js

async function testReceiptWorkflow() {
    try {
        console.log('--- Phase 1: Setup Test Data ---');
        
        // 1. Create a Purchase Order
        console.log('Creating Purchase Order...');
        const poResponse = await axios.post(`${API_URL}/purchase-orders`, {
            supplierId: '3a303831-3438-41fb-853b-b74968b8e0c0',
            items: [
                { productId: '4fdcb5b4-9544-42a1-b95d-9d1e9933489e', quantity: 5, unitCost: 100 }
            ]
        }, { headers: { 'x-user-id': USER_ID } });
        
        const poId = poResponse.data.id;
        console.log(`PO Created: ${poId}`);

        // 2. Approve PO
        console.log('Approving PO...');
        await axios.post(`${API_URL}/purchase-orders/${poId}/approve`, {}, { headers: { 'x-user-id': USER_ID } });

        console.log('--- Phase 2: Receive Goods & Trigger Workflow ---');
        
        // 3. Receive Goods
        console.log('Receiving Goods...');
        const receiveResponse = await axios.post(`${API_URL}/purchase-orders/${poId}/receive`, {
            items: [
                { poItemId: poResponse.data.items[0].id, quantity: 5 }
            ]
        }, { headers: { 'x-user-id': USER_ID } });
        
        const receiptId = receiveResponse.data.id;
        console.log(`Goods Received. Receipt ID: ${receiptId}`);

        console.log('--- Phase 3: Verify Workflow Trigger ---');
        
        // 4. Check for Workflow Instance
        console.log('Waiting for Workflow Engine to process event...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const workflowResponse = await axios.get(`${API_URL}/workflow-instances`, { 
            headers: { 'x-user-id': USER_ID } 
        });
        
        const instances = workflowResponse.data;
        const myInstance = instances.find(inst => inst.context.includes(receiptId));

        if (myInstance) {
            console.log('✅ SUCCESS: Workflow Instance found for the receipt!');
            console.log(`Instance ID: ${myInstance.id}`);
            console.log(`Template Name: ${myInstance.template?.name}`);
            console.log(`Status: ${myInstance.status}`);
        } else {
            console.error('❌ FAILURE: No Workflow Instance found for the receipt.');
            // console.log('All instances context:', instances.map(i => i.context));
        }

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testReceiptWorkflow();
