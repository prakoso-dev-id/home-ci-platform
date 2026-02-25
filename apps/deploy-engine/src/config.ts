import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';
import type { ProjectsConfig } from '@home-ci/shared-types';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// ─── Environment ─────────────────────────────────────────────

const envSchema = z.object({
    DEPLOY_TOKEN: z.string().min(1, 'DEPLOY_TOKEN is required'),
    DEPLOY_ENGINE_PORT: z.coerce.number().default(4000),
    DEPLOY_ENGINE_HOST: z.string().default('127.0.0.1'),
    DATABASE_PATH: z.string().default(resolve(__dirname, '../../data/deployments.db')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;

// ─── Projects Config ─────────────────────────────────────────

const projectConfigSchema = z.object({
    projects: z.record(
        z.string(),
        z.object({
            name: z.string(),
            composePath: z.string(),
            composeFile: z.string().default('docker-compose.yml'),
            description: z.string().default(''),
        })
    ),
});

function loadProjectsConfig(): ProjectsConfig {
    const configPath = resolve(__dirname, '../config/projects.json');
    try {
        const raw = readFileSync(configPath, 'utf-8');
        const data = JSON.parse(raw);
        return projectConfigSchema.parse(data);
    } catch (err) {
        console.error(`❌ Failed to load projects config from ${configPath}:`, err);
        process.exit(1);
    }
}

export const projectsConfig = loadProjectsConfig();

export function getProject(name: string) {
    return projectsConfig.projects[name] ?? null;
}

export function getAllProjects() {
    return Object.values(projectsConfig.projects);
}
