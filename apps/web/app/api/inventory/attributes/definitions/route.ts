import { cookies } from 'next/headers';

export async function GET() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    // Extract user_id from cookies for x-user-id header
    const userIdCookie = allCookies.find((c: any) => c.name === 'user_id');
    const userId = userIdCookie?.value || '';

    const response = await fetch(`${API_URL}/inventory/attributes/definitions`, {
        headers: {
            'Cookie': cookieHeader,
            'x-user-id': userId,
        },
    });

    if (!response.ok) {
        // Return empty array instead of error to prevent the "Loading attributes..." state
        console.error('Failed to fetch attribute definitions:', response.status, response.statusText);
        return Response.json([]);
    }

    const data = await response.json();
    return Response.json(data);
}
