import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

export async function POST(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    const res = await fetch(`${INTERNAL_API_URL}/currencies/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
