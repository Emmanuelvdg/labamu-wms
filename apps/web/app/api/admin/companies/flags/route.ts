import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function adminHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function GET(request: Request) {
    const companyId = new URL(request.url).searchParams.get('companyId') ?? '';
    const res = await fetch(`${INTERNAL_API_URL}/companies/${companyId}/feature-flags`, { headers: adminHeaders(request) });
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function PUT(request: Request) {
    const { companyId, key, enabled, notes } = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/companies/${companyId}/feature-flags/${key}`, {
        method: 'PUT',
        headers: adminHeaders(request),
        body: JSON.stringify({ enabled, notes }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
