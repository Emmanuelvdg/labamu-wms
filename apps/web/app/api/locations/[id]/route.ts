
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Forward cookie and x-user-id from the client request
        const cookieHeader = request.headers.get('cookie') || '';
        const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        // Backend uses PUT for updates on /inventory/locations/:id
        const response = await fetch(`${API_BASE}/inventory/locations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to update location', detail: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating location:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Forward cookie and x-user-id from the client request
        const cookieHeader = request.headers.get('cookie') || '';
        const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';

        // Backend uses DELETE on /inventory/locations/:id
        const response = await fetch(`${API_BASE}/inventory/locations/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to delete location' },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting location:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
