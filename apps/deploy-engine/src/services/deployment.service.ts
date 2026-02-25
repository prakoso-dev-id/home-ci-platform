import { getProject } from '../config';
import * as dockerService from './docker.service';
import * as db from './database.service';
import { EventEmitter } from 'events';
import type { Deployment } from '@home-ci/shared-types';

// ─── Per-project deployment lock ─────────────────────────────

const locks = new Map<string, Promise<void>>();

async function withLock<T>(project: string, fn: () => Promise<T>): Promise<T> {
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

// ─── SSE Event Bus ───────────────────────────────────────────

export const deployEmitter = new EventEmitter();
deployEmitter.setMaxListeners(50);

export type DeployEvent = {
    type: 'log' | 'status' | 'complete';
    project: string;
    message: string;
    status?: 'running' | 'success' | 'failed';
    timestamp: string;
};

function emit(project: string, type: DeployEvent['type'], message: string, status?: DeployEvent['status']): void {
    const event: DeployEvent = {
        type,
        project,
        message,
        status,
        timestamp: new Date().toISOString(),
    };
    deployEmitter.emit(`deploy:${project}`, event);
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

        emit(projectName, 'status', 'Deployment started', 'running');

        try {
            emit(projectName, 'log', '=== Pulling images ===');
            logs.push('=== Pulling images ===');
            const pullOutput = await dockerService.composePull(
                project.composePath,
                project.composeFile
            );
            logs.push(pullOutput);
            emit(projectName, 'log', pullOutput);

            emit(projectName, 'log', '=== Starting containers ===');
            logs.push('\n=== Starting containers ===');
            const upOutput = await dockerService.composeUp(
                project.composePath,
                project.composeFile
            );
            logs.push(upOutput);
            emit(projectName, 'log', upOutput);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'success', logText);

            emit(projectName, 'status', 'Deployment successful', 'success');
            emit(projectName, 'complete', 'Deployment completed successfully', 'success');

            return db.getDeploymentsByProject(projectName, 1)[0];
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            logs.push(`\n=== ERROR ===\n${errorMsg}`);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'failed', logText);

            emit(projectName, 'status', `Deployment failed: ${errorMsg}`, 'failed');
            emit(projectName, 'complete', errorMsg, 'failed');

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

        emit(projectName, 'status', 'Destroy started', 'running');

        try {
            emit(projectName, 'log', '=== Stopping and removing containers ===');
            logs.push('=== Stopping and removing containers ===');
            const downOutput = await dockerService.composeDown(
                project.composePath,
                project.composeFile
            );
            logs.push(downOutput);
            emit(projectName, 'log', downOutput);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'success', logText);

            emit(projectName, 'status', 'Destroy successful', 'success');
            emit(projectName, 'complete', 'Destroy completed successfully', 'success');

            return db.getDeploymentsByProject(projectName, 1)[0];
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : 'Unknown error';
            logs.push(`\n=== ERROR ===\n${errorMsg}`);

            const logText = logs.join('\n');
            db.updateDeployment(deploymentId, 'failed', logText);

            emit(projectName, 'status', `Destroy failed: ${errorMsg}`, 'failed');
            emit(projectName, 'complete', errorMsg, 'failed');

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
