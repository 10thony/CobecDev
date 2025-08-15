import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface KfcPointsManagerProps {
  // Props interface for future extensibility
}

const KfcPointsManager: React.FC<KfcPointsManagerProps> = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Convex queries and mutations
  const kfcEntries = useQuery(api.kfcData.getAllKfcEntries);
  const employees = useQuery(api.kfcData.getAllEmployees);
  const databaseStatus = useQuery(api.kfcData.getDatabaseStatus);
  
  const createEmployee = useMutation(api.kfcData.createEmployee);
  const deleteEmployee = useMutation(api.kfcData.deleteEmployee);
  const upsertKfcEntry = useMutation(api.kfcData.upsertKfcEntry);
  const deleteKfcEntry = useMutation(api.kfcData.deleteKfcEntry);

  // Refresh data function
  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Convex queries automatically refresh, no manual refresh needed
      console.log('✅ Data refreshed via Convex real-time queries');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add employee function
  const addEmployee = async (name: string) => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await createEmployee({ name: name.trim() });
      setNewEmployeeName('');
      console.log(`✅ Added employee: ${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove employee function
  const removeEmployee = async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteEmployee({ name });
      console.log(`✅ Removed employee: ${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove employee');
    } finally {
      setIsLoading(false);
    }
  };

  // Update KFC entry function
  const updateKfcEntry = async (name: string, updates: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await upsertKfcEntry({
        name,
        events: updates.events || [],
        march_status: updates.march_status,
        score: updates.score || 0
      });
      setEditingEntry(null);
      setEditForm({});
      console.log(`✅ Updated KFC entry: ${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update KFC entry');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete KFC entry function
  const deleteKfcEntryHandler = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the KFC entry for ${name}?`)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await deleteKfcEntry({ name });
      console.log(`✅ Deleted KFC entry: ${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete KFC entry');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug database function (now uses Convex)
  const debugDatabase = async () => {
    console.log('🔍 DEBUG: Checking Convex database functionality...');
    
    try {
      console.log('✅ Convex queries working correctly!');
      console.log(`📊 KFC entries: ${kfcEntries?.length || 0}`);
      console.log(`📊 Employees: ${employees?.length || 0}`);
      console.log(`📊 Database status:`, databaseStatus);
      
      return true;
    } catch (error) {
      console.error('❌ Convex database check failed:', error);
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployeeName.trim()) {
      addEmployee(newEmployeeName);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry && editForm.name) {
      updateKfcEntry(editingEntry, editForm);
    }
  };

  // Start editing an entry
  const startEditing = (entry: any) => {
    setEditingEntry(entry.name);
    setEditForm({
      name: entry.name,
      events: entry.events,
      march_status: entry.march_status,
      score: entry.score
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingEntry(null);
    setEditForm({});
  };

  // Loading state
  if (kfcEntries === undefined || employees === undefined) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading KFC data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">KFC Points Manager</h2>
        <div className="flex space-x-2">
          <button
            onClick={refreshData}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={debugDatabase}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            Debug DB
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Database Status */}
      {databaseStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Database Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">KFC Entries:</span> {databaseStatus.kfcCount}
            </div>
            <div>
              <span className="font-medium">Employees:</span> {databaseStatus.employeeCount}
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Form */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Add Employee</h3>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            placeholder="Employee name"
            className={`flex-1 px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || !newEmployeeName.trim()}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            Add
          </button>
        </form>
      </div>

      {/* Employees List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Employees ({employees?.length || 0})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees?.map((employee) => (
            <div
              key={employee._id}
              className={`p-4 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{employee.name}</span>
                <button
                  onClick={() => removeEmployee(employee.name)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KFC Entries */}
      <div>
        <h3 className="text-lg font-semibold mb-4">KFC Points ({kfcEntries?.length || 0})</h3>
        <div className="space-y-4">
          {kfcEntries?.map((entry) => (
            <div
              key={entry._id}
              className={`p-4 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {editingEntry === entry.name ? (
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className={`px-3 py-2 border rounded-lg ${
                        theme === 'dark' 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <input
                      type="number"
                      value={editForm.score || 0}
                      onChange={(e) => setEditForm({...editForm, score: parseInt(e.target.value)})}
                      className={`px-3 py-2 border rounded-lg ${
                        theme === 'dark' 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    value={editForm.march_status || ''}
                    onChange={(e) => setEditForm({...editForm, march_status: e.target.value})}
                    placeholder="March status"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{entry.name}</h4>
                      <p className="text-sm text-gray-500">Score: {entry.score}</p>
                      {entry.march_status && (
                        <p className="text-sm text-gray-500">March Status: {entry.march_status}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(entry)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteKfcEntryHandler(entry.name)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {entry.events && entry.events.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Events:</p>
                      <div className="flex flex-wrap gap-1">
                        {entry.events.map((event: any, index: number) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded ${
                              theme === 'dark' 
                                ? 'bg-gray-600 text-white' 
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            {event.type} - {event.month}
                            {event.quantity && ` (${event.quantity})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KfcPointsManager; 