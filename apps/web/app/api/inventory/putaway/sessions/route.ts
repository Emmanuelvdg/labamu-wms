import { NextResponse } from 'next/server';

const API_BASE = 'http://127.0.0.1:3001';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Get user ID from cookie
        const cookieHeader = request.headers.get('cookie') || '';
        const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        const response = await fetch(`${API_BASE}/inventory/putaway/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('POST putaway sessions error:', error);
        return NextResponse.json({ error: 'Failed to create putaway session' }, { status: 500 });
    }
}
