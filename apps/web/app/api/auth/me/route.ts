import { NextResponse } from 'next/server';

const API_BASE = 'http://127.0.0.1:3001';

export async function GET(request: Request) {
    try {
        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('GET /auth/me error:', error);
        return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
    }
}
