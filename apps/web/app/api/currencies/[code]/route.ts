import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function backendHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL_API_URL}/currencies/${code}`, { method: 'PUT', headers: backendHeaders(request), body: JSON.stringify(body) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const res = await fetch(`${INTERNAL_API_URL}/currencies/${code}`, { method: 'DELETE', headers: backendHeaders(request) });
    return NextResponse.json({ success: res.ok }, { status: res.ok ? 200 : res.status });
}
