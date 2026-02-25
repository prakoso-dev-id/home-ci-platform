import { getProject } from '../config';
import * as dockerService from './docker.service';
import * as db from './database.service';
import type { Deployment } from '@home-ci/shared-types';

// ─── Per-project deployment lock ─────────────────────────────

const locks = new Map<string, Promise<void>>();

async function withLock<T>(project: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing lock on this project
    const existing = locks.get(project);
    if (existing) {
        await existing;
    }

    let resolve: () => void;
    const lockPromise = new Promise<void>((r) => {
        resolve = r;
    });
    locks.set(project, lockPromise);

    try {
        return await fn();
    } finally {
        resolve!();
        locks.delete(project);
    }
}

// ─── Deploy ──────────────────────────────────────────────────

export async function deploy(projectName: string): Promise<Deployment> {
    const project = getProject(projectName);
    if (!project) {
        throw new Error(`Unknown project: ${projectName}`);
    }

    return withLock(projectName, async () => {
        const deploymentId = db.insertDeployment(projectName);
        const logs: string[] = [];

        try {
            logs.push('=== Pulling images ===');
            const pullOutput = await dockerService.composePull(
                project.composePath,
                project.composeFile
            );
            logs.push(pullOutput);

            logs.push('\n=== Starting containers ===');
            const upOutput = await dockerService.composeUp(
                project.composePath,
                project.composeFile
            );
            logs.push(upOutput);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'success', logText);

            return db.getDeploymentsByProject(projectName, 1)[0];
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            logs.push(`\n=== ERROR ===\n${errorMsg}`);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'failed', logText);

            return db.getDeploymentsByProject(projectName, 1)[0];
        }
    });
}

// ─── Destroy ─────────────────────────────────────────────────

export async function destroy(projectName: string): Promise<Deployment> {
    const project = getProject(projectName);
    if (!project) {
        throw new Error(`Unknown project: ${projectName}`);
    }

    return withLock(projectName, async () => {
        const deploymentId = db.insertDeployment(projectName);
        const logs: string[] = [];

        try {
            logs.push('=== Stopping and removing containers ===');
            const downOutput = await dockerService.composeDown(
                project.composePath,
                project.composeFile
            );
            logs.push(downOutput);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'success', logText);

            return db.getDeploymentsByProject(projectName, 1)[0];
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            logs.push(`\n=== ERROR ===\n${errorMsg}`);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'failed', logText);

            return db.getDeploymentsByProject(projectName, 1)[0];
        }
    });
}

// ─── Query ───────────────────────────────────────────────────

export function getDeploymentHistory(
    projectName: string,
    limit: number = 20
): Deployment[] {
    return db.getDeploymentsByProject(projectName, limit);
}

export function getLatestDeployment(
    projectName: string
): Deployment | null {
    return db.getLatestDeployment(projectName);
}
