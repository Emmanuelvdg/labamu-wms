import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
    const { id } = await params;

    console.log(`[API Proxy] GET /api/warehouses/${id} - userId:`, userId);

    if (!userId) {
        console.error('[API Proxy] No user_id cookie found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const backendUrl = `${API_BASE_URL}/warehouses/${id}`;
        console.log('[API Proxy] Fetching from backend:', backendUrl);

        const response = await fetch(backendUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
        });

        console.log('[API Proxy] Backend response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Proxy] Backend error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch warehouse' },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[API Proxy] Successfully fetched warehouse:', data.id);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Exception in warehouse route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
