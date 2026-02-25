import { NextRequest, NextResponse } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET || 'home-ci-default-secret-change-me';

async function hashToken(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function middleware(request: NextRequest) {
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

    if (!session) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Validate token against today and yesterday
    const today = Math.floor(Date.now() / 86400000);
    for (let day = today; day >= today - 1; day--) {
        const expected = await hashToken(`${SESSION_SECRET}:${day}`);
        if (session === expected) {
            return NextResponse.next();
        }
    }

    // Invalid session
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }
    return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
