import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from './config';

/**
 * Auth hook — checks Bearer token on mutating routes.
 * GET requests are allowed without authentication for dashboard polling.
 */
export async function authHook(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Allow GET requests without auth (read-only dashboard access)
    if (request.method === 'GET') {
        return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ success: false, error: 'Missing or invalid authorization header' });
        return;
    }

    const token = authHeader.slice(7);

    if (token !== env.DEPLOY_TOKEN) {
        reply.code(403).send({ success: false, error: 'Invalid token' });
        return;
    }
}
