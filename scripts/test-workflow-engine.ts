import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { WorkflowEngineService } from '../apps/api/src/workflow/workflow-engine.service';
import { WorkflowTemplateService } from '../apps/api/src/workflow/workflow-template.service';

async function bootstrap() {
    console.log('Starting Nest...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const engineService = app.get(WorkflowEngineService);
    const templateService = app.get(WorkflowTemplateService);

    console.log('Creating Test Template...');
    const template = await templateService.create({
        name: 'Inbound Receiving Test',
        description: 'A test workflow',
        steps: [
            { id: 'S1', type: 'RECEIVE', name: 'Dock Receive', isStart: true, config: {} },
            { id: 'S2', type: 'QC_INSPECT', name: 'Quality Check', isStart: false, config: {} },
            { id: 'S3', type: 'PUTAWAY', name: 'Putaway to Bin', isStart: false, config: {} }
        ],
        transitions: [
            { fromStepId: 'S1', toStepId: 'S2', order: 1 },
            { fromStepId: 'S2', toStepId: 'S3', order: 1 }
        ]
    });

    console.log('Template created: ', template.id);
    console.log('Starting Instance...');

    // Note: we need a real warehouse ID
    const warehouse = await (app.get('PrismaService') as any).warehouse.findFirst();
    if (!warehouse) {
        console.log('No warehouse found. Cannot test.');
        process.exit(1);
    }

    const result = await engineService.startWorkflow(template.id, warehouse.id, 'PO-123', 'PURCHASE_ORDER');
    console.log('Instance started:', result.instance.id);

    // Advance 
    await engineService.executeTask(result.task.id);
    console.log('Executed Task 1 (Receive)');

    process.exit(0);
}

bootstrap().catch(console.error);
