/**
 * remove-embeddings.js
 *
 * Loads connection info from .env.local via dotenv, connects to MongoDB,
 * processes specific collections with collection-specific removal rules:
 *  - resumes: remove "embedding" and "embeddingGeneratedAt" (singular)
 *  - jobpostings: remove "embeddingGeneratedAt" (singular)
 *  - other collections: skipped (no changes)
 *
 * .env.local expected variables:
 *   MONGODB_HOST
 *   MONGODB_PORT
 *   MONGODB_DATABASE
 *   MONGODB_CLUSTER
 *   MONGODB_PASSWORD
 *   MONGODB_USERNAME
 *   DRY_RUN (optional, "true" or "false")
 *
 * Usage:
 *   # dry run (no writes)
 *   DRY_RUN=true node remove-embeddings.js
 *
 *   # actual run (writes)
 *   DRY_RUN=false node remove-embeddings.js
 */

import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Read env vars (from .env.local or environment)
const {
  MONGODB_HOST = "",
  MONGODB_PORT = "",
  MONGODB_DATABASE = "",
  MONGODB_CLUSTER = "",
  MONGODB_PASSWORD = "",
  MONGODB_USERNAME = ""
} = process.env;

// Validate required fields (allow cluster-based or host/port)
if (!MONGODB_DATABASE) {
  console.error(
    "ERROR: MONGODB_DATABASE must be set in .env.local or environment."
  );
  process.exit(1);
}
if (!MONGODB_CLUSTER && (!MONGODB_HOST || !MONGODB_PORT)) {
  console.error(
    "ERROR: either MONGODB_CLUSTER or both MONGODB_HOST and MONGODB_PORT must be set."
  );
  process.exit(1);
}
if (!MONGODB_USERNAME || !MONGODB_PASSWORD) {
  console.error(
    "ERROR: MONGODB_USERNAME and MONGODB_PASSWORD must be set in .env.local or environment."
  );
  process.exit(1);
}

// Build URI
let MONGODB_URI;
if (MONGODB_CLUSTER && MONGODB_CLUSTER.trim() !== "") {
  // Use SRV connection
  MONGODB_URI = `mongodb+srv://${encodeURIComponent(
    MONGODB_USERNAME
  )}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_CLUSTER}/${encodeURIComponent(
    MONGODB_DATABASE
  )}?retryWrites=true&w=majority`;
} else {
  MONGODB_URI = `mongodb://${encodeURIComponent(
    MONGODB_USERNAME
  )}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${encodeURIComponent(
    MONGODB_DATABASE
  )}?retryWrites=true&w=majority`;
}

const DB_NAME = MONGODB_DATABASE;
// We'll still list collections of interest; only resumes and jobpostings are modified
const COLLECTIONS = [
  "resumes",
  "jobpostings",
  "kfcpoints",
  "nominations",
  "employees",
  "cobecadmin"
];

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "500", 10);
const DRY_RUN = false;
const LOG_SAMPLE_DOCS = parseInt(process.env.LOG_SAMPLE_DOCS || "3", 10);

// Recursively remove keys in keysToRemove array from obj.
// Returns true if any key was removed.
function stripKeys(obj, keysToRemove) {
  let changed = false;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const childChanged = stripKeys(obj[i], keysToRemove);
      if (childChanged) changed = true;
    }
    return changed;
  }

  if (obj && typeof obj === "object") {
    // Collect keys because we'll mutate object during iteration
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (keysToRemove.includes(k)) {
        delete obj[k];
        changed = true;
        continue;
      }
      const child = obj[k];
      if (child && typeof child === "object") {
        const childChanged = stripKeys(child, keysToRemove);
        if (childChanged) changed = true;
      }
    }
  }

  return changed;
}

// Pretty-print a small diff example: show keys that existed and were removed
function findRemovedKeys(original, cleaned, keysToMatch, path = "") {
  const removed = [];
  if (Array.isArray(original)) {
    for (let i = 0; i < original.length; i++) {
      const sub = findRemovedKeys(
        original[i],
        cleaned && cleaned[i],
        keysToMatch,
        `${path}[${i}]`
      );
      removed.push(...sub);
    }
    return removed;
  }

  if (original && typeof original === "object") {
    for (const k of Object.keys(original)) {
      const newPath = path ? `${path}.${k}` : k;
      if (!(k in (cleaned || {}))) {
        if (keysToMatch.includes(k)) {
          removed.push(newPath);
        }
      } else {
        const childRemoved = findRemovedKeys(
          original[k],
          cleaned[k],
          keysToMatch,
          newPath
        );
        removed.push(...childRemoved);
      }
    }
  }
  return removed;
}

