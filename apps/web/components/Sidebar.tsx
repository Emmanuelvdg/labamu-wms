'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
    LayoutDashboard,
    FileText,
    Box,
    Layers,
    Package,
    Map,
    Settings,
    ChevronDown,
    ChevronRight,
    Truck,
    ShoppingCart,
    ClipboardList,
    BookOpen,
    GitBranch,
    Building2,
} from 'lucide-react';

type NavItem = {
    name: string;
    href: string;
    icon?: any;
    items?: { name: string; href: string; permission?: { resource: string, action: string } }[];
    permission?: { resource: string, action: string };
};

const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Mobile Hub', href: '/mobile/dashboard', icon: Map, permission: { resource: 'SETTINGS', action: 'READ' } },
    { name: 'Report', href: '/reporting', icon: FileText, permission: { resource: 'REPORTS', action: 'READ' } },
    { name: 'Product', href: '/inventory', icon: Box, permission: { resource: 'INVENTORY', action: 'READ' } },
    { name: 'Lot Number', href: '/inventory/batches', icon: Layers, permission: { resource: 'INVENTORY', action: 'READ' } },
    { name: 'Package', href: '/inventory/packages', icon: Package, permission: { resource: 'INVENTORY', action: 'READ' } },
    {
        name: 'Inbound',
        href: '#inbound',
        icon: Truck,
        items: [
            { name: 'Suppliers', href: '/inventory/suppliers', permission: { resource: 'SUPPLIERS', action: 'READ' } },
            { name: 'Purchase Orders', href: '/inventory/purchases', permission: { resource: 'PURCHASE_ORDERS', action: 'READ' } },
            { name: 'Putaway', href: '/putaway', permission: { resource: 'INVENTORY', action: 'UPDATE' } },
            { name: 'Putaway Rules', href: '/inventory/putaway-rules', permission: { resource: 'INVENTORY', action: 'UPDATE' } },
        ]
    },
    {
        name: 'Outbound',
        href: '#outbound',
        icon: ShoppingCart,
        items: [
            { name: 'Customers', href: '/customers', permission: { resource: 'CUSTOMERS', action: 'READ' } },
            { name: 'Orders', href: '/orders', permission: { resource: 'ORDERS', action: 'READ' } },
            { name: 'Picking', href: '/picking', permission: { resource: 'ORDERS', action: 'UPDATE' } },
            { name: 'Picking Dashboard', href: '/picking/dashboard', permission: { resource: 'ORDERS', action: 'UPDATE' } },
            { name: 'Wave Rules', href: '/picking/wave-rules', permission: { resource: 'ORDERS', action: 'UPDATE' } },
            { name: 'Packing', href: '/packing', permission: { resource: 'ORDERS', action: 'UPDATE' } },
            { name: 'Returns (RMA)', href: '/returns', permission: { resource: 'ORDERS', action: 'READ' } },
            { name: 'Shipments', href: '/shipments', permission: { resource: 'ORDERS', action: 'READ' } },
            { name: 'Invoices', href: '/invoices', permission: { resource: 'INVOICES', action: 'READ' } },
            { name: 'Delivery Methods', href: '/configuration/delivery-methods', permission: { resource: 'SETTINGS', action: 'READ' } },
        ]
    },
    {
        name: 'Inventory',
        href: '#inventory',
        icon: ClipboardList,
        items: [
            { name: 'Inventory List', href: '/inventory', permission: { resource: 'INVENTORY', action: 'READ' } },
            { name: 'Stocktaking', href: '/stocktaking', permission: { resource: 'INVENTORY', action: 'UPDATE' } },
            { name: 'Moves', href: '/inventory/moves', permission: { resource: 'INVENTORY', action: 'READ' } },
            { name: 'Transfers', href: '/transfers', permission: { resource: 'FULFILLMENT', action: 'READ' } },
            { name: 'Adjustments', href: '/inventory/adjustments', permission: { resource: 'INVENTORY', action: 'UPDATE' } },
            { name: 'Scrap', href: '/inventory/scrap', permission: { resource: 'INVENTORY', action: 'UPDATE' } },
            { name: 'Replenishment', href: '/inventory/replenishment', permission: { resource: 'INVENTORY', action: 'READ' } },
        ]
    },
    {
        name: 'Warehouse',
        href: '#warehouse',
        icon: Map,
        items: [
            { name: 'Locations', href: '/inventory/locations', permission: { resource: 'SETTINGS', action: 'READ' } },
            { name: 'Warehouses', href: '/inventory/warehouses', permission: { resource: 'SETTINGS', action: 'READ' } },
            { name: 'Floor Plan', href: '/floor-plan', permission: { resource: 'SETTINGS', action: 'READ' } },
            { name: 'Routes', href: '/inventory/routes', permission: { resource: 'INVENTORY', action: 'READ' } },
        ]
    },
    {
        name: 'Workflows',
        href: '#workflows',
        icon: GitBranch,
        items: [
            { name: 'Templates', href: '/workflows', permission: { resource: 'SETTINGS', action: 'READ' } },
            { name: 'Monitor', href: '/workflows/monitor', permission: { resource: 'SETTINGS', action: 'READ' } },
            { name: 'Analytics', href: '/workflows/analytics', permission: { resource: 'REPORTS', action: 'READ' } },
        ]
    },
    { name: 'Audit Log', href: '/audit', icon: ClipboardList, permission: { resource: 'SETTINGS', action: 'READ' } },
    { name: 'Settings', href: '/settings', icon: Settings, permission: { resource: 'SETTINGS', action: 'READ' } },
    { name: 'Backoffice', href: '/admin', icon: Building2, permission: { resource: 'ALL', action: 'MANAGE' } },
    { name: 'User Guide', href: '/user-guide', icon: BookOpen },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { hasPermission } = useAuth();
    // Defer permission-gated items until after hydration to avoid server/client mismatch.
    // The server renders without cookie access, so hasPermission returns false; the client
    // reads from the user_data cookie and returns true. Using mounted prevents the diff.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'Inbound': true,
        'Outbound': true,
        'Inventory': true,
        'Warehouse': true,
        'Platform': true,
    });

    const toggleSection = (name: string) => {
        setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const isVisible = (item: NavItem | { permission?: { resource: string, action: string } }) => {
        if (!item.permission) return true;
        // Before hydration, hide permission-gated items to match SSR output
        if (!mounted) return false;
        return hasPermission(item.permission.resource as any, item.permission.action as any);
    };

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen text-gray-600 font-sans">
            <div className="flex items-center h-16 px-6 border-b border-gray-100">
                <span className="text-xl font-bold text-blue-600">Labamu</span>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const hasSubItems = item.items && item.items.length > 0;

                    if (hasSubItems) {
                        const visibleChildren = item.items!.filter(isVisible);
                        if (visibleChildren.length === 0) return null;

                        const isActive = pathname === item.href || (item.items && item.items.some(sub => pathname.startsWith(sub.href)));
                        const isOpen = openSections[item.name];

                        return (
                            <div key={item.name} className="py-1">
                                <button
                                    onClick={() => toggleSection(item.name)}
                                    className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors select-none
                                        ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center">
                                        {item.icon && <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />}
                                        {item.name}
                                    </div>
                                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                </button>

                                {isOpen && (
                                    <div className="pl-9 mt-1 space-y-1">
                                        {visibleChildren.map(subItem => {
                                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                                            return (
                                                <Link
                                                    key={subItem.name}
                                                    href={subItem.href}
                                                    className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors
                                                        ${isSubActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                                >
                                                    {subItem.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (!isVisible(item)) return null;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1
                                ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            {item.icon && <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />}
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <Link href="/login" className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-900 w-full">
                    Sign Out
                </Link>
            </div>
        </div>
    );
}
