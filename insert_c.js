const fs = require('fs');

const filePath = "c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\apps\\web\\app\\(dashboard)\\user-guide\\page.tsx";
let content = fs.readFileSync(filePath, 'utf8');

const target = `                                    </ol>
                                </CardContent>
                            </Card>
                        </div>`;

const replacement = `                                    </ol>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-orange-500">
                                <CardHeader>
                                    <CardTitle>Scenario C: Accelerated Cross-Dock Routing (Dynamic Workflow)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground mb-4">Using the Visual Builder to handle urgent inbound shipments by bypassing standard putaway.</p>
                                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                                        <li><strong>Design:</strong> Manager creates an "Urgent Inbound" template: <code className="bg-muted px-1 py-0.5 rounded">RECEIVE &rarr; CONDITION &rarr; CROSS_DOCK</code>.</li>
                                        <li><strong>Trigger:</strong> PO is marked as urgent and the worker receives the goods at the dock.</li>
                                        <li><strong>Evaluate:</strong> The Execution Engine automatically evaluates the custom logic (<code className="bg-muted px-1 py-0.5 rounded">isUrgent: true</code>).</li>
                                        <li><strong>Execute:</strong> Putsaway is dynamically skipped. Worker moves goods directly to outbound Shipping area.</li>
                                    </ol>
                                </CardContent>
                            </Card>
                        </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully updated page.tsx");
} else {
    console.log("Target not found in page.tsx");
}
