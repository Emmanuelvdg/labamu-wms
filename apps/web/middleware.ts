import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const auth = request.cookies.get('auth');
    const { pathname } = request.nextUrl;

    // Allow access to login page and public assets
    if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!auth) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
