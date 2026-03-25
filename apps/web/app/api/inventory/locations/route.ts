import { NextRequest, NextResponse } from 'next/server';
import { INTERNAL_API_URL } from '@/lib/api';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the x-user-id header from the client request
    const userId = request.headers.get('x-user-id') || '';

    const url = `${INTERNAL_API_URL}/inventory/locations${queryString ? `?${queryString}` : ''}`;

    try {
        const res = await fetch(url, {
            headers: {
                'x-user-id': userId,
            },
        });
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch locations' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const userId = request.headers.get('x-user-id') || '';

    try {
        const body = await request.json();

        const response = await fetch(`${INTERNAL_API_URL}/inventory/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorText;
            } catch (e) {
                // Use raw text if not JSON
            }
            return NextResponse.json(
                { error: 'Failed to create location', details: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating location:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
