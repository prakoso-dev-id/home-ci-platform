import type {
    ApiResponse,
    ProjectWithStatus,
    ContainerStats,
    Deployment,
} from '@home-ci/shared-types';

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || '/api/engine';
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || '';

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${ENGINE_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(DEPLOY_TOKEN ? { Authorization: `Bearer ${DEPLOY_TOKEN}` } : {}),
            ...options.headers,
        },
        cache: 'no-store',
    });
    return res.json();
}

// ─── Read endpoints ──────────────────────────────────────────

export async function fetchProjects(): Promise<ProjectWithStatus[]> {
    const res = await request<ProjectWithStatus[]>('/projects');
    return res.data ?? [];
}

export async function fetchProjectStatus(project: string): Promise<{
    containers: { id: string; name: string; image: string; state: string; status: string; ports: string[]; createdAt: string }[];
    stats: ContainerStats[];
    lastDeployment: Deployment | null;
}> {
    const res = await request<any>(`/status/${project}`);
    return res.data ?? { containers: [], stats: [], lastDeployment: null };
}

export async function fetchProjectLogs(
    project: string,
    tail: number = 100
): Promise<Record<string, string>> {
    const res = await request<Record<string, string>>(`/logs/${project}?tail=${tail}`);
    return res.data ?? {};
}

export async function fetchDeploymentHistory(
    project: string
): Promise<Deployment[]> {
    const res = await request<Deployment[]>(`/deployments/${project}`);
    return res.data ?? [];
}

// ─── Write endpoints ─────────────────────────────────────────

export async function deployProject(project: string): Promise<ApiResponse> {
    return request('/deploy', {
        method: 'POST',
        body: JSON.stringify({ project }),
    });
}

export async function destroyProject(project: string): Promise<ApiResponse> {
    return request('/destroy', {
        method: 'POST',
        body: JSON.stringify({ project }),
    });
}
