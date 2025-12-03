'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserGuidePage() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">User Guide</h1>
                <p className="text-gray-500 mt-2">Comprehensive documentation for the Labamu Inventory Management System.</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">System Overview</TabsTrigger>
                    <TabsTrigger value="modules">Module Guides</TabsTrigger>
                    <TabsTrigger value="howto">How-To Guides</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Architecture</CardTitle>
                            <CardDescription>How data flows through the system</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center space-y-8 p-8 bg-slate-50 rounded-lg border">
                                {/* External Entities */}
                                <div className="flex justify-between w-full max-w-4xl">
                                    <div className="p-4 bg-blue-100 rounded-lg border border-blue-200 text-center w-32 font-semibold">Suppliers</div>
                                    <div className="p-4 bg-green-100 rounded-lg border border-green-200 text-center w-32 font-semibold">Customers</div>
                                </div>

                                {/* Flow Arrows */}
                                <div className="flex justify-between w-full max-w-4xl px-12">
                                    <div className="text-gray-400 text-2xl">↓</div>
                                    <div className="text-gray-400 text-2xl">↑</div>
                                </div>

                                {/* Core System */}
                                <div className="grid grid-cols-3 gap-8 w-full max-w-4xl">
                                    <div className="col-span-1 space-y-4">
                                        <div className="p-4 bg-white shadow rounded-lg border text-center">
                                            <div className="font-bold text-gray-900">Purchase Orders</div>
                                            <div className="text-xs text-gray-500 mt-1">Procurement</div>
                                        </div>
                                    </div>
                                    <div className="col-span-1 space-y-4">
                                        <div className="p-6 bg-white shadow-lg rounded-lg border-2 border-indigo-100 text-center">
                                            <div className="font-bold text-indigo-900 text-lg">Inventory</div>
                                            <div className="text-sm text-gray-500 mt-2">Warehouses & Locations</div>
                                            <div className="mt-4 flex justify-center gap-2 text-xs">
                                                <span className="px-2 py-1 bg-gray-100 rounded">Stock Moves</span>
                                                <span className="px-2 py-1 bg-gray-100 rounded">Routes</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-1 space-y-4">
                                        <div className="p-4 bg-white shadow rounded-lg border text-center">
                                            <div className="font-bold text-gray-900">Sales Orders</div>
                                            <div className="text-xs text-gray-500 mt-1">Fulfillment</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="text-sm text-gray-500 pt-8">
                                    <p>The system connects Procurement (Suppliers) and Sales (Customers) through a central Inventory engine controlled by Routes and Rules.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ModuleCard
                            title="Dashboard"
                            description="Real-time overview of key metrics."
                            details="Displays low stock alerts, recent activity, and inventory valuation summary."
                        />
                        <ModuleCard
                            title="Inventory"
                            description="Master product list and management."
                            details="Create and edit products, view stock levels, and manage product categories."
                        />
                        <ModuleCard
                            title="Warehouses"
                            description="Physical storage facilities."
                            details="Manage warehouses and configure their incoming/outgoing shipment steps (1, 2, or 3 steps)."
                        />
                        <ModuleCard
                            title="Locations"
                            description="Granular storage spots within warehouses."
                            details="Hierarchical view of locations (e.g., Warehouse -> Stock -> Shelf A). Supports View, Internal, Vendor, and Customer location types."
                        />
                        <ModuleCard
                            title="Stock Moves"
                            description="The engine of inventory movement."
                            details="Track every movement of stock. Moves are chained automatically based on Routes (e.g., Input -> Quality -> Stock)."
                        />
                        <ModuleCard
                            title="Routes & Rules"
                            description="Logic defining how stock moves."
                            details="Configure Push/Pull rules to automate workflows. For example, a 'Pull' rule can trigger a move from Stock when a Customer Order is placed."
                        />
                        <ModuleCard
                            title="Purchase Orders"
                            description="Procurement management."
                            details="Create POs for suppliers. Confirming a PO automatically generates incoming Stock Moves."
                        />
                        <ModuleCard
                            title="Adjustments"
                            description="Correcting stock levels."
                            details="Perform cycle counts or manual adjustments to match physical inventory with system records."
                        />
                    </div>
                </TabsContent>

                <TabsContent value="howto" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Common Workflows</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <HowToStep
                                title="How to Receive Goods (3-Step Process)"
                                steps={[
                                    "Create a Purchase Order and confirm it.",
                                    "Go to 'Stock Moves'. You will see a move from Vendor -> Input.",
                                    "Validate the move when goods arrive at the dock.",
                                    "The system automatically creates a new move: Input -> Quality.",
                                    "Validate this move after quality check.",
                                    "Finally, validate the Quality -> Stock move to put items away."
                                ]}
                            />
                            <HowToStep
                                title="How to Create a New Product"
                                steps={[
                                    "Navigate to 'Inventory'.",
                                    "Click '+ New Item'.",
                                    "Fill in details (SKU, Name, Cost, etc.).",
                                    "Click 'Create Item'."
                                ]}
                            />
                            <HowToStep
                                title="How to Configure a Pull Rule"
                                steps={[
                                    "Go to 'Routes' and select or create a route.",
                                    "Add a Rule with Action 'PULL'.",
                                    "Set Destination (e.g., Customer) and Source (e.g., Stock).",
                                    "Now, when a move is created for the Destination, the system will try to 'pull' from the Source."
                                ]}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ModuleCard({ title, description, details }: { title: string, description: string, details: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600">{details}</p>
            </CardContent>
        </Card>
    );
}

function HowToStep({ title, steps }: { title: string, steps: string[] }) {
    return (
        <div className="border-b pb-4 last:border-0">
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
                {steps.map((step, i) => (
                    <li key={i}>{step}</li>
                ))}
            </ol>
        </div>
    );
}
