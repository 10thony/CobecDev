# Docker Development Guide

This guide covers Docker-based development workflows for CobecDev, including full application containerization and smart dev pipeline automation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Development Workflows](#development-workflows)
- [Docker Compose Files](#docker-compose-files)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Docker Desktop** (or Docker Engine + Docker Compose)
   - Windows: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
   - macOS: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
   - Linux: [Docker Engine](https://docs.docker.com/engine/install/) + [Docker Compose](https://docs.docker.com/compose/install/)

2. **Bun** (or Node.js 18+)
   - [Bun Installation Guide](https://bun.sh/docs/installation)

3. **Convex CLI**
   ```bash
   bun add -g convex
   ```

### Recommended (Windows)

- **WSL2** (Windows Subsystem for Linux 2) for better Docker performance
  - [WSL2 Installation Guide](https://docs.microsoft.com/en-us/windows/wsl/install)

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   frontend  │───▶│   backend   │◀───│    dashboard    │  │
│  │   (Vite)    │    │  (Convex)   │    │ (Convex Admin)  │  │
│  │  Port 5173  │    │  Port 3210  │    │   Port 6791     │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                            │                                 │
│                     ┌──────┴──────┐                         │
│                     │    data     │                         │
│                     │  (volume)   │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Port Mapping

| Service | Container Port | Host Port | URL |
|---------|---------------|-----------|-----|
| Frontend (Vite) | 5173 | 5173 | http://localhost:5173 |
| Convex Backend | 3210 | 3210 | http://localhost:3210 |
| Convex Dashboard | 6791 | 6791 | http://localhost:6791 |

---

## Quick Start

### Option 1: Smart Dev Pipeline (Recommended)

The smart dev pipeline automatically detects and starts Convex containers:

```bash
# Start everything (auto-detects and starts Convex if needed)
bun run dev
```

This command:
1. ✅ Checks if Convex backend is running
2. 🚀 Starts Convex containers if not running
3. ⏳ Waits for health checks to pass
4. 🎯 Starts frontend (Vite) and backend sync (convex dev)

### Option 2: Manual Docker Management

```bash
# Start only Convex backend and dashboard
bun run docker:convex:start

# Start full stack (frontend + backend + dashboard)
bun run docker:full:start

# Check status
bun run docker:full:status

# View logs
bun run docker:full:logs

# Stop everything
bun run docker:full:stop
```

---

## Development Workflows

### Workflow 1: Local Development (Recommended)

**Use this for active development with hot reloading:**

```bash
# Start Convex containers
bun run docker:convex:start

# In another terminal, start dev servers
bun run dev:no-check
```

**Or use the smart pipeline:**
```bash
bun run dev  # Automatically handles Convex startup
```

**Benefits:**
- ✅ Hot reloading for frontend (Vite)
- ✅ Hot reloading for backend (convex dev watches for changes)
- ✅ Fast iteration cycle
- ✅ Source code mounted as volumes

### Workflow 2: Full Docker Stack

**Use this for testing the complete containerized setup:**

```bash
# Start everything in Docker
bun run docker:full:start

# View logs
bun run docker:full:logs

# Stop
bun run docker:full:stop
```

**Benefits:**
- ✅ Isolated environment
- ✅ Consistent across team members
- ✅ Production-like setup

**Limitations:**
- ⚠️ Hot reloading may be slower (volume mounts)
- ⚠️ Requires rebuilding on dependency changes

### Workflow 3: Production Build Testing

```bash
# Build production image
bun run docker:full:build

# Start with production build
docker compose -f cobecdev-docker-compose.yml up
```

---

## Docker Compose Files

### `convex-docker-compose.yml`

**Purpose:** Manages only Convex backend and dashboard services.

**Services:**
- `backend`: Convex backend server
- `dashboard`: Convex admin dashboard

**Usage:**
```bash
docker compose -f convex-docker-compose.yml up -d
```

### `cobecdev-docker-compose.yml`

**Purpose:** Full application stack (frontend + backend + dashboard).

**Services:**
- `frontend`: Vite React application
- `backend`: Convex backend server
- `dashboard`: Convex admin dashboard

**Usage:**
```bash
docker compose -f cobecdev-docker-compose.yml up -d
```

---

## Environment Variables

### Required Variables

Create a `.env` file in the project root:

```bash
# Frontend
VITE_CONVEX_URL=http://127.0.0.1:3210
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Convex Backend
PORT=3210
SITE_PROXY_PORT=3211
DASHBOARD_PORT=6791
INSTANCE_NAME=cobecdev
INSTANCE_SECRET=your_secret_here
```

### Docker-Specific Variables

For Docker Compose, you can use `env.docker.example` as a template:

```bash
# Copy template
cp env.docker.example .env.docker

# Edit with your values
# Then use with:
docker compose -f cobecdev-docker-compose.yml --env-file .env.docker up
```

### Important Notes

1. **`VITE_CONVEX_URL`**: Must be `http://127.0.0.1:3210` (or host IP), not `http://backend:3210`
   - Reason: The React app runs in the browser, which makes requests to the host machine
   - Docker internal DNS (`backend:3210`) only works for container-to-container communication

2. **Clerk Keys**: Get your publishable key from [Clerk Dashboard](https://dashboard.clerk.com)

3. **Convex Secrets**: Generate a secure secret for `INSTANCE_SECRET`:
   ```bash
   openssl rand -hex 32
   ```

4. **Convex Admin Key**: Required for deploying functions and accessing the dashboard. See [Getting the Admin Key](#getting-the-admin-key) below.

---

## Getting the Admin Key

The admin key is required to:
- Deploy Convex functions (`convex dev`)
- Access the Convex dashboard
- Authenticate with your self-hosted Convex backend

### Method 1: Using the Helper Script (Recommended)

```bash
# Make sure Convex backend is running first
bun run docker:convex:start

# Get the admin key
bun run convex:admin-key
```

This will automatically:
1. Check if the container is running
2. Generate the admin key from the container
3. Display it with instructions on how to use it

### Method 2: Manual Docker Command

```bash
# Access the backend container
docker exec -it cobecdev-backend /bin/sh

# Run the admin key generation script
./generate_admin_key.sh
# or
/usr/local/bin/generate_admin_key.sh
```

### Method 3: Check Container Logs

The admin key might be printed in the container logs when it first starts:

```bash
# View logs
bun run docker:convex:logs

# Or search for admin key
docker logs cobecdev-backend | grep -i "admin"
```

### Method 4: Check Environment Variables

```bash
# Check if admin key is set as environment variable
docker exec cobecdev-backend env | grep -i "ADMIN\|DEPLOY"
```

### Using the Admin Key

Once you have the admin key, add it to your `.env` file:

```bash
# .env
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=your_admin_key_here
```

Or use it directly with the Convex CLI:

```bash
CONVEX_SELF_HOSTED_ADMIN_KEY=your_admin_key_here convex dev
```

**Important:** Keep your admin key secure! Never commit it to version control.

---

## Troubleshooting

### Issue: Docker not found

**Error:** `docker: command not found`

**Solution:**
1. Install Docker Desktop (Windows/macOS) or Docker Engine (Linux)
2. Ensure Docker is running
3. Verify: `docker --version`

### Issue: Port already in use

**Error:** `Bind for 0.0.0.0:3210 failed: port is already allocated`

**Solution:**
```bash
# Find process using the port
# Windows:
netstat -ano | findstr :3210

# macOS/Linux:
lsof -i :3210

# Stop the process or change port in .env
PORT=3212  # Use different port
```

### Issue: Convex backend not healthy

**Error:** `Timeout waiting for Convex backend`

**Solution:**
1. Check container logs:
   ```bash
   bun run docker:convex:logs
   ```

2. Verify health check:
   ```bash
   curl http://127.0.0.1:3210/version
   ```

3. Restart containers:
   ```bash
   bun run docker:convex:stop
   bun run docker:convex:start
   ```

### Issue: Frontend can't connect to Convex

**Error:** `Failed to connect to Convex`

**Solution:**
1. Verify `VITE_CONVEX_URL` is set correctly (must be `http://127.0.0.1:3210`)
2. Check if Convex backend is running:
   ```bash
   bun run check:convex
   ```
3. Check browser console for CORS errors

### Issue: Hot reload not working in Docker

**Solution:**
1. Ensure volumes are mounted correctly (check `cobecdev-docker-compose.yml`)
2. Use Vite's polling mode (add to `vite.config.ts`):
   ```typescript
   export default defineConfig({
     server: {
       watch: {
         usePolling: true
       }
     }
   });
   ```

### Issue: Permission denied (Linux)

**Error:** `permission denied while trying to connect to the Docker daemon socket`

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker
```

---

## Available Scripts

### Development

| Script | Description |
|--------|-------------|
| `bun run dev` | Smart dev pipeline (auto-starts Convex) |
| `bun run dev:frontend` | Start Vite dev server only |
| `bun run dev:backend` | Start Convex dev sync only |
| `bun run dev:no-check` | Start both without Convex check |

### Docker - Convex Only

| Script | Description |
|--------|-------------|
| `bun run docker:convex:start` | Start Convex containers |
| `bun run docker:convex:stop` | Stop Convex containers |
| `bun run docker:convex:status` | Show container status |
| `bun run docker:convex:logs` | View container logs |

### Docker - Full Stack

| Script | Description |
|--------|-------------|
| `bun run docker:full:start` | Start all containers |
| `bun run docker:full:stop` | Stop all containers |
| `bun run docker:full:status` | Show container status |
| `bun run docker:full:logs` | View container logs |
| `bun run docker:full:build` | Build container images |

### Utilities

| Script | Description |
|--------|-------------|
| `bun run check:convex` | Check if Convex is running |
| `bun run convex:admin-key` | Get the admin key from running container |

---

## Best Practices

1. **Use Smart Dev Pipeline**: Prefer `bun run dev` for daily development
2. **Keep Containers Running**: Don't stop/start containers frequently during active development
3. **Monitor Logs**: Use `docker:full:logs` to debug issues
4. **Environment Variables**: Never commit `.env` files to git
5. **Volume Mounts**: Use volume mounts for source code in development
6. **Production Builds**: Test production builds regularly with `Dockerfile.prod`

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Convex Self-Hosted Guide](https://docs.convex.dev/self-hosted)
- [Vite Docker Guide](https://vitejs.dev/guide/build.html#docker)

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review container logs: `bun run docker:full:logs`
3. Check Convex health: `bun run check:convex`
4. Verify environment variables are set correctly
