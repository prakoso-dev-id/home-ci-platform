import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://deploy-engine:4000';
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || '';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = '/' + params.path.join('/');
    const search = request.nextUrl.search;

    try {
        const res = await fetch(`${ENGINE_URL}${path}${search}`, {
            headers: {
                Authorization: `Bearer ${DEPLOY_TOKEN}`,
            },
            cache: 'no-store',
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Failed to connect to Deploy Engine' },
            { status: 502 }
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
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Failed to connect to Deploy Engine' },
            { status: 502 }
        );
    }
}
