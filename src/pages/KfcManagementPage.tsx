import React, { useState, useEffect } from 'react';
import KfcPointsManager from '../components/KfcPointsManager';
import KfcNomination from '../components/KfcNomination';
import DatabaseManager from '../components/DatabaseManager';
import { Trophy, Users, Database, Settings, AlertCircle, Shield } from 'lucide-react';
import { getMongoClient } from '../lib/mongoClient';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Import cobecadmins data
import cobecadminsData from '../../workdemos.cobecadmins.json';

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
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'manager' | 'nominations' | 'database'>('nominations');
  const [isClientReady, setIsClientReady] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  
  // Admin check using MongoDB cluster directly
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Initialize the client and load cobecadmins data when the component mounts
  useEffect(() => {
    const initializeClientAndLoadData = async () => {
      try {
        console.log('🔄 Initializing KFC MongoDB client...');
        await kfcClientService.connect();
        console.log('✅ KFC MongoDB client initialized successfully');
        
        // Load cobecadmins data automatically
        await loadCobecAdminsData();
        
        // Check admin status from MongoDB cluster
        await checkAdminStatus();
        
        setIsClientReady(true);
        setClientError(null);
      } catch (error) {
        console.error('❌ Failed to initialize KFC client:', error);
        setClientError(error instanceof Error ? error.message : 'Failed to initialize database connection');
        setIsClientReady(false);
      }
    };

    initializeClientAndLoadData();
  }, []);

  // Function to automatically load cobecadmins data
  const loadCobecAdminsData = async () => {
    try {
      console.log('🔄 Loading cobecadmins data automatically...');
      
      const db = await kfcClientService.getDatabase();
      const cobecadminsCollection = db.collection('cobecadmins');
      
      // Check if collection exists, if not create it
      const collections = await db.listCollections();
      const cobecadminsExists = collections.some((col: { name: string }) => col.name === 'cobecadmins');
      if (!cobecadminsExists) {
        console.log('📝 cobecadmins collection does not exist, but it should be created automatically by the database setup');
        console.log('Available collections:', collections.map((col: { name: string }) => col.name));
      }
      
      console.log(`📄 Processing ${cobecadminsData.length} admin entries from JSON...`);
      
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      
      for (const entry of cobecadminsData) {
        try {
          // Extract the clerkUserId from the nested _id structure
          const clerkUserId = (entry._id as any)?.clerkuserid || (entry._id as any)?.clerkUserId || '';
          
          if (!clerkUserId) {
            console.log('⚠️ Skipping entry with no clerkUserId:', entry);
            skipCount++;
            continue;
          }
          
          // Create the properly formatted admin entry
          const adminEntry = {
            clerkuserid: clerkUserId, // Use lowercase as specified
            name: `Admin User ${clerkUserId.slice(-4)}`, // Generate a name from the ID
            email: `${clerkUserId}@example.com`, // Generate an email
            role: 'admin',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          // Check if admin already exists
          const existingAdmin = await cobecadminsCollection.findOne({ 
            clerkuserid: adminEntry.clerkuserid 
          });
          
          if (existingAdmin) {
            console.log(`⚠️ Admin already exists: ${adminEntry.clerkuserid}`);
            skipCount++;
          } else {
            const result = await cobecadminsCollection.insertOne(adminEntry);
            console.log(`✅ Added cobec admin: ${adminEntry.clerkuserid} (${result.insertedId})`);
            successCount++;
          }
          
        } catch (error) {
          console.error(`❌ Error processing entry:`, entry, error instanceof Error ? error.message : 'Unknown error');
          errorCount++;
        }
      }
      
      console.log(`📊 Cobecadmins loading complete: ${successCount} added, ${skipCount} skipped, ${errorCount} errors`);
      
    } catch (error) {
      console.error('❌ Error loading cobecadmins data:', error);
      // Don't throw here - we want the app to continue even if this fails
    }
  };

  // Function to check admin status from MongoDB cluster
  const checkAdminStatus = async () => {
    try {
      if (!userId) {
        console.log('No user ID available for admin check');
        setIsAdmin(false);
        return;
      }

      console.log(`🔍 Checking admin status for user: ${userId}`);
      
      const db = await kfcClientService.getDatabase();
      const cobecadminsCollection = db.collection('cobecadmins');
      
      const adminUser = await cobecadminsCollection.findOne({ 
        clerkuserid: userId 
      });
      
      const adminResult = adminUser !== null;
      console.log(`✅ Admin check result: ${adminResult}`);
      console.log('📊 Admin user found:', adminUser);
      setIsAdmin(adminResult);
      
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Expose debug functions to window for console access
  React.useEffect(() => {
    (window as any).debugKfcDatabase = async () => {
      console.log('🔧 Debugging KFC database...');
      try {
        const db = await kfcClientService.getDatabase();
        const cobecadminsCollection = db.collection('cobecadmins');
        const allAdmins = await cobecadminsCollection.findToArray({});
        console.log('📊 All cobecadmins in database:', allAdmins);
        console.log('👤 Current user ID:', userId);
        console.log('🔍 Checking if user is admin...');
        await checkAdminStatus();
        return allAdmins;
      } catch (error) {
        console.error('❌ Debug failed:', error);
        return null;
      }
    };
    
    (window as any).debugAdminCheck = checkAdminStatus;
    (window as any).reloadCobecAdmins = loadCobecAdminsData;
    
    console.log('🔧 Debug functions available:');
    console.log('  - window.debugKfcDatabase() - Check all admins and current user status');
    console.log('  - window.debugAdminCheck() - Re-check admin status');
    console.log('  - window.reloadCobecAdmins() - Reload cobecadmins data');
  }, [userId]);

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

  if (!isClientReady || isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            {!isClientReady ? 'Initializing database connection...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    );
  }

  // If user is not a cobec admin, only show the nominations tab
  const availableTabs = isAdmin
    ? [
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
      ]
    : [
        {
          id: 'nominations' as const,
          name: 'Nominations',
          icon: Users,
          description: 'Handle employee nominations'
        }
      ];

  // If user is not admin and trying to access a restricted tab, redirect to nominations
  if (!isAdmin && activeTab !== 'nominations') {
    setActiveTab('nominations');
  }

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
                  {isAdmin 
                    ? 'Manage points, nominations, and database operations'
                    : 'Submit and manage employee nominations'
                  }
                </p>
              </div>
              {!isAdmin && (
                <div className="ml-auto">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      Limited Access
                    </span>
                  </div>
                </div>
              )}
              
              {/* Debug info - remove in production */}
              <div className="ml-auto mr-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div>User ID: {userId?.slice(0, 20)}...</div>
                  <div>Admin Status: {isAdmin === null ? 'Loading...' : isAdmin ? 'Yes' : 'No'}</div>
                </div>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={checkAdminStatus}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Re-check Admin
                  </button>
                  <button
                    onClick={loadCobecAdminsData}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    Reload Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Only show if user is admin or if there are multiple tabs */}
      {availableTabs.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {availableTabs.map((tab) => {
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
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Content Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center space-x-3">
              {(() => {
                const activeTabData = availableTabs.find(tab => tab.id === activeTab);
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