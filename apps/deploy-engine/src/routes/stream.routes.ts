import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProject } from '../config';
import { deployEmitter, type DeployEvent } from '../services/deployment.service';

const projectParamSchema = z.object({
    project: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function streamRoutes(app: FastifyInstance): Promise<void> {
    // GET /stream/:project — SSE endpoint for live deploy logs
    app.get('/stream/:project', async (request, reply) => {
        const params = projectParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.code(400).send({ success: false, error: 'Invalid project name' });
        }

        const { project } = params.data;
        const config = getProject(project);
        if (!config) {
            return reply.code(404).send({ success: false, error: 'Project not found' });
        }

        // Set SSE headers
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no',
        });

        // Send initial connection event
        reply.raw.write(`data: ${JSON.stringify({ type: 'connected', project, message: 'Stream connected', timestamp: new Date().toISOString() })}\n\n`);

        // Listen for deploy events
        const handler = (event: DeployEvent) => {
            try {
                reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
            } catch {
                // Client disconnected
            }
        };

        deployEmitter.on(`deploy:${project}`, handler);

        // Send heartbeat every 15s to keep connection alive
        const heartbeat = setInterval(() => {
            try {
                reply.raw.write(': heartbeat\n\n');
            } catch {
                clearInterval(heartbeat);
            }
        }, 15000);

        // Cleanup on disconnect
        request.raw.on('close', () => {
            deployEmitter.off(`deploy:${project}`, handler);
            clearInterval(heartbeat);
        });

        // Keep the connection open — don't return
        await new Promise(() => { });
    });
}
