import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isAdminUser(request: NextRequest): boolean {
    const raw = request.cookies.get('user_data')?.value;
    if (!raw) return false;
    try {
        const userData = JSON.parse(decodeURIComponent(raw));
        const permissions: string[] = userData.permissions ?? [];
        return permissions.some(p => p === 'ALL:MANAGE' || p === '*:MANAGE');
    } catch {
        return false;
    }
}

export function proxy(request: NextRequest) {
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

    // Admin-only guard: /admin/** requires ALL:MANAGE permission
    if (pathname.startsWith('/admin')) {
        if (!isAdminUser(request)) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
