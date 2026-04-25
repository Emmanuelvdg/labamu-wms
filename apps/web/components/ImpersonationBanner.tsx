'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImpersonationBanner() {
    const [info, setInfo] = useState<{ companyName: string } | null>(null);
    const [stopping, setStopping] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const raw = Cookies.get('impersonating');
        if (raw) {
            try { setInfo(JSON.parse(raw)); } catch { /* ignore */ }
        }
    }, []);

    if (!info) return null;

    const handleStop = async () => {
        setStopping(true);
        try {
            const res = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
            if (res.ok) {
                Cookies.remove('impersonating');
                setInfo(null);
                router.push('/admin');
            }
        } finally {
            setStopping(false);
        }
    };

    return (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-50">
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Impersonating <strong>{info.companyName}</strong> — you are acting as this tenant</span>
            </div>
            <button
                onClick={handleStop}
                disabled={stopping}
                className="bg-white text-amber-600 font-semibold text-xs px-3 py-1 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
                {stopping ? 'Stopping...' : 'Exit Impersonation'}
            </button>
        </div>
    );
}
