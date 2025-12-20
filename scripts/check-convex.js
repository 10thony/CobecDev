#!/usr/bin/env node
/**
 * check-convex.js
 * Cross-platform script to check if Convex backend is running
 * Uses HTTP health check for reliability
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';
const HEALTH_CHECK_ENDPOINT = `${CONVEX_URL}/version`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if Convex backend is running via HTTP health check
 * @returns {Promise<boolean>}
 */
async function checkConvexHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_ENDPOINT, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if Docker containers are running
 * @returns {Promise<boolean>}
 */
async function checkDockerContainers() {
  try {
    // Check for containers with "convex" in the name
    const { stdout } = await execAsync(
      'docker ps --filter "name=convex" --format "{{.Names}}"'
    );
    const containers = stdout.trim().split('\n').filter(Boolean);
    return containers.length > 0;
  } catch (error) {
    // Docker might not be installed or not running
    return false;
  }
}

/**
 * Main function to check if Convex is running
 * @returns {Promise<{running: boolean, method: string}>}
 */
export async function isConvexRunning() {
  // First, try HTTP health check (most reliable)
  for (let i = 0; i < MAX_RETRIES; i++) {
    const isHealthy = await checkConvexHealth();
    if (isHealthy) {
      return { running: true, method: 'http' };
    }
    if (i < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  // Fallback: Check Docker containers
  const hasContainers = await checkDockerContainers();
  if (hasContainers) {
    return { running: false, method: 'docker-containers-exist-but-not-healthy' };
  }

  return { running: false, method: 'none' };
}

// If run directly (not imported)
// Check if this is the main module
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('check-convex.js') ||
  process.argv[1].endsWith('check-convex')
);

if (isMainModule) {
  isConvexRunning()
    .then(({ running, method }) => {
      console.log(JSON.stringify({ running, method }));
      process.exit(running ? 0 : 1);
    })
    .catch((error) => {
      console.error('Error checking Convex status:', error);
      process.exit(1);
    });
}
