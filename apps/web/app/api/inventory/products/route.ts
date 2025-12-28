import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Get query params from request URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(
        `${API_URL}/inventory/products${queryString ? `?${queryString}` : ''}`,
        {
            headers: {
                'Cookie': cookieHeader,
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
