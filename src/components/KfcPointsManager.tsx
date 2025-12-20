import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';

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
  const [isEmployeesCollapsed, setIsEmployeesCollapsed] = useState(true);

  // Convex queries and mutations
  const kfcEntries = useQuery(api.kfcData.getAllKfcEntries);
  const employees = useQuery(api.kfcData.getAllEmployees);
  const nominations = useQuery(api.nominations.list);
  const pendingNominations = useQuery(api.nominations.listPending);
  
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete KFC entry');
    } finally {
      setIsLoading(false);
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

  // Check if an employee has pending nominations
  const hasPendingNomination = (employeeName: string) => {
    if (!pendingNominations) return false;
    return pendingNominations.some(nomination => 
      nomination.nominatedEmployee === employeeName
    );
  };

  // Loading state
  if (kfcEntries === undefined || employees === undefined || nominations === undefined || pendingNominations === undefined) {
    return (
      <div className="p-6 bg-tron-bg-panel text-tron-white">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
          <span className="ml-2">Loading KFC data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-tron-bg-panel text-tron-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">KFC Points Manager</h2>
        <div className="flex space-x-2">
          <TronButton
            onClick={refreshData}
            disabled={isLoading}
            variant="primary"
            color="cyan"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </TronButton>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-neon-error/20 border border-neon-error text-neon-error rounded-lg">
          {error}
        </div>
      )}


      {/* Add Employee Form */}
      <TronPanel title="Add Employee">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            placeholder="Employee name"
            className="tron-input flex-1"
          />
          <TronButton
            type="submit"
            disabled={isLoading || !newEmployeeName.trim()}
            variant="primary"
            color="cyan"
          >
            Add
          </TronButton>
        </form>
      </TronPanel>

      {/* Employees List */}
      <TronPanel title={`Employees (${employees?.length || 0})`}>
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsEmployeesCollapsed(!isEmployeesCollapsed)}
        >
          <span className={`transform transition-transform duration-200 ${isEmployeesCollapsed ? 'rotate-0' : 'rotate-180'}`}>
            ▼
          </span>
        </div>
        {!isEmployeesCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees?.map((employee) => (
              <div
                key={employee._id}
                className="p-4 border border-tron-cyan/20 rounded-lg bg-tron-bg-card"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-tron-white">{employee.name}</span>
                  <TronButton
                    onClick={() => removeEmployee(employee.name)}
                    variant="ghost"
                    color="orange"
                    size="sm"
                  >
                    Remove
                  </TronButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </TronPanel>

      {/* KFC Entries */}
      <TronPanel title={`KFC Points (${kfcEntries?.length || 0})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kfcEntries?.map((entry) => (
            <div
              key={entry._id}
              className="p-4 border border-tron-cyan/20 rounded-lg bg-tron-bg-card"
            >
              {editingEntry === entry.name ? (
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="tron-input"
                    />
                    <input
                      type="number"
                      value={editForm.score || 0}
                      onChange={(e) => setEditForm({...editForm, score: parseInt(e.target.value)})}
                      className="tron-input"
                    />
                  </div>
                  <input
                    type="text"
                    value={editForm.march_status || ''}
                    onChange={(e) => setEditForm({...editForm, march_status: e.target.value})}
                    placeholder="March status"
                    className="tron-input w-full"
                  />
                  <div className="flex gap-2">
                    <TronButton
                      type="submit"
                      variant="primary"
                      color="cyan"
                      size="sm"
                    >
                      Save
                    </TronButton>
                    <TronButton
                      type="button"
                      onClick={cancelEditing}
                      variant="outline"
                      color="orange"
                      size="sm"
                    >
                      Cancel
                    </TronButton>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-tron-white">{entry.name}</h4>
                        {hasPendingNomination(entry.name) && (
                          <span 
                            className="tron-badge tron-badge-warning"
                            title="Has pending nomination"
                          >
                            ⭐ Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-tron-gray">Score: {entry.score}</p>
                      {entry.march_status && (
                        <p className="text-sm text-tron-gray">March Status: {entry.march_status}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <TronButton
                        onClick={() => startEditing(entry)}
                        variant="ghost"
                        color="cyan"
                        size="sm"
                      >
                        Edit
                      </TronButton>
                      <TronButton
                        onClick={() => deleteKfcEntryHandler(entry.name)}
                        variant="ghost"
                        color="orange"
                        size="sm"
                      >
                        Delete
                      </TronButton>
                    </div>
                  </div>
                  {entry.events && entry.events.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-tron-gray">Events:</p>
                      <div className="flex flex-wrap gap-1">
                        {entry.events.map((event: any, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs rounded bg-tron-bg-elevated text-tron-white"
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
      </TronPanel>
    </div>
  );
};

export default KfcPointsManager; 