/**
 * run-all-tests.ts — Master test runner
 *
 * Runs all workflow and routing test suites in sequence.
 * Each suite builds on the seeded data from seed-realistic-data.ts.
 *
 * HOW TO RUN:
 *   Make sure the API server is running first:
 *     cd apps/api && npm run dev
 *
 *   Then from the repo root:
 *     npx ts-node --project apps/api/tsconfig.json \
 *       -r tsconfig-paths/register \
 *       apps/api/scripts/tests/run-all-tests.ts
 *
 *   Run a single suite:
 *     SUITES=inbound npx ts-node ... run-all-tests.ts
 *     SUITES=outbound,putaway npx ts-node ... run-all-tests.ts
 *     SUITES=inventory npx ts-node ... run-all-tests.ts
 *
 *   Point at a different API:
 *     API_URL=http://staging:3001 npx ts-node ... run-all-tests.ts
 *
 * EXIT CODE: 0 = all passed, 1 = failures present
 */

import { requireServer, printSummary, prisma, API_URL } from './test-utils';
import { runInboundTests }     from './test-inbound';
import { runOutboundTests }    from './test-outbound';
import { runPutawayRuleTests } from './test-putaway-rules';
import { runInventoryTests }   from './test-inventory';

const ALL_SUITES: Record<string, () => Promise<void>> = {
    inbound:   runInboundTests,
    outbound:  runOutboundTests,
    putaway:   runPutawayRuleTests,
    inventory: runInventoryTests,
};

async function main() {
    console.log('═'.repeat(60));
    console.log(' Labamu IMS — Workflow & Routing Test Suite');
    console.log(`  API: ${API_URL}`);
    console.log('═'.repeat(60));

    // ── Check server is up
    await requireServer();

    // ── Check seed data exists
    const whCount = await prisma.warehouse.count();
    if (whCount < 2) {
        console.error('\n✗ Seed data not found. Run first:');
        console.error('  npx ts-node --project apps/api/tsconfig.json -r tsconfig-paths/register apps/api/scripts/seed-realistic-data.ts\n');
        process.exit(1);
    }

    // ── Determine which suites to run
    const requested = process.env.SUITES?.split(',').map(s => s.trim().toLowerCase());
    const suites = requested
        ? Object.entries(ALL_SUITES).filter(([name]) => requested.includes(name))
        : Object.entries(ALL_SUITES);

    if (!suites.length) {
        console.error(`\n✗ No matching suites for: ${process.env.SUITES}`);
        console.error(`  Available: ${Object.keys(ALL_SUITES).join(', ')}\n`);
        process.exit(1);
    }

    // ── Run suites
    for (const [, fn] of suites) {
        try {
            await fn();
        } catch (e: any) {
            console.error(`\nUnhandled error in suite: ${e?.message ?? e}`);
        }
    }

    // ── Print summary and exit
    const failCount = printSummary();
    await prisma.$disconnect();
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(async e => {
    console.error('Fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
});
