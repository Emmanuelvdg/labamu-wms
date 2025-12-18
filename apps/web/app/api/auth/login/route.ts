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

        // Set cookie
        response.cookies.set('auth', 'true', {
            path: '/',
            httpOnly: true,
            secure: false, // Force false for localhost
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Also set user_id cookie for easier access if needed, but we'll return it too
        response.cookies.set('user_id', user.id, {
            path: '/',
            httpOnly: false, // Allow client JS to read if needed
            secure: false,
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
