import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// GET /api/warehouses/:id/areas - Get all functional areas for a warehouse
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookiesGet = cookieStore.getAll();
    const cookieHeaderGet = allCookiesGet.map((c: any) => `${c.name}=${c.value}`).join('; ');
    const { id } = await params;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/warehouses/${id}/areas`, {
            headers: {
                'Cookie': cookieHeaderGet,
                'x-user-id': userId,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to fetch areas', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching areas:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/warehouses/:id/areas - Create a new functional area
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookiesPost = cookieStore.getAll();
    const cookieHeaderPost = allCookiesPost.map((c: any) => `${c.name}=${c.value}`).join('; ');
    const { id } = await params;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        const response = await fetch(`${API_BASE_URL}/warehouses/${id}/areas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeaderPost,
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to create area', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating area:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
