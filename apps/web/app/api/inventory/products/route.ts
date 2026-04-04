import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

async function getUserId() {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const userIdCookie = allCookies.find((c: any) => c.name === 'user_id');
    return {
        userId: userIdCookie?.value || '',
        cookieHeader: allCookies.map((c: any) => `${c.name}=${c.value}`).join('; '),
    };
}

export async function GET(request: Request) {
    const { userId, cookieHeader } = await getUserId();

    // Get query params from request URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(
        `${API_URL}/inventory/products${queryString ? `?${queryString}` : ''}`,
        {
            headers: {
                'Cookie': cookieHeader,
                'x-user-id': userId,
            },
        }
    );

    if (!response.ok) {
        return Response.json(
            { error: 'Failed to fetch products' },
            { status: response.status }
        );
    }

    const data = await response.json();
    return Response.json(data);
}

export async function POST(request: Request) {
    const { userId } = await getUserId();

    try {
        const body = await request.json();

        const response = await fetch(`${API_URL}/inventory/products`, {
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
            return Response.json(
                { error: 'Failed to create product', message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('Error creating product:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
