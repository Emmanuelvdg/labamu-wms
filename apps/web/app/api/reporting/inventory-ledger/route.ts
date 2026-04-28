import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function backendHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return {
        Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`,
        Cookie: cookies,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const res = await fetch(
        `${INTERNAL_API_URL}/reporting/inventory-ledger${qs ? `?${qs}` : ''}`,
        { headers: backendHeaders(request) },
    );
    if (!res.ok) return NextResponse.json([], { status: res.status });
    const data = await res.json().catch(() => []);
    return NextResponse.json(data);
}
