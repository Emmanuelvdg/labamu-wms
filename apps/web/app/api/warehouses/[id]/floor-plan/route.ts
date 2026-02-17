import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// PATCH /api/warehouses/:id/floor-plan - Update floor plan settings
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const { id } = await params;

    console.log(`[API Proxy] PATCH /api/warehouses/${id}/floor-plan - userId:`, userId);

    if (!userId) {
        console.error('[API Proxy] No user_id cookie found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        console.log('[API Proxy] Request body:', body);

        const backendUrl = `${API_BASE_URL}/warehouses/${id}/floor-plan`;
        console.log('[API Proxy] Fetching from backend:', backendUrl);
        const response = await fetch(backendUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        console.log('[API Proxy] Backend response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Proxy] Backend error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to update floor plan', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[API Proxy] Successfully updated floor plan:', data);
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API Proxy] Exception in floor-plan route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
