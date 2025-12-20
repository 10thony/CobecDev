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
        alert('Database reset successfully! Data will refresh automatically.');
        // Data will automatically refresh via Convex reactive queries
        // No need for manual page reload
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
        <Database className="w-6 h-6 text-powder-blue-600" />
        <h1 className="text-2xl font-bold text-mint-cream-DEFAULT">Database Manager</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Status */}
        <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md border border-yale-blue-300 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-mint-cream-DEFAULT">
            <CheckCircle className="w-5 h-5 text-mint-cream-600" />
            <span>Database Status</span>
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-mint-cream-600">IndexedDB Supported:</span>
              <span className={dbInfo?.supported ? 'text-mint-cream-600' : 'text-red-600'}>
                {dbInfo?.supported ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-mint-cream-600">Database Accessible:</span>
              <span className={dbInfo?.access?.accessible ? 'text-mint-cream-600' : 'text-red-600'}>
                {dbInfo?.access?.accessible ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-mint-cream-600">Database Version:</span>
              <span className="text-mint-cream-DEFAULT">{dbInfo?.version}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-mint-cream-600">Connection Status:</span>
              <span className={dbInfo?.status?.isConnected ? 'text-mint-cream-600' : 'text-red-600'}>
                {dbInfo?.status?.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md border border-yale-blue-300 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-mint-cream-DEFAULT">
            <RefreshCw className="w-5 h-5 text-powder-blue-600" />
            <span>Actions</span>
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={loadDatabaseInfo}
              className="w-full bg-yale-blue-DEFAULT text-white px-4 py-2 rounded-md hover:bg-yale-blue-600 transition-colors"
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
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-mint-cream-DEFAULT">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span>Troubleshooting Guide</span>
        </h3>
        
        <div className="space-y-2 text-sm text-mint-cream-500">
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
        <div className="mt-6 bg-mint-cream-900 rounded-lg p-6 border border-yale-blue-300">
          <h3 className="text-lg font-semibold mb-3 text-mint-cream-DEFAULT">Debug Information</h3>
          <pre className="text-xs bg-berkeley-blue-DEFAULT p-4 rounded border border-yale-blue-300 overflow-auto text-mint-cream-DEFAULT">
            {JSON.stringify(dbInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager; 