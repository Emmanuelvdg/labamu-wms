import { NextResponse } from 'next/server';

const API_BASE = 'http://127.0.0.1:3001';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const body = await request.json();
        const { taskId } = await params;

        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || '';

        const response = await fetch(`${API_BASE}/inventory/putaway/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('PATCH putaway task error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}
