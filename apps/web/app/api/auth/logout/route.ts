import { NextResponse } from 'next/server';

const AUTH_COOKIES = ['auth', 'token', 'orig_token', 'user_id', 'company_id', 'user_data', 'impersonating'];

export async function POST() {
    const response = NextResponse.json({ success: true });
    for (const name of AUTH_COOKIES) {
        response.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
    return response;
}
