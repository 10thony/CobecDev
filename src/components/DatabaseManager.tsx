import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { 
  getDatabaseInfo, 
  resetDatabase, 
  isIndexedDBSupported,
  checkDatabaseAccess 
} from '../lib/databaseUtils';
import { RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';

const DatabaseManager: React.FC = () => {
  const { theme } = useTheme();
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await getDatabaseInfo();
      setDbInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database info');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('This will delete all data in the database. Are you sure you want to continue?')) {
      return;
    }

    try {
      setResetLoading(true);
      const result = await resetDatabase();
      
      if (result.success) {
        alert('Database reset successfully! The page will refresh in 2 seconds.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(result.error || 'Failed to reset database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset database');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database Manager</h1>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900 dark:text-white">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span>Database Status</span>
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">IndexedDB Supported:</span>
              <span className={dbInfo?.supported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {dbInfo?.supported ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Database Accessible:</span>
              <span className={dbInfo?.access?.accessible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {dbInfo?.access?.accessible ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Database Version:</span>
              <span className="text-gray-900 dark:text-white">{dbInfo?.version}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Connection Status:</span>
              <span className={dbInfo?.status?.isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {dbInfo?.status?.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900 dark:text-white">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Actions</span>
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={loadDatabaseInfo}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Status
            </button>
            
            <button
              onClick={handleResetDatabase}
              disabled={resetLoading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetLoading ? 'Resetting...' : 'Reset Database'}
            </button>
          </div>
        </div>
      </div>

      {/* Troubleshooting Guide */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-gray-900 dark:text-white">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span>Troubleshooting Guide</span>
        </h3>
        
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p><strong>If you see "object stores was not found" error:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Click "Reset Database" above</li>
            <li>Wait for the page to refresh automatically</li>
            <li>If the error persists, try clearing your browser cache</li>
          </ol>
          
          <p className="mt-3"><strong>If IndexedDB is not supported:</strong></p>
          <p className="ml-4">Try using a different browser (Chrome, Firefox, Safari, Edge)</p>
          
          <p className="mt-3"><strong>If database is not accessible:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Check if you're in private/incognito mode</li>
            <li>Ensure cookies and site data are enabled</li>
            <li>Try refreshing the page</li>
          </ol>
        </div>
      </div>

      {/* Debug Information */}
      {dbInfo && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Debug Information</h3>
          <pre className="text-xs bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-600 overflow-auto text-gray-900 dark:text-gray-100">
            {JSON.stringify(dbInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager; 