'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

type NavItem = { name: string; href: string };
type NavSection = { title?: string; items: NavItem[] };

const navigation: NavSection[] = [
    {
        items: [
            { name: 'Dashboard', href: '/' },
        ]
    },
    {
        title: 'Inventory',
        items: [
            { name: 'Products', href: '/inventory' },
            { name: 'Locations', href: '/inventory/locations' },
            { name: 'Warehouses', href: '/inventory/warehouses' },
            { name: 'Adjustments', href: '/inventory/adjustments' },
            { name: 'Scrap Orders', href: '/inventory/scrap' },
            { name: 'Partner Locations', href: '/inventory/partners' },
            { name: 'Routes', href: '/inventory/routes' },
        ]
    },
    {
        title: 'Inbound Operations',
        items: [
            { name: 'Suppliers', href: '/inventory/suppliers' },
            { name: 'Purchase Orders', href: '/inventory/purchases' },
        ]
    },
    {
        title: 'Outbound Operations',
        items: [
            { name: 'Orders', href: '/orders' },
            { name: 'Picking', href: '/picking' },
            { name: 'Delivery Methods', href: '/configuration/delivery-methods' },
            { name: 'Invoices', href: '/invoices' },
        ]
    },
    {
        title: 'Reporting',
        items: [
            { name: 'Reports', href: '/reports' },
            { name: 'Stock Moves', href: '/inventory/moves' },
        ]
    },
    {
        title: 'System',
        items: [
            { name: 'User Guide', href: '/user-guide' },
            { name: 'Settings', href: '/settings' },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { hasPermission } = useAuth();

    const isItemVisible = (item: NavItem) => {
        // Public/Common items
        if (item.href === '/' || item.href === '/user-guide') return true;

        // Inventory
        if (item.href.startsWith('/inventory')) {
            if (item.href === '/inventory/purchases') return hasPermission('PURCHASE_ORDERS', 'READ');
            if (item.href === '/inventory/suppliers') return hasPermission('SUPPLIERS', 'READ');
            if (item.href === '/inventory/routes') return hasPermission('INVENTORY', 'READ');
            if (item.href === '/inventory/moves') return hasPermission('INVENTORY', 'READ');
            if (item.href === '/inventory/adjustments') return hasPermission('INVENTORY', 'UPDATE');
            if (item.href === '/inventory/scrap') return hasPermission('INVENTORY', 'UPDATE');
            return hasPermission('INVENTORY', 'READ');
        }

        // Invoices
        if (item.href === '/invoices') return hasPermission('INVOICES', 'READ');

        // Orders
        if (item.href === '/orders') return hasPermission('ORDERS', 'READ');
        if (item.href === '/picking') return hasPermission('ORDERS', 'UPDATE');
        if (item.href === '/configuration/delivery-methods') return hasPermission('SETTINGS', 'READ');

        // Reports
        if (item.href === '/reports') return hasPermission('REPORTS', 'READ');

        // Settings
        if (item.href === '/settings') return hasPermission('SETTINGS', 'READ');

        return true;
    };

    return (
        <div className="flex flex-col w-64 bg-gray-800 min-h-screen text-white">
            <div className="flex items-center justify-center h-16 border-b border-gray-700">
                <span className="text-xl font-bold">Labamu IMS</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
                {navigation.map((section, sectionIdx) => {
                    const visibleItems = section.items.filter(isItemVisible);

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={sectionIdx}>
                            {section.title && (
                                <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    {section.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {visibleItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                                }`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-700">
                <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                    Sign Out
                </Link>
            </div>
        </div>
    );
}
