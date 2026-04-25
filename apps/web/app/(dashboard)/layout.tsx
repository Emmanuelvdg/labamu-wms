import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import ImpersonationBanner from '@/components/ImpersonationBanner';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <ImpersonationBanner />
                <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-end px-6 flex-shrink-0">
                    <NotificationBell />
                </header>
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
