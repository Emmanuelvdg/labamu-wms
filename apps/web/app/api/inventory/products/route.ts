import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    // Extract user_id from cookies for x-user-id header
    const userIdCookie = allCookies.find((c: any) => c.name === 'user_id');
    const userId = userIdCookie?.value || '';

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
