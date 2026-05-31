import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// PUT /api/warehouses/:id/areas/:areaId - Update a functional area
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; areaId: string }> }
) {
    const { id, areaId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookiesPut = cookieStore.getAll();
    const cookieHeaderPut = allCookiesPut.map((c: any) => `${c.name}=${c.value}`).join('; ');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        const response = await fetch(
            `${API_BASE_URL}/warehouses/${id}/areas/${areaId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookieHeaderPut,
                    'x-user-id': userId,
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to update area', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating area:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/warehouses/:id/areas/:areaId - Delete a functional area
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; areaId: string }> }
) {
    const { id, areaId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookiesDel = cookieStore.getAll();
    const cookieHeaderDel = allCookiesDel.map((c: any) => `${c.name}=${c.value}`).join('; ');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/warehouses/${id}/areas/${areaId}`,
            {
                method: 'DELETE',
                headers: {
                    'Cookie': cookieHeaderDel,
                    'x-user-id': userId,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: 'Failed to delete area', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error deleting area:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
