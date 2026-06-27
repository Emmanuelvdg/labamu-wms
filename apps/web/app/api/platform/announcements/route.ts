import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function adminHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function GET(_request: Request) {
    try {
        const res = await fetch(`${INTERNAL_API_URL}/platform/announcements`);
        const data = await res.json().catch(() => []);
        return NextResponse.json(data, { status: res.ok ? 200 : res.status });
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(`${INTERNAL_API_URL}/platform/announcements`, {
            method: 'POST',
            headers: adminHeaders(request),
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: 'Failed to create announcement' }, { status: 500 });
    }
}
