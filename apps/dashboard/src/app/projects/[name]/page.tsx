'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import LogViewer from '@/components/LogViewer';
import DeploymentHistory from '@/components/DeploymentHistory';
import {
    fetchProjectStatus,
    fetchProjectLogs,
    fetchDeploymentHistory,
    deployProject,
    destroyProject,
} from '@/lib/api';
import type { ContainerStats, Deployment } from '@home-ci/shared-types';

interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    ports: string[];
    createdAt: string;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const projectName = params.name as string;

    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [stats, setStats] = useState<ContainerStats[]>([]);
    const [logs, setLogs] = useState<Record<string, string>>({});
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'history'>('overview');

    const loadData = useCallback(async () => {
        try {
            const [statusData, logData, historyData] = await Promise.all([
                fetchProjectStatus(projectName),
                fetchProjectLogs(projectName),
                fetchDeploymentHistory(projectName),
            ]);
            setContainers(statusData.containers);
            setStats(statusData.stats);
            setLogs(logData);
            setDeployments(historyData);
            setError(null);
        } catch {
            setError('Failed to connect to Deploy Engine');
        } finally {
            setLoading(false);
        }
    }, [projectName]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleDeploy = async () => {
        setActionLoading(true);
        try {
            await deployProject(projectName);
        } finally {
            setTimeout(() => {
                setActionLoading(false);
                loadData();
            }, 2000);
        }
    };

    const handleDestroy = async () => {
        const confirmed = window.confirm(`Are you sure you want to destroy "${projectName}"?`);
        if (!confirmed) return;
        setActionLoading(true);
        try {
            await destroyProject(projectName);
        } finally {
            setTimeout(() => {
                setActionLoading(false);
                loadData();
            }, 2000);
        }
    };

    function getStatsForContainer(containerId: string): ContainerStats | undefined {
        return stats.find((s) => s.containerId === containerId);
    }

    function cpuColor(pct: number): string {
        if (pct > 80) return 'var(--danger)';
        if (pct > 50) return 'var(--warning)';
        return 'var(--success)';
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
                Loading project...
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ marginBottom: 4 }}>
                            <a href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                ← Back to Projects
                            </a>
                        </div>
                        <h1>{projectName}</h1>
                        <p>
                            {containers.length} container{containers.length !== 1 ? 's' : ''}
                            {' · '}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Auto-refreshing every 5s
                            </span>
                        </p>
                    </div>
                    <div className="btn-group">
                        <button
                            className="btn btn-primary"
                            onClick={handleDeploy}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Working...' : '🚀 Deploy'}
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleDestroy}
                            disabled={actionLoading}
                        >
                            🗑 Destroy
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="error-box" style={{ marginBottom: 24 }}>{error}</div>}

            {/* Tab navigation */}
            <div
                style={{
                    display: 'flex',
                    gap: 0,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 24,
                }}
            >
                {(['overview', 'logs', 'history'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.875rem',
                            fontWeight: activeTab === tab ? 600 : 400,
                            textTransform: 'capitalize',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="section">
                    <h2 className="section-title">Containers</h2>
                    {containers.length === 0 ? (
                        <div
                            style={{
                                padding: 32,
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            No containers running for this project.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {containers.map((container) => {
                                const containerStats = getStatsForContainer(container.id);
                                return (
                                    <div className="card" key={container.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <div>
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontWeight: 600,
                                                        fontSize: '0.9rem',
                                                    }}
                                                >
                                                    {container.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)',
                                                        marginLeft: 8,
                                                    }}
                                                >
                                                    {container.image}
                                                </span>
                                            </div>
                                            <StatusBadge status={container.state} />
                                        </div>

                                        <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                            <span>ID: <code style={{ color: 'var(--text-secondary)' }}>{container.id}</code></span>
                                            {container.ports.length > 0 && (
                                                <span>Ports: <code style={{ color: 'var(--text-secondary)' }}>{container.ports.join(', ')}</code></span>
                                            )}
                                        </div>

                                        {/* Resource gauges */}
                                        {containerStats && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <div className="stat-label">
                                                        <span>CPU</span>
                                                        <span>{containerStats.cpuPercent}%</span>
                                                    </div>
                                                    <div className="stat-bar">
                                                        <div
                                                            className="stat-bar-fill"
                                                            style={{
                                                                width: `${Math.min(containerStats.cpuPercent, 100)}%`,
                                                                background: cpuColor(containerStats.cpuPercent),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="stat-label">
                                                        <span>Memory</span>
                                                        <span>
                                                            {containerStats.memoryUsageMB.toFixed(0)} MB / {containerStats.memoryLimitMB.toFixed(0)} MB
                                                        </span>
                                                    </div>
                                                    <div className="stat-bar">
                                                        <div
                                                            className="stat-bar-fill"
                                                            style={{
                                                                width: `${Math.min(containerStats.memoryPercent, 100)}%`,
                                                                background: cpuColor(containerStats.memoryPercent),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="section">
                    <h2 className="section-title">Container Logs</h2>
                    <LogViewer logs={logs} />
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="section">
                    <h2 className="section-title">Deployment History</h2>
                    <DeploymentHistory deployments={deployments} />
                </div>
            )}
        </>
    );
}
