'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { ArrowLeft, Book, Box, MapPin, Truck, ShoppingCart, LayoutGrid, FileText, Users, BarChart, Settings, ClipboardList, Trash2, Globe, Archive, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserGuidePage() {
    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <div className="flex items-center mb-8 gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Guide</h1>
                    <p className="text-muted-foreground">Comprehensive documentation for the Labamu Inventory Management System.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 hidden lg:block">
                    <Card className="sticky top-8">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Table of Contents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <nav className="flex flex-col space-y-4 p-4 text-sm">

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Getting Started</h4>
                                        <a onClick={(e) => scrollToSection(e, 'dashboard')} href="#dashboard" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Dashboard</a>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Inventory Management</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'products')} href="#products" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Products</a>
                                            <a onClick={(e) => scrollToSection(e, 'locations')} href="#locations" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Locations</a>
                                            <a onClick={(e) => scrollToSection(e, 'warehouses')} href="#warehouses" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Warehouses</a>
                                            <a onClick={(e) => scrollToSection(e, 'adjustments')} href="#adjustments" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Adjustments</a>
                                            <a onClick={(e) => scrollToSection(e, 'scrap')} href="#scrap" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Scrap Orders</a>
                                            <a onClick={(e) => scrollToSection(e, 'partner-locations')} href="#partner-locations" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Partner Locations</a>
                                            <a onClick={(e) => scrollToSection(e, 'routes')} href="#routes" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Routes</a>
                                            <a onClick={(e) => scrollToSection(e, 'stocktaking')} href="#stocktaking" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Stocktaking</a>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Inbound Operations</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'suppliers')} href="#suppliers" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Suppliers</a>
                                            <a onClick={(e) => scrollToSection(e, 'purchase-orders')} href="#purchase-orders" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Purchase Orders</a>
                                            <a onClick={(e) => scrollToSection(e, 'putaway')} href="#putaway" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Putaway</a>
                                            <a onClick={(e) => scrollToSection(e, 'putaway-rules')} href="#putaway-rules" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Putaway Rules</a>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Outbound Operations</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'orders')} href="#orders" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Creating Orders</a>
                                            <a onClick={(e) => scrollToSection(e, 'picking-strategies')} href="#picking-strategies" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Picking Strategies</a>
                                            <a onClick={(e) => scrollToSection(e, 'rotation-policies')} href="#rotation-policies" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Rotation Policies</a>
                                            <a onClick={(e) => scrollToSection(e, 'worker-interface')} href="#worker-interface" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Worker Interface</a>
                                            <a onClick={(e) => scrollToSection(e, 'delivery-methods')} href="#delivery-methods" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Delivery Methods</a>
                                            <a onClick={(e) => scrollToSection(e, 'invoices')} href="#invoices" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Invoices</a>
                                            <a onClick={(e) => scrollToSection(e, 'returns')} href="#returns" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Returns (RMA)</a>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Reporting & Admin</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'reports')} href="#reports" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Reports</a>
                                            <a onClick={(e) => scrollToSection(e, 'stock-moves')} href="#stock-moves" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Stock Moves</a>
                                            <a onClick={(e) => scrollToSection(e, 'inventory-ledger')} href="#inventory-ledger" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Inventory Ledger</a>
                                            <a onClick={(e) => scrollToSection(e, 'settings')} href="#settings" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Settings</a>
                                        </div>
                                    </div>

                                    <a onClick={(e) => scrollToSection(e, 'examples')} href="#examples" className="font-bold hover:text-primary py-1.5 transition-colors">End-to-End Examples</a>
                                </nav>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-16">

                    {/* 1. Dashboard */}
                    <section id="dashboard" className="scroll-mt-24">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutGrid className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Dashboard</h2>
                        </div>
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <p><strong>Purpose:</strong> The command center for your warehouse operations, offering real-time visibility into stock value, alerts, and activity.</p>
                                <div className="bg-primary/5 p-4 rounded-md text-sm border border-primary/20">
                                    <strong className="text-primary block mb-2">✨ New: Deep Dive Analytics</strong>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>Date Filtering:</strong> Toggle view between 7, 30, and 90 days, or select a custom range to analyze trends over specific periods.</li>
                                        <li><strong>Drill-Down:</strong> Double-click on any KPI card (e.g., "Stock Value" or "Pending Orders") to open a detailed view with granular line-item data.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Key Metrics & Widgets:</h4>
                                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                        <li><strong>Total Inventory Value:</strong> The aggregate cost value of all `ACTIVE` inventory.</li>
                                        <li><strong>Low Stock Alerts:</strong> Real-time counter of items below their `Min Quantity` reorder point. Click to view the specific items and generate POs.</li>
                                        <li><strong>Pending Orders:</strong> Sales orders currently in `PENDING` or `RESERVED` state, awaiting picking.</li>
                                        <li><strong>Recent Activity:</strong> A timeline of the last 10 system actions (logins, stock moves, settings changes).</li>
                                    </ul>
                                </div>
                                <div className="bg-muted p-4 rounded-md text-sm">
                                    <strong>How to Use:</strong>
                                    <ol className="list-decimal pl-5 mt-1 space-y-1">
                                        <li><strong>Date Filtering:</strong> Use the date picker in the top right to filter activity logs.</li>
                                        <li><strong>Quick Navigation:</strong> Click on any card (e.g., "Pending Orders") to jump directly to the pre-filtered list view for that metric.</li>
                                    </ol>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator />

                    {/* 2. Inventory Management Group */}
                    <section>
                        <h2 className="text-3xl font-bold mb-8 text-foreground">Inventory Management</h2>

                        <div className="space-y-12">
                            {/* Products */}
                            <div id="products" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Box className="h-5 w-5" /> Products</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The master record for every item you buy, store, or sell.</p>
                                        <div className="space-y-4">
                                            <div>
                                                <strong>Detailed Configuration:</strong>
                                                <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-1">
                                                    <li><strong>SKU (Stock Keeping Unit):</strong> Unique alphanumeric identifier (Required).</li>
                                                    <li><strong>Dimensions & Weight:</strong> Critical for shipping calculation and storage capacity logic.</li>
                                                    <li><strong>Cost & Price:</strong> 'Cost' is used for inventory valuation (COGS); 'Price' is the default sales price.</li>
                                                    <li><strong>Packaging Units:</strong> Define specific unit types (e.g., "Case of 12", "Pallet of 50") in the "Manage Packaging" tab.</li>
                                                    <li><strong>Ti-Hi Configuration:</strong> For Pallet units, define <code>Ti</code> (Cartons/Layer) and <code>Hi</code> (Layers/Pallet) for automatic capacity calc.</li>
                                                    <li><strong>Storage Requirements:</strong> Tag items as "Refrigerated", "Hazardous", or "Heavy" to restrict where they can be put away.</li>
                                                </ul>
                                            </div>
                                            <div className="bg-muted p-4 rounded-md text-sm">
                                                <strong>How to Use:</strong>
                                                <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                    <li>Navigate to <strong>Inventory &rarr; Products</strong>.</li>
                                                    <li>Click <strong>New Product</strong>.</li>
                                                    <li>Fill in the <strong>General Info</strong> tab. Ensure SKU is unique.</li>
                                                    <li>(Optional) Go to the <strong>Packaging</strong> tab to add barcodes for specific variants or unit sizes.</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Locations */}
                            <div id="locations" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><MapPin className="h-5 w-5" /> Locations</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> A digital twin of your physical warehouse layout, enabling precise stock tracking.</p>
                                        <div className="space-y-4">
                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Structural Hierarchy:</h4>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    The system supports a 6-level hierarchical structure for organizing your warehouse locations, from the broadest facility level down to individual storage positions.
                                                </p>

                                                <div className="bg-gray-50 p-4 rounded-md mb-3">
                                                    <img
                                                        src="/location_hierarchy.png"
                                                        alt="Location Hierarchy: Warehouse → Room → Row → Bay → Shelf → Position"
                                                        className="mx-auto rounded border border-gray-200"
                                                        style={{ maxWidth: '300px' }}
                                                    />
                                                    <p className="text-xs text-center text-muted-foreground mt-2">Hierarchical nesting structure</p>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">WAREHOUSE</span>
                                                        <span className="text-muted-foreground">Top level, represents entire facility</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">ROOM</span>
                                                        <span className="text-muted-foreground">Major zones (Receiving, Packing, Cold Storage, etc.)</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">ROW</span>
                                                        <span className="text-muted-foreground">Aisle or row designation within a room</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">BAY</span>
                                                        <span className="text-muted-foreground">Section or bay within a row</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">SHELF</span>
                                                        <span className="text-muted-foreground">Individual shelf or rack level within a bay</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs font-medium min-w-[100px]">POSITION</span>
                                                        <span className="text-muted-foreground">Specific bin or slot on a shelf (most granular)</span>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 p-3 rounded-md mt-3 text-sm">
                                                    <strong className="text-blue-900">Visual Navigation:</strong>
                                                    <p className="text-muted-foreground mt-1">Each structural type is color-coded in the location tree UI, making it easy to identify the hierarchy level at a glance.</p>
                                                </div>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Attribute Inheritance:</h4>
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    Attributes set at a parent level automatically apply to all child locations unless explicitly overridden at a lower level.
                                                </p>

                                                <div className="bg-green-50 p-3 rounded-md text-sm space-y-2">
                                                    <div>
                                                        <strong className="text-green-900">Example:</strong>
                                                        <p className="text-muted-foreground mt-1">
                                                            Set <code className="bg-white px-1 rounded">{`{"refrigerated": true}`}</code> on a ROOM → all ROWs, BAYs, SHELFs, and POSITIONs within that room automatically inherit this constraint.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t pt-4 border-blue-100 bg-blue-50/50 p-4 rounded-md">
                                                <h4 className="font-medium mb-2 text-blue-900">✨ New: Address Codes & Capacity</h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <strong className="text-sm text-foreground">Address Codes</strong>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Locations now have granular <code>code</code> fields (e.g., <code>ZONE-A</code>, <code>ROW-1</code>). The system automatically rolls these up into a full address path (<code>WH1.ZONE-A.ROW-1</code>), ensuring every position has a unique, scannable identifier.
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <strong className="text-sm text-foreground">Capacity Planning</strong>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            You can now define physical limits for any location to prevent overloading:
                                                        </p>
                                                        <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                                                            <li><strong>Dimensions (L x W x H):</strong> Inner usable space in mm.</li>
                                                            <li><strong>Max Weight:</strong> Maximum load capacity in kg.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Configuration Options:</h4>
                                                <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                                                    <li><strong>Location Types:</strong> INTERNAL (storage), VIEW (grouping), CUSTOMER, VENDOR, SCRAP</li>
                                                    <li><strong>Attributes:</strong> JSON object for capabilities like <code>{`{"refrigerated": true}`}</code></li>
                                                    <li><strong>Capacity:</strong> Set Max Volume or Max Weight limits</li>
                                                    <li><strong>Putaway Priority:</strong> Zone priority number (lower = higher priority)</li>
                                                    <li><strong>Removal Strategy:</strong> FIFO, FEFO, or LIFO per location</li>
                                                </ul>
                                            </div>


                                            <div className="bg-muted p-4 rounded-md text-sm">
                                                <strong>How to Use:</strong>
                                                <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                    <li>Navigate to <strong>Inventory &rarr; Locations</strong>.</li>
                                                    <li>Use the <strong>Hierarchy Tree</strong> to select a parent (e.g., "Warehouse A").</li>
                                                    <li>Click <strong>Add Child Location</strong> to create a sub-location (e.g., "Row 1").</li>
                                                    <li>Print <strong>Location Barcodes</strong> (future) for scanning during picking.</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Warehouses */}
                            <div id="warehouses" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Archive className="h-5 w-5" /> Warehouses</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Top-level facilities that act as the root of your location hierarchy.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Address:</strong> Used as the "Ship From" address on labels.</li>
                                            <li><strong>Picking Strategy:</strong> Set the default strategy for this warehouse (FIFO, FEFO, or User Selected).</li>
                                            <li><strong>Resupply Rules:</strong> Configure if this warehouse restocks from another warehouse (STO) or from Suppliers (PO).</li>
                                        </ul>

                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="font-medium mb-2">Workflow Configuration:</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Each warehouse can be configured with different inbound and outbound workflows to match your operational reality:
                                            </p>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                <li><strong>Inbound Steps:</strong> 1-step (direct-to-storage), 2-steps (receiving + staging), 3-steps (receiving + staging + quality)</li>
                                                <li><strong>Outbound Steps:</strong> 1-step (pick to ship), 2-steps (pick + pack), 3-steps (pick + pack + staging)</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-md text-sm">
                                            <strong className="text-blue-900">✨ Automatic Setup</strong>
                                            <p className="text-muted-foreground mt-2 mb-3">
                                                When you create a warehouse, the system automatically creates functional areas and locations based on your workflow configuration:
                                            </p>
                                            <div className="space-y-2 text-xs">
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium min-w-[80px]">1-step</span>
                                                        <span className="text-muted-foreground">Receiving Dock, Main Storage, Shipping Dock</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-medium min-w-[80px]">2-steps</span>
                                                        <span className="text-muted-foreground">Receiving Dock, Staging Area, Main Storage, Picking Zone, Shipping Dock</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="bg-green-100 text-green-900 px-2 py-0.5 rounded font-medium min-w-[80px]">3-steps</span>
                                                        <span className="text-muted-foreground">Receiving Dock, Staging Area, Putaway Lane, Main Storage, Picking Zone, Packing Station, Shipping Dock</span>
                                                    </div>
                                                    <div className="mt-2 pl-2 border-l-2 border-blue-200">
                                                        <strong className="text-blue-900 block mb-1">Advanced: Multi-Step Tracking</strong>
                                                        <span className="text-muted-foreground">
                                                            The system automatically generates digital `TransferOrder` records to track goods as they move through these steps (e.g., from Receiving &rarr; Quality Control &rarr; Stock).
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground mt-3">
                                                ✓ Each area gets a functional area entry with explicit type classification<br />
                                                ✓ Linked INTERNAL locations are created automatically<br />
                                                ✓ Warehouse is immediately operational for putaway and picking
                                            </p>
                                        </div>

                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="font-medium mb-2">✨ Address Management:</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Each warehouse can have a complete structured address for delivery integration and shipping:
                                            </p>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">

                                                <li><strong>Street Address:</strong> Physical location of the warehouse</li>
                                                <li><strong>City, State, Postal Code, Country:</strong> Complete geographic details</li>
                                                <li><strong>Latitude/Longitude:</strong> GPS coordinates for automated delivery quotations</li>
                                            </ul>
                                            <div className="bg-blue-50 p-3 rounded-md text-sm mt-3">
                                                <strong className="text-blue-900">💡 Delivery Integration:</strong>
                                                <p className="text-muted-foreground mt-1">
                                                    Structured address information is critical for automated delivery quotations and third-party logistics integrations like Lalamove. Navigate to the warehouse edit page to update address details and GPS coordinates.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Go to <strong>Settings &rarr; Warehouses</strong>.</li>
                                                <li>Create a Warehouse for each physical address.</li>
                                                <li>Select inbound/outbound workflow steps (1, 2, or 3 steps).</li>
                                                <li>System automatically creates functional areas and locations.</li>
                                                <li>Click on warehouse to edit and add complete address information.</li>
                                                <li>Assign <strong>Users</strong> to the warehouse to restrict their access/visibility.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Adjustments */}
                            <div id="adjustments" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><ClipboardList className="h-5 w-5" /> Adjustments</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Reconciling system usage with physical reality (Cycle Counts, Stocktakes).</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Navigate to <strong>Inventory &rarr; Adjustments</strong>.</li>
                                                <li>Click <strong>New Adjustment</strong>.</li>
                                                <li><strong>Scope:</strong> Select the specific <strong>Location</strong> and <strong>Product</strong>.</li>
                                                <li><strong>Entry Mode:</strong>
                                                    <ul className="list-disc pl-5 mt-1">
                                                        <li><em>Relative:</em> "We found 2 extra" &rarr; Enter <code>+2</code>.</li>
                                                        <li><em>Absolute:</em> "We counted 5 total" &rarr; Enter <code>5</code>.</li>
                                                    </ul>
                                                </li>
                                                <li><strong>Reason Code:</strong> Mandatory field (e.g., "Damaged", "Theft").</li>
                                                <li><strong>Apply:</strong> Stock creates a <code>StockTransaction</code> of type <code>ADJUSTMENT</code>.</li>
                                            </ol>
                                        </div>
                                        <div className="mt-4">
                                            <strong>Advanced: Batch Management</strong>
                                            <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                                                <li><strong>Expiration Date:</strong> Set this when receiving goods to enable FEFO picking.</li>
                                                <li><strong>Velocity (ABC):</strong> Classify products as 'A' (Fast) or 'C' (Slow) to optimize putaway.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Scrap */}
                            <div id="scrap" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Trash2 className="h-5 w-5" /> Scrap Orders</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Formal process for writing off inventory value due to damage or expiry.</p>
                                        <p className="text-muted-foreground text-sm"><strong>Note:</strong> Adjustments fix counts; Scrap Orders explicitly record <em>loss</em> and are often part of a financial approval workflow.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Navigate to <strong>Inventory &rarr; Scrap</strong>.</li>
                                                <li>Create a new order and select items that are damaged/expired.</li>
                                                <li><strong>Confirm:</strong> Items move to <code>SCRAP</code> location and asset value is reduced.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Partner Locations */}
                            <div id="partner-locations" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Globe className="h-5 w-5" /> Partner Locations</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Extending visibility to 3rd party sites like Retail Stores, Consignment Partners, or Manufacturing nodes.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Create a Location with <code>Type = PARTNER</code>.</li>
                                                <li>This location functions like a Warehouse but is flagged as external.</li>
                                                <li>Use <strong>Transfer Orders</strong> (STO) to move stock here.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Optimized Putaway */}
                            <div id="optimized-putaway" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><MapPin className="h-5 w-5" /> Optimized Putaway</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The system recommends the best location for incoming goods based on <strong>Product Velocity</strong> and <strong>Zone Priority</strong>.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Configuration:</strong>
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                <li><strong>Zone Priority:</strong> Assign priority (1-100) to Locations. Lower is better (Golden Zone).</li>
                                                <li><strong>Product Velocity:</strong> Set 'A' (Fast) or 'C' (Slow) in Product form.</li>
                                                <li><strong>Logic:</strong> System matches Fast items to Low Priority (Golden) zones.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Routes */}
                            <div id="routes" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Route className="h-5 w-5" /> Routes</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Defining the lifecycle and movement path of inventory.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Push Rules:</strong> "When detailed product arrives at Receiving, automatic move &rarr; Quality Control."</li>
                                            <li><strong>Pull Rules:</strong> "When Order confirms, reserve from Stock; if empty, trigger Resupply from Bulk Storage."</li>
                                        </ul>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Navigate to <strong>Inventory &rarr; Routes</strong>.</li>
                                                <li>Define a sequence of steps (Source &rarr; Destination).</li>
                                                <li>Apply the route to a <strong>Warehouse</strong> (global) or a <strong>Product Category</strong>.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stocktaking Section */}
                            <div id="stocktaking" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><ClipboardList className="h-5 w-5" /> Stocktaking & Cycle Counting</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Maintain exact inventory accuracy through regular physical counts and reconciliation.</p>
                                        <div>
                                            <h4 className="font-medium mb-1">Workflow:</h4>
                                            <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-sm">
                                                <li><strong>Cycle Count:</strong> Frequent, small-scale counts of high-velocity items or zones.</li>
                                                <li><strong>Full Stocktake:</strong> Complete wall-to-wall annual count.</li>
                                                <li><strong>Reconciliation:</strong> System highlights variances; Managers approve adjustments to update stock.</li>
                                            </ul>
                                        </div>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Navigate to <strong>Inventory &rarr; Stocktaking</strong>.</li>
                                                <li>Create a <strong>Session</strong> and generate tasks.</li>
                                                <li>Mobile Interface: Workers count and submit quantities.</li>
                                                <li><strong>Review & Reconcile:</strong> Approve variances to auto-create inventory adjustments.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    </section>

                    <Separator />

                    {/* 3. Inbound Operations */}
                    <section>
                        <h2 className="text-3xl font-bold mb-8 text-foreground">Inbound Operations</h2>
                        <div className="space-y-12">
                            {/* Suppliers */}
                            <div id="suppliers" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Users className="h-5 w-5" /> Suppliers</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> CRM for your vendors.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Payment Terms:</strong> Default terms (e.g., Net 30) for generated POs.</li>
                                            <li><strong>Lead Time:</strong> Average time to deliver (used for forecasting).</li>
                                        </ul>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong> Go to <strong>Purchasing &rarr; Suppliers</strong>. Keep contact info and addresses up to date for PO generation.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Purchase Orders */}
                            <div id="purchase-orders" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Truck className="h-5 w-5" /> Purchase Orders & Receiving</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The commercial agreement to buy goods and the act of accepting them.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Detailed Workflow:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li><strong>Draft:</strong> Create PO, select Supplier. Add line items.</li>
                                                <li><strong>Order:</strong> Confirming sends status to <code>ORDERED</code>.</li>
                                                <li><strong>Receive:</strong>
                                                    <ul className="list-disc pl-5 mt-1">
                                                        <li>Click <strong>Receive Goods</strong> on the PO.</li>
                                                        <li><strong>Partial Receive:</strong> If you ordered 100 but got 50, enter 50. The PO stays open (PARTIAL).</li>
                                                        <li><strong>Location:</strong> Default receiving location is used, or specify a sorting bay.</li>
                                                        <li><strong>LPN Generation:</strong> If receiving "Pallets", the system generates unique license plate numbers.</li>
                                                    </ul>
                                                </li>
                                                <li><strong>Tracking:</strong> For multi-step warehouses, receiving automatically triggers an inbound <code>TransferOrder</code> chain (e.g. Input &rarr; QC &rarr; Stock).</li>
                                            </ol>
                                        </div>

                                        <div className="bg-yellow-50 p-4 rounded-md text-sm">
                                            <strong className="text-yellow-900">⚡ Exception Handling</strong>
                                            <p className="text-muted-foreground mt-1">
                                                If items fail Quality Control (QC), workers can move them to a <strong>Quarantine</strong> location. The system automatically detects this deviation and cancels the standard "Move to Stock" task, ensuring damaged goods don't mix with sellable inventory.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Putaway */}
                            <div id="putaway" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Box className="h-5 w-5" /> Putaway Operations</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Moving received goods from receiving areas to their designated storage locations quickly and efficiently.</p>

                                        <div className="bg-green-50 p-4 rounded-md text-sm cursor-pointer hover:bg-green-100 transition-colors">
                                            <strong className="text-green-900">✨ New: Manual Inbound</strong>
                                            <p className="text-muted-foreground mt-1">
                                                Manually adding an inventory batch (via "Add Batch") now triggers a standard Putaway Task. This ensures strict inventory control even for unplanned stock discovery.
                                            </p>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">What is Putaway?</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                After goods arrive via purchase orders and are received into a receiving location, putaway is the process of transferring them to optimal storage locations. The system recommends storage locations based on product velocity, zone priority, and location constraints.
                                            </p>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Session-Based Workflow:</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Putaway operates in sessions where workers are assigned multiple tasks to complete as a batch, optimizing travel time and efficiency.
                                            </p>

                                            <div className="bg-muted p-4 rounded-md text-sm">
                                                <strong>Standard Putaway Flow:</strong>
                                                <ol className="list-decimal pl-5 mt-2 space-y-2">
                                                    <li>
                                                        <strong>Start Session:</strong>
                                                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                            <li>Navigate to <strong>Putaway</strong> page</li>
                                                            <li>Select your warehouse</li>
                                                            <li>Click <strong>Start Putaway Session</strong></li>
                                                            <li>System scans receiving locations and creates tasks for all pending items</li>
                                                        </ul>
                                                    </li>
                                                    <li>
                                                        <strong>View Tasks:</strong>
                                                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                            <li>See list of all putaway tasks in session</li>
                                                            <li>Each task shows: Product, Quantity, Source (receiving location), Suggested destination</li>
                                                            <li>Tasks are optimized by zone priority and product velocity</li>
                                                        </ul>
                                                    </li>
                                                    <li>
                                                        <strong>Execute Tasks:</strong>
                                                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                            <li>Click <strong>Start</strong> on a task to begin</li>
                                                            <li>System shows source location and suggested storage location</li>
                                                            <li>Physical: Pick items from receiving, transport to storage location</li>
                                                            <li>Click <strong>Confirm</strong> to complete the putaway</li>
                                                            <li>Inventory automatically moves from receiving to st orage</li>
                                                        </ul>
                                                    </li>
                                                    <li>
                                                        <strong>Complete Session:</strong>
                                                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                            <li>Continue until all tasks are completed</li>
                                                            <li>Click <strong>Complete Session</strong> when done</li>
                                                            <li>Session is finalized and new one can be started</li>
                                                        </ul>
                                                    </li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Smart Location Recommendations:</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                The system uses intelligent logic to suggest optimal storage locations:
                                            </p>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                <li><strong>Zone Priority:</strong> Locations with lower priority numbers (golden zones) are preferred for fast-mo ving items</li>
                                                <li><strong>Product Velocity:</strong> 'A' class (fast) products go to easily accessible zones</li>
                                                <li><strong>Capacity Checking:</strong> System verifies location has sufficient space (volume/weight)</li>
                                                <li><strong>Attribute Matching:</strong> Refrigerated products only suggested for refrigerated locations</li>
                                                <li><strong>Existing Stock:</strong> Prefers consolidating same product in fewer locations</li>
                                            </ul>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Exception Handling:</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Workers can report exceptions during putaway that require supervisor intervention:
                                            </p>

                                            <div className="space-y-3">
                                                <div className="bg-red-50 p-3 rounded-md">
                                                    <strong className="text-red-900">LOCATION_FULL</strong>
                                                    <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                        <li><strong>When:</strong> Suggested location doesn't have physical space</li>
                                                        <li><strong>Action:</strong> Supervisor assigns alternative location</li>
                                                        <li><strong>System:</strong> Updates task with new destination</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-orange-50 p-3 rounded-md">
                                                    <strong className="text-orange-900">DAMAGED</strong>
                                                    <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                        <li><strong>When:</strong> Items found damaged during putaway</li>
                                                        <li><strong>Action:</strong> Specify damaged quantity, items moved to inspection/scrap</li>
                                                        <li><strong>Tracking:</strong> Records loss for inventory accuracy</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-yellow-50 p-3 rounded-md">
                                                    <strong className="text-yellow-900">SHORT_RECEIPT</strong>
                                                    <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                        <li><strong>When:</strong> Physical quantity doesn't match expected</li>
                                                        <li><strong>Action:</strong> Adjust task to actual quantity found</li>
                                                        <li><strong>Resolution:</strong> Triggers receiving variance investigation</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Performance Metrics:</h4>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                <li><strong>Tasks per Session:</strong> Track worker productivity</li>
                                                <li><strong>Average Time per Task:</strong> Identify bottlenecks</li>
                                                <li><strong>Exception Rate:</strong> Monitor process quality</li>
                                                <li><strong>Location Accuracy:</strong> Verify suggested locations are followed</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-md text-sm mt-4">
                                            <strong className="text-blue-900">💡 Best Practice:</strong>
                                            <p className="text-muted-foreground mt-1">
                                                Complete putaway sessions within the same day as receiving. This keeps receiving locations clear, provides accurate stock data, and enables faster order fulfillment from organized storage locations.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>

                            {/* Returns Management (RMA) */}
                            <div id="returns" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Box className="h-5 w-5" /> Returns Management (RMA)</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Manage customer returns efficiently, including validation, receiving condition assessment, and inventory restocking.</p>

                                        <div className="bg-blue-50 p-4 rounded-md text-sm">
                                            <strong className="text-blue-900">Process Flow:</strong>
                                            <ol className="list-decimal pl-5 mt-2 space-y-2 text-muted-foreground">
                                                <li><strong>Request:</strong> Customer or Admin initiates return from Sales Order.</li>
                                                <li><strong>Receive & Assess:</strong> Warehouse receives item. Condition tagged as SELLABLE, DAMAGED, or REFURBISH.</li>
                                                <li><strong>Restock:</strong> SELLABLE items auto-restock. DAMAGED items go to Quarantine.</li>
                                            </ol>
                                        </div>

                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                <li>Navigate to <strong>Orders &rarr; Returns</strong>.</li>
                                                <li>Click <strong>New Return Request</strong>.</li>
                                                <li>On arrival, click <strong>Receive</strong> and input condition.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Putaway Rules */}
                            <div id="putaway-rules" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Putaway Rules Management</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Define sophisticated, rule-based logic for automated putaway location selection using configurable matching criteria and selection strategies.</p>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">What are Putaway Rules?</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Putaway Rules are user-defined configurations that automatically determine the optimal storage location for incoming goods based on product characteristics, storage requirements, and inventory strategies. Rules are evaluated in priority order, allowing you to create complex location assignment logic.
                                            </p>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Accessing Putaway Rules:</h4>
                                            <div className="bg-muted p-4 rounded-md text-sm">
                                                <ol className="list-decimal pl-5 space-y-1">
                                                    <li>Navigate to <strong>Inbound Operations → Putaway Rules</strong></li>
                                                    <li>View all existing rules with their priority, strategy, and status</li>
                                                    <li>Click <strong>Create Rule</strong> to define new putaway logic</li>
                                                    <li>Edit existing rules by clicking the edit icon</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Rule Components:</h4>

                                            <div className="space-y-3">
                                                <div>
                                                    <strong className="text-sm">1. Basic Information</strong>
                                                    <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-0.5">
                                                        <li><strong>Name:</strong> Descriptive identifier for the rule</li>
                                                        <li><strong>Description:</strong> Explains when and why this rule applies</li>
                                                        <li><strong>Priority:</strong> Numeric value (higher = evaluated first). Critical for rule precedence</li>
                                                        <li><strong>Warehouse Scope:</strong> Apply to specific warehouse or globally</li>
                                                        <li><strong>Active Status:</strong> Enable/disable rule without deletion</li>
                                                    </ul>
                                                </div>

                                                <div>
                                                    <strong className="text-sm">2. Matching Criteria (When to Apply)</strong>
                                                    <p className="text-xs text-muted-foreground mt-1 mb-2">Define which products this rule matches. Rules match when ALL specified criteria are met.</p>
                                                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                                                        <li><strong>Specific Product:</strong> Target individual SKU</li>
                                                        <li><strong>Product Category:</strong> Apply to all products in category</li>
                                                        <li><strong>Velocity Class:</strong> A (Fast), B (Medium), C (Slow-moving)</li>
                                                        <li><strong>ABC Classification:</strong> A (High value), B (Medium), C (Low value)</li>
                                                        <li><strong>Storage Requirements:</strong> refrigerated, climate_controlled, hazmat_certified, fragile, heavy_duty, ground_floor, dry, frozen</li>
                                                        <li><strong>Temperature Range:</strong> Min/Max temperature constraints (°C)</li>
                                                        <li><strong>Packaging Size:</strong> INDIVIDUAL, BOX, or PALLET</li>
                                                        <li><strong>Weight Range:</strong> Min/Max weight filters (kg)</li>
                                                        <li><strong>Source Location:</strong> Apply only when items come from specific receiving area</li>
                                                    </ul>
                                                </div>

                                                <div>
                                                    <strong className="text-sm">3. Destination Strategy (Where to Put)</strong>
                                                    <p className="text-xs text-muted-foreground mt-1 mb-2">How should the system select the storage location?</p>

                                                    <div className="space-y-2">
                                                        <div className="bg-blue-50 p-2 rounded">
                                                            <strong className="text-blue-900 text-xs">📍 FIXED Location</strong>
                                                            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                                <li>Always assigns to a specific location</li>
                                                                <li>Use for dedicated storage zones</li>
                                                                <li>Configuration: Select exact destination location</li>
                                                            </ul>
                                                        </div>

                                                        <div className="bg-purple-50 p-2 rounded">
                                                            <strong className="text-purple-900 text-xs">🎯 ZONE_PRIORITY</strong>
                                                            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                                <li>Selects from zone priority range</li>
                                                                <li>Ideal for flexible golden zone assignment</li>
                                                                <li>Configuration: Set min/max zone priority (e.g., 1-20 for golden zones)</li>
                                                            </ul>
                                                        </div>

                                                        <div className="bg-green-50 p-2 rounded">
                                                            <strong className="text-green-900 text-xs">📏 CLOSEST</strong>
                                                            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                                <li>Minimizes travel distance from receiving</li>
                                                                <li>Calculates distance to each eligible location</li>
                                                                <li>Best for high-volume, fast putaway operations</li>
                                                            </ul>
                                                        </div>

                                                        <div className="bg-yellow-50 p-2 rounded">
                                                            <strong className="text-yellow-900 text-xs">⚖️ LEAST_OCCUPIED</strong>
                                                            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                                <li>Balances utilization across locations</li>
                                                                <li>Prevents hotspot congestion</li>
                                                                <li>Maximizes available capacity</li>
                                                            </ul>
                                                        </div>

                                                        <div className="bg-orange-50 p-2 rounded">
                                                            <strong className="text-orange-900 text-xs">🎲 BALANCED</strong>
                                                            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                                <li>Random distribution within eligible locations</li>
                                                                <li>Prevents worker clustering</li>
                                                                <li>Improves concurrent putaway performance</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Rule Evaluation Logic:</h4>
                                            <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm">
                                                <p><strong>When putaway location is needed:</strong></p>
                                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                                    <li>System retrieves all <strong>active</strong> rules for the warehouse</li>
                                                    <li>Rules are sorted by <strong>priority descending</strong> (highest first)</li>
                                                    <li>Each rule's matching criteria is evaluated against the product</li>
                                                    <li><strong>First matching rule</strong> determines the strategy to use</li>
                                                    <li>Strategy is applied to find candidate locations</li>
                                                    <li>Location capacity, attributes, and compatibility are validated</li>
                                                    <li>Best location is returned based on strategy algorithm</li>
                                                    <li>If no rules match → fallback to velocity-based heuristic</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Common Rule Patterns:</h4>

                                            <div className="space-y-3">
                                                <div className="bg-blue-50 p-3 rounded">
                                                    <strong className="text-blue-900 text-sm">Example 1: Fast-Moving Items to Golden Zone</strong>
                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                        <li><strong>Priority:</strong> 150</li>
                                                        <li><strong>Match:</strong> Velocity Class = A</li>
                                                        <li><strong>Strategy:</strong> ZONE_PRIORITY (1-20)</li>
                                                        <li><strong>Result:</strong> All fast-moving products go to easily accessible zones</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-green-50 p-3 rounded">
                                                    <strong className="text-green-900 text-sm">Example 2: Refrigerated Products</strong>
                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                        <li><strong>Priority:</strong> 200 (higher = evaluated first)</li>
                                                        <li><strong>Match:</strong> Storage Requirement = refrigerated, Temperature 2-8°C</li>
                                                        <li><strong>Strategy:</strong> FIXED → Cold Storage Room A</li>
                                                        <li><strong>Result:</strong> Temperature-sensitive items always go to climate-controlled area</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-purple-50 p-3 rounded">
                                                    <strong className="text-purple-900 text-sm">Example 3: Heavy Pallets</strong>
                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground mt-1">
                                                        <li><strong>Priority:</strong> 120</li>
                                                        <li><strong>Match:</strong> Packaging = PALLET, Min Weight = 500kg</li>
                                                        <li><strong>Strategy:</strong> LEAST_OCCUPIED</li>
                                                        <li><strong>Result:</strong> Distributes heavy items across ground-floor locations to balance load</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Best Practices:</h4>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                                <li><strong>Assign Clear Priorities:</strong> Use priority ranges (100-199 for category rules, 200+ for product-specific rules)</li>
                                                <li><strong>Start General, Get Specific:</strong> Create broad rules first, then add exceptions</li>
                                                <li><strong>Test Before Activating:</strong> Create rules as inactive, verify logic, then enable</li>
                                                <li><strong>Monitor Rule Usage:</strong> Check which rules are being applied most frequently</li>
                                                <li><strong>Keep Descriptions Clear:</strong> Document the business reason for each rule</li>
                                                <li><strong>Avoid Rule Conflicts:</strong> Ensure higher priority rules don't make lower ones unreachable</li>
                                                <li><strong>Regular Review:</strong> Audit rules quarterly as inventory mix changes</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-md text-sm mt-4">
                                            <strong className="text-blue-900">💡 Pro Tip:</strong>
                                            <p className="text-muted-foreground mt-1">
                                                Combine multiple matching criteria to create highly targeted rules. For example: "Fast-moving (A) + Refrigerated + From Dock 3" creates a very specific rule that won't interfere with other putaway logic.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* 4. Outbound Operations */}
                    <section>
                        <h2 className="text-3xl font-bold mb-8 text-foreground">Outbound Operations</h2>
                        <div className="space-y-12">

                            {/* Creating Orders */}
                            <div id="orders" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><ShoppingCart className="h-5 w-5" /> Creating Orders</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Capturing demand.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Customer:</strong> Who is buying.</li>
                                            <li><strong>Warehouse:</strong> Where stock should come from.</li>
                                            <li><strong>Priority:</strong> High, Normal, Low. High priority orders can "steal" reservations.</li>
                                        </ul>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Workflow:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li><strong>Draft:</strong> Add products. Price is auto-filled.</li>
                                                <li><strong>Shipping:</strong> Select a <strong>Delivery Method</strong> to tack on costs.</li>
                                                <li><strong>Check Availability:</strong> Critical step. System locks stock (<code>RESERVED</code>) for this order.</li>
                                                <li><strong>Confirm:</strong> Moves order to the Picking Queue.</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Picking Strategies */}
                            <div id="picking-strategies" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Picking Strategies</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Optimizing how physical labor is utilized.</p>
                                        <div className="space-y-4">
                                            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                                <li><strong>Single Order:</strong> Picker grabs a cart, picks one order A to Z. Simple, good for low volume.</li>
                                                <li><strong>Batch Picking:</strong> System combines 5 orders. Picker goes to Shelf A, grabs 5 widgets (1 for each order). Reduces walking.</li>
                                                <li><strong>Wave Picking:</strong> Orders are grouped by carrier/time. Released in "waves" to balance hourly workload.</li>
                                            </ul>
                                            <strong>Configuration:</strong> Set the active strategy in <strong>Warehouse Settings</strong>.
                                        </div>
                                        <div className="mt-2">
                                            <h4 className="font-medium text-sm">Stock Rotation Policies:</h4>
                                            <p className="text-xs text-muted-foreground mt-1">The system supports FIFO, FEFO, and LIFO policies. See the dedicated section below for comprehensive configuration details.</p>
                                        </div>

                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stock Rotation Policies */}
                            <div id="rotation-policies" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Stock Rotation Policies</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Control which batch or lot of inventory is picked first when fulfilling orders, ensuring optimal stock rotation based on your business requirements.</p>

                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-medium mb-2">Available  Policies:</h4>
                                                <div className="space-y-3">
                                                    <div className="bg-blue-50 p-3 rounded-md">
                                                        <strong className="text-blue-900">FIFO (First In, First Out)</strong>
                                                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                            <li><strong>Definition:</strong> Picks the oldest inventory first based on purchase/receipt date</li>
                                                            <li><strong>Use Case:</strong> Standard goods, preventing inventory aging, general merchandise</li>
                                                            <li><strong>Logic:</strong> Orders batches by <code>purchaseDate ASC</code></li>
                                                        </ul>
                                                    </div>

                                                    <div className="bg-green-50 p-3 rounded-md">
                                                        <strong className="text-green-900">FEFO (First Expiry, First Out)</strong>
                                                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                            <li><strong>Definition:</strong> Picks inventory closest to expiration first</li>
                                                            <li><strong>Use Case:</strong> Perishable goods (food, dairy, produce), pharmaceuticals, cosmetics</li>
                                                            <li><strong>Logic:</strong> Orders batches by <code>expiryDate ASC</code></li>
                                                            <li><strong>Requirement:</strong> Batches must have expiry dates set during receiving</li>
                                                        </ul>
                                                    </div>

                                                    <div className="bg-orange-50 p-3 rounded-md">
                                                        <strong className="text-orange-900">LIFO (Last In, First Out)</strong>
                                                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                            <li><strong>Definition:</strong> Picks the newest inventory first</li>
                                                            <li><strong>Use Case:</strong> Rare; sometimes used for commodities, bulk materials, or specific accounting requirements</li>
                                                            <li><strong>Logic:</strong> Orders batches by <code>purchaseDate DESC</code></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Configuration Hierarchy &amp; Precedence:</h4>
                                                <p className="text-sm text-muted-foreground mb-2">Rotation rules can be defined at multiple levels. When multiple rules could apply to an order, the system uses this precedence (highest to lowest):</p>
                                                <ol className="list-decimal pl-5 text-sm space-y-1 text-muted-foreground">
                                                    <li><strong>Customer + Order Type:</strong> Specific customer for a specific order type (e.g., "CustomerA for B2B orders")</li>
                                                    <li><strong>Customer:</strong> All orders for a specific customer</li>
                                                    <li><strong>Order Type:</strong> All orders of a specific type (B2B, B2C, Wholesale, etc.)</li>
                                                    <li><strong>Product (SKU):</strong> Specific product override</li>
                                                    <li><strong>Category:</strong> All products in a category</li>
                                                    <li><strong>Warehouse:</strong> Default for entire warehouse</li>
                                                    <li><strong>System Default:</strong> FIFO (if no rules match)</li>
                                                </ol>
                                                <div className="bg-yellow-50 p-3 rounded-md mt-2 text-sm">
                                                    <strong>Example:</strong> If you have a FIFO rule for "CustomerA" and a FEFO rule for "Product XYZ", when CustomerA orders Product XYZ, the customer-level rule (FIFO) wins.
                                                </div>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Advanced Features:</h4>

                                                <div className="space-y-3">
                                                    <div>
                                                        <strong className="text-sm">Minimum Shelf Life Constraint (FEFO)</strong>
                                                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                            <li><strong>Purpose:</strong> Prevent picking items that won't last long enough for the customer to receive and use</li>
                                                            <li><strong>Configuration:</strong> Set <code>minShelfLifeDays</code> on a rotation rule</li>
                                                            <li><strong>Example:</strong> "Only pick batches with at least 15 days until expiry"</li>
                                                            <li><strong>Behavior:</strong> System skips batches that don't meet the shelf life requirement</li>
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <strong className="text-sm">Missing Expiry Action</strong>
                                                        <p className="text-sm text-muted-foreground mt-1">For FEFO policies when a batch lacks an expiry date:</p>
                                                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                                                            <li><strong>BLOCK:</strong> Refuse to pick the batch (strict compliance mode)</li>
                                                            <li><strong>FALLBACK_FIFO:</strong> Fall back to FIFO logic for that batch (recommended)</li>
                                                            <li><strong>ALLOW:</strong> Pick anyway without checking expiry (not recommended for strict FEFO)</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-muted p-4 rounded-md text-sm">
                                                <strong>How to Configure:</strong>
                                                <ol className="list-decimal pl-5 mt-2 space-y-1">
                                                    <li>Navigate to <strong>Settings → Rotation Rules</strong></li>
                                                    <li>Click <strong>+ New Rule</strong></li>
                                                    <li><strong>Set Context:</strong> Select target level (Customer, Order Type, Product, Category, or Warehouse)</li>
                                                    <li><strong>Choose Policy:</strong> Select FIFO, FEFO, or LIFO</li>
                                                    <li><strong>Set Priority:</strong> Higher number = more important (used as tie-breaker at same level)</li>
                                                    <li><strong>(Optional)</strong> For FEFO: Set <code>minShelfLifeDays</code> and <code>missingExpiryAction</code></li>
                                                    <li><strong>Activate:</strong> Toggle the rule to active status</li>
                                                </ol>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-medium mb-2">Integration with Order Fulfillment:</h4>
                                                <p className="text-sm text-muted-foreground mb-2">When an order is created and stock reservation occurs:</p>
                                                <ol className="list-decimal pl-5 text-sm space-y-1 text-muted-foreground">
                                                    <li>System determines applicable rotation rule based on order context (customer, type, products)</li>
                                                    <li>Queries available batches in the assigned warehouse</li>
                                                    <li>Applies rotation policy to sort batches (oldest first, expiring first, or newest first)</li>
                                                    <li>Applies shelf life filter if minimum days configured</li>
                                                    <li>Reserves appropriate quantity from the selected batch(es)</li>
                                                    <li>Creates picking tasks with recommended batch locations for workers</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>


                            {/* Worker Interface */}

                            {/* Worker Interface */}
                            <div id="worker-interface" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Box className="h-5 w-5" /> Worker Interface</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The mobile-focused screen for floor staff.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Workflow:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Picker logs in on tablet/scanner at <code>/picking</code>.</li>
                                                <li><strong>Scan:</strong> System shows "Go to Row 1, Shelf B".</li>
                                                <li>Worker scans Location Barcode (Validation).</li>
                                                <li>System shows "Pick 3x SKU-123".</li>
                                                <li>Worker scans Product Barcode (Validation).</li>
                                                <li><strong>Confirm:</strong> Stock moves from Shelf to "Packing Zone".</li>
                                            </ol>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Delivery Methods */}
                            <div id="delivery-methods" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Truck className="h-5 w-5" /> Delivery Methods</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Calculating shipping costs and managing delivery logistics.</p>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Method Types:</h4>
                                            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                                <li><strong>Fixed Price:</strong> Simple flat rate shipping (e.g., "Standard Shipping = $10")</li>
                                                <li><strong>Rules Based:</strong> Calculate based on weight, volume, dimensions (e.g., "If Weight &gt; 5kg, Cost = $20")</li>
                                                <li><strong>Lalamove (On-Demand):</strong> Real-time delivery quotations from Lalamove API</li>
                                            </ul>
                                        </div>

                                        <div className="border-t pt-4 mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Truck className="h-5 w-5 text-blue-600" />
                                                ✨ Lalamove Integration
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Seamless on-demand delivery integration for supported markets (Indonesia, Singapore, Thailand, Philippines, Vietnam)
                                            </p>

                                            <div className="space-y-4">
                                                <div className="bg-white p-4 rounded-md">
                                                    <strong className="text-sm block mb-2 text-blue-900">📋 Setup:</strong>
                                                    <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                                                        <li>Navigate to <strong>Configuration → Delivery Methods</strong></li>
                                                        <li>Create new delivery method with Provider = "LALAMOVE"</li>
                                                        <li>Configure Lalamove credentials in environment variables</li>
                                                        <li>System automatically maps markets to appropriate languages</li>
                                                    </ol>
                                                </div>

                                                <div className="bg-white p-4 rounded-md">
                                                    <strong className="text-sm block mb-2 text-green-900">🚀 Using Lalamove for Order Delivery:</strong>
                                                    <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                                                        <li><strong>Create Order:</strong> Ensure warehouse and customer have complete address information</li>
                                                        <li><strong>Select Method:</strong> In order's "Shipping Info", choose "Lalamove Delivery (On-Demand)" from dropdown</li>
                                                        <li><strong>Auto-Quote:</strong> System automatically fetches real-time quotation</li>
                                                        <li><strong>View Cost:</strong> "Estimated Cost" updates with actual Lalamove price (e.g., IDR 8,500)</li>
                                                        <li><strong>Apply:</strong> Click "Apply" to confirm delivery method</li>
                                                        <li><strong>Book Delivery:</strong> Once order is ready to ship, use "Book Delivery" button</li>
                                                    </ol>
                                                </div>

                                                <div className="bg-white p-4 rounded-md">
                                                    <strong className="text-sm block mb-2 text-purple-900">🏍️ Supported Service Types:</strong>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="flex items-start gap-2">
                                                            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium min-w-[100px]">MOTORCYCLE</span>
                                                            <span className="text-muted-foreground">&lt; 20kg</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="bg-green-100 text-green-900 px-2 py-0.5 rounded font-medium min-w-[100px]">SEDAN</span>
                                                            <span className="text-muted-foreground">20-100kg</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-medium min-w-[100px]">VAN</span>
                                                            <span className="text-muted-foreground">100-500kg</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded font-medium min-w-[100px]">LORRY</span>
                                                            <span className="text-muted-foreground">&gt; 500kg</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">System automatically selects appropriate service type based on order weight</p>
                                                </div>

                                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                                    <strong className="text-yellow-900 text-sm block mb-1">⚠️ Requirements:</strong>
                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
                                                        <li><strong>Warehouse:</strong> Street address, city, state, postal code, country, latitude, longitude</li>
                                                        <li><strong>Customer:</strong> Street address, city, state, postal code, country, latitude, longitude</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-muted p-4 rounded-md text-sm mt-4">
                                            <strong>How to Configure:</strong>
                                            <p className="text-muted-foreground mt-1">
                                                Go to <strong>Configuration → Delivery Methods</strong> to define methods. These will appear in the Sales Order shipping dropdown for automatic cost calculation and booking.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Invoices */}
                            <div id="invoices" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><FileText className="h-5 w-5" /> Invoices</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The request for payment.</p>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Workflow:</strong>
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                <li><strong>Sales Invoice:</strong> Created from a Sales Order <em>after</em> shipment.</li>
                                                <li><strong>Vendor Bill:</strong> Created from a Purchase Order <em>after</em> receipt.</li>
                                                <li><strong>Status:</strong> <code>DRAFT</code> &rarr; <code>POSTED</code> (Finalized) &rarr; <code>PAID</code>.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    </section>

                    <Separator />

                    {/* 5. Reporting & Admin */}
                    <section>
                        <h2 className="text-3xl font-bold mb-8 text-foreground">Reporting & Admin</h2>
                        <div className="space-y-12">

                            <div id="reports" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><BarChart className="h-5 w-5" /> Reports</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Compliance and Deep Dive.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                                            <li><strong>Inventory Valuation:</strong> "What is my stock worth right now?" (Quantity * Cost).</li>
                                            <li><strong>Stock Moves:</strong> The ledger of truth. Every single change is row here. Use for investigating "missing" items.</li>
                                            <li><strong>Compliance:</strong> Export data for VAT or SAF-T requirements.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="stock-moves" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Archive className="h-5 w-5" /> Stock Moves</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> The ledger of truth. Audit trail of every single transaction row.</p>
                                        <p className="text-muted-foreground text-sm">Every single change is a row here. Use for investigating "missing" items.</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="inventory-ledger" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Archive className="h-5 w-5" /> Inventory Ledger</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> A chronological, immutable record of every stock movement in the system. Essential for audits and traceability.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Unified History:</strong> Combines data from Inbound Receipts, Outbound Orders, Adjustments, and Scrap.</li>
                                            <li><strong>Traceability:</strong> Links directly back to source documents (PO Number, Order Number).</li>
                                            <li><strong>Detailed Columns:</strong> Date, Type, Product, Quantity, Warehouse, Location, Notes.</li>
                                        </ul>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>Features:</strong>
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                <li><strong>Advanced Filtering:</strong> Filter by Warehouse, Location, Product, Date Range, or Transaction Type.</li>
                                                <li><strong>Export to CSV:</strong> Download the full ledger history for external reporting or auditing.</li>
                                                <li><strong>Pagination:</strong> Efficiently browse through thousands of records.</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="settings" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Settings</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-6">
                                        <p><strong>Purpose:</strong> Administrative configuration for users, locations, and external integrations.</p>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Users & Roles</h4>
                                            <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1">
                                                <li><strong>Users:</strong> Create accounts and assign roles (Admin, Manager, Picker, etc.)</li>
                                                <li><strong>Roles:</strong> Define permission sets for different user types</li>
                                                <li><strong>Warehouse Assignment:</strong> Restrict users to specific warehouses</li>
                                            </ul>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">Location Attributes</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Define custom attributes that can be applied to warehouse locations to enforce storage requirements and optimize putaway decisions.
                                            </p>

                                            <div className="bg-blue-50 p-3 rounded-md text-sm space-y-2">
                                                <p><strong className="text-blue-900">Common Attributes:</strong></p>
                                                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                                                    <li><strong>refrigerated:</strong> For cold storage zones</li>
                                                    <li><strong>frozen:</strong> For freezer areas</li>
                                                    <li><strong>climate_controlled:</strong> Temperature and humidity controlled</li>
                                                    <li><strong>hazmat_certified:</strong> For dangerous goods storage</li>
                                                    <li><strong>heavy_duty:</strong> Reinforced floors for heavy items</li>
                                                    <li><strong>ground_floor:</strong> Accessible without lifts</li>
                                                    <li><strong>fragile:</strong> Special handling zones</li>
                                                    <li><strong>secure:</strong> Restricted access areas</li>
                                                </ul>
                                            </div>

                                            <div className="bg-muted p-4 rounded-md text-sm mt-3">
                                                <strong>How to Use:</strong>
                                                <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                    <li>Navigate to <strong>Settings → Location Attributes</strong></li>
                                                    <li>Create custom attributes for your warehouse needs</li>
                                                    <li>Apply attributes to locations in the location management page</li>
                                                    <li>Set matching storage requirements on products</li>
                                                    <li>System automatically respects these constraints during putaway</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">API Keys & MCP Integration</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Generate secure API keys for programmatic access and enable LLM-powered warehouse orchestration through the Model Context Protocol (MCP) server.
                                            </p>

                                            <div className="space-y-3">
                                                <div className="bg-green-50 p-3 rounded-md text-sm">
                                                    <strong className="text-green-900">✨ Key Management:</strong>
                                                    <ul className="list-disc pl-5 text-muted-foreground mt-1 space-y-0.5">
                                                        <li><strong>Generation:</strong> Create keys with custom scopes (permissions)</li>
                                                        <li><strong>Scopes:</strong> INVENTORY:READ, ORDERS:CREATE, PUTAWAY:UPDATE, etc.</li>
                                                        <li><strong>Security:</strong> Keys shown only once, stored as SHA-256 hashes</li>
                                                        <li><strong>Lifecycle:</strong> Track last used date, expiration, revoke inactive keys</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-purple-50 p-3 rounded-md text-sm">
                                                    <strong className="text-purple-900">🤖 MCP Server:</strong>
                                                    <p className="text-muted-foreground mt-1 mb-2">
                                                        Allows AI assistants like Claude to orchestrate warehouse operations using generated API keys.
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mb-1"><strong>Available Tools:</strong></p>
                                                    <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-0.5">
                                                        <li><strong>list_products</strong> - Query inventory</li>
                                                        <li><strong>get_stock_levels</strong> - Check stock for products</li>
                                                        <li><strong>create_purchase_order</strong> - Generate POs programmatically</li>
                                                        <li><strong>start_putaway_task</strong> - Initiate putaway operations</li>
                                                    </ul>
                                                </div>

                                                <div className="bg-muted p-4 rounded-md text-sm">
                                                    <strong>How to Use:</strong>
                                                    <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                        <li>Navigate to <strong>Settings → API Keys</strong></li>
                                                        <li>Click <strong>Generate New Key</strong></li>
                                                        <li>Select required scopes (e.g., INVENTORY:READ, ORDERS:CREATE)</li>
                                                        <li>Copy the key (shown only once!)</li>
                                                        <li>Configure MCP server in <code>apps/mcp/.env</code></li>
                                                        <li>Add to Claude Desktop config or use via MCP protocol</li>
                                                        <li>Ask Claude to "List all products" or "Check stock levels"</li>
                                                    </ol>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h4 className="font-medium mb-2">General Settings</h4>
                                            <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1">
                                                <li><strong>Company Info:</strong> Business name and contact details</li>
                                                <li><strong>Currency:</strong> Base currency for cost and pricing</li>
                                                <li><strong>System Preferences:</strong> Default warehouse, language, timezone</li>
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    </section>

                    <Separator className="my-12" />

                    {/* End-to-End Examples */}
                    <section id="examples" className="scroll-mt-24">
                        <h2 className="text-3xl font-bold mb-8">End-to-End Examples</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardHeader>
                                    <CardTitle>Scenario A: The Full Retail Flow</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                                        <li><strong>Buy:</strong> Create PO for Supplier "TechDistro". Receive goods into "Zone A".</li>
                                        <li><strong>Sell:</strong> Create Sales Order for "John Doe".</li>
                                        <li><strong>Shipping:</strong> Select "Express ($15)".</li>
                                        <li><strong>Process:</strong>
                                            <ul className="list-disc pl-4 mt-1">
                                                <li>"Check Availability" (Reserve)</li>
                                                <li>Pick (Worker scans item)</li>
                                                <li>Pack & Ship.</li>
                                            </ul>
                                        </li>
                                        <li><strong>Bill:</strong> Generate Invoice #INV-1001 for $115.</li>
                                    </ol>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-green-500">
                                <CardHeader>
                                    <CardTitle>Scenario B: Resupplying a Retail Store (STO)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                                        <li><strong>Context:</strong> "Main Warehouse" & Partner "Downtown Store".</li>
                                        <li><strong>Trigger:</strong> Store needs 100 "Coffee Beans".</li>
                                        <li><strong>Action:</strong> Create <strong>Transfer Order</strong> (Source: Main, Dest: Downtown).</li>
                                        <li><strong>Execute:</strong> Main Warehouse picks and ships. Status: <code>IN_TRANSIT</code>.</li>
                                        <li><strong>Receive:</strong> Store Manager logs in, opens Transfer, clicks "Receive".</li>
                                        <li><strong>Result:</strong> Inventory moves buckets.</li>
                                    </ol>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <div className="h-20"></div>
                </div >
            </div >
        </div >
    );
}
