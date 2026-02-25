'use client';

interface StatusBadgeProps {
    status: string;
}

function getStatusConfig(status: string): { className: string; label: string } {
    const s = status.toLowerCase();
    if (s === 'running' || s === 'up') {
        return { className: 'badge badge-success', label: 'Running' };
    }
    if (s === 'success') {
        return { className: 'badge badge-success', label: 'Success' };
    }
    if (s === 'exited' || s === 'stopped' || s === 'failed') {
        return { className: 'badge badge-danger', label: s.charAt(0).toUpperCase() + s.slice(1) };
    }
    if (s === 'created' || s === 'restarting') {
        return { className: 'badge badge-warning', label: s.charAt(0).toUpperCase() + s.slice(1) };
    }
    return { className: 'badge badge-info', label: status || 'Unknown' };
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = getStatusConfig(status);
    return (
        <span className={config.className}>
            <span className="badge-dot" />
            {config.label}
        </span>
    );
}
