import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { env } from '../config';
import type { Deployment, DeploymentStatus } from '@home-ci/shared-types';

let db: Database.Database;

export function initializeDatabase(): void {
    // Ensure data directory exists
    mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

    db = new Database(env.DATABASE_PATH);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    db.exec(`
    CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      logs TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project);
    CREATE INDEX IF NOT EXISTS idx_deployments_started_at ON deployments(started_at);
  `);
}

export function insertDeployment(project: string): number {
    const stmt = db.prepare(
        'INSERT INTO deployments (project, status, started_at) VALUES (?, ?, ?)'
    );
    const result = stmt.run(project, 'running', new Date().toISOString());
    return result.lastInsertRowid as number;
}

export function updateDeployment(
    id: number,
    status: DeploymentStatus,
    logs: string | null
): void {
    const stmt = db.prepare(
        'UPDATE deployments SET status = ?, finished_at = ?, logs = ? WHERE id = ?'
    );
    stmt.run(status, new Date().toISOString(), logs, id);
}

export function getDeploymentsByProject(
    project: string,
    limit: number = 20
): Deployment[] {
    const stmt = db.prepare(
        'SELECT * FROM deployments WHERE project = ? ORDER BY started_at DESC LIMIT ?'
    );
    return stmt.all(project, limit) as Deployment[];
}

export function getLatestDeployment(project: string): Deployment | null {
    const stmt = db.prepare(
        'SELECT * FROM deployments WHERE project = ? ORDER BY started_at DESC LIMIT 1'
    );
    return (stmt.get(project) as Deployment) ?? null;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
    }
}
