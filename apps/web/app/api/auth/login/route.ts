import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (email === 'admin@labamu.co.id' && password === 'admin') {
            const response = NextResponse.json({ success: true });

            // Set cookie
            response.cookies.set('auth', 'true', {
                path: '/',
                httpOnly: true,
                secure: false, // Force false for localhost
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
