import { forceDatabaseReinitialization, debugDatabaseStatus } from './mongoClient';

/**
 * Utility functions for managing the IndexedDB database
 */

/**
 * Check if IndexedDB is supported in the current browser
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Get the current database version
 */
export function getDatabaseVersion(): number {
  return 1; // This should match the version in mongoClient.ts
}

/**
 * Check if the database exists and is accessible
 */
export async function checkDatabaseAccess(): Promise<{
  supported: boolean;
  accessible: boolean;
  error?: string;
}> {
  if (!isIndexedDBSupported()) {
    return {
      supported: false,
      accessible: false,
      error: 'IndexedDB is not supported in this browser'
    };
  }

  try {
    const status = await debugDatabaseStatus();
    return {
      supported: true,
      accessible: status.isConnected,
      error: status.error
    };
  } catch (error) {
    return {
      supported: true,
      accessible: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Force reinitialize the database (delete and recreate)
 */
export async function resetDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await forceDatabaseReinitialization();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get database information for debugging
 */
export async function getDatabaseInfo(): Promise<{
  supported: boolean;
  version: number;
  status: any;
  access: any;
}> {
  const supported = isIndexedDBSupported();
  const version = getDatabaseVersion();
  const status = await debugDatabaseStatus();
  const access = await checkDatabaseAccess();

  return {
    supported,
    version,
    status,
    access
  };
}

/**
 * Clear all data from the database (but keep the structure)
 */
export async function clearAllData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // This would require implementing a clear method in the Collection class
    // For now, we'll just reset the entire database
    return await resetDatabase();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 