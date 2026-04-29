'use client';

import { useRouter } from 'next/navigation';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    function logout() {
        document.cookie = 'supplier_token=; Max-Age=0; path=/';
        router.push('/portal/login');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-600">Labamu</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-sm text-gray-600 font-medium">Supplier Portal</span>
                </div>
                <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
                    Log out
                </button>
            </header>
            <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}
