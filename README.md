# Home CI Platform

A lightweight, self-hosted deployment platform for home servers. Manage Docker Compose projects through a clean web dashboard, triggered by GitHub Actions via a self-hosted runner.

## Architecture

```
GitHub Push
  → Self-Hosted Runner (on your server)
    → Deploy API (localhost:4000, 127.0.0.1 only)
      → Docker Engine
        → Your Containers

Dashboard (LAN:3000)
  → Deploy API (internal network)
    → Docker Engine (read-only status)
```

Everything runs on **one machine**. No cloud dependencies, no public exposure.

## Components

| Component | Tech | Purpose |
|-----------|------|---------|
| **Deploy Engine** | Fastify + TypeScript | REST API for deployments |
| **Dashboard** | Next.js 14 | Web UI for visual control |
| **Shared Types** | TypeScript | Shared interfaces |
| **Database** | SQLite (WAL mode) | Deployment history |
| **Docker** | Dockerode + CLI | Container management |

## Security Model

- **Deploy Engine** binds to `127.0.0.1` — not accessible from network
- **Dashboard** binds to `0.0.0.0:3000` — accessible on LAN only (configure firewall)
- **Bearer token** required on all `POST` endpoints
- **Input validation** via Zod with regex whitelist (prevents injection)
- **`docker.sock`** mounted only to engine container, never exposed to dashboard
- **`execFile`** used instead of `exec` for compose operations (no shell injection)

## Quick Start

### 1. Clone & Configure

```bash
git clone <your-repo> && cd home-ci-platform
cp .env.example .env
```

Edit `.env`:
```bash
# Generate a strong token
DEPLOY_TOKEN=$(openssl rand -hex 32)
```

### 2. Configure Projects

Edit `apps/deploy-engine/config/projects.json`:

```json
{
  "projects": {
    "my-app": {
      "name": "my-app",
      "composePath": "/opt/stacks/my-app",
      "composeFile": "docker-compose.yml",
      "description": "My Web Application"
    }
  }
}
```

### 3. Launch

```bash
docker compose up -d --build
```

- **Dashboard**: `http://<your-lan-ip>:3000`
- **Engine API**: `http://127.0.0.1:4000` (localhost only)

### 4. Set Up GitHub Runner

Install the [self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners) on the same machine. Add `DEPLOY_TOKEN` as a GitHub repository secret.

## Development

```bash
# Install dependencies
npm install

# Run deploy engine (requires Docker)
npm run dev:engine

# Run dashboard
npm run dev:dashboard
```

## API Reference

### `POST /deploy`
Deploy a project (pull → build → up).

```bash
curl -X POST http://127.0.0.1:4000/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"project": "my-app"}'
```

### `POST /destroy`
Stop and remove a project.

### `GET /projects`
List all projects with current status.

### `GET /status/:project`
Container status with CPU/memory stats.

### `GET /logs/:project?tail=100`
Container logs (last N lines).

### `GET /deployments/:project`
Deployment history.

## Adding a New Project

1. Create a `docker-compose.yml` for your app in `/opt/stacks/your-app/`
2. Add an entry to `apps/deploy-engine/config/projects.json`
3. Restart the engine: `docker compose restart deploy-engine`

No code changes required.

## Folder Structure

```
home-ci-platform/
├── apps/
│   ├── deploy-engine/          # Fastify API
│   │   ├── config/
│   │   │   └── projects.json   # Project mapping
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       ├── config.ts       # Env + config loading
│   │       ├── auth.ts         # Bearer token hook
│   │       ├── routes/
│   │       │   ├── deploy.routes.ts
│   │       │   └── status.routes.ts
│   │       └── services/
│   │           ├── database.service.ts
│   │           ├── docker.service.ts
│   │           └── deployment.service.ts
│   └── dashboard/              # Next.js UI
│       └── src/
│           ├── app/
│           │   ├── page.tsx            # Projects list
│           │   └── projects/[name]/
│           │       └── page.tsx        # Project detail
│           ├── components/
│           │   ├── StatusBadge.tsx
│           │   ├── LogViewer.tsx
│           │   └── DeploymentHistory.tsx
│           └── lib/
│               └── api.ts              # API client
├── packages/
│   └── shared-types/           # Shared TS interfaces
├── docker-compose.yml          # Platform compose
├── .env.example
└── .github/workflows/
    └── deploy.yml              # Example CI workflow
```

## License

MIT