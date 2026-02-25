'use client';

import StatusBadge from './StatusBadge';
import type { Deployment } from '@home-ci/shared-types';

interface DeploymentHistoryProps {
    deployments: Deployment[];
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function formatDuration(start: string, end: string | null): string {
    if (!end) return 'In progress...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
}

export default function DeploymentHistory({ deployments }: DeploymentHistoryProps) {
    if (deployments.length === 0) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                No deployment history yet.
            </div>
        );
    }

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {deployments.map((d) => (
                        <tr key={d.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                #{d.id}
                            </td>
                            <td>
                                <StatusBadge status={d.status} />
                            </td>
                            <td>{formatDate(d.started_at)}</td>
                            <td>{formatDuration(d.started_at, d.finished_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
