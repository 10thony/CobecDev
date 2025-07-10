import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { getKfcMongoService } from '../lib/kfcMongoService';
import { useGlobalData } from '../lib/useGlobalData';
import { SectionLoadingSpinner } from './LoadingSpinner';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Import KFC data directly as fallback
import kfcData from '../../kfcpoints.json';

interface KfcEvent {
  type: 'Team' | 'Individ';
  month: string;
  quantity?: number;
}

interface KfcEntry {
  _id?: string;
  name: string;
  events: KfcEvent[];
  march_status: string | null;
  score: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Employee {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClerkUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: number;
  lastSignInAt?: number;
}

interface KfcPointsManagerProps {
  mongoClient: any;
}

const KfcPointsManager: React.FC<KfcPointsManagerProps> = ({ mongoClient }) => {
  const { theme } = useTheme();
  const { 
    kfcEntries, 
    employees, 
    isLoading, 
    error, 
    refreshData, 
    refreshKfcData, 
    addEmployee, 
    removeEmployee 
  } = useGlobalData();
  
  const [selectedEntry, setSelectedEntry] = useState<KfcEntry | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showLoadDataButton, setShowLoadDataButton] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{kfcCount: number, employeeCount: number} | null>(null);

  // Cobec Admin Management state
  const [showCobecAdminManagement, setShowCobecAdminManagement] = useState(false);
  const [newCobecAdminUserId, setNewCobecAdminUserId] = useState('');
  const [newCobecAdminName, setNewCobecAdminName] = useState('');
  const [newCobecAdminEmail, setNewCobecAdminEmail] = useState('');
  const [isAddingCobecAdmin, setIsAddingCobecAdmin] = useState(false);

