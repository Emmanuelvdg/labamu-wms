import { NextResponse } from 'next/server';

const API_BASE = 'http://127.0.0.1:3001';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { id } = params;

        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        const response = await fetch(`${API_BASE}/inventory/putaway-rules/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('PUT putaway-rule error:', error);
        return NextResponse.json({ error: 'Failed to update putaway rule' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        const response = await fetch(`${API_BASE}/inventory/putaway-rules/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
        });

        if (response.status === 204 || response.status === 200) {
            return new NextResponse(null, { status: 204 });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('DELETE putaway-rule error:', error);
        return NextResponse.json({ error: 'Failed to delete putaway rule' }, { status: 500 });
    }
}
