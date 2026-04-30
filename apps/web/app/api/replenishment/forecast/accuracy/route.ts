import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function backendHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const res = await fetch(`${INTERNAL_API_URL}/replenishment/forecast/accuracy?${qs}`, { headers: backendHeaders(request) });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
