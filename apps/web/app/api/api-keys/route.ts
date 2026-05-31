import { NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

const API_BASE = INTERNAL_API_URL;

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || '';

        const response = await fetch(`${API_BASE}/api-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('POST api-keys error:', error);
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        // Get user ID from cookie
        const cookies = request.headers.get('cookie') || '';
        const userIdMatch = cookies.match(/user_id=([^;]+)/);
        const userId = userIdMatch?.[1] || '';

        const response = await fetch(`${API_BASE}/api-keys`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'x-user-id': userId,
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('GET api-keys error:', error);
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }
}
