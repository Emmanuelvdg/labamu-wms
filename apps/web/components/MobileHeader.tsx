'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Home, LogOut } from 'lucide-react';

export default function MobileHeader() {
    const pathname = usePathname();
    const router = useRouter();

    const isDashboard = pathname === '/mobile/dashboard';

    return (
        <header className="flex-none bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2">
                {!isDashboard && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-indigo-500 -ml-2"
                        onClick={() => router.back()}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}
                <h1 className="text-lg font-bold">Labamu Mobile</h1>
            </div>

            <div className="flex items-center gap-2">
                {!isDashboard && (
                    <Link href="/mobile/dashboard">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-indigo-500">
                            <Home className="w-5 h-5" />
                        </Button>
                    </Link>
                )}

                {isDashboard && (
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-white hover:bg-indigo-500 gap-1">
                            <LogOut className="w-4 h-4" />
                            <span className="text-xs uppercase font-bold">Exit</span>
                        </Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
