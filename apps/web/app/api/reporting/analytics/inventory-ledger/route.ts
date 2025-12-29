import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.toString();
        const response = await fetch(`${API_URL}/reporting/inventory-ledger?${query}`, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || '',
            },
        });
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch inventory ledger' }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Inventory ledger API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
