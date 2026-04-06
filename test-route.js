const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
    try {
        console.log("Checking for active OUTBOUND workflow templates...");
        const routeTemplates = await prisma.workflowTemplate.findMany({
            where: { triggerType: 'OUTBOUND', status: 'ACTIVE' },
            include: { steps: true, transitions: true }
        });
        
        console.log(`Found ${routeTemplates.length} OUTBOUND routes`);
        
        if (routeTemplates.length > 0) {
            console.log("Template:", routeTemplates[0].name);
            console.log("Steps:", routeTemplates[0].steps.map(s => s.name));
            console.log("Transitions:", routeTemplates[0].transitions.map(t => `${t.fromStepId} -> ${t.toStepId}`));
        } else {
            console.log("Please run seed first to create templates!");
        }

        console.log("\nChecking for any order in PICKING state or recently created task...");
        // Actually, we can just instantiate the ContextEnrichmentService and PickingStrategyService
        // But doing it via node script needs NestJS app context.
        // Let's just do a mock test using the API or check if there's any compilation error.
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
