const fs = require('fs');
const path = require('path');

const plan9Path = path.join(__dirname, 'E2E_Test_Plan9.md');
const plan10Path = path.join(__dirname, 'E2E_Test_Plan10_WorkflowEngine.md');
const outputPath = path.join(__dirname, 'E2E_Test_Plan11.md');

let content9 = fs.readFileSync(plan9Path, 'utf8');
let content10 = fs.readFileSync(plan10Path, 'utf8');

// Replace Header and Description
content9 = content9.replace(
    '# E2E Test Plan 9.0: Full Regression + WMS Gap Remediation Coverage',
    '# E2E Test Plan 11.0: Full Regression + WMS Gap Remediation & Workflow Engine Coverage'
);

content9 = content9.replace(
    /This test plan extends Plan 8\.0 by adding test cases for \*\*Phases 15–20\*\* covering the WMS Gap Remediation features\.[^\n]*/,
    'This test plan combines Plan 9.0 and Plan 10.0, extending coverage with test cases for **Phases 15–20** (WMS Gap Remediation) and **Phases 21-27** (Dynamic Routing & Multi-Step Workflow Engine).'
);

content9 = content9.replace(
    /\*\*Date\*\*: \d{4}-\d{2}-\d{2}/,
    '**Date**: 2026-03-07'
);

// Append Plan 10 Matrix to Plan 9 Matrix
const plan10Matrix = `| 36 | **Workflow Template CRUD** | **21.1–21.5: Create, View, Version, Clone, Delete** | **21** |
| 37 | **Visual Builder Canvas** | **22.1–22.5: Drag & Drop, Connections, Validate** | **22** |
| 38 | **Execution Engine: Basic** | **23.1–23.3: Start, Complete Task, Finish** | **23** |
| 39 | **Execution Engine: Complex** | **24.1–24.3: Conditions, Cross-Dock logic** | **24** |
| 40 | **Execution Engine: Admin** | **25.1–25.3: Pause, Resume, Override** | **25** |
| 41 | **Dashboard & Monitoring** | **26.1–26.2: Monitor display, Visual Trace** | **26** |
| 42 | **Telemetry & Analytics** | **27.1–27.2: Throughput metrics, Bottleneck Time** | **27** |`;

content9 = content9.replace(
    /\|\s*\*\*Analytics & Integrations\*\*\s*\|\s*\*\*20\.1–20\.5:.*?\*\*\s*\|\s*\*\*20\*\*\s*\|/,
    `| **Analytics & Integrations** | **20.1–20.5: ABC Classification, Pick Accuracy, Cycle Count, Carrier Rates** | **20** |\n${plan10Matrix}`
);

// Extract Plan 10 Phases
const phaseStartIndex = content10.indexOf('## Phase 1:');
let plan10Phases = content10.substring(phaseStartIndex);

// Renumber Phases and Scenarios in Plan 10
plan10Phases = plan10Phases.replace(/## Phase 1:/g, '## Phase 21:');
plan10Phases = plan10Phases.replace(/Scenario 1\./g, 'Scenario 21.');

plan10Phases = plan10Phases.replace(/## Phase 2:/g, '## Phase 22:');
plan10Phases = plan10Phases.replace(/Scenario 2\./g, 'Scenario 22.');

plan10Phases = plan10Phases.replace(/## Phase 3:/g, '## Phase 23:');
plan10Phases = plan10Phases.replace(/Scenario 3\./g, 'Scenario 23.');

plan10Phases = plan10Phases.replace(/## Phase 4:/g, '## Phase 24:');
plan10Phases = plan10Phases.replace(/Scenario 4\./g, 'Scenario 24.');

plan10Phases = plan10Phases.replace(/## Phase 5:/g, '## Phase 25:');
plan10Phases = plan10Phases.replace(/Scenario 5\./g, 'Scenario 25.');

plan10Phases = plan10Phases.replace(/## Phase 6:/g, '## Phase 26:');
plan10Phases = plan10Phases.replace(/Scenario 6\./g, 'Scenario 26.');

plan10Phases = plan10Phases.replace(/## Phase 7:/g, '## Phase 27:');
plan10Phases = plan10Phases.replace(/Scenario 7\./g, 'Scenario 27.');

// Remove the old execution summary and anything after it from Plan 9
const summaryStartIndex = content9.indexOf('## Execution Summary');
if (summaryStartIndex !== -1) {
    content9 = content9.substring(0, summaryStartIndex);
}

// Ensure proper spacing before appending
if (!content9.endsWith('\n\n')) {
    content9 += '\n\n';
}

const newExecutionSummary = `## Execution Summary

**Execution Date**: March 7, 2026 | **Executed By**: Automated E2E via Browser Extension + API

| Phase | Title | Scenarios | Status |
|-------|-------|-----------|--------|
| 0 | Environment Reset | 1 | ⬜ |
| 1 | Auth & Setup | 6 | ⬜ |
| 2 | Catalog | 3 | ⬜ |
| 3 | Inbound | 3 | ⬜ |
| 4 | Outbound | 4 | ⬜ |
| 5 | Exceptions | 3 | ⬜ |
| 6 | Reports & Analytics | 4 | ⬜ |
| 7 | Floor Plans | 7 | ⬜ |
| 8 | Lalamove | 1 | ⬜ |
| 9 | PO & QA | 7 | ⬜ |
| 10 | Adjustments/Scrap/Routes | 6 | ⬜ |
| 11 | Putaway/Strategies | 5 | ⬜ |
| 12 | Stocktaking | 4 | ⬜ |
| 13 | Returns/Audit | 5 | ⬜ |
| 14 | RBAC & Settings | 5 | ⬜ |
| 15 | Packing Station | 4 | ⬜ |
| 16 | Shipping Documents | 3 | ⬜ |
| 17 | Replenishment Engine | 4 | ⬜ |
| 18 | Notifications & Alerts | 4 | ⬜ |
| 19 | Barcode & Mobile | 6 | ⬜ |
| 20 | Analytics & Integrations | 5 | ⬜ |
| **21** | **Workflow Template** | **5** | ⬜ |
| **22** | **Visual Builder** | **5** | ⬜ |
| **23** | **Execution Basic** | **3** | ⬜ |
| **24** | **Execution Complex** | **3** | ⬜ |
| **25** | **Incident Mgmt** | **3** | ⬜ |
| **26** | **Monitoring Board** | **2** | ⬜ |
| **27** | **WF Analytics** | **2** | ⬜ |
| **Total** | | **113** | **⬜ 0/113** |
`;

// Merge and uncheck scenarios
let mergedContent = content9 + '---\n\n' + plan10Phases + '\n\n---\n\n' + newExecutionSummary;
mergedContent = mergedContent.replace(/- \[x\]/g, '- [ ]');

fs.writeFileSync(outputPath, mergedContent, 'utf8');
console.log('Successfully merged into E2E_Test_Plan11.md');
