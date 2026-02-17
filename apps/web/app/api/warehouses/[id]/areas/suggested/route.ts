import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// GET /api/warehouses/:id/areas/suggested - Get suggested areas for a warehouse
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const { id } = await params;

    console.log(`[API Proxy] GET /api/warehouses/${id}/areas/suggested - userId:`, userId);

    if (!userId) {
        console.error('[API Proxy] No user_id cookie found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const backendUrl = `${API_BASE_URL}/warehouses/${id}/areas/suggested`;
        console.log('[API Proxy] Fetching from backend:', backendUrl);
        const response = await fetch(backendUrl, {
            headers: {
                'x-user-id': userId,
            },
        });

        console.log('[API Proxy] Backend response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Proxy] Backend error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch suggested areas', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[API Proxy] Successfully fetched suggested areas:', data.length, 'items');
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Exception in suggested areas route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
