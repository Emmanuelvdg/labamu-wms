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
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Inbound Operations</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'suppliers')} href="#suppliers" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Suppliers</a>
                                            <a onClick={(e) => scrollToSection(e, 'purchase-orders')} href="#purchase-orders" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Purchase Orders</a>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Outbound Operations</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'orders')} href="#orders" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Creating Orders</a>
                                            <a onClick={(e) => scrollToSection(e, 'picking-strategies')} href="#picking-strategies" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Picking Strategies</a>
                                            <a onClick={(e) => scrollToSection(e, 'worker-interface')} href="#worker-interface" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Worker Interface</a>
                                            <a onClick={(e) => scrollToSection(e, 'delivery-methods')} href="#delivery-methods" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Delivery Methods</a>
                                            <a onClick={(e) => scrollToSection(e, 'invoices')} href="#invoices" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Invoices</a>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">Reporting & Admin</h4>
                                        <div className="flex flex-col space-y-1">
                                            <a onClick={(e) => scrollToSection(e, 'reports')} href="#reports" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Reports</a>
                                            <a onClick={(e) => scrollToSection(e, 'stock-moves')} href="#stock-moves" className="block text-muted-foreground hover:text-primary py-1 transition-colors pl-2 border-l-2 border-transparent hover:border-primary">Stock Moves</a>
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
                                            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                                <li><strong>Location Types:</strong> INTERNAL (storage), VIEW (grouping), CUSTOMER, VENDOR, SCRAP.</li>
                                                <li><strong>Attributes:</strong> Assign capabilities like <code>{`{ "refrigerated": true }`}</code> to enforce storage rules.</li>
                                                <li><strong>Capacity:</strong> Set Max Volume or Max Weight limits.</li>
                                                <li><strong>Putaway Priority:</strong> Set a sequence number to tell the system which bins to fill first.</li>
                                            </ul>
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
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong>
                                            <ol className="list-decimal pl-5 mt-1 space-y-1">
                                                <li>Go to <strong>Settings &rarr; Warehouses</strong>.</li>
                                                <li>Create a Warehouse for each physical address.</li>
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
                                            </ol>
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
                                            <h4 className="font-medium text-sm">Advanced Policies (Automatic):</h4>
                                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                                <li><strong>FIFO:</strong> Picks oldest batch (Purchase Date).</li>
                                                <li><strong>FEFO:</strong> Picks expiring batch (Expiration Date).</li>
                                            </ul>
                                        </div>

                                    </CardContent>
                                </Card>
                            </div>

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
                                        <p><strong>Purpose:</strong> Calculating and charging for logistics.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Fixed Price:</strong> Simple. "Standard Shipping = $10".</li>
                                            <li><strong>Rules Based:</strong> "If Weight &gt; 5kg, Cost = $20". "If Total &gt; $100, Free Shipping".</li>
                                        </ul>
                                        <div className="bg-muted p-4 rounded-md text-sm">
                                            <strong>How to Use:</strong> Define methods in <strong>Configuration</strong>. These appear in the Sales Order dropdown.
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

                            <div id="settings" className="scroll-mt-24 gap-4">
                                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2"><Settings className="h-5 w-5" /> Settings</h3>
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <p><strong>Purpose:</strong> Admin controls.</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li><strong>Users:</strong> Create accounts and assign Roles (Manager vs Picker).</li>
                                            <li><strong>General:</strong> Set base currency and company details.</li>
                                        </ul>
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
                </div>
            </div >
        </div >
    );
}
