import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as deploymentService from '../services/deployment.service';
import { getProject } from '../config';

const deployBodySchema = z.object({
    project: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Project name must be alphanumeric with hyphens/underscores'),
});

export async function deployRoutes(app: FastifyInstance): Promise<void> {
    // POST /deploy
    app.post('/deploy', async (request, reply) => {
        const parsed = deployBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({
                success: false,
                error: parsed.error.issues.map((i) => i.message).join(', '),
            });
        }

        const { project } = parsed.data;
        const projectConfig = getProject(project);
        if (!projectConfig) {
            return reply.code(404).send({
                success: false,
                error: `Project "${project}" not found in configuration`,
            });
        }

        // Return immediately, deployment runs async
        reply.code(202).send({
            success: true,
            data: { message: `Deployment of "${project}" started`, project },
        });

        // Fire and forget — result is persisted in DB
        deploymentService.deploy(project).catch((err) => {
            app.log.error({ err, project }, 'Deployment failed');
        });
    });

    // POST /destroy
    app.post('/destroy', async (request, reply) => {
        const parsed = deployBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({
                success: false,
                error: parsed.error.issues.map((i) => i.message).join(', '),
            });
        }

        const { project } = parsed.data;
        const projectConfig = getProject(project);
        if (!projectConfig) {
            return reply.code(404).send({
                success: false,
                error: `Project "${project}" not found in configuration`,
            });
        }

        reply.code(202).send({
            success: true,
            data: { message: `Destroy of "${project}" started`, project },
        });

        deploymentService.destroy(project).catch((err) => {
            app.log.error({ err, project }, 'Destroy failed');
        });
    });
}
