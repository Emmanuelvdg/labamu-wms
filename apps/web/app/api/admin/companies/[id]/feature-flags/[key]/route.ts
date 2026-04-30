import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function adminHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
    const { id, key } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/companies/${id}/feature-flags/${key}`, {
        method: 'PUT',
        headers: adminHeaders(request),
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
