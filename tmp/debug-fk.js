const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFk() {
    const template = await prisma.workflowTemplate.findFirst({
        where: { name: 'Default 1-Step Receipt' },
        include: { steps: true }
    });
    const warehouse = await prisma.warehouse.findFirst();
    const location = await prisma.location.findFirst({
        where: { warehouseId: warehouse.id }
    });
    
    console.log('Template ID:', template.id);
    console.log('Start Step ID:', template.steps.find(s => s.isStart)?.id);
    console.log('Warehouse ID:', warehouse.id);
    console.log('Location ID:', location.id);
    
    try {
        const instance = await prisma.workflowInstance.create({
            data: {
                templateId: template.id,
                warehouseId: warehouse.id,
                status: 'RUNNING',
                currentStepId: template.steps.find(s => s.isStart)?.id,
                triggerRef: 'test',
                triggerType: 'ROUTE'
            }
        });
        console.log('Success! Instance ID:', instance.id);
    } catch (err) {
        console.error('FAILED create:', err.message);
    }
}

debugFk();
