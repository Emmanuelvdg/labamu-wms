import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function adminHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function GET(request: Request) {
    try {
        const res = await fetch(`${INTERNAL_API_URL}/feature-flags/available`, { headers: adminHeaders(request) });
        const data = await res.json().catch(() => []);
        return NextResponse.json(data, { status: res.ok ? 200 : res.status });
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
