import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'home-ci-default-secret-change-me';

function isValidSession(token: string): boolean {
    const today = Math.floor(Date.now() / 86400000);
    // Check today and yesterday (handles day boundary)
    for (let day = today; day >= today - 1; day--) {
        const payload = `${DASHBOARD_USER}:${SESSION_SECRET}:${day}`;
        const expected = createHash('sha256').update(payload).digest('hex');
        if (token === expected) return true;
    }
    return false;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow login page and auth API routes
    if (
        pathname === '/login' ||
        pathname.startsWith('/api/auth/') ||
        pathname.startsWith('/_next/') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    const session = request.cookies.get('session')?.value;

    if (!session || !isValidSession(session)) {
        // API requests get 401, page requests redirect to login
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
