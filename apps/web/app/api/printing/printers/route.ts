import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function backendHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`,
        Cookie: cookies,
    };
}

export async function GET(request: Request) {
    const res = await fetch(`${INTERNAL_API_URL}/printing/printers`, { headers: backendHeaders(request) });
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function POST(request: Request) {
    const body = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/printing/printers`, {
        method: 'POST',
        headers: backendHeaders(request),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
