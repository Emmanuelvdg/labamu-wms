import os

file_path = r"c:\Users\EmmanuelVanDeGeer\.gemini\antigravity\scratch\labamu-ims\apps\web\app\(dashboard)\user-guide\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                                    </ol>
                                </CardContent>
                            </Card>
                        </div>"""

replacement = """                                    </ol>
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
                        </div>"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully updated page.tsx")
else:
    print("Target not found in page.tsx")
