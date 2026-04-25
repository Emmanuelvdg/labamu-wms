import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
    const cookieStore = await cookies();
    const origToken = cookieStore.get('orig_token')?.value;

    if (!origToken) {
        // Nothing to restore — just redirect back to admin
        return NextResponse.json({ redirect: '/admin' });
    }

    const response = NextResponse.json({ redirect: '/admin' });
    const isProd = process.env.NODE_ENV === 'production';
    const longOpts = { path: '/', secure: isProd, maxAge: 60 * 60 * 24 * 7 }; // 7 days

    // Restore original admin token
    response.cookies.set('token', origToken, { ...longOpts, httpOnly: true });
    // Clear impersonation cookies
    response.cookies.delete('orig_token');
    response.cookies.set('impersonating', '', { path: '/', maxAge: 0 });

    return response;
}
