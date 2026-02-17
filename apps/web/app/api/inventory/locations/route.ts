import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    // Forward the x-user-id header from the client request
    const userId = request.headers.get('x-user-id') || '';

    const url = warehouseId
        ? `${API_URL}/inventory/locations?warehouseId=${warehouseId}`
        : `${API_URL}/inventory/locations`;

    try {
        const res = await fetch(url, {
            headers: {
                'x-user-id': userId,
            },
        });
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch locations' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
