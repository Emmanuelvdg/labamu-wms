import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    const res = await fetch(`${INTERNAL_API_URL}/printing/printers/${params.id}/default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenMatch?.[1] ?? ''}`, Cookie: cookies },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