async function processCollection(db, collName) {
  const coll = db.collection(collName);

  // Define collection-specific keys to remove:
  // - resumes: remove "embedding" and "embeddingGeneratedAt"
  // - jobpostings: remove only "embeddingGeneratedAt"
  // - others: skip (no removal)
  let keysToRemove = [];
  if (collName === "resumes") {
    keysToRemove = ["embedding", "embeddingGeneratedAt"];
  } else if (collName === "jobpostings") {
    keysToRemove = ["embeddingGeneratedAt"];
  } else {
    console.log(`\nCollection: ${collName} - skipping (no keys to remove)`);
    return { processed: 0, modified: 0 };
  }

  // Build a query that finds documents that have any of the keys to remove
  const orClauses = keysToRemove.map((k) => ({ [k]: { $exists: true } }));
  const query = { $or: orClauses };

  const totalMatch = await coll.countDocuments(query);
  console.log(`\nCollection: ${collName} - documents matching: ${totalMatch}`);
  if (totalMatch === 0) return { processed: 0, modified: 0 };

  const cursor = coll.find(query).batchSize(BATCH_SIZE);
  let batch = [];
  let processed = 0;
  let modified = 0;
  let sampleLogged = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    processed++;

    // Keep the original for sample/diff only
    const original = JSON.parse(JSON.stringify(doc));

    // Remove _id from doc for safe replacement logic, but keep _id value separately
    const id = doc._id;
    delete doc._id;

    // Recursively strip unwanted fields for this collection
    const changed = stripKeys(doc, keysToRemove);

    if (changed) {
      modified++;
      // For updates, we want to replace the document (preserving any other fields)
      const cleanedDoc = { ...doc, _id: id };

      // Optionally log a few examples
      if (sampleLogged < LOG_SAMPLE_DOCS) {
        const removedPaths = findRemovedKeys(original, cleanedDoc, keysToRemove);
        if (DRY_RUN) {
          console.log(
            `  (sample) doc _id=${id} would have removed keys: ${JSON.stringify(
              removedPaths
            )}`
          );
        } else {
          console.log(
            `  (sample) doc _id=${id} removed keys: ${JSON.stringify(
              removedPaths
            )}`
          );
        }
        sampleLogged++;
      }

      if (!DRY_RUN) {
        batch.push({
          replaceOne: {
            filter: { _id: id },
            replacement: cleanedDoc,
            upsert: false
          }
        });
      }
    }

    // Execute batch if full
    if (!DRY_RUN && batch.length >= BATCH_SIZE) {
      const res = await coll.bulkWrite(batch, { ordered: false });
      console.log(
        `  bulkWrite executed for ${batch.length} ops. matchedCount: ${res.matchedCount}, modifiedCount: ${res.modifiedCount}`
      );
      batch = [];
    }
  }

  // Final flush
  if (!DRY_RUN && batch.length > 0) {
    const res = await coll.bulkWrite(batch, { ordered: false });
    console.log(
      `  final bulkWrite executed for ${batch.length} ops. matchedCount: ${res.matchedCount}, modifiedCount: ${res.modifiedCount}`
    );
  }

  console.log(
    `Collection ${collName} finished. processed=${processed}  modified=${modified}`
  );
  return { processed, modified };
}

async function main() {
  console.log("Using connection string:", MONGODB_URI);
  console.log("DB:", DB_NAME);
  console.log("Collections to process:", COLLECTIONS.join(", "));
  console.log("Batch size:", BATCH_SIZE);
  console.log("Dry run:", DRY_RUN);
  console.log("");

  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);

    const summary = [];
    for (const collName of COLLECTIONS) {
      try {
        const res = await processCollection(db, collName);
        summary.push({ collName, ...res });
      } catch (err) {
        console.error(`Error processing collection ${collName}:`, err);
      }
    }

    console.log("\nSummary:");
    for (const s of summary) {
      console.log(
        `  ${s.collName}: processed=${s.processed} modified=${s.modified}`
      );
    }

    if (DRY_RUN) {
      console.log(
        "\nDRY_RUN=true — no writes were performed. Set DRY_RUN=false to apply changes."
      );
    } else {
      console.log("\nWrites completed. Verify data and consider reindexing if needed.");
    }
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await client.close();
    console.log("Mongo client closed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});