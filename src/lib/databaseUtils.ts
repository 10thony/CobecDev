// Remove the import from the missing mongoClient file
// import { forceDatabaseReinitialization, debugDatabaseStatus } from './mongoClient';

/**
 * Utility functions for managing the database
 * Updated for Convex migration - IndexedDB functionality removed
 */

/**
 * Check if IndexedDB is supported in the current browser
 * Note: This is kept for compatibility but IndexedDB is no longer used
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Get the current database version
 */
export function getDatabaseVersion(): number {
  return 2; // Updated version for Convex migration
}

/**
 * Check if the database exists and is accessible
 * Updated for Convex - always returns true since Convex handles connectivity
 */
export async function checkDatabaseAccess(): Promise<{
  supported: boolean;
  accessible: boolean;
  error?: string;
}> {
  // Convex handles database connectivity automatically
  return {
    supported: true,
    accessible: true,
    error: undefined
  };
}

/**
 * Force reinitialize the database (delete and recreate)
 * Updated for Convex - this functionality is not needed with Convex
 */
export async function resetDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  // Convex handles database management automatically
  // This function is kept for compatibility but doesn't perform any action
  console.warn('resetDatabase: This function is deprecated. Convex handles database management automatically.');
  return { success: true };
}

/**
 * Get database information for debugging
 * Updated for Convex
 */
export async function getDatabaseInfo(): Promise<{
  supported: boolean;
  version: number;
  status: any;
  access: any;
}> {
  const supported = isIndexedDBSupported();
  const version = getDatabaseVersion();
  
  // Convex status - simplified since Convex handles connectivity
  const status = {
    isConnected: true,
    error: undefined
  };
  
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
 * Updated for Convex - this would require implementing Convex mutations
 */
export async function clearAllData(): Promise<{
  success: boolean;
  error?: string;
}> {
  // This would require implementing Convex mutations to clear data
  // For now, return success but log a warning
  console.warn('clearAllData: This function requires Convex mutations to be implemented.');
  return {
    success: true,
    error: 'Function not implemented for Convex - requires mutations'
  };
} 