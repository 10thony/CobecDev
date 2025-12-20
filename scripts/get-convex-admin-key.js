#!/usr/bin/env node
/**
 * get-convex-admin-key.js
 * Helper script to get the admin key from a running Convex backend container
 * 
 * Usage:
 *   node scripts/get-convex-admin-key.js
 *   node scripts/get-convex-admin-key.js --container-name cobecdev-backend
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONTAINER_NAME = process.argv.includes('--container-name') 
  ? process.argv[process.argv.indexOf('--container-name') + 1]
  : 'cobecdev-backend';

async function getAdminKey() {
  try {
    console.log(`🔍 Checking for Convex backend container: ${CONTAINER_NAME}...`);
    
    // Check if container is running
    const { stdout: psOutput } = await execAsync(
      `docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`
    );
    
    if (!psOutput.trim()) {
      console.error(`❌ Container "${CONTAINER_NAME}" is not running.`);
      console.log('\n💡 Start the container first:');
      console.log('   bun run docker:convex:start');
      console.log('   or');
      console.log('   docker compose -f convex-docker-compose.yml up -d');
      process.exit(1);
    }

    console.log(`✅ Container found. Generating admin key...\n`);

    // Execute the generate_admin_key.sh script in the container
    // Note: The script path may vary, try common locations
    const commands = [
      '/generate_admin_key.sh',
      './generate_admin_key.sh',
      '/usr/local/bin/generate_admin_key.sh',
    ];

    let adminKey = null;
    let error = null;

    for (const scriptPath of commands) {
      try {
        const { stdout, stderr } = await execAsync(
          `docker exec ${CONTAINER_NAME} ${scriptPath} 2>&1`
        );
        
        if (stdout && !stderr) {
          adminKey = stdout.trim();
          break;
        }
      } catch (err) {
        error = err;
        continue;
      }
    }

    if (!adminKey) {
      // Alternative: Try to access the admin key endpoint or check logs
      console.log('⚠️  Could not find generate_admin_key.sh script.');
      console.log('\n📋 Alternative methods to get the admin key:\n');
      console.log('Method 1: Check container logs for admin key:');
      console.log(`   docker logs ${CONTAINER_NAME} | grep -i "admin"`);
      console.log('\nMethod 2: Access container shell and run:');
      console.log(`   docker exec -it ${CONTAINER_NAME} /bin/sh`);
      console.log('   Then look for admin key in:');
      console.log('   - /convex/data/admin_key');
      console.log('   - Environment variables');
      console.log('   - Container logs');
      console.log('\nMethod 3: Check if admin key is in environment:');
      console.log(`   docker exec ${CONTAINER_NAME} env | grep -i admin`);
      
      // Try to get it from environment or data directory
      try {
        const { stdout: envOutput } = await execAsync(
          `docker exec ${CONTAINER_NAME} env | grep -i "ADMIN\\|DEPLOY" || true`
        );
        if (envOutput.trim()) {
          console.log('\n📝 Found environment variables:');
          console.log(envOutput);
        }
      } catch (e) {
        // Ignore
      }

      process.exit(1);
    }

    console.log('✅ Admin key generated successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔑 CONVEX ADMIN KEY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(adminKey);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📝 Add this to your .env file:');
    console.log(`   CONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}\n`);
    
    console.log('💡 Or use it with convex dev:');
    console.log(`   CONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey} convex dev\n`);

    return adminKey;
  } catch (error) {
    console.error('❌ Error getting admin key:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Docker is running');
    console.log('   2. Convex backend container is started');
    console.log('   3. Container name is correct (use --container-name to specify)');
    process.exit(1);
  }
}

getAdminKey();
