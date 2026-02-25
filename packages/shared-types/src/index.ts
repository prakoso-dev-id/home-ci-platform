// ─── Project Config ──────────────────────────────────────────

export interface ProjectConfig {
    name: string;
    composePath: string;
    composeFile: string;
    description: string;
}

export interface ProjectsConfig {
    projects: Record<string, ProjectConfig>;
}

// ─── Deployment ──────────────────────────────────────────────

export type DeploymentStatus = 'running' | 'success' | 'failed';

export interface Deployment {
    id: number;
    project: string;
    status: DeploymentStatus;
    started_at: string;
    finished_at: string | null;
    logs: string | null;
}

// ─── Container Status ────────────────────────────────────────

export interface ContainerStatus {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    ports: string[];
    createdAt: string;
}

export interface ContainerStats {
    containerId: string;
    name: string;
    cpuPercent: number;
    memoryUsageMB: number;
    memoryLimitMB: number;
    memoryPercent: number;
}

// ─── API Request / Response ──────────────────────────────────

export interface DeployRequest {
    project: string;
}

export interface DestroyRequest {
    project: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface ProjectWithStatus extends ProjectConfig {
    containers: ContainerStatus[];
    lastDeployment: Deployment | null;
}
