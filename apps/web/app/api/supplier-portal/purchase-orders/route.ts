import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

function supplierHeaders(request: Request) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)supplier_token=([^;]+)/);
    return { Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies };
}

export async function GET(request: Request) {
    const res = await fetch(`${INTERNAL_API_URL}/supplier-portal/purchase-orders`, { headers: supplierHeaders(request) });
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
