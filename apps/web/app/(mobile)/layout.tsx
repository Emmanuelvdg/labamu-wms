import MobileHeader from '@/components/MobileHeader';

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <MobileHeader />
            <main className="flex-1 overflow-y-auto p-4">
                {children}
            </main>
        </div>
    );
}
