import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value || '';

    try {
        const response = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
            headers: {
                'x-user-id': userId,
            },
        });

        if (!response.ok) {
            console.error(`[NextAPI] /inventory/warehouses failed: ${response.status}`);
            return NextResponse.json([], { status: 200 }); // Return empty array on error
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[NextAPI] /inventory/warehouses error:', error);
        return NextResponse.json([], { status: 200 }); // Return empty array on error
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value || '';

    try {
        const body = await request.json();
        const response = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[NextAPI] POST /inventory/warehouses error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
