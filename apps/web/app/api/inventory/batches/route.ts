import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'http://127.0.0.1:3001';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const cookieHeader = req.headers.get('cookie') || '';
    const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
    const userId = userIdMatch?.[1] || req.headers.get('x-user-id') || '';

    let url = `${API_URL}/inventory/batches`;
    if (warehouseId) {
        url += `?warehouseId=${warehouseId}`;
    }

    try {
        const res = await fetch(url, {
            headers: {
                'Cookie': cookieHeader,
                ...(userId ? { 'x-user-id': userId } : {}),
            },
        });

        if (!res.ok) {
            const error = await res.text();
            return NextResponse.json({ error }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
