import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminNav />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-12 border-b border-gray-200 bg-white flex items-center px-6 flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Platform Administration
                    </span>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
