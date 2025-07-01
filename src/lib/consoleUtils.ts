import { forceDatabaseReinitialization, debugDatabaseStatus } from './mongoClient';
import { getDatabaseInfo, resetDatabase } from './databaseUtils';

/**
 * Console utilities for debugging and managing the IndexedDB database
 * These functions can be called from the browser console
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
 * Usage: resetKfcDatabase()
 */
export async function resetKfcDatabase(): Promise<void> {
  try {
    console.log('🔄 Resetting KFC database...');
    await forceDatabaseReinitialization();
    console.log('✅ Database reset successfully!');
    console.log('🔄 Refreshing page in 2 seconds...');
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
  }
}

/**
 * Check the KFC database status
 * Usage: checkKfcDatabase()
 */
export async function checkKfcDatabase(): Promise<void> {
  try {
    console.log('🔍 Checking KFC database status...');
    const status = await debugDatabaseStatus();
    console.log('📊 Database Status:', status);
    
    if (status.isConnected) {
      console.log('✅ Database is connected and working');
    } else {
      console.log('❌ Database is not connected');
      if (status.error) {
        console.log('🚨 Error:', status.error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to check database:', error);
  }
}

/**
 * Get detailed database information
 * Usage: debugKfcDatabase()
 */
export async function debugKfcDatabase(): Promise<void> {
  try {
    console.log('🔍 Getting detailed database information...');
    const info = await getDatabaseInfo();
    console.log('📊 Database Info:', info);
    
    if (info.supported) {
      console.log('✅ IndexedDB is supported');
    } else {
      console.log('❌ IndexedDB is not supported');
    }
    
    if (info.access.accessible) {
      console.log('✅ Database is accessible');
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
    
    if (info.access.error) {
      console.log('🚨 Access Error:', info.access.error);
    }
    
    if (info.status.error) {
      console.log('🚨 Status Error:', info.status.error);
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('❌ Failed to get database information:', error);
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