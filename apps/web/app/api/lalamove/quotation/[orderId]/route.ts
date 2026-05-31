import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ orderId: string }> }
) {
    const params = await props.params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    const response = await fetch(
        `${API_BASE_URL}/lalamove/quotation/${params.orderId}?warehouseId=${warehouseId}`,
        {
            headers: {
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
        }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
