import { NextRequest } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://deploy-engine:4000';
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || '';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = '/' + params.path.join('/');
    const search = request.nextUrl.search;

    // SSE passthrough for /stream/* endpoints
    if (path.startsWith('/stream/')) {
        try {
            const res = await fetch(`${ENGINE_URL}${path}${search}`, {
                headers: {
                    Authorization: `Bearer ${DEPLOY_TOKEN}`,
                    Accept: 'text/event-stream',
                },
                cache: 'no-store',
            });

            if (!res.body) {
                return new Response(
                    JSON.stringify({ success: false, error: 'No stream body' }),
                    { status: 502, headers: { 'Content-Type': 'application/json' } }
                );
            }

            return new Response(res.body, {
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                },
            });
        } catch {
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to connect to Deploy Engine' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    // Standard JSON proxy
    try {
        const res = await fetch(`${ENGINE_URL}${path}${search}`, {
            headers: {
                Authorization: `Bearer ${DEPLOY_TOKEN}`,
            },
            cache: 'no-store',
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch {
        return new Response(
            JSON.stringify({ success: false, error: 'Failed to connect to Deploy Engine' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = '/' + params.path.join('/');
    let body: string | undefined;

    try {
        body = await request.text();
    } catch {
        body = undefined;
    }

    try {
        const res = await fetch(`${ENGINE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${DEPLOY_TOKEN}`,
            },
            body,
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch {
        return new Response(
            JSON.stringify({ success: false, error: 'Failed to connect to Deploy Engine' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
