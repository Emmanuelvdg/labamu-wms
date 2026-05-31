
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: warehouseId } = await params;
        const cookieHeader = request.headers.get('cookie') || '';
        const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || request.headers.get('x-user-id') || '';
        // Call the NestJS backend API
        const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/warehouses/${warehouseId}/zones`, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch zones' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching zones:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
