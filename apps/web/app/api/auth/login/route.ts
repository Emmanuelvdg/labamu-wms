import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001';

        const apiResponse = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!apiResponse.ok) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Backend now returns { token, user }
        const result = await apiResponse.json();
        const { token, user } = result;

        // Flatten backwards-compat: some callers expect a user at top level
        const response = NextResponse.json({ success: true, token, user });

        const isProd = process.env.NODE_ENV === 'production';
        const cookieOpts = {
            path: '/',
            secure: isProd,
            maxAge: 60 * 60 * 24 * 7, // 7 days
        };

        // ── Cookies ──────────────────────────────────────────────────────────
        // 1. Gate cookie — Next.js middleware uses this to allow access
        response.cookies.set('auth', 'true', { ...cookieOpts, httpOnly: true });

        // 2. JWT — httpOnly so JS can't steal it; the NestJS JwtStrategy reads
        //    it from the cookie extractor, and fetchWithRetry sends it as Bearer.
        if (token) {
            response.cookies.set('token', token, { ...cookieOpts, httpOnly: true });
        }

        // 3. user_id — kept for E2E test backward compat (x-user-id header)
        response.cookies.set('user_id', user.id, {
            ...cookieOpts,
            httpOnly: false, // must be readable by client JS
        });

        // 4. company context — client-side reads for UI rendering
        if (user.companyId) {
            response.cookies.set('company_id', user.companyId, {
                ...cookieOpts,
                httpOnly: false,
            });
        }

        // 5. user_data — minimal claims for client-side permission checks
        response.cookies.set('user_data', JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            companyId: user.companyId ?? null,
            companySlug: user.company?.slug ?? null,
            permissions: user.roles?.flatMap(
                (r: any) => r.permissions?.map((p: any) => `${p.resource}:${p.action}`) ?? []
            ) ?? [],
        }), { ...cookieOpts, httpOnly: false });

        return response;
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
        }, { status: 500 });
    }
}
