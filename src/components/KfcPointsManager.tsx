import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';

// Import KFC data directly
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

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data from database...');
      const db = await mongoClient.getDatabase();
      console.log('Database obtained:', db);
      
      // Load KFC entries
      const kfcCollection = db.collection('kfcpoints');
      console.log('KFC collection obtained:', kfcCollection);
      console.log('Collection methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(kfcCollection)));
      
      const kfcData = await kfcCollection.findToArray({});
      console.log('KFC data loaded:', kfcData);
      setKfcEntries(kfcData);
      
      // Load employees
      const employeesCollection = db.collection('employees');
      console.log('Employees collection obtained:', employeesCollection);
      
      const employeesData = await employeesCollection.findToArray({});
      console.log('Employees data loaded:', employeesData);
      setEmployees(employeesData);
      
      // Show load data button if no data found in database
      if (kfcData.length === 0) {
        setShowLoadDataButton(true);
      }
      
    } catch (err) {
      console.error('Error in loadData:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadKfcDataFromJson = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = await mongoClient.getDatabase();
      
      // Load KFC points
      const kfcCollection = db.collection('kfcpoints');
      let kfcSuccessCount = 0;
      let kfcFailCount = 0;
      
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
      
      console.log(`✅ Successfully loaded data! KFC: ${kfcSuccessCount} success, ${kfcFailCount} failed. Employees: ${employeeSuccessCount} success, ${employeeFailCount} failed.`);
      
      // Reload data to show the newly loaded entries
      await loadData();
      setShowLoadDataButton(false);
      
    } catch (err) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <div className="mt-2 space-x-2">
            <button 
              onClick={loadData}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">KFC Points Manager</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KFC Entries List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">KFC Entries</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {kfcEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No KFC entries found. Click "Load Data from JSON" to populate the database.
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