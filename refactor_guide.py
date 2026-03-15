import os

filepath = r"c:\Users\EmmanuelVanDeGeer\.gemini\antigravity\scratch\labamu-ims\apps\web\app\(dashboard)\user-guide\page.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

def get_block(start_line, end_line):
    return "".join(lines[start_line-1:end_line])

packing = get_block(1628, 1645)
shipping_docs = get_block(1647, 1669)
replenishment = get_block(1671, 1688)
notifications = get_block(1690, 1717)
barcode = get_block(1719, 1741)
analytics = get_block(1743, 1770)

workflow_engine = """
                    {/* 6. Workflow Engine */}
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
"""

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    line_num = i + 1

    # Sidebar updates
    if "<a onClick={(e) => scrollToSection(e, 'stocktaking')}" in line:
        new_lines.append(line)
        new_lines.append('                                            <a onClick={(e) => scrollToSection(e, \'replenishment\')} href="#replenishment" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Replenishment Engine</a>\n')
        i += 1
        continue
        
    if "<a onClick={(e) => scrollToSection(e, 'delivery-methods')}" in line:
        new_lines.append('                                            <a onClick={(e) => scrollToSection(e, \'packing-station\')} href="#packing-station" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Packing Station</a>\n')
        new_lines.append(line)
        i += 1
        continue
        
    if "<a onClick={(e) => scrollToSection(e, 'shipping-execution')}" in line:
        new_lines.append(line)
        new_lines.append('                                            <a onClick={(e) => scrollToSection(e, \'shipping-documents\')} href="#shipping-documents" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Shipping Documents</a>\n')
        i += 1
        continue
        
    if "<a onClick={(e) => scrollToSection(e, 'reports')}" in line:
        new_lines.append(line)
        new_lines.append('                                            <a onClick={(e) => scrollToSection(e, \'analytics\')} href="#analytics" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Analytics & Classification</a>\n')
        i += 1
        continue
        
    if "<a onClick={(e) => scrollToSection(e, 'settings')}" in line:
        new_lines.append(line)
        new_lines.append('                                            <a onClick={(e) => scrollToSection(e, \'notifications\')} href="#notifications" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Notifications & Alerts</a>\n')
        i += 1
        continue

    # Insert Workflow Engine into sidebar
    if '<div className="mb-4">' in line and line_num == 98:
        workflow_sidebar = """                                    <div className="mb-4">
                                        <h4 className="font-semibold text-foreground mb-1">Workflow Engine</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'workflow-builder')} href="#workflow-builder" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Visual Builder</a>
                                            <a onClick={(e) => scrollToSection(e, 'step-handlers')} href="#step-handlers" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Step Handlers & Execution</a>
                                            <a onClick={(e) => scrollToSection(e, 'workflow-monitoring')} href="#workflow-monitoring" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Monitoring & Telemetry</a>
                                        </div>
                                    </div>\n"""
        new_lines.append(workflow_sidebar)
        new_lines.append(line)
        i += 1
        continue

    # Content structure updates
    if line_num == 784:  # Before Returns
        new_lines.append(replenishment + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num == 1224: # Before Delivery Methods
        new_lines.append(packing + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num == 1341: # Before Invoices
        new_lines.append(shipping_docs + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num == 1383: # Before Stock Moves
        new_lines.append(analytics + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num == 1522: # Before Separator prior to Mobile Warehouse App
        new_lines.append(notifications + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num == 1618: # End of mobile app grid
        new_lines.append(barcode + "\n")
        new_lines.append(line)
        i += 1
        continue

    if line_num >= 1624 and line_num <= 1775:
        # We replace this whole block with Workflow Engine. But we only need to append it once.
        if line_num == 1624:
            new_lines.append(workflow_engine)
        i += 1
        continue

    new_lines.append(line)
    i += 1

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Refactoring complete.")
