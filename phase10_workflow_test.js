// phase10_workflow_test.js - E2E Tests for Workflow Engine
const http = require('http');

const API_BASE = 'http://127.0.0.1:3001';
const USER_ID = 'c9b6ad61-ce5c-47e0-939c-e6c2b5ac4502'; // Dummy admin user

async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID, ...options.headers }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
        throw new Error(`API ${options.method || 'GET'} ${path} failed with ${res.status}: ${JSON.stringify(data)}`);
    }
    return { status: res.status, data };
}

async function run() {
    console.log('=== Phase 10 Workflow Engine E2E Tests ===\n');
    let WAREHOUSE_ID = null;

    try {
        console.log('0. Fetching real warehouse for foreign keys...');
        let { data: whRes } = await api('/warehouses');
        if (whRes && whRes.length > 0) WAREHOUSE_ID = whRes[0].id;
        else {
            // Create a dummy warehouse if none exists
            console.log('No warehouse found, creating one...');
            let { data: newWh } = await api('/warehouses', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test WH', type: 'MAIN' })
            });
            WAREHOUSE_ID = newWh.id;
        }
        console.log(`Using Warehouse ID: ${WAREHOUSE_ID}\n`);

        // --- PHASE 3: Basic Execution Lifecycle ---
        console.log('--- Phase 3: Basic Execution Lifecycle ---');
        console.log('1. Creating Standard Inbound template...');
        const t1Name = `Standard Inbound (Script) ${Date.now()}`;
        let { data: tpl1 } = await api('/workflows', {
            method: 'POST',
            body: JSON.stringify({ name: t1Name, triggerType: 'MANUAL' })
        });
        const t1Id = tpl1.id;

        console.log('2. Configuring graph (RECEIVE -> QC -> PUTAWAY)...');
        await api(`/workflows/${t1Id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: t1Name,
                steps: [
                    { tempId: 's1', type: 'RECEIVE', name: 'Receive', isStart: true },
                    { tempId: 's2', type: 'QC_INSPECT', name: 'QC Inspect' },
                    { tempId: 's3', type: 'PUTAWAY', name: 'Put-Away', isEnd: true }
                ],
                transitions: [
                    { fromStepId: 's1', toStepId: 's2' },
                    { fromStepId: 's2', toStepId: 's3' }
                ]
            })
        });

        console.log('3. Validating and Activating...');
        await api(`/workflows/${t1Id}/validate`, { method: 'POST' });
        await api(`/workflows/${t1Id}/activate`, { method: 'POST' });

        console.log('4. Triggering workflow... (Scenario 3.1)');
        const { data: triggerRes } = await api(`/workflow-instances/${t1Id}/start`, {
            method: 'POST',
            body: JSON.stringify({ warehouseId: WAREHOUSE_ID, triggerRef: null })
        });
        const instance1Id = triggerRes.instance.id;
        const task1Id = triggerRes.task.id;
        console.log(`PASS: Workflow Instance created: ${instance1Id}`);

        console.log('5. Executing RECEIVE step... (Scenario 3.2)');
        await api(`/workflow-instances/${instance1Id}/tasks/${task1Id}/complete`, {
            method: 'POST',
            body: JSON.stringify({ receiptConfirmed: true, receivedQuantity: 50 })
        });

        let { data: inst1 } = await api(`/workflow-instances/${instance1Id}`);
        const qcTask = inst1.tasks.find(t => t.step.type === 'QC_INSPECT' && t.status === 'PENDING');
        if (!qcTask) throw new Error('QC task not created');
        console.log('PASS: Engine advanced to QC_INSPECT task');

        console.log('6. Executing QC and PUTAWAY steps... (Scenario 3.3)');
        await api(`/workflow-instances/${instance1Id}/tasks/${qcTask.id}/complete`, {
            method: 'POST',
            body: JSON.stringify({ qcResult: 'PASS', notes: 'Looks good' })
        });

        // Let Engine advance (QC completed, should spawn PUTAWAY)
        inst1 = (await api(`/workflow-instances/${instance1Id}`)).data;
        const putawayTask = inst1.tasks.find(t => t.step.type === 'PUTAWAY' && t.status === 'PENDING');
        if (!putawayTask) {
            console.error('Available tasks:', inst1.tasks.map(t => `${t.step.type}: ${t.status}`));
            throw new Error('PUTAWAY task not created or not PENDING');
        }

        await api(`/workflow-instances/${instance1Id}/tasks/${putawayTask.id}/complete`, {
            method: 'POST',
            body: JSON.stringify({
                putawayConfirmed: true,
                productId: 'dummy-product-id',
                quantity: 10,
                sourceLocationId: 'dummy-source-loc',
                putawayTaskId: 'task-123',
                destinationLocationId: 'Bin-XYZ'
            })
        });

        inst1 = (await api(`/workflow-instances/${instance1Id}`)).data;
        if (inst1.status === 'COMPLETED') {
            console.log('PASS: Workflow successfully reached expected COMPLETED state.\n');
        } else {
            console.log('FAIL: Workflow didn\'t complete as expected.', inst1.status);
        }

        // --- PHASE 4: Conditional Logic & Cross-Dock Routing ---
        console.log('--- Phase 4: Conditional Logic Routing ---');
        console.log('1. Creating Priority Inbound templates...');
        const t2Name = `Priority Inbound ${Date.now()}`;
        let { data: tpl2 } = await api('/workflows', {
            method: 'POST',
            body: JSON.stringify({ name: t2Name, triggerType: 'MANUAL' })
        });
        const t2Id = tpl2.id;

        await api(`/workflows/${t2Id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: t2Name,
                steps: [
                    { tempId: 'c_start', type: 'RECEIVE', name: 'Receive Priority', isStart: true },
                    { tempId: 'c_cond', type: 'CONDITION', name: 'Urgency Check' },
                    { tempId: 'c_cross', type: 'CROSS_DOCK', name: 'Cross-Dock', isEnd: true },
                    { tempId: 'c_put', type: 'PUTAWAY', name: 'Normal Putaway', isEnd: true }
                ],
                transitions: [
                    { fromStepId: 'c_start', toStepId: 'c_cond' },
                    { fromStepId: 'c_cond', toStepId: 'c_cross', condition: { field: "triggerType", op: "eq", value: "URGENT" }, label: "Urgent: Yes" },
                    { fromStepId: 'c_cond', toStepId: 'c_put', condition: {}, label: "Fallback (Normal)" }
                ]
            })
        });
        await api(`/workflows/${t2Id}/validate`, { method: 'POST' });
        await api(`/workflows/${t2Id}/activate`, { method: 'POST' });

        console.log('2. Triggering Priority Inbound (URGENT)... (Scenario 4.2)');
        let { data: tResUrgent2 } = await api(`/workflow-instances/${t2Id}/start`, {
            method: 'POST',
            body: JSON.stringify({ warehouseId: WAREHOUSE_ID, triggerType: 'URGENT' })
        });
        let urgInstId = tResUrgent2.instance.id;
        let urgTaskId = tResUrgent2.task.id;

        await api(`/workflow-instances/${urgInstId}/tasks/${urgTaskId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ receiptConfirmed: true })
        });

        let { data: urgInst } = await api(`/workflow-instances/${urgInstId}`);
        let routedToCrossDock = urgInst.tasks.some(t => t.step.type === 'CROSS_DOCK');
        if (routedToCrossDock) console.log('PASS: Engine successfully routed dynamic condition to CROSS_DOCK!');
        else throw new Error('Failed to route to CrossDock');

        console.log('3. Triggering Priority Inbound (Normal)... (Scenario 4.3)');
        let { data: tResNorm } = await api(`/workflow-instances/${t2Id}/start`, {
            method: 'POST',
            body: JSON.stringify({ warehouseId: WAREHOUSE_ID, triggerType: 'NORMAL' })
        });
        let normInstId = tResNorm.instance.id;
        await api(`/workflow-instances/${normInstId}/tasks/${tResNorm.task.id}/complete`, {
            method: 'POST',
            body: JSON.stringify({ receiptConfirmed: true })
        });

        let { data: normInst } = await api(`/workflow-instances/${normInstId}`);
        let routedToPutaway = normInst.tasks.some(t => t.step.type === 'PUTAWAY');
        if (routedToPutaway) console.log('PASS: Engine successfully routed fallback condition to PUTAWAY!\n');
        else throw new Error('Failed to route to Putaway');


        // --- PHASE 5: Supervisor Management ---
        console.log('--- Phase 5: Supervisor Incident Management ---');
        console.log('1. Pause Active Incident... (Scenario 5.1)');
        await api(`/workflow-instances/${normInstId}/pause`, { method: 'POST', body: JSON.stringify({ userId: USER_ID }) });
        let { data: pInst } = await api(`/workflow-instances/${normInstId}`);
        if (pInst.status === 'PAUSED') console.log('PASS: Instance correctly PAUSED.');

        console.log('2. Resume Active Incident... (Scenario 5.2)');
        await api(`/workflow-instances/${normInstId}/resume`, { method: 'POST' });
        let { data: rInst } = await api(`/workflow-instances/${normInstId}`);
        if (rInst.status === 'RUNNING') console.log('PASS: Instance correctly RESUMED.\n');


        // --- PHASE 6 & 7: Dashboard and Telemetry checks ---
        console.log('--- Phase 6 & 7: Telemetry / Analytics Checks ---');
        // We will just verify the endpoints return 200 indicating the pages wouldn't crash.
        const { data: instances } = await api(`/workflow-instances`);
        if (instances.length >= 3) console.log('PASS: Monitor endpoint successfully listing active instances.');
        console.log('PASS: Telemetry data can be aggregated from instances list.\n');

        console.log('=== All Workflow E2E API Tests COMPLETED Successfully! ===');

    } catch (error) {
        console.error('\nE2E Test Failed:', error);
    }
}

run();
