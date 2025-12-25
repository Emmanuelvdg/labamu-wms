import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Call Backend API
        const apiResponse = await fetch('http://127.0.0.1:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!apiResponse.ok) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = await apiResponse.json();

        const response = NextResponse.json({ success: true, user });

        // Set auth cookie
        response.cookies.set('auth', 'true', {
            path: '/',
            httpOnly: true,
            secure: false, // Force false for localhost
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Set user_id cookie for API requests
        response.cookies.set('user_id', user.id, {
            path: '/',
            httpOnly: false, // Allow client JS to read
            secure: false,
            maxAge: 60 * 60 * 24 * 7,
        });

        // Set user_data cookie with full user object including roles and permissions
        // This is used by usePermission hook for frontend permission checks
        response.cookies.set('user_data', JSON.stringify(user), {
            path: '/',
            httpOnly: false, // Allow client JS to read for permission checks
            secure: false,
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
