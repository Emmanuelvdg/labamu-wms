'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    BarChart3,
    Flag,
    Megaphone,
    ClipboardList,
    ExternalLink,
    LogOut,
} from 'lucide-react';

type NavLink = {
    name: string;
    href: string;
    icon: any;
};

const navLinks: NavLink[] = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Tenants', href: '/admin/tenants', icon: Building2 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
    { name: 'Audit Log', href: '/admin/audit-log', icon: ClipboardList },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
];

export default function AdminNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <div className="flex flex-col w-60 bg-slate-900 min-h-screen text-slate-300">
            {/* Branding */}
            <div className="flex items-center h-16 px-5 border-b border-slate-700 flex-shrink-0">
                <div>
                    <div className="text-sm font-bold text-white tracking-wide">LABAMU</div>
                    <div className="text-xs text-slate-400 font-medium">Backoffice</div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navLinks.map((link) => (
                    <Link
                        key={link.name}
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive(link.href)
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                        <link.icon className="w-4 h-4 flex-shrink-0" />
                        {link.name}
                    </Link>
                ))}
            </nav>

            {/* Footer links */}
            <div className="p-3 border-t border-slate-700 space-y-0.5">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    Main App
                </Link>
                <Link
                    href="/login"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    Sign Out
                </Link>
            </div>
        </div>
    );
}
