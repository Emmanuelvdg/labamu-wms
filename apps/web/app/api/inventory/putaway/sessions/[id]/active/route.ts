import { NextResponse } from 'next/server';

const API_BASE = 'http://127.0.0.1:3001';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || '';

        const response = await fetch(`${API_BASE}/inventory/putaway/sessions/${id}/active`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'x-user-id': userId,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('GET active putaway session error:', error);
        return NextResponse.json({ error: 'Failed to get active session' }, { status: 500 });
    }
}
