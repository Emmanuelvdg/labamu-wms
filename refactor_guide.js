const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'apps/web/app/(dashboard)/user-guide/page.tsx');
let fileContent = '';
try {
    fileContent = fs.readFileSync(filepath, 'utf-8');
} catch (e) {
    console.error("Failed to read file:", e.message);
    process.exit(1);
}

const lines = fileContent.split('\n');

function getBlock(startLine, endLine) {
    return lines.slice(startLine - 1, endLine).join('\n') + '\n';
}

const packing = getBlock(1628, 1645);
const shippingDocs = getBlock(1647, 1669);
const replenishment = getBlock(1671, 1688);
const notifications = getBlock(1690, 1717);
const barcode = getBlock(1719, 1741);
const analytics = getBlock(1743, 1770);

const workflowEngine = `                    {/* 6. Workflow Engine */}
                    <section>
                        <h2 className="text-3xl font-bold mb-8 text-foreground">Workflow Engine</h2>
                        <div className="space-y-12">
                            {/* Visual Builder */}
                            <div id="workflow-builder" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><LayoutGrid className="h-5 w-5" /> Visual Builder</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> A drag-and-drop interface for designing complex, multi-step warehouse workflows visually.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Features:</strong>
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                <li><strong>Nodes & Edges:</strong> Add operation steps like Receive, QC, Putaway, and connect them with directional arrows.</li>
                                                <li><strong>Conditional Logic:</strong> Use IF/ELSE condition nodes to branch workflows based on real-time data (e.g., failed QC, urgent orders).</li>
                                                <li><strong>Validation:</strong> The builder validates graph integrity to prevent infinite loops, detached nodes, or invalid transitions.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step Handlers */}
                            <div id="step-handlers" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Step Handlers & Execution</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The execution engine that processes active workflow instances step-by-step.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                                            <li><strong>Automated Transitions:</strong> As workers complete tasks (like "Putaway Confirmed"), the engine automatically triggers the next step in the flow.</li>
                                            <li><strong>Dynamic Handlers:</strong> Specialized handlers for each step type (RECEIVE, QC_INSPECT, CROSS_DOCK, PUTAWAY) ensure context is passed seamlessly (e.g., passing receipt IDs to the QC step).</li>
                                            <li><strong>Incident Management:</strong> Supervisors can pause failing workflows, remediate physical issues (like missing stock), and resume execution without losing state.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Monitoring */}
                            <div id="workflow-monitoring" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><BarChart className="h-5 w-5" /> Monitoring & Telemetry</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Operational visibility into all active and completed workflows.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Capabilities:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li><strong>Active Instances:</strong> View a real-time list of all currently running workflows across the warehouse.</li>
                                                <li><strong>Bottleneck Identification:</strong> Telemetry data tracks execution time for each step, allowing managers to identify slow processes (e.g., QC taking too long).</li>
                                                <li><strong>Execution History:</strong> Drill down into completed workflows to audit exactly who completed each task and when.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <Separator className="my-12" />
`;

const workflowSidebar = `                                    <div className="mb-4">
                                        <h4 className="font-semibold text-foreground mb-1">Workflow Engine</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'workflow-builder')} href="#workflow-builder" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Visual Builder</a>
                                            <a onClick={(e) => scrollToSection(e, 'step-handlers')} href="#step-handlers" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Step Handlers & Execution</a>
                                            <a onClick={(e) => scrollToSection(e, 'workflow-monitoring')} href="#workflow-monitoring" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Monitoring & Telemetry</a>
                                        </div>
                                    </div>
`;

let newLines = [];
let i = 0;

while (i < lines.length) {
    const line = lines[i];
    const lineNum = i + 1;

    // Sidebar updates
    if (line.includes("<a onClick={(e) => scrollToSection(e, 'stocktaking')}")) {
        newLines.push(line);
        newLines.push('                                            <a onClick={(e) => scrollToSection(e, \'replenishment\')} href="#replenishment" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Replenishment Engine</a>');
        i++;
        continue;
    }

    if (line.includes("<a onClick={(e) => scrollToSection(e, 'delivery-methods')}")) {
        newLines.push('                                            <a onClick={(e) => scrollToSection(e, \'packing-station\')} href="#packing-station" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Packing Station</a>');
        newLines.push(line);
        i++;
        continue;
    }

    if (line.includes("<a onClick={(e) => scrollToSection(e, 'shipping-execution')}")) {
        newLines.push(line);
        newLines.push('                                            <a onClick={(e) => scrollToSection(e, \'shipping-documents\')} href="#shipping-documents" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Shipping Documents</a>');
        i++;
        continue;
    }

    if (line.includes("<a onClick={(e) => scrollToSection(e, 'reports')}")) {
        newLines.push(line);
        newLines.push('                                            <a onClick={(e) => scrollToSection(e, \'analytics\')} href="#analytics" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Analytics & Classification</a>');
        i++;
        continue;
    }

    if (line.includes("<a onClick={(e) => scrollToSection(e, 'settings')}")) {
        newLines.push(line);
        newLines.push('                                            <a onClick={(e) => scrollToSection(e, \'notifications\')} href="#notifications" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Notifications & Alerts</a>');
        i++;
        continue;
    }

    if (line.includes('<div className="mb-4">') && lineNum === 98) {
        newLines.push(workflowSidebar);
        newLines.push(line);
        i++;
        continue;
    }

    // Content structure updates
    if (lineNum === 784) {
        newLines.push(replenishment);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum === 1224) {
        newLines.push(packing);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum === 1341) {
        newLines.push(shippingDocs);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum === 1383) {
        newLines.push(analytics);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum === 1522) {
        newLines.push(notifications);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum === 1618) {
        newLines.push(barcode);
        newLines.push(line);
        i++;
        continue;
    }

    if (lineNum >= 1624 && lineNum <= 1775) {
        if (lineNum === 1624) {
            newLines.push(workflowEngine);
        }
        i++;
        continue;
    }

    newLines.push(line);
    i++;
}

fs.writeFileSync(filepath, newLines.join('\n'), 'utf-8');
console.log("Refactoring complete.");
