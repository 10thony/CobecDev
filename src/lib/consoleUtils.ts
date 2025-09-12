import { getDatabaseInfo, resetDatabase } from './databaseUtils';

/**
 * Console utilities for debugging and managing the database
 * Updated for Convex migration - IndexedDB functionality removed
 */

// Make these functions available globally for console access
declare global {
  interface Window {
    resetKfcDatabase: () => Promise<void>;
    checkKfcDatabase: () => Promise<void>;
    debugKfcDatabase: () => Promise<void>;
    getKfcDatabaseInfo: () => Promise<void>;
  }
}

/**
 * Reset the KFC database (delete and recreate)
 * Updated for Convex - this functionality is not needed with Convex
 * Usage: resetKfcDatabase()
 */
export async function resetKfcDatabase(): Promise<void> {
  try {
    console.log('🔄 Resetting KFC database...');
    console.log('ℹ️  Note: This function is deprecated. Convex handles database management automatically.');
    await resetDatabase();
    console.log('✅ Database reset completed (no action taken - Convex handles this automatically)');
    console.log('🔄 Refreshing page in 2 seconds...');
    // Data will automatically refresh via Convex reactive queries
    // No need for manual page reload
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
  }
}

/**
 * Check the KFC database status
 * Updated for Convex
 * Usage: checkKfcDatabase()
 */
export async function checkKfcDatabase(): Promise<void> {
  try {
    console.log('🔍 Checking KFC database status...');
    const access = await getDatabaseInfo();
    console.log('📊 Database Status:', access);
    
    if (access.access.accessible) {
      console.log('✅ Database is connected and working (Convex)');
    } else {
      console.log('❌ Database is not accessible');
      if (access.access.error) {
        console.log('🚨 Error:', access.access.error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to check database:', error);
  }
}

/**
 * Get detailed database information
 * Updated for Convex
 * Usage: debugKfcDatabase()
 */
export async function debugKfcDatabase(): Promise<void> {
  try {
    console.log('🔍 Getting detailed database information...');
    const info = await getDatabaseInfo();
    console.log('📊 Database Info:', info);
    
    if (info.supported) {
      console.log('✅ IndexedDB is supported (but not used - Convex handles storage)');
    } else {
      console.log('❌ IndexedDB is not supported (but not needed - using Convex)');
    }
    
    if (info.access.accessible) {
      console.log('✅ Database is accessible (Convex)');
    } else {
      console.log('❌ Database is not accessible');
      if (info.access.error) {
        console.log('🚨 Access Error:', info.access.error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to get database info:', error);
  }
}

/**
 * Get database information and display it nicely
 * Updated for Convex
 * Usage: getKfcDatabaseInfo()
 */
export async function getKfcDatabaseInfo(): Promise<void> {
  try {
    console.log('🔍 Getting KFC database information...');
    const info = await getDatabaseInfo();
    
    console.group('📊 KFC Database Information');
    console.log('IndexedDB Supported:', info.supported ? '✅ Yes' : '❌ No');
    console.log('Database Version:', info.version);
    console.log('Database Accessible:', info.access.accessible ? '✅ Yes' : '❌ No');
    console.log('Connection Status:', info.status.isConnected ? '✅ Connected' : '❌ Disconnected');
    console.log('Database Type:', '🔄 Convex (Cloud Database)');
    console.groupEnd();
    
    if (info.access.accessible) {
      console.log('✅ Database is working correctly with Convex');
    } else {
      console.log('❌ Database has issues');
      if (info.access.error) {
        console.log('🚨 Error:', info.access.error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to get database info:', error);
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.resetKfcDatabase = resetKfcDatabase;
  window.checkKfcDatabase = checkKfcDatabase;
  window.debugKfcDatabase = debugKfcDatabase;
  window.getKfcDatabaseInfo = getKfcDatabaseInfo;
  
  // Log available functions
  console.log('🔧 KFC Database Console Utilities loaded!');
  console.log('Available functions:');
  console.log('- resetKfcDatabase() - Reset the database');
  console.log('- checkKfcDatabase() - Check database status');
  console.log('- debugKfcDatabase() - Get detailed database info');
  console.log('- getKfcDatabaseInfo() - Get formatted database info');
} 