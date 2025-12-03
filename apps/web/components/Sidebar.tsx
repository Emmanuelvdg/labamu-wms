'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Warehouses', href: '/inventory/warehouses' },
    { name: 'Locations', href: '/inventory/locations' },
    { name: 'Adjustments', href: '/inventory/adjustments' },
    { name: 'Scrap', href: '/inventory/scrap' },
    { name: 'Orders', href: '/orders' },
    { name: 'Purchase Orders', href: '/inventory/purchases' },
    { name: 'Suppliers', href: '/inventory/suppliers' },
    { name: 'Reports', href: '/reports' },
    { name: 'Routes', href: '/inventory/routes' },
    { name: 'Stock Moves', href: '/inventory/moves' },
    { name: 'User Guide', href: '/user-guide' },
    { name: 'Settings', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 bg-gray-800 min-h-screen text-white">
            <div className="flex items-center justify-center h-16 border-b border-gray-700">
                <span className="text-xl font-bold">Labamu IMS</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => {
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
            </nav>
            <div className="p-4 border-t border-gray-700">
                <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                    Sign Out
                </Link>
            </div>
        </div>
    );
}
