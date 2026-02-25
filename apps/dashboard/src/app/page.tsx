'use client';

import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { fetchProjects, deployProject, destroyProject } from '@/lib/api';
import type { ProjectWithStatus } from '@home-ci/shared-types';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const loadProjects = useCallback(async () => {
        try {
            const data = await fetchProjects();
            setProjects(data);
            setError(null);
        } catch (err) {
            setError('Failed to connect to Deploy Engine');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + polling every 5s
    useEffect(() => {
        loadProjects();
        const interval = setInterval(loadProjects, 5000);
        return () => clearInterval(interval);
    }, [loadProjects]);

    const handleDeploy = async (project: string) => {
        if (actionLoading[project]) return;
        setActionLoading((prev) => ({ ...prev, [project]: true }));
        try {
            await deployProject(project);
        } catch {
            // Error will be reflected on next poll
        } finally {
            setTimeout(() => {
                setActionLoading((prev) => ({ ...prev, [project]: false }));
                loadProjects();
            }, 1500);
        }
    };

    const handleDestroy = async (project: string) => {
        if (actionLoading[project]) return;
        const confirmed = window.confirm(`Are you sure you want to destroy "${project}"?`);
        if (!confirmed) return;
        setActionLoading((prev) => ({ ...prev, [project]: true }));
        try {
            await destroyProject(project);
        } catch {
            // Error will be reflected on next poll
        } finally {
            setTimeout(() => {
                setActionLoading((prev) => ({ ...prev, [project]: false }));
                loadProjects();
            }, 1500);
        }
    };

    function getProjectStatus(project: ProjectWithStatus): string {
        if (project.containers.length === 0) return 'stopped';
        const allRunning = project.containers.every((c) => c.state === 'running');
        if (allRunning) return 'running';
        return 'partial';
    }

    function formatDate(iso: string | null | undefined): string {
        if (!iso) return 'Never';
        return new Date(iso).toLocaleString();
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
                Loading projects...
            </div>
        );
    }

    if (error) {
        return (
            <>
                <div className="page-header">
                    <h1>Projects</h1>
                    <p>Manage your Docker Compose deployments</p>
                </div>
                <div className="error-box">{error}</div>
            </>
        );
    }

    return (
        <>
            <div className="page-header">
                <h1>Projects</h1>
                <p>
                    {projects.length} project{projects.length !== 1 ? 's' : ''} configured
                    {' · '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Auto-refreshing every 5s
                    </span>
                </p>
            </div>

            {projects.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: 48,
                        color: 'var(--text-muted)',
                    }}
                >
                    <p style={{ marginBottom: 8 }}>No projects configured yet.</p>
                    <p style={{ fontSize: '0.85rem' }}>
                        Add projects to{' '}
                        <code style={{ color: 'var(--accent)' }}>config/projects.json</code>
                    </p>
                </div>
            ) : (
                <div className="card-grid">
                    {projects.map((project) => {
                        const status = getProjectStatus(project);
                        const isLoading = actionLoading[project.name] ?? false;
                        return (
                            <div className="card" key={project.name}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: 16,
                                    }}
                                >
                                    <div>
                                        <a
                                            href={`/projects/${project.name}`}
                                            style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            {project.name}
                                        </a>
                                        <p
                                            style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-muted)',
                                                marginTop: 2,
                                            }}
                                        >
                                            {project.description || project.composePath}
                                        </p>
                                    </div>
                                    <StatusBadge status={status} />
                                </div>

                                <div
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: 16,
                                    }}
                                >
                                    <div>
                                        Containers:{' '}
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {project.containers.length}
                                        </span>
                                    </div>
                                    <div>
                                        Last deploy:{' '}
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {formatDate(project.lastDeployment?.started_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="btn-group">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleDeploy(project.name)}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="spinner" style={{ width: 14, height: 14, margin: 0 }} />
                                                Deploying...
                                            </>
                                        ) : (
                                            '🚀 Deploy'
                                        )}
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDestroy(project.name)}
                                        disabled={isLoading}
                                    >
                                        🗑 Destroy
                                    </button>
                                    <a
                                        href={`/projects/${project.name}`}
                                        className="btn btn-outline"
                                    >
                                        Details →
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
