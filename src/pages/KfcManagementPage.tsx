import React, { useState, useEffect } from 'react';
import KfcPointsManager from '../components/KfcPointsManager';
import KfcNomination from '../components/KfcNomination';
import ResumeManager from '../components/ResumeManager';
import { Trophy, Users, Database, Settings, AlertCircle, Shield } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function KfcManagementPage() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'manager' | 'nominations' | 'database'>('nominations');
  const [isClientReady, setIsClientReady] = useState(true); // Always ready with Convex
  const [clientError, setClientError] = useState<string | null>(null);
  
  // Admin check using Convex
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Convex queries
  const cobecAdmins = useQuery(api.cobecAdmins.getAllCobecAdmins);
  const databaseStatus = useQuery(api.kfcData.getDatabaseStatus);

  // Check admin status from Convex
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check if user is in cobecadmins collection
        const isUserAdmin = cobecAdmins?.some(admin => admin.clerkUserId === userId) || false;
        console.log(`✅ Convex Admin check result: ${isUserAdmin}`);
        setIsAdmin(isUserAdmin);
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [userId, cobecAdmins]);

  // Handle tab changes
  const handleTabChange = (tab: 'manager' | 'nominations' | 'database') => {
    setActiveTab(tab);
  };

  // Loading state
  if (cobecAdmins === undefined) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-oxford-blue-DEFAULT text-mint_cream-500' : 'bg-mint-cream-900 text-mint-cream-DEFAULT'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-powder-blue-600"></div>
          <span className="ml-2">Loading KFC management...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-oxford-blue-DEFAULT text-white' : 'bg-mint-cream-900 text-mint-cream-DEFAULT'}`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'bg-berkeley-blue-DEFAULT' : 'border-yale-blue-300 bg-berkeley-blue-DEFAULT'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">KFC Management</h1>
              <p className="text-sm text-mint-cream-700 mt-1">
                Manage KFC points, nominations, and database operations
              </p>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              {isAdmin !== null && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${ isAdmin ? 'bg-green-100 text-green-800' : 'bg-mint-cream-800 text-mint-cream-DEFAULT' }`}>
                  <Shield className="w-4 h-4" />
                  <span>{isAdmin ? 'Admin Access' : 'User Access'}</span>
                </div>
              )}
              
              {databaseStatus && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-yale-blue-500 text-blue-800 bg-yale-blue-500/20 text-mint-cream-DEFAULT">
                  <Database className="w-4 h-4" />
                  <span>{databaseStatus.kfcCount} KFC, {databaseStatus.employeeCount} Emp</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`border-b ${theme === 'dark' ? 'bg-berkeley-blue-DEFAULT' : 'border-yale-blue-300 bg-berkeley-blue-DEFAULT'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('nominations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'nominations' ? 'border-powder-blue-600 text-yale_blue-500' : 'border-transparent text-mint-cream-700 hover:text-mint-cream-500 hover:border-yale-blue-400'}`}
            >
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4" />
                <span>Nominations</span>
              </div>
            </button>
            
            <button
              onClick={() => handleTabChange('manager')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === 'manager' ? 'border-powder-blue-600 text-powder-blue-600' : 'border-transparent text-mint-cream-700 hover:text-mint-cream-500 hover:border-yale-blue-400' }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Points Manager</span>
              </div>
            </button>
            
            {isAdmin && (
              <button
                onClick={() => handleTabChange('database')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === 'database' ? 'border-powder-blue-600 text-powder-blue-600' : 'border-transparent text-mint-cream-700 hover:text-mint-cream-500 hover:border-yale-blue-400' }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Resumes</span>
                </div>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {clientError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <strong>Connection Error:</strong> {clientError}
                <div className="mt-2 text-sm">
                  <p>This could be due to:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Convex deployment not being available</li>
                    <li>Network connectivity issues</li>
                    <li>Authentication problems</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isClientReady && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-powder-blue-600"></div>
            <span className="ml-2">Initializing KFC management system...</span>
          </div>
        )}

        {/* Tab Content */}
        {isClientReady && (
          <div>
            {activeTab === 'nominations' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">KFC Nominations</h2>
                  <p className="text-powder_blue-400">
                    Create and manage employee nominations for KFC points. Nominations can be for Team efforts, Individual achievements, or Growth & Development.
                  </p>
                </div>
                <KfcNomination />
              </div>
            )}

            {activeTab === 'manager' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">KFC Points Manager</h2>
                  <p className="text-powder_blue-400">
                    View and manage KFC points for all employees. Add new employees and track their points and events.
                  </p>
                </div>
                <KfcPointsManager />
              </div>
            )}

            {activeTab === 'database' && isAdmin && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Resume Management</h2>
                  <p className="text-mint-cream-600">
                    Import and manage candidate resumes.
                  </p>
                </div>
                <ResumeManager />
              </div>
            )}
          </div>
        )}

        {/* Admin Access Required Message */}
        {activeTab === 'database' && !isAdmin && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-mint-cream-700" />
            <h3 className="text-lg font-medium text-oxford_blue-500 mb-2">
              Admin Access Required
            </h3>
            <p className="text-mint-cream-600">
              You need admin privileges to access the database management section.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t ${theme === 'dark' ? 'bg-berkeley-blue-DEFAULT' : 'border-yale-blue-300 bg-berkeley-blue-DEFAULT'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-mint-cream-700">
            <div>
              <span>Powered by Convex • Real-time updates enabled</span>
            </div>
            <div>
              <span>Vector search remains with MongoDB cluster</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 