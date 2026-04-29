import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

export async function POST(request: Request) {
    const body = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/supplier-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
