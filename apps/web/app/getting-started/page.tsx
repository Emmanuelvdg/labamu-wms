'use client';

import Link from 'next/link';

export default function GettingStartedPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-indigo-600 px-6 py-8 sm:p-10">
                    <h1 className="text-3xl font-extrabold text-white">Getting Started with Labamu IMS</h1>
                    <p className="mt-2 text-indigo-100 text-lg">Your step-by-step guide to mastering inventory management.</p>
                </div>

                <div className="px-6 py-8 sm:p-10 space-y-12">
                    {/* Section 1 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">1</div>
                            <h2 className="text-2xl font-bold text-gray-900">Initial Setup</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <p>
                                <strong>Login:</strong> Access the application with your credentials (e.g., <code>admin@labamu.co.id</code>).
                            </p>
                            <p>
                                <strong>Dashboard:</strong> Upon login, you'll see a high-level overview of inventory value and alerts.
                            </p>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">2</div>
                            <h2 className="text-2xl font-bold text-gray-900">Organization Structure</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                                <p className="text-sm text-blue-700">Before adding products, define <em>where</em> they will be stored.</p>
                            </div>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    <strong>Create a Warehouse:</strong> Go to <Link href="/inventory/warehouses" className="text-indigo-600 hover:underline">Inventory &gt; Warehouses</Link>. Click "+ Add Warehouse".
                                </li>
                                <li>
                                    <strong>Define Locations:</strong> Go to <Link href="/inventory/locations" className="text-indigo-600 hover:underline">Inventory &gt; Locations</Link>. Create a hierarchy (Warehouse &rarr; Zone &rarr; Shelf).
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">3</div>
                            <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    <strong>Manage Categories:</strong> Go to <Link href="/settings/categories" className="text-indigo-600 hover:underline">Settings &gt; Categories</Link> to organize items.
                                </li>
                                <li>
                                    <strong>Create Products:</strong> Go to <Link href="/inventory" className="text-indigo-600 hover:underline">Inventory &gt; Products</Link>, click "+ New Item", and fill in SKU, Name, Category, and Tracking method.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">4</div>
                            <h2 className="text-2xl font-bold text-gray-900">Initializing Inventory</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <p>Once products and locations exist, you can add stock.</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    <strong>Add Stock (Batch):</strong> In Product Details, click "Add Batch" to input opening stock quantity and cost.
                                </li>
                                <li>
                                    <strong>Adjustments:</strong> Use <Link href="/inventory/adjustments" className="text-indigo-600 hover:underline">Adjustments</Link> for corrections (shrinkage, damage).
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">5</div>
                            <h2 className="text-2xl font-bold text-gray-900">Sales & Fulfillment</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <ol className="list-decimal pl-5 space-y-2">
                                <li><strong>Create Customer:</strong> Add profile in Partners &gt; Customers.</li>
                                <li><strong>Create Sales Order:</strong> In <Link href="/orders" className="text-indigo-600 hover:underline">Orders</Link>, create a new order and confirm it.</li>
                                <li><strong>Check Availability:</strong> Reserve stock for the order.</li>
                                <li><strong>Picking:</strong> Use <Link href="/operations/picking" className="text-indigo-600 hover:underline">Operations &gt; Picking</Link> to generate and execute picking tasks.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Section 6 */}
                    <section>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">6</div>
                            <h2 className="text-2xl font-bold text-gray-900">Procurement & Reporting</h2>
                        </div>
                        <div className="ml-14 space-y-4 text-gray-600">
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Procurement:</strong> Create <Link href="/purchases" className="text-indigo-600 hover:underline">Purchase Orders</Link> to restock from vendors.</li>
                                <li><strong>Reports:</strong> Check <Link href="/reporting/valuation" className="text-indigo-600 hover:underline">Valuation</Link> and <Link href="/inventory/moves" className="text-indigo-600 hover:underline">Stock Moves</Link> for insights.</li>
                            </ul>
                        </div>
                    </section>
                </div>

                <div className="bg-gray-50 px-6 py-6 sm:px-10 border-t border-gray-100 flex justify-center">
                    <Link href="/">
                        <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg">
                            Go to Dashboard
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
