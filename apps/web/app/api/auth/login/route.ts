import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;


        const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001';

        // Call Backend API
        const apiResponse = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!apiResponse.ok) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = await apiResponse.json();

        const response = NextResponse.json({ success: true, user });

        const isProd = process.env.NODE_ENV === 'production';

        // Set auth cookie
        response.cookies.set('auth', 'true', {
            path: '/',
            httpOnly: true,
            secure: isProd,
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Set user_id cookie for API requests
        response.cookies.set('user_id', user.id, {
            path: '/',
            httpOnly: false, // Allow client JS to read
            secure: isProd,
            maxAge: 60 * 60 * 24 * 7,
        });

        // Set localized user_data cookie with minimal claims
        response.cookies.set('user_data', JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            permissions: user.roles?.flatMap((r: any) => r.permissions?.map((p: any) => p.name)) || []
        }), {
            path: '/',
            httpOnly: false, // Allow client JS to read for permission checks
            secure: isProd,
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
