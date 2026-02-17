import { NextResponse } from 'next/server';
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
