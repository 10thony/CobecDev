import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { getKfcMongoService } from '../lib/kfcMongoService';

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

interface KfcPointsManagerProps {
  mongoClient: any;
}

const KfcPointsManager: React.FC<KfcPointsManagerProps> = ({ mongoClient }) => {
  const { theme } = useTheme();
  const [kfcEntries, setKfcEntries] = useState<KfcEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KfcEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showLoadDataButton, setShowLoadDataButton] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{kfcCount: number, employeeCount: number} | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null); // Clear any previous success messages
      
      console.log('🔄 Loading KFC data from MongoDB cluster...');
      
      // Try to load from MongoDB cluster first
      try {
        const kfcService = await getKfcMongoService();
        console.log('✅ Connected to KFC MongoDB service');
        
        // Load KFC entries and employees
        const [kfcEntries, employees, status] = await Promise.all([
          kfcService.getAllKfcEntries(),
          kfcService.getAllEmployees(),
          kfcService.getDatabaseStatus()
        ]);
        
        console.log('✅ Loaded data from MongoDB cluster:', { kfcEntries, employees, status });
        
        setKfcEntries(kfcEntries);
        setEmployees(employees);
        setDbStatus(status);
        
        // Show success message
        setSuccessMessage(`Successfully loaded ${kfcEntries.length} KFC entries and ${employees.length} employees from MongoDB cluster`);
        setTimeout(() => setSuccessMessage(null), 3000);
        
        setShowLoadDataButton(false);
        return;
        
      } catch (mongoError) {
        console.log('⚠️ MongoDB cluster not available, falling back to IndexedDB:', mongoError);
      }
      
      // Fallback to IndexedDB
      console.log('🔄 Falling back to IndexedDB...');
      
      // Ensure client is connected
      if (!mongoClient) {
        throw new Error('MongoDB client is not available');
      }
      
      const db = await mongoClient.getDatabase();
      console.log('✅ IndexedDB connection established');
      
      // Debug: Check database status
      console.log('🔍 Checking database collections...');
      await checkDatabaseStatus();
      
      // Load KFC entries
      const kfcCollection = db.collection('kfcpoints');
      console.log('📊 Fetching KFC entries...');
      
      const kfcData = await kfcCollection.findToArray({});
      console.log(`✅ Loaded ${kfcData.length} KFC entries:`, kfcData);
      setKfcEntries(kfcData);
      
      // Load employees
      const employeesCollection = db.collection('employees');
      console.log('👥 Fetching employees...');
      
      const employeesData = await employeesCollection.findToArray({});
      console.log(`✅ Loaded ${employeesData.length} employees:`, employeesData);
      setEmployees(employeesData);
      
      // Show load data button if no data found in database
      if (kfcData.length === 0) {
        console.log('⚠️ No KFC data found in database, showing load button');
        setShowLoadDataButton(true);
      } else {
        setShowLoadDataButton(false);
      }
      
      console.log('🎉 Data loading completed successfully');
      
      // Show success message
      setSuccessMessage(`Successfully loaded ${kfcData.length} KFC entries and ${employeesData.length} employees from IndexedDB`);
      setTimeout(() => setSuccessMessage(null), 3000); // Auto-hide after 3 seconds
      
    } catch (err) {
      console.error('❌ Error loading KFC data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data from database';
      setError(errorMessage);
      
      // Show load data button on error as fallback
      setShowLoadDataButton(true);
    } finally {
      setLoading(false);
    }
  };

  const loadKfcDataFromJson = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
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
      
      // Reload data to show the newly loaded entries
      await loadData();
      setShowLoadDataButton(false);
      
    } catch (err) {
      console.error('❌ Error loading KFC data from JSON:', err);
      setError(err instanceof Error ? err.message : 'Failed to load KFC data from JSON');
    } finally {
      setLoading(false);
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
      
      // Update local state
      setKfcEntries(prev => 
        prev.map(entry => 
          entry._id === selectedEntry._id 
            ? { ...entry, score: newScore }
            : entry
        )
      );
      setSelectedEntry({ ...selectedEntry, score: newScore });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
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
      
      // Update local state
      const updatedEntry = { ...selectedEntry, events: updatedEvents };
      setKfcEntries(prev => 
        prev.map(entry => 
          entry._id === selectedEntry._id 
            ? updatedEntry
            : entry
        )
      );
      setSelectedEntry(updatedEntry);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
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
      
      // Update local state
      const updatedEntry = { ...selectedEntry, events: updatedEvents };
      setKfcEntries(prev => 
        prev.map(entry => 
          entry._id === selectedEntry._id 
            ? updatedEntry
            : entry
        )
      );
      setSelectedEntry(updatedEntry);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove event');
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) return;
    
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('employees');
      
      const newEmployee: Employee = {
        name: newEmployeeName.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newEmployee);
      newEmployee._id = result.insertedId;
      
      setEmployees(prev => [...prev, newEmployee]);
      setNewEmployeeName('');
      setShowAddEmployee(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('employees');
      
      await collection.deleteOne({ _id: employeeId });
      
      setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove employee');
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading KFC data from database...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the latest data</p>
        </div>
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
                  onClick={loadData}
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
              onClick={loadData}
              disabled={loading}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
              title="Refresh data from database"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
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
                kfcEntries.map((entry) => (
                  <div
                    key={entry._id}
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
                        {entry.events.slice(0, 3).map((event, index) => (
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
          <button
            onClick={() => setShowAddEmployee(!showAddEmployee)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            {showAddEmployee ? 'Cancel' : 'Add Employee'}
          </button>
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {employees.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No employees found. Add employees or load data from JSON.
            </div>
          ) : (
            employees.map((employee) => (
              <div
                key={employee._id}
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