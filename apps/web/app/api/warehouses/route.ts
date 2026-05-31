import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = `${API_BASE_URL}/warehouses`;
    console.log(`[NextAPI] Fetching warehouses from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
        });

        console.log(`[NextAPI] Response status: ${response.status}`);
        const text = await response.text();
        console.log(`[NextAPI] Response text preview: ${text.substring(0, 100)}`);

        if (!response.ok) {
            console.error(`[NextAPI] Backend failed with status ${response.status}`);
            return NextResponse.json({ error: `Backend error: ${response.status}`, details: text }, { status: response.status });
        }

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data, { status: response.status });
        } catch (e) {
            console.error('[NextAPI] Failed to parse JSON:', e);
            return NextResponse.json({ error: 'Invalid JSON from backend', details: text }, { status: 500 });
        }
    } catch (e) {
        console.error('[NextAPI] Fetch error:', e);
        return NextResponse.json({ error: 'Fetch failed', details: String(e) }, { status: 500 });
    }
}
