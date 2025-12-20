#!/usr/bin/env node
/**
 * dev-with-convex.js
 * Smart dev pipeline orchestrator
 * - Checks if Convex is running
 * - Starts Convex containers if needed
 * - Waits for health checks
 * - Starts frontend and backend dev servers
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';
const HEALTH_CHECK_ENDPOINT = `${CONVEX_URL}/version`;
const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 2000; // 2 seconds

/**
 * Check if Convex backend is healthy
 */
function checkConvexHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_ENDPOINT, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for Convex backend to be healthy
 */
async function waitForConvex(maxWaitTime = MAX_WAIT_TIME) {
  const startTime = Date.now();
  console.log('⏳ Waiting for Convex backend to be ready...');

  while (Date.now() - startTime < maxWaitTime) {
    const isHealthy = await checkConvexHealth();
    if (isHealthy) {
      console.log('✅ Convex backend is ready!');
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    process.stdout.write('.');
  }

  console.log('\n❌ Timeout waiting for Convex backend');
  return false;
}

/**
 * Start Convex Docker containers
 */
async function startConvexContainers() {
  const composeFile = path.join(__dirname, '..', 'convex-docker-compose.yml');
  console.log('🚀 Starting Convex Docker containers...');

  try {
    const { stdout, stderr } = await execAsync(
      `docker compose -f "${composeFile}" up -d`
    );
    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
      console.warn('⚠️  Docker compose warnings:', stderr);
    }
    console.log('📦 Convex containers started');
    return true;
  } catch (error) {
    console.error('❌ Failed to start Convex containers:', error.message);
    return false;
  }
}

/**
 * Check if Docker is available
 */
async function isDockerAvailable() {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Main orchestrator function
 */
async function main() {
  console.log('🔍 Checking Convex backend status...');

  // Check if Docker is available
  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    console.warn('⚠️  Docker not found. Skipping container checks.');
    console.log('💡 Starting dev servers without container management...');
    startDevServers();
    return;
  }

  // Check if Convex is already running
  const isHealthy = await checkConvexHealth();
  if (isHealthy) {
    console.log('✅ Convex backend is already running');
    startDevServers();
    return;
  }

  // Convex is not running, start containers
  console.log('📦 Convex backend is not running');
  const started = await startConvexContainers();
  if (!started) {
    console.error('❌ Failed to start Convex containers');
    console.log('💡 Attempting to start dev servers anyway...');
    startDevServers();
    return;
  }

  // Wait for health check
  const isReady = await waitForConvex();
  if (!isReady) {
    console.warn('⚠️  Convex backend may not be fully ready');
    console.log('💡 Starting dev servers anyway...');
  }

  // Start dev servers
  startDevServers();
}

/**
 * Start frontend and backend dev servers
 */
function startDevServers() {
  console.log('\n🎯 Starting development servers...\n');

  // Use concurrently if available, otherwise run sequentially
  const projectRoot = path.join(__dirname, '..');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  try {
    // Check if concurrently is available
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const hasConcurrently = packageJson.devDependencies?.concurrently || packageJson.dependencies?.concurrently;
    
    if (hasConcurrently) {
      // Use concurrently
      const devProcess = spawn('bun', ['run', 'dev:no-check'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
      });

      devProcess.on('error', (error) => {
        console.error('❌ Failed to start dev servers:', error);
        process.exit(1);
      });

      devProcess.on('exit', (code) => {
        process.exit(code || 0);
      });
    } else {
      // Fallback: run sequentially
      console.log('⚠️  concurrently not found, running servers sequentially');
      const frontendProcess = spawn('bun', ['run', 'dev:frontend'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
      });

      const backendProcess = spawn('bun', ['run', 'dev:backend'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
      });

      // Handle process termination
      const cleanup = () => {
        frontendProcess.kill();
        backendProcess.kill();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  } catch (error) {
    // Fallback if package.json can't be read - assume concurrently is available
    console.log('⚠️  Could not read package.json, assuming concurrently is available');
    const devProcess = spawn('bun', ['run', 'dev:no-check'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    devProcess.on('error', (error) => {
      console.error('❌ Failed to start dev servers:', error);
      process.exit(1);
    });

    devProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
