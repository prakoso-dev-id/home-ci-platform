import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAllProjects, getProject } from '../config';
import * as dockerService from '../services/docker.service';
import * as deploymentService from '../services/deployment.service';
import type { ProjectWithStatus } from '@home-ci/shared-types';

const tailSchema = z.object({
    tail: z.coerce.number().min(1).max(5000).default(100),
});

const projectParamSchema = z.object({
    project: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function statusRoutes(app: FastifyInstance): Promise<void> {
    // GET /projects — list all configured projects with status
    app.get('/projects', async (_request, reply) => {
        const projects = getAllProjects();
        const results: ProjectWithStatus[] = [];

        for (const project of projects) {
            try {
                const containers = await dockerService.getContainersByProject(project.name);
                const lastDeployment = deploymentService.getLatestDeployment(project.name);
                results.push({ ...project, containers, lastDeployment });
            } catch {
                results.push({ ...project, containers: [], lastDeployment: null });
            }
        }

        return reply.send({ success: true, data: results });
    });

    // GET /status — all project container statuses
    app.get('/status', async (_request, reply) => {
        const projects = getAllProjects();
        const statuses: Record<string, unknown> = {};

        for (const project of projects) {
            try {
                const containers = await dockerService.getContainersByProject(project.name);
                const stats = await Promise.all(
                    containers
                        .filter((c) => c.state === 'running')
                        .map((c) => dockerService.getContainerStats(c.id).catch(() => null))
                );
                statuses[project.name] = {
                    containers,
                    stats: stats.filter(Boolean),
                };
            } catch {
                statuses[project.name] = { containers: [], stats: [] };
            }
        }

        return reply.send({ success: true, data: statuses });
    });

    // GET /status/:project — single project status with stats
    app.get('/status/:project', async (request, reply) => {
        const params = projectParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.code(400).send({ success: false, error: 'Invalid project name' });
        }

        const { project } = params.data;
        const config = getProject(project);
        if (!config) {
            return reply.code(404).send({ success: false, error: 'Project not found' });
        }

        try {
            const containers = await dockerService.getContainersByProject(project);
            const stats = await Promise.all(
                containers
                    .filter((c) => c.state === 'running')
                    .map((c) => dockerService.getContainerStats(c.id).catch(() => null))
            );
            const lastDeployment = deploymentService.getLatestDeployment(project);

            return reply.send({
                success: true,
                data: { ...config, containers, stats: stats.filter(Boolean), lastDeployment },
            });
        } catch (err) {
            app.log.error({ err, project }, 'Failed to get status');
            return reply.code(500).send({ success: false, error: 'Failed to get status' });
        }
    });

    // GET /logs/:project — container logs
    app.get('/logs/:project', async (request, reply) => {
        const params = projectParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.code(400).send({ success: false, error: 'Invalid project name' });
        }
        const query = tailSchema.safeParse(request.query);
        const tail = query.success ? query.data.tail : 100;

        const { project } = params.data;
        const config = getProject(project);
        if (!config) {
            return reply.code(404).send({ success: false, error: 'Project not found' });
        }

        try {
            const containers = await dockerService.getContainersByProject(project);
            const logsMap: Record<string, string> = {};

            for (const container of containers) {
                try {
                    logsMap[container.name] = await dockerService.getContainerLogs(
                        container.id,
                        tail
                    );
                } catch {
                    logsMap[container.name] = '(logs unavailable)';
                }
            }

            return reply.send({ success: true, data: logsMap });
        } catch (err) {
            app.log.error({ err, project }, 'Failed to get logs');
            return reply.code(500).send({ success: false, error: 'Failed to get logs' });
        }
    });

    // GET /deployments/:project — deployment history
    app.get('/deployments/:project', async (request, reply) => {
        const params = projectParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.code(400).send({ success: false, error: 'Invalid project name' });
        }

        const { project } = params.data;
        const config = getProject(project);
        if (!config) {
            return reply.code(404).send({ success: false, error: 'Project not found' });
        }

        const query = tailSchema.safeParse(request.query);
        const limit = query.success ? query.data.tail : 20;

        const deployments = deploymentService.getDeploymentHistory(project, limit);
        return reply.send({ success: true, data: deployments });
    });
}
