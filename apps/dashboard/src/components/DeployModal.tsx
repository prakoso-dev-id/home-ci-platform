'use client';

import { useState, useEffect, useRef } from 'react';

interface DeployEvent {
    type: 'log' | 'status' | 'complete' | 'connected';
    project: string;
    message: string;
    status?: 'running' | 'success' | 'failed';
    timestamp: string;
}

interface DeployModalProps {
    project: string;
    action: 'deploy' | 'destroy';
    onClose: () => void;
    onComplete: (status: 'success' | 'failed') => void;
}

export default function DeployModal({ project, action, onClose, onComplete }: DeployModalProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting' | 'running' | 'success' | 'failed'>('connecting');
    const logRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Connect to SSE stream
        const es = new EventSource(`/api/engine/stream/${project}`);
        eventSourceRef.current = es;

        es.onopen = () => {
            setStatus('running');
            setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Stream connected, waiting for ${action}...`]);
        };

        es.onmessage = (event) => {
            try {
                const data: DeployEvent = JSON.parse(event.data);

                if (data.type === 'connected') {
                    setStatus('running');
                    return;
                }

                if (data.type === 'log') {
                    const lines = data.message.split('\n').filter((l) => l.trim());
                    setLogs((prev) => [
                        ...prev,
                        ...lines.map((l) => `[${new Date(data.timestamp).toLocaleTimeString()}] ${l}`),
                    ]);
                }

                if (data.type === 'status') {
                    if (data.status) {
                        setStatus(data.status);
                    }
                    setLogs((prev) => [...prev, `[${new Date(data.timestamp).toLocaleTimeString()}] ⚡ ${data.message}`]);
                }

                if (data.type === 'complete') {
                    const finalStatus = data.status === 'failed' ? 'failed' : 'success';
                    setStatus(finalStatus);
                    setLogs((prev) => [...prev, `[${new Date(data.timestamp).toLocaleTimeString()}] ── ${data.message} ──`]);
                    es.close();
                    onComplete(finalStatus);
                }
            } catch {
                // Ignore parse errors (heartbeats etc)
            }
        };

        es.onerror = () => {
            // SSE will auto-reconnect; only update if we haven't completed
            setStatus((prev) => (prev === 'running' || prev === 'connecting' ? 'connecting' : prev));
        };

        return () => {
            es.close();
        };
    }, [project, action, onComplete]);

    // Auto-scroll logs
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    const statusColor = {
        connecting: 'var(--warning)',
        running: 'var(--accent)',
        success: 'var(--success)',
        failed: 'var(--danger)',
    }[status];

    const statusLabel = {
        connecting: 'Connecting...',
        running: action === 'deploy' ? 'Deploying...' : 'Destroying...',
        success: action === 'deploy' ? 'Deploy Successful' : 'Destroy Complete',
        failed: action === 'deploy' ? 'Deploy Failed' : 'Destroy Failed',
    }[status];

    const isComplete = status === 'success' || status === 'failed';

    return (
        <div className="modal-overlay" onClick={isComplete ? onClose : undefined}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            {action === 'deploy' ? '🚀' : '🗑'}{' '}
                            {action === 'deploy' ? 'Deploying' : 'Destroying'}{' '}
                            <span style={{ color: 'var(--accent)' }}>{project}</span>
                        </h2>
                        <div className="modal-status" style={{ color: statusColor }}>
                            <span className={`modal-status-dot ${isComplete ? '' : 'modal-status-dot-pulse'}`} style={{ background: statusColor }} />
                            {statusLabel}
                        </div>
                    </div>
                    {isComplete && (
                        <button className="btn btn-outline" onClick={onClose}>
                            Close
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="modal-progress">
                    <div
                        className={`modal-progress-bar ${isComplete ? '' : 'modal-progress-bar-animate'}`}
                        style={{
                            background: statusColor,
                            width: isComplete ? '100%' : '60%',
                        }}
                    />
                </div>

                {/* Logs */}
                <div className="modal-logs" ref={logRef}>
                    {logs.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>Waiting for output...</span>
                    ) : (
                        logs.map((line, i) => (
                            <div key={i} className="modal-log-line">
                                {line}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
