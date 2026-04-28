import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

/**
 * GET /api/feature-flags
 * Returns the feature flag state for the authenticated company.
 * Reads company_id from the auth cookie and proxies to the backend.
 */
export async function GET(request: Request) {
    const cookies = request.headers.get('cookie') || '';

    const companyIdMatch = cookies.match(/company_id=([^;]+)/);
    const companyId = companyIdMatch?.[1];

    if (!companyId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    const token = tokenMatch?.[1] || '';

    try {
        const res = await fetch(`${INTERNAL_API_URL}/companies/${companyId}/feature-flags`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Cookie: cookies,
            },
        });

        if (!res.ok) {
            return NextResponse.json([], { status: 200 });
        }

        const flags = await res.json();
        return NextResponse.json(flags);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
