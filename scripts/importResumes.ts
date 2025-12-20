#!/usr/bin/env node
/**
 * importResumes.ts
 * Local Resume Bulk Importer (CLI)
 * 
 * Synchronizes a local directory (/Resumes/) with a Convex backend.
 * Performs recursive file discovery, local parsing, binary storage upload, and metadata indexing.
 * 
 * Usage:
 *   npx tsx scripts/importResumes.ts
 *   or
 *   bun run scripts/importResumes.ts
 * 
 * Environment Variables:
 *   CONVEX_URL - Your Convex deployment URL (required)
 *   RESUME_DIR - Path to resume directory (default: ./Resumes)
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
const RESUME_DIR = process.env.RESUME_DIR || path.join(__dirname, "..", "Resumes");

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is required");
  console.error("   Set it in your .env.local file or export it:");
  console.error("   export CONVEX_URL='http://127.0.0.1:3210'");
  console.error("   or");
  console.error("   export CONVEX_URL='https://your-deployment.convex.cloud'");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

/**
 * Recursively find all .docx files in a directory and all subdirectories
 * No limit - processes all files found
 */
function findDocxFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`❌ Error: Directory does not exist: ${dir}`);
    return files;
  }

  function walkDir(currentPath: string) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            // Recursively walk into subdirectories
            walkDir(fullPath);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx')) {
            files.push(fullPath);
          }
        } catch (error) {
          // Continue processing even if one file/directory fails
          console.warn(`⚠️  Warning: Could not process ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      // Continue processing even if one directory fails
      console.warn(`⚠️  Warning: Could not read directory ${currentPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  walkDir(dir);
  return files;
}

/**
 * Extract text from DOCX file using mammoth (local-only, no AI)
 */
async function parseDocx(filePath: string): Promise<{ text: string; buffer: Buffer }> {
  const buffer = await fs.promises.readFile(filePath);
  const { value: text } = await mammoth.extractRawText({ buffer });
  return { text, buffer };
}

/**
 * Calculate MD5 checksum of a buffer
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Upload file to Convex storage using action
 */
async function uploadToStorage(buffer: Buffer, filename: string): Promise<string> {
  // Convert buffer to base64 for transmission
  const base64Data = buffer.toString('base64');
  
  // Call the Convex action to upload the file
  const result = await client.action(api.resumesActions.uploadFileToStorage, {
    fileData: base64Data,
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  if (!result.storageId) {
    throw new Error("Storage upload response missing storageId");
  }

  return result.storageId;
}

/**
 * Import a single resume file
 */
async function importResume(filePath: string): Promise<{ success: boolean; filename: string; error?: string }> {
  const filename = path.basename(filePath);
  
  try {
    // 1. Extract text locally (no external AI calls)
    const { text: textContent, buffer } = await parseDocx(filePath);
    
    if (!textContent || textContent.trim().length === 0) {
      return {
        success: false,
        filename,
        error: "No text content could be extracted from the document",
      };
    }

    // 2. Calculate checksum to prevent duplicates
    const checksum = calculateChecksum(buffer);

    // 3. Upload binary to Convex Storage
    const storageId = await uploadToStorage(buffer, filename);

    // 4. Save metadata/text to DB via mutation
    const result = await client.mutation(api.resumes.insertResume, {
      filename,
      storageId: storageId as any, // Type assertion for storage ID
      textContent,
      checksum,
    });

    if (result.skipped) {
      return {
        success: true,
        filename,
        error: "Skipped (duplicate checksum)",
      };
    }

    return {
      success: true,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main import function
 */
async function runImport() {
  console.log("🚀 Starting Local Resume Bulk Import");
  console.log(`📁 Resume Directory: ${RESUME_DIR}`);
  console.log(`🔗 Convex URL: ${CONVEX_URL}`);
  console.log("");

  // Find all .docx files
  const files = findDocxFiles(RESUME_DIR);
  
  if (files.length === 0) {
    console.log("⚠️  No .docx files found in the resume directory");
    return;
  }

  console.log(`📄 Found ${files.length} .docx file(s) to import\n`);

  // Process files sequentially (safer for 100+ files)
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const errors: Array<{ filename: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = path.basename(file);
    const progress = `[${i + 1}/${files.length}]`;
    
    process.stdout.write(`${progress} Processing: ${filename}... `);
    
    const result = await importResume(file);
    
    if (result.success) {
      if (result.error && result.error.includes("Skipped")) {
        skipCount++;
        console.log("⏭️  Skipped (duplicate)");
      } else {
        successCount++;
        console.log("✅ Imported");
      }
    } else {
      failCount++;
      errors.push({ filename, error: result.error || "Unknown error" });
      console.log(`❌ Failed: ${result.error}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Import Summary");
  console.log("=".repeat(50));
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`⏭️  Skipped (duplicates): ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📄 Total processed: ${files.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    errors.forEach(({ filename, error }) => {
      console.log(`   - ${filename}: ${error}`);
    });
  }

  console.log("\n✨ Import complete!");
}

// Run the import
runImport().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
