# Nuvero Full-Stack Dockerization & Deployment Guide

This repository contains the production-ready Docker configuration for the Nuvero Enterprise SaaS application. It includes separate development and production Docker setups designed for high performance, security, build-caching, and developer productivity (hot-reloading).

---

## Table of Contents
1. [Architecture & System Overview](#architecture--system-overview)
2. [Environment Configuration](#environment-configuration)
3. [Development Workflow](#development-workflow)
4. [Production Workflow](#production-workflow)
5. [Dockerfile Explanations & Optimization Rationale](#dockerfile-explanations--optimization-rationale)
6. [Docker Compose & Network Configurations](#docker-compose--network-configurations)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture & System Overview

Nuvero is structured as a monorepo consisting of:
- **Frontend**: A React + TypeScript application powered by Vite, served via an optimized Nginx server in production.
- **Backend**: A FastAPI application running on Python 3.12, utilizing asynchronous MongoDB drivers.
- **External Resources**: Connects directly to external MongoDB Atlas database, Supabase Object Storage, and Clerk Identity Provider.

---

## Environment Configuration

Before building or running the application, make sure the environment variables are set up.

1. **Backend**:
   Create a `.env` file in the `backend/` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in the parameters (MongoDB URI, JWT secret, Supabase, SMTP credentials, Clerk JWKS url, etc.).

2. **Frontend**:
   Create a `.env` file in the `frontend/` directory:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Provide the publishable Clerk key (`VITE_CLERK_PUBLISHABLE_KEY`).

---

## Development Workflow

The development environment is optimized for **fast hot-reloading**, direct directory mounts, and local debugging.

### Start Development Stack
```bash
docker compose -f docker-compose.dev.yml up --build
```
- **Frontend URL**: [http://localhost:5173](http://localhost:5173) (Hot Module Replacement enabled)
- **Backend Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend API URL**: [http://localhost:8000](http://localhost:8000)

### Stop Development Stack
```bash
docker compose -f docker-compose.dev.yml down
```

---

## Production Workflow

The production environment is built for scale, using multi-stage builds, non-root users, gzipped static asset delivery via Nginx, and hardened safety configurations.

### Build and Run Production Stack
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
- **Frontend URL**: [http://localhost](http://localhost) (Served on port 80 via Nginx)
- **Backend API URL**: [http://localhost:8000](http://localhost:8000) (Production Uvicorn without hot reload)

### Stop Production Stack
```bash
docker compose -f docker-compose.prod.yml down
```

---

## Dockerfile Explanations & Optimization Rationale

### 1. Backend Dev Dockerfile (`backend/Dockerfile.dev`)
- **`FROM python:3.12-slim`**: Uses a lightweight base image to minimize size and reduce security vulnerability vectors.
- **`ENV PYTHONDONTWRITEBYTECODE=1`**: Prevents Python from writing `.pyc` files to disk, saving space and avoiding file permission issues.
- **`ENV PYTHONUNBUFFERED=1`**: Ensures Python standard logs are outputted directly to the console without buffering.
- **`USER appuser`**: Runs the process as a non-root system user to block container breakout security risks.
- **`COPY requirements.txt .`**: Copies ONLY dependency definitions before copying source code to leverage Docker layer caching.
- **`--reload`**: Configured to auto-reload code changes immediately.

### 2. Backend Prod Dockerfile (`backend/Dockerfile.prod`)
- **Builder Stage (`builder`)**: Installs compilation tools (`build-essential`) and builds wheels in an isolated environment.
- **Runner Stage (`runner`)**: Copies only the pre-compiled wheels, installing them clean without carrying compiler/tooling bloating to the final production image.
- **Non-Root Execution**: Runs under system account `appuser` (ID `10001`).

### 3. Frontend Dev Dockerfile (`frontend/Dockerfile.dev`)
- **`FROM node:22-alpine`**: Employs Node 22 on Alpine Linux for a minimal Node runtime.
- **`npm ci`**: Installs lockfile dependencies directly for reproducible local dev setups.
- **`CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]`**: Exposes the Vite dev port on all network interfaces to support hot-reloading inside the Docker network.

### 4. Frontend Prod Dockerfile (`frontend/Dockerfile.prod`)
- **Builder Stage**: Builds the static bundle from TypeScript/Vite into `/app/dist`.
- **Nginx Stage**: Copies the built assets into `/usr/share/nginx/html` and layers a custom `nginx.conf` designed for single page app routers (`try_files $uri /index.html`).
- **Gzip Compression**: Pre-compresses CSS, JavaScript, and fonts dynamically on access to optimize load times.
- **Unprivileged Nginx Port**: Binds to port `8080` instead of port `80` inside the container so it can run entirely as the non-root `nginx` user.

---

## Docker Compose & Network Configurations

### Networks
Both the frontend and backend are joined to a custom dedicated bridge network named `nuvero_network`:
```yaml
networks:
  nuvero_network:
    driver: bridge
```
This isolates the containers from external host networks while enabling internal DNS lookup (e.g., frontend could communicate with backend via `http://backend:8000`).

### Volumes
In the development config (`docker-compose.dev.yml`), we mount the local directories into the containers:
- **Backend Mount**: `./backend:/app` mounts code so changes trigger the Uvicorn reload module.
- **Frontend Mount**: `./frontend:/app` mounts code for HMR. Anonymous volume `/app/node_modules` is declared so the container-specific `node_modules` are not overwritten by host files.

---

## Troubleshooting Guide

### 1. Hot Reloading Is Not Working on Windows (WSL / Docker Desktop)
- Ensure that the files reside inside the WSL filesystem (`/home/user/...`) rather than the Windows NTFS directory (`/mnt/c/...`) for optimal file system watch event propagation.
- Or, configure Vite to poll for file changes by updating `vite.config.ts` to include:
  ```typescript
  server: {
    watch: {
      usePolling: true
    }
  }
  ```

### 2. Backend Healthcheck Failing
- Verify that your MongoDB Atlas cluster allows incoming connections from your local/server IP address.
- Double check that the `.env` settings are correctly copied to `backend/.env`.

### 3. CSS/JS Files Returning 404 in Production
- Ensure Nginx has correct read permission. The production Dockerfile builds files with `--chown=nginx:nginx` to avoid permissions conflicts.
