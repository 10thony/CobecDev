#!/usr/bin/env node
/**
 * Convex dev wrapper script
 * Automatically detects whether to use local Docker or Convex Cloud
 * and runs convex dev with appropriate configuration
 */

import { spawn } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// Check for local Docker setup
const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL || "";
const isLocalDocker =
  convexUrl.includes("127.0.0.1") ||
  convexUrl.includes("localhost") ||
  convexUrl.includes(":3210");
const isCloudUrl = convexUrl.includes(".convex.cloud");

// Check for self-hosted admin key
const adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

// Extract deployment name from cloud URL if available
let deploymentName = null;
if (isCloudUrl && convexUrl) {
  try {
    // Extract deployment from URL like https://xxx.convex.cloud
    const urlObj = new URL(convexUrl);
    deploymentName = urlObj.hostname.split(".")[0];
  } catch (e) {
    // Invalid URL, ignore
  }
}

// Build convex dev command
const args = ["dev"];

// If using local Docker and have admin key, use it
if (isLocalDocker && adminKey) {
  console.log("🔧 Using local Convex Docker instance...");
  args.push("--url", convexUrl);
  args.push("--admin-key", adminKey);
} else if (isLocalDocker && !adminKey) {
  console.log(
    "⚠️  Local Docker detected but CONVEX_SELF_HOSTED_ADMIN_KEY not set",
  );
  console.log("💡 Attempting to connect to Convex Cloud instead...");
  // Will use cloud by default
} else if (isCloudUrl && deploymentName) {
  console.log(`☁️  Using Convex Cloud deployment: ${deploymentName}...`);
} else {
  console.log("☁️  Using Convex Cloud (default deployment)...");
}

// Check if there's a convex.json file, create minimal one if missing and we have cloud URL
const convexJsonPath = path.join(projectRoot, "convex.json");
if (!existsSync(convexJsonPath)) {
  // Create a minimal, valid convex.json to avoid prompts.
  // Deployment selection should be controlled via CONVEX_DEPLOYMENT/CONVEX_URL env vars.
  console.log("📝 Creating minimal convex.json");
  const convexJson = {
    functions: "convex",
  };
  writeFileSync(convexJsonPath, JSON.stringify(convexJson, null, 2));
}

// Spawn convex dev with non-interactive environment
const env = {
  ...process.env,
  // Ensure non-interactive mode - prevents prompts
  CI: "true",
  // Set deployment if we have one
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT || deploymentName || "",
  // Pass the URL so convex can detect the deployment
  ...(isCloudUrl && convexUrl ? { CONVEX_URL: convexUrl } : {}),
};

const convexProcess = spawn("convex", args, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env,
});

convexProcess.on("error", (error) => {
  console.error("❌ Failed to start convex dev:", error.message);
  console.error("💡 Make sure Convex CLI is installed: npm install -g convex");
  process.exit(1);
});

convexProcess.on("exit", (code) => {
  process.exit(code || 0);
});

// Handle termination
process.on("SIGINT", () => {
  convexProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  convexProcess.kill("SIGTERM");
});
