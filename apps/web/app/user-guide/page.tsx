'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { ArrowLeft, Book, Box, MapPin, Truck, ShoppingCart, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserGuidePage() {
    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="flex items-center mb-8 gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Guide</h1>
                    <p className="text-muted-foreground">Comprehensive documentation for the Inventory Management System.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="md:col-span-1">
                    <Card className="sticky top-8">
                        <CardHeader>
                            <CardTitle className="text-lg">Table of Contents</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <nav className="flex flex-col space-y-1 p-4">
                                    <a href="#getting-started" className="text-sm font-medium hover:underline py-2 text-muted-foreground hover:text-primary">Getting Started</a>
                                    <a href="#inventory-management" className="text-sm font-medium hover:underline py-2 text-muted-foreground hover:text-primary">Inventory Management</a>
                                    <div className="pl-4 flex flex-col space-y-1 border-l ml-2">
                                        <a href="#products" className="text-xs text-muted-foreground hover:text-primary py-1">Products</a>
                                        <a href="#locations" className="text-xs text-muted-foreground hover:text-primary py-1">Locations</a>
                                        <a href="#warehouses" className="text-xs text-muted-foreground hover:text-primary py-1">Warehouses</a>
                                    </div>
                                    <a href="#inbound-operations" className="text-sm font-medium hover:underline py-2 text-muted-foreground hover:text-primary">Inbound Operations</a>
                                    <div className="pl-4 flex flex-col space-y-1 border-l ml-2">
                                        <a href="#purchase-orders" className="text-xs text-muted-foreground hover:text-primary py-1">Purchase Orders</a>
                                        <a href="#receiving-goods" className="text-xs text-muted-foreground hover:text-primary py-1">Receiving Goods</a>
                                    </div>
                                    <a href="#outbound-operations" className="text-sm font-medium hover:underline py-2 text-muted-foreground hover:text-primary">Outbound Operations</a>
                                    <div className="pl-4 flex flex-col space-y-1 border-l ml-2">
                                        <a href="#creating-orders" className="text-xs text-muted-foreground hover:text-primary py-1">Creating Orders</a>
                                        <a href="#picking-strategies" className="text-xs text-muted-foreground hover:text-primary py-1">Picking Strategies</a>
                                        <a href="#worker-interface" className="text-xs text-muted-foreground hover:text-primary py-1">Worker Interface</a>
                                    </div>
                                    <a href="#floor-plan-manager" className="text-sm font-medium hover:underline py-2 text-muted-foreground hover:text-primary">Floor Plan Manager</a>
                                </nav>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="md:col-span-3 space-y-12">

                    {/* Getting Started */}
                    <section id="getting-started" className="scroll-mt-20">
                        <div className="flex items-center gap-2 mb-4">
                            <Book className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Getting Started</h2>
                        </div>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="mb-4">Welcome to the Inventory Management System. This guide covers the core functionalities for managing your warehouse operations.</p>
                                <h3 className="text-lg font-medium mb-2">Dashboard</h3>
                                <p className="text-muted-foreground mb-2">The Dashboard provides a real-time overview of your operations:</p>
                                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                                    <li><strong>Key Metrics:</strong> Total Inventory Value, Pending Orders, Low Stock Alerts.</li>
                                    <li><strong>Charts:</strong> Daily Sales Trend, Inventory Distribution.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator />

                    {/* Inventory Management */}
                    <section id="inventory-management" className="scroll-mt-20">
                        <div className="flex items-center gap-2 mb-4">
                            <Box className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Inventory Management</h2>
                        </div>

                        <div className="space-y-6">
                            <div id="products" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Products</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Manage your item catalog at <Link href="/inventory/products" className="text-primary hover:underline">/inventory/products</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li><strong>Create Product:</strong> Click "New Product" and fill in details (SKU, Name, Dimensions).</li>
                                            <li>
                                                <strong>Multi-Form Factor:</strong>
                                                <ul className="list-circle pl-6 mt-1 space-y-1">
                                                    <li>Go to a Product's details page.</li>
                                                    <li>Click <strong>"Manage Packaging"</strong>.</li>
                                                    <li>Define units like "Box of 10" or "Pallet of 100".</li>
                                                    <li>These units can be used in Purchase Orders and Receiving.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="locations" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Locations</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Manage your warehouse layout at <Link href="/inventory/locations" className="text-primary hover:underline">/inventory/locations</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li><strong>Hierarchy:</strong> Locations are organized as Warehouse &rarr; Room &rarr; Row &rarr; Bay &rarr; Shelf &rarr; Position.</li>
                                            <li>
                                                <strong>Editing:</strong>
                                                <ul className="list-circle pl-6 mt-1 space-y-1">
                                                    <li>Click on a location to view details.</li>
                                                    <li>Click <strong>"Edit Location"</strong> to modify attributes.</li>
                                                    <li><strong>Color Coding:</strong> Set a "Color Code" in the edit dialog to visually distinguish locations in the Tree View and Floor Plan.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="warehouses" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Warehouses</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Manage warehouse-specific settings at <Link href="/inventory/warehouses" className="text-primary hover:underline">/inventory/warehouses</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li><strong>Picking Strategy:</strong> Configure how orders are picked (Wave, Batch, Cluster) per warehouse.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Inbound Operations */}
                    <section id="inbound-operations" className="scroll-mt-20">
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Inbound Operations</h2>
                        </div>

                        <div className="space-y-6">
                            <div id="purchase-orders" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Purchase Orders</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Navigate to <Link href="/inventory/purchases" className="text-primary hover:underline">/inventory/purchases</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li><strong>Create PO:</strong> Select a Supplier and add items.</li>
                                            <li><strong>Ordering Units:</strong> You can select specific packaging units (e.g., "2 Pallets") instead of just base units.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="receiving-goods" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Receiving Goods</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li>Open a "Ordered" Purchase Order.</li>
                                            <li>Click <strong>"Receive"</strong>.</li>
                                            <li><strong>Auto-LPN:</strong> If you ordered packaged units (e.g., Pallets), the system automatically creates unique Package records (LPNs) for tracking.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Outbound Operations */}
                    <section id="outbound-operations" className="scroll-mt-20">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Outbound Operations</h2>
                        </div>

                        <div className="space-y-6">
                            <div id="creating-orders" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Creating Orders</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Navigate to <Link href="/orders" className="text-primary hover:underline">/orders</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li>Create orders for customers.</li>
                                            <li>Orders are automatically assigned to a Warehouse based on availability (or manual selection).</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="picking-strategies" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Picking Strategies</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Configure these in <strong>Warehouse Details</strong>:</p>
                                        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                                            <li><strong>Standard:</strong> Pick orders one by one.</li>
                                            <li><strong>Batch Picking:</strong> Group multiple orders into a single pick list.</li>
                                            <li><strong>Cluster Picking:</strong> Pick for multiple orders simultaneously into sorted totes.</li>
                                            <li><strong>Wave Picking:</strong> Aggregate demand for items across many orders for mass picking.</li>
                                        </ol>
                                    </CardContent>
                                </Card>
                            </div>

                            <div id="worker-interface" className="scroll-mt-24">
                                <h3 className="text-xl font-medium mb-3">Worker Interface</h3>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="mb-2">Navigate to <Link href="/picking" className="text-primary hover:underline">/picking</Link>.</p>
                                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                            <li>This is the mobile-friendly view for warehouse workers.</li>
                                            <li>Workers select their active strategy and follow the guided picking steps.</li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* Floor Plan Manager */}
                    <section id="floor-plan-manager" className="scroll-mt-20">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutGrid className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Floor Plan Manager</h2>
                        </div>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="mb-2">Access via <strong>"Manage Floor Plan"</strong> on the Locations page.</p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Visual Editor:</strong> Drag and drop Bays onto a canvas.</li>
                                    <li><strong>Sidebar:</strong> Shows "Unmapped Bays" that need placement.</li>
                                    <li><strong>Controls:</strong>
                                        <ul className="list-circle pl-6 mt-1 space-y-1">
                                            <li><strong>Drag:</strong> Move bays around.</li>
                                            <li><strong>Rotate:</strong> Click the rotate icon on a selected bay.</li>
                                            <li><strong>Save:</strong> Persist your layout.</li>
                                        </ul>
                                    </li>
                                    <li><strong>Color Coding:</strong> Bays display their assigned color attribute.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </section>

                </div>
            </div>
        </div>
    );
}
