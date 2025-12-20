# Development Dockerfile for CobecDev
# Uses Bun for fast package management and runtime
# Note: Source code is mounted as volumes in docker-compose for hot reloading

FROM oven/bun:latest AS base

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy configuration files (these are not mounted as volumes)
COPY vite.config.ts tsconfig.json tsconfig.app.json tailwind.config.js postcss.config.cjs ./
COPY index.html ./

# Expose Vite dev server port
EXPOSE 5173

# Development command - source code mounted as volumes for hot reload
CMD ["bun", "run", "dev:frontend"]
