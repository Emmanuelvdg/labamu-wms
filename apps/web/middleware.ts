import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const auth = request.cookies.get('auth');
    const { pathname } = request.nextUrl;
    console.log(`[Middleware] Path: ${pathname}`);
    console.log(`[Middleware] All Cookies: ${request.cookies.getAll().map(c => `${c.name}=${c.value}`).join(', ')}`);
    console.log(`[Middleware] Auth Cookie: ${auth?.value}`);

    // Allow access to login page and public assets
    if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!auth) {
        console.log('[Middleware] Redirecting to /login');
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
