import Dockerode from 'dockerode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ContainerStatus, ContainerStats } from '@home-ci/shared-types';

const execFileAsync = promisify(execFile);
const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

// ─── Compose Operations (via child_process.execFile — no shell injection) ────

async function composeExec(
    composePath: string,
    composeFile: string,
    args: string[]
): Promise<string> {
    const { stdout, stderr } = await execFileAsync(
        'docker',
        ['compose', '-f', composeFile, ...args],
        {
            cwd: composePath,
            timeout: 300_000, // 5 min timeout
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
    );
    return `${stdout}\n${stderr}`.trim();
}

// ─── Git Operations ──────────────────────────────────────────

export async function gitPull(composePath: string): Promise<string> {
    const { stdout, stderr } = await execFileAsync(
        'git',
        ['pull'],
        {
            cwd: composePath,
            timeout: 120_000, // 2 min timeout
            maxBuffer: 10 * 1024 * 1024,
        }
    );
    return `${stdout}\n${stderr}`.trim();
}

export async function composePull(
    composePath: string,
    composeFile: string
): Promise<string> {
    return composeExec(composePath, composeFile, ['pull']);
}

export async function composeUp(
    composePath: string,
    composeFile: string
): Promise<string> {
    return composeExec(composePath, composeFile, [
        'up',
        '-d',
        '--build',
        '--remove-orphans',
    ]);
}

export async function composeDown(
    composePath: string,
    composeFile: string
): Promise<string> {
    return composeExec(composePath, composeFile, [
        'down',
        '--remove-orphans',
    ]);
}

// ─── Docker Read Operations (via Dockerode) ──────────────────

export async function getContainersByProject(
    projectName: string
): Promise<ContainerStatus[]> {
    const containers = await docker.listContainers({
        all: true,
        filters: {
            label: [`com.docker.compose.project=${projectName}`],
        },
    });

    return containers.map((c) => ({
        id: c.Id.slice(0, 12),
        name: c.Names[0]?.replace(/^\//, '') ?? 'unknown',
        image: c.Image,
        state: c.State,
        status: c.Status,
        ports: c.Ports.map(
            (p) =>
                p.PublicPort
                    ? `${p.IP ?? '0.0.0.0'}:${p.PublicPort}->${p.PrivatePort}/${p.Type}`
                    : `${p.PrivatePort}/${p.Type}`
        ),
        createdAt: new Date(c.Created * 1000).toISOString(),
    }));
}

export async function getContainerStats(
    containerId: string
): Promise<ContainerStats> {
    const container = docker.getContainer(containerId);
    // Dockerode types are incomplete — cast to any for runtime fields
    const stats: any = await container.stats({ stream: false });

    // Calculate CPU percentage
    const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent =
        systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    // Calculate memory
    const memUsage = stats.memory_stats.usage ?? 0;
    const memLimit = stats.memory_stats.limit ?? 1;

    return {
        containerId: containerId.slice(0, 12),
        name: stats.name?.replace(/^\//, '') ?? 'unknown',
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsageMB: Math.round((memUsage / 1024 / 1024) * 100) / 100,
        memoryLimitMB: Math.round((memLimit / 1024 / 1024) * 100) / 100,
        memoryPercent: Math.round((memUsage / memLimit) * 100 * 100) / 100,
    };
}

export async function getContainerLogs(
    containerId: string,
    tail: number = 100
): Promise<string> {
    const container = docker.getContainer(containerId);
    const logs: any = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
    });

    // Dockerode returns a Buffer or string; strip Docker stream headers
    const logString: string = typeof logs === 'string' ? logs : logs.toString('utf-8');
    return logString
        .split('\n')
        .map((line: string) => {
            // Docker stream header is 8 bytes, strip if present
            if (line.length > 8 && line.charCodeAt(0) <= 2) {
                return line.slice(8);
            }
            return line;
        })
        .join('\n')
        .trim();
}
