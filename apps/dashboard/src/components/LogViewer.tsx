'use client';

import { useRef, useEffect } from 'react';

interface LogViewerProps {
    logs: Record<string, string>;
}

export default function LogViewer({ logs }: LogViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const entries = Object.entries(logs);

    if (entries.length === 0) {
        return (
            <div className="log-viewer" style={{ color: 'var(--text-muted)' }}>
                No logs available.
            </div>
        );
    }

    return (
        <div>
            {entries.map(([name, logText]) => (
                <div key={name} style={{ marginBottom: 16 }}>
                    <div
                        style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginBottom: 6,
                            color: 'var(--accent)',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        📦 {name}
                    </div>
                    <div className="log-viewer" ref={containerRef}>
                        {logText || 'No output.'}
                    </div>
                </div>
            ))}
        </div>
    );
}
