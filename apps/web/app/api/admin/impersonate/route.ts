import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.API_URL || 'http://127.0.0.1:3001';

export async function POST(request: NextRequest) {
    const { companyId } = await request.json();
    if (!companyId) {
        return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    // Read the current admin token from the httpOnly cookie
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('token')?.value;
    if (!adminToken) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call the backend impersonation endpoint with admin credentials
    const backendRes = await fetch(`${BACKEND}/companies/${companyId}/impersonate`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!backendRes.ok) {
        const text = await backendRes.text();
        return NextResponse.json({ error: text || 'Impersonation failed' }, { status: backendRes.status });
    }

    const { token: impersonationToken, companyId: cid, companyName } = await backendRes.json();

    const response = NextResponse.json({ success: true, companyId: cid, companyName });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = { path: '/', secure: isProd, maxAge: 60 * 15 }; // 15 min

    // Save original admin token so we can restore it later
    response.cookies.set('orig_token', adminToken, { ...cookieOpts, httpOnly: true });
    // Replace current session token with the impersonation token
    response.cookies.set('token', impersonationToken, { ...cookieOpts, httpOnly: true });
    // Non-httpOnly flag for client-side banner rendering
    response.cookies.set('impersonating', JSON.stringify({ companyId: cid, companyName }), {
        ...cookieOpts,
        httpOnly: false,
    });

    return response;
}