  // State for MongoDB-based admin management
  const [isCobecAdmin, setIsCobecAdmin] = useState(false);
  const [allCobecAdmins, setAllCobecAdmins] = useState<any[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  // Clerk User Integration state
  const [selectedClerkUser, setSelectedClerkUser] = useState<string>('');
  const [clerkUsersError, setClerkUsersError] = useState<string | null>(null);
  const [clerkUsers, setClerkUsers] = useState<ClerkUser[]>([]);
  const [isLoadingClerkUsers, setIsLoadingClerkUsers] = useState(false);
  
  // Get Clerk users action
  const getClerkUsersAction = useAction(api.cobecAdmins.getClerkUsers);

  // Load Clerk users when component mounts or when admin management is opened
  const loadClerkUsers = async () => {
    if (!isCobecAdmin) return;
    
    setIsLoadingClerkUsers(true);
    setClerkUsersError(null);
    
    try {
      const users = await getClerkUsersAction();
      setClerkUsers(users);
    } catch (error) {
      console.error('Failed to load Clerk users:', error);
      setClerkUsersError("Failed to load users from Clerk. Please check your CLERK_SECRET_KEY configuration.");
      setClerkUsers([]);
    } finally {
      setIsLoadingClerkUsers(false);
    }
  };

  // Load Clerk users when admin status changes
  useEffect(() => {
    if (isCobecAdmin) {
      loadClerkUsers();
    }
  }, [isCobecAdmin]);

  // Load data on component mount
  useEffect(() => {
    if (kfcEntries.length === 0 && !isLoading) {
      refreshData();
    }
  }, [kfcEntries.length, isLoading, refreshData]);

  // Check admin status from MongoDB cluster
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const db = await mongoClient.getDatabase();
        const cobecadminsCollection = db.collection('cobecadmins');
        
        // Get current user ID from localStorage or other source
        const currentUserId = localStorage.getItem('currentUserId') || 'user_2yeq7o5pXddjNeLFDpoz5tTwkWS'; // Fallback for testing
        
        const adminUser = await cobecadminsCollection.findOne({ 
          clerkuserid: currentUserId 
        });
        
        const adminResult = adminUser !== null;
        console.log(`✅ MongoDB Admin check result: ${adminResult}`);
        setIsCobecAdmin(adminResult);
        
        if (adminResult) {
          // Load all admins if user is admin
          await loadAllCobecAdmins();
        }
        
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsCobecAdmin(false);
      }
    };

    checkAdminStatus();
  }, [mongoClient]);

  const loadAllCobecAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const db = await mongoClient.getDatabase();
      const cobecadminsCollection = db.collection('cobecadmins');
      
      const admins = await cobecadminsCollection.findToArray({});
      console.log(`📊 Loaded ${admins.length} cobec admins from MongoDB`);
      setAllCobecAdmins(admins);
    } catch (error) {
      console.error('❌ Error loading cobec admins:', error);
      setAllCobecAdmins([]);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const loadKfcDataFromJson = async () => {
    try {
      console.log('🔄 Loading KFC data from JSON file...');
      console.log(`📄 JSON data contains ${kfcData.length} entries`);
      
      const db = await mongoClient.getDatabase();
      
      // Load KFC points
      const kfcCollection = db.collection('kfcpoints');
      let kfcSuccessCount = 0;
      let kfcFailCount = 0;
      
      console.log('📊 Inserting KFC entries...');
      for (const entry of kfcData) {
        try {
          const kfcEntry = {
            ...entry,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await kfcCollection.insertOne(kfcEntry);
          kfcSuccessCount++;
          console.log(`✅ Added KFC entry: ${entry.name}`);
        } catch (error) {
          kfcFailCount++;
          console.error(`❌ Failed to add KFC entry: ${entry.name}`, error);
        }
      }
      
      // Load employees
      const employeesCollection = db.collection('employees');
      const employeeNames = [...new Set(kfcData.map(entry => entry.name))];
      let employeeSuccessCount = 0;
      let employeeFailCount = 0;
      
      console.log(`👥 Inserting ${employeeNames.length} unique employees...`);
      for (const name of employeeNames) {
        try {
          const employee = {
            name: name,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await employeesCollection.insertOne(employee);
          employeeSuccessCount++;
          console.log(`✅ Added employee: ${name}`);
        } catch (error) {
          employeeFailCount++;
          console.error(`❌ Failed to add employee: ${name}`, error);
        }
      }
      
      console.log(`🎉 Successfully loaded data! KFC: ${kfcSuccessCount} success, ${kfcFailCount} failed. Employees: ${employeeSuccessCount} success, ${employeeFailCount} failed.`);
      
      // Show success message
      setSuccessMessage(`Successfully loaded ${kfcSuccessCount} KFC entries and ${employeeSuccessCount} employees from JSON`);
      
      // Refresh data to show the newly loaded entries
      await refreshData();
      setShowLoadDataButton(false);
      
    } catch (err) {
      console.error('❌ Error loading KFC data from JSON:', err);
    }
  };

  const handleEntrySelect = (entry: KfcEntry) => {
    setSelectedEntry(entry);
  };

  const handleScoreChange = async (newScore: number) => {
    if (!selectedEntry) return;
    
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('kfcpoints');
      
      await collection.updateOne(
        { _id: selectedEntry._id },
        { 
          $set: { 
            score: newScore,
            updatedAt: new Date()
          }
        }
      );
      
      // Update selected entry
      setSelectedEntry({ ...selectedEntry, score: newScore });
      
      // Refresh data to update the list
      await refreshData();
      
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  };

  const handleAddEvent = async () => {
    if (!selectedEntry) return;
    
    const newEvent: KfcEvent = {
      type: 'Team',
      month: 'JAN',
      quantity: 1
    };
    
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('kfcpoints');
      
      const updatedEvents = [...selectedEntry.events, newEvent];
      
      await collection.updateOne(
        { _id: selectedEntry._id },
        { 
          $set: { 
            events: updatedEvents,
            updatedAt: new Date()
          }
        }
      );
      
      // Update selected entry
      const updatedEntry = { ...selectedEntry, events: updatedEvents };
      setSelectedEntry(updatedEntry);
      
      // Refresh data to update the list
      await refreshData();
      
    } catch (err) {
      console.error('Failed to add event:', err);
    }
  };

  const handleRemoveEvent = async (eventIndex: number) => {
    if (!selectedEntry) return;
    
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('kfcpoints');
      
      const updatedEvents = selectedEntry.events.filter((_, index) => index !== eventIndex);
      
      await collection.updateOne(
        { _id: selectedEntry._id },
        { 
          $set: { 
            events: updatedEvents,
            updatedAt: new Date()
          }
        }
      );
      
      // Update selected entry
      const updatedEntry = { ...selectedEntry, events: updatedEvents };
      setSelectedEntry(updatedEntry);
      
      // Refresh data to update the list
      await refreshData();
      
    } catch (err) {
      console.error('Failed to remove event:', err);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) return;
    
    try {
      await addEmployee(newEmployeeName.trim());
      setNewEmployeeName('');
      setShowAddEmployee(false);
      
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      await removeEmployee(employeeId);
    } catch (err) {
      console.error('Failed to remove employee:', err);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const db = await mongoClient.getDatabase();
      const kfcCollection = db.collection('kfcpoints');
      const employeesCollection = db.collection('employees');
      
      const kfcCount = await kfcCollection.countDocuments({});
      const employeeCount = await employeesCollection.countDocuments({});
      
      setDbStatus({ kfcCount, employeeCount });
      console.log(`📊 Database Status - KFC: ${kfcCount}, Employees: ${employeeCount}`);
      
      return { kfcCount, employeeCount };
    } catch (error) {
      console.error('❌ Error checking database status:', error);
      return { kfcCount: 0, employeeCount: 0 };
    }
  };

  // Debug function that can be called from browser console
  const debugDatabase = async () => {
    console.log('🔍 DEBUG: Checking database functionality...');
    
    try {
      // Try MongoDB cluster first
      try {
        const kfcService = await getKfcMongoService();
        console.log('✅ MongoDB cluster service connected');
        
        const status = await kfcService.getDatabaseStatus();
        console.log('📊 MongoDB cluster status:', status);
        
        const kfcEntries = await kfcService.getAllKfcEntries();
        console.log(`📊 MongoDB cluster KFC entries: ${kfcEntries.length}`);
        
        console.log('🎉 MongoDB cluster operations working correctly!');
        return true;
        
      } catch (mongoError) {
        console.log('⚠️ MongoDB cluster not available, testing IndexedDB...');
      }
      
      // Fallback to IndexedDB
      const db = await mongoClient.getDatabase();
      console.log('✅ IndexedDB connection successful');
      
      const kfcCollection = db.collection('kfcpoints');
      const employeesCollection = db.collection('employees');
      
      // Test basic operations
      const kfcCount = await kfcCollection.countDocuments({});
      const employeeCount = await employeesCollection.countDocuments({});
      
      console.log(`📊 IndexedDB collection counts - KFC: ${kfcCount}, Employees: ${employeeCount}`);
      
      // Test inserting a test document
      const testEntry = {
        name: 'TEST_USER',
        events: [{ type: 'Team', month: 'TEST' }],
        march_status: 'TEST',
        score: 999,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await kfcCollection.insertOne(testEntry);
      console.log('✅ IndexedDB test insert successful:', insertResult);
      
      // Test retrieving the test document
      const retrieved = await kfcCollection.findToArray({ name: 'TEST_USER' });
      console.log('✅ IndexedDB test retrieval successful:', retrieved);
      
      // Clean up test document
      await kfcCollection.deleteOne({ name: 'TEST_USER' });
      console.log('✅ IndexedDB test cleanup successful');
      
      console.log('🎉 All IndexedDB operations working correctly!');
      return true;
      
    } catch (error) {
      console.error('❌ Database debug failed:', error);
      return false;
    }
  };

  // Expose debug function to window for console access
  React.useEffect(() => {
    (window as any).debugKfcDatabase = debugDatabase;
    console.log('🔧 Debug function available: window.debugKfcDatabase()');
  }, []);

  const handleAddCobecAdmin = async () => {
    if (!newCobecAdminUserId.trim()) {
      alert('Please enter a Clerk User ID');
      return;
    }

    setIsAddingCobecAdmin(true);
    try {
      const db = await mongoClient.getDatabase();
      const cobecadminsCollection = db.collection('cobecadmins');
      
      // Check if admin already exists
      const existingAdmin = await cobecadminsCollection.findOne({ 
        clerkuserid: newCobecAdminUserId.trim() 
      });
      
      if (existingAdmin) {
        alert('User is already a Cobec Admin');
        return;
      }
      
      // Add new admin
      const newAdmin = {
        clerkuserid: newCobecAdminUserId.trim(),
        name: newCobecAdminName.trim() || `Admin User ${newCobecAdminUserId.trim().slice(-4)}`,
        email: newCobecAdminEmail.trim() || `${newCobecAdminUserId.trim()}@example.com`,
        role: 'admin',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await cobecadminsCollection.insertOne(newAdmin);
      
      setSuccessMessage(`Successfully added ${newAdmin.name} as Cobec Admin`);
      setNewCobecAdminUserId('');
      setNewCobecAdminName('');
      setNewCobecAdminEmail('');
      setShowCobecAdminManagement(false);
      
      // Reload admins list
      await loadAllCobecAdmins();
      
    } catch (error) {
      console.error('Failed to add Cobec Admin:', error);
      alert(`Failed to add Cobec Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingCobecAdmin(false);
    }
  };

  const handleRemoveCobecAdmin = async (clerkUserId: string) => {
    if (!confirm('Are you sure you want to remove this Cobec Admin?')) {
      return;
    }

    try {
      const db = await mongoClient.getDatabase();
      const cobecadminsCollection = db.collection('cobecadmins');
      
      await cobecadminsCollection.deleteOne({ clerkuserid: clerkUserId });
      setSuccessMessage('Successfully removed Cobec Admin');
      
      // Reload admins list
      await loadAllCobecAdmins();
      
    } catch (error) {
      console.error('Failed to remove Cobec Admin:', error);
      alert(`Failed to remove Cobec Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle Clerk user selection
  const handleClerkUserSelect = (userId: string) => {
    setSelectedClerkUser(userId);
    setNewCobecAdminUserId(userId);
    
    // Auto-fill name and email if available
    if (clerkUsers) {
      const selectedUser = clerkUsers.find((user: ClerkUser) => user.id === userId);
      if (selectedUser) {
        setNewCobecAdminName(selectedUser.fullName);
        setNewCobecAdminEmail(selectedUser.email);
      }
    }
  };

  // Reset form when closing admin management
  const handleCloseAdminManagement = () => {
    setShowCobecAdminManagement(false);
    setSelectedClerkUser('');
    setNewCobecAdminUserId('');
    setNewCobecAdminName('');
    setNewCobecAdminEmail('');
    setClerkUsersError(null);
  };

  // Open admin management and refresh Clerk users
  const handleOpenAdminManagement = () => {
    setShowCobecAdminManagement(true);
    // Refresh Clerk users when opening admin management
    if (isCobecAdmin) {
      loadClerkUsers();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <SectionLoadingSpinner text="Loading KFC data from database..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <strong>Database Error:</strong> {error}
              <div className="mt-2 text-sm">
                <p>This could be due to:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Database not being initialized properly</li>
                  <li>Browser storage limitations</li>
                  <li>IndexedDB not being supported</li>
                </ul>
              </div>
              <div className="mt-3 space-x-2">
                <button 
                  onClick={refreshData}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={debugDatabase}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                >
                  Debug Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KFC Points Manager</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{kfcEntries.length} KFC Entries</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{employees.length} Employees</span>
              </span>
              {dbStatus && (
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>DB: {dbStatus.kfcCount} KFC, {dbStatus.employeeCount} Emp</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
              title="Refresh data from database"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
            
            <button
              onClick={debugDatabase}
              className="px-4 py-2 rounded-md transition-colors flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              title="Debug database functionality"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Debug</span>
            </button>
          </div>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KFC Entries List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">KFC Entries</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {kfcEntries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No KFC entries found in database</p>
                    <p className="text-sm">The database appears to be empty. You can load sample data from the JSON file.</p>
                  </div>
                  <button
                    onClick={loadKfcDataFromJson}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Load Sample Data from JSON
                  </button>
                </div>
              ) : (
                kfcEntries.map((entry, index) => (
                  <div
                    key={entry._id || `entry-${index}`}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedEntry?._id === entry._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                    }`}
                    onClick={() => handleEntrySelect(entry)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900 dark:text-white text-lg">{entry.name}</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {entry.score} pts
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {entry.events.length} event{entry.events.length !== 1 ? 's' : ''}
                    </div>
                    {entry.events.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.events.slice(0, 3).map((event: KfcEvent, index: number) => (
                          <span
                            key={index}
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              event.type === 'Team' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {event.type} - {event.month}
                            {event.quantity && event.quantity > 1 && ` (x${event.quantity})`}
                          </span>
                        ))}
                        {entry.events.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{entry.events.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Entry Details */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Entry Details</h2>
            
            {selectedEntry ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Employee Name
                  </label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEntry.name}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Score
                  </label>
                  <input
                    type="number"
                    value={selectedEntry.score}
                    onChange={(e) => handleScoreChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Events ({selectedEntry.events.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedEntry.events.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex-1">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mr-2 ${
                            event.type === 'Team' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          }`}>
                            {event.type}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {event.month}
                            {event.quantity && event.quantity > 1 && ` (x${event.quantity})`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveEvent(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddEvent}
                      className="w-full mt-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add Event
                    </button>
                  </div>
                </div>

                {selectedEntry.march_status && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      March Status
                    </label>
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                      {selectedEntry.march_status}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                Select an entry to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employees Management */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Employees Management</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddEmployee(!showAddEmployee)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              {showAddEmployee ? 'Cancel' : 'Add Employee'}
            </button>
            {isCobecAdmin && (
              <button
                onClick={showCobecAdminManagement ? handleCloseAdminManagement : handleOpenAdminManagement}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                {showCobecAdminManagement ? 'Cancel' : 'Manage Cobec Admins'}
              </button>
            )}
          </div>
        </div>

        {showAddEmployee && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex gap-2">
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Enter employee name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddEmployee}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Cobec Admin Management Section */}
        {isCobecAdmin && showCobecAdminManagement && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-semibold mb-4 text-purple-900 dark:text-purple-100">Cobec Admin Management</h3>
            
            {/* Add New Cobec Admin Form */}
            <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-purple-200 dark:border-purple-600">
              <h4 className="font-medium mb-3 text-purple-900 dark:text-purple-100">Add New Cobec Admin</h4>
              
              {/* Clerk Users Dropdown */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select User from Clerk
                  </label>
                  <button
                    onClick={loadClerkUsers}
                    disabled={isLoadingClerkUsers}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {isLoadingClerkUsers ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {isLoadingClerkUsers ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    Loading users from Clerk...
                  </div>
                ) : clerkUsersError ? (
                  <div className="text-red-600 dark:text-red-400 text-sm mb-2">
                    Error loading users: {clerkUsersError}
                    <button
                      onClick={loadClerkUsers}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : clerkUsers && clerkUsers.length > 0 ? (
                  <select
                    value={selectedClerkUser}
                    onChange={(e) => handleClerkUserSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a user...</option>
                    {clerkUsers.map((user: ClerkUser) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    No users found in Clerk
                  </div>
                )}
              </div>

              {/* Admin Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Clerk User ID
                  </label>
                  <input
                    type="text"
                    value={newCobecAdminUserId}
                    onChange={(e) => setNewCobecAdminUserId(e.target.value)}
                    placeholder="Clerk User ID (auto-filled when user selected)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly={!!selectedClerkUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    value={newCobecAdminName}
                    onChange={(e) => setNewCobecAdminName(e.target.value)}
                    placeholder="Admin Name (auto-filled when user selected)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={newCobecAdminEmail}
                    onChange={(e) => setNewCobecAdminEmail(e.target.value)}
                    placeholder="Admin Email (auto-filled when user selected)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select a user from the dropdown above to auto-fill their details
                </p>
                <button
                  onClick={handleAddCobecAdmin}
                  disabled={isAddingCobecAdmin || !newCobecAdminUserId.trim()}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    isAddingCobecAdmin || !newCobecAdminUserId.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white`}
                >
                  {isAddingCobecAdmin ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </div>

            {/* Current Cobec Admins List */}
            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-purple-200 dark:border-purple-600">
              <h4 className="font-medium mb-3 text-purple-900 dark:text-purple-100">Current Cobec Admins</h4>
              {isLoadingAdmins ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Loading admins...
                </div>
              ) : allCobecAdmins && allCobecAdmins.length > 0 ? (
                <div className="space-y-2">
                  {allCobecAdmins.map((admin) => (
                    <div
                      key={admin._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {admin.name || 'Unnamed Admin'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.clerkuserid}
                        </div>
                        {admin.email && (
                          <div className="text-sm text-gray-500 dark:text-gray-500">
                            {admin.email}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveCobecAdmin(admin.clerkuserid)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm ml-2 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No Cobec Admins found
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {employees.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No employees found. Add employees or load data from JSON.
            </div>
          ) : (
            employees.map((employee, index) => (
              <div
                key={employee._id || `employee-${index}`}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</span>
                <button
                  onClick={() => handleRemoveEmployee(employee._id!)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm ml-2"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Load Data Button */}
      {showLoadDataButton && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-center items-center">
            <button
              onClick={loadKfcDataFromJson}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Load Data from JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KfcPointsManager; 