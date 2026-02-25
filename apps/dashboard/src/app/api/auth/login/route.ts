import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'home-ci-default-secret-change-me';

// Force Node.js runtime for this route (supports crypto module)
export const runtime = 'nodejs';

function createSessionToken(): string {
    const day = Math.floor(Date.now() / 86400000);
    const payload = `${SESSION_SECRET}:${day}`;
    return createHash('sha256').update(payload).digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (username !== DASHBOARD_USER || password !== DASHBOARD_PASS) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const token = createSessionToken();
        const response = NextResponse.json({ success: true });

        response.cookies.set('session', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 86400,
        });

        return response;
    } catch {
        return NextResponse.json(
            { success: false, error: 'Bad request' },
            { status: 400 }
        );
    }
}
