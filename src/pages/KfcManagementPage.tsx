import React, { useState, useEffect } from 'react';
import KfcPointsManager from '../components/KfcPointsManager';
import KfcNomination from '../components/KfcNomination';
import DatabaseManager from '../components/DatabaseManager';
import { Trophy, Users, Database, Settings, AlertCircle } from 'lucide-react';
import { getMongoClient } from '../lib/mongoClient';
import { useTheme } from '../lib/ThemeContext';

// Client-side MongoDB-like service for KFC operations
class KfcClientService {
  private client: any = null;

  async connect() {
    if (this.client) return this.client;
    
    try {
      console.log('Connecting to client database...');
      this.client = await getMongoClient();
      console.log('Successfully connected to client database');
      return this.client;
    } catch (error) {
      console.error('Failed to connect to client database:', error);
      throw error;
    }
  }

  async getDatabase() {
    if (!this.client) {
      await this.connect();
    }
    return this.client.getDatabase('workdemos');
  }

  async close() {
    // The client-side service handles connection management
    // No need to explicitly close
  }
}

// Global client service instance for KFC operations
const kfcClientService = new KfcClientService();

export function KfcManagementPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'manager' | 'nominations' | 'database'>('manager');
  const [isClientReady, setIsClientReady] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Initialize the client when the component mounts
  useEffect(() => {
    const initializeClient = async () => {
      try {
        console.log('🔄 Initializing KFC MongoDB client...');
        await kfcClientService.connect();
        console.log('✅ KFC MongoDB client initialized successfully');
        setIsClientReady(true);
        setClientError(null);
      } catch (error) {
        console.error('❌ Failed to initialize KFC client:', error);
        setClientError(error instanceof Error ? error.message : 'Failed to initialize database connection');
        setIsClientReady(false);
      }
    };

    initializeClient();
  }, []);

  if (clientError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Database Connection Error
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {clientError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isClientReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Initializing database connection...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'manager' as const,
      name: 'Points Manager',
      icon: Trophy,
      description: 'Manage KFC points and rewards'
    },
    {
      id: 'nominations' as const,
      name: 'Nominations',
      icon: Users,
      description: 'Handle employee nominations'
    },
    {
      id: 'database' as const,
      name: 'Database',
      icon: Database,
      description: 'Database management tools'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  KFC Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage points, nominations, and database operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Content Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center space-x-3">
              {(() => {
                const activeTabData = tabs.find(tab => tab.id === activeTab);
                const Icon = activeTabData?.icon || Settings;
                return (
                  <>
                    <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {activeTabData?.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTabData?.description}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'manager' ? (
              <KfcPointsManager mongoClient={kfcClientService} />
            ) : activeTab === 'nominations' ? (
              <KfcNomination mongoClient={kfcClientService} />
            ) : (
              <DatabaseManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 