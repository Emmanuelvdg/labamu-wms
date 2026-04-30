import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function backendHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/replenishment/seasonality/${id}/periods`, { method: 'POST', headers: backendHeaders(request), body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
