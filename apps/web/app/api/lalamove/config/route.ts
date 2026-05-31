import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/lalamove/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'x-user-id': userId,
        },
        body: JSON.stringify(body),
    });

    const text = await response.text();
    try {
        const data = JSON.parse(text);
        return NextResponse.json(data, { status: response.status });
    } catch (e) {
        console.error('Failed to parse backend response:', text);
        return NextResponse.json({ error: 'Backend error', details: text }, { status: 500 });
    }
}
