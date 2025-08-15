import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface KfcNominationProps {
  // Props interface for future extensibility
}

const KfcNomination: React.FC<KfcNominationProps> = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [nominatorName, setNominatorName] = useState('');
  const [nominatedEmployee, setNominatedEmployee] = useState('');
  const [nominationType, setNominationType] = useState<'Team' | 'Individual' | 'Growth'>('Team');
  const [description, setDescription] = useState('');

  // Convex queries and mutations
  const employees = useQuery(api.kfcData.getAllEmployees);
  const nominations = useQuery(api.nominations.list);
  const pendingNominations = useQuery(api.nominations.listPending);
  
  const createNomination = useMutation(api.nominations.create);
  const approveNomination = useMutation(api.nominations.approve);
  const declineNomination = useMutation(api.nominations.decline);
  const deleteNomination = useMutation(api.nominations.remove);

  // Calculate points based on nomination type
  const getPointsForNominationType = (type: 'Team' | 'Individual' | 'Growth'): number => {
    switch (type) {
      case 'Team':
        return 10;
      case 'Individual':
        return 20;
      case 'Growth':
        return 30;
      default:
        return 0;
    }
  };

  // Submit nomination
  const handleSubmitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nominatorName.trim() || !nominatedEmployee.trim() || !description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await createNomination({
        nominatedBy: nominatorName.trim(),
        nominatedEmployee: nominatedEmployee.trim(),
        nominationType,
        description: description.trim()
      });
      
      setSuccessMessage(`Successfully created nomination for ${nominatedEmployee}`);
      
      // Reset form
      setNominatorName('');
      setNominatedEmployee('');
      setNominationType('Team');
      setDescription('');
      
      console.log(`✅ Created nomination for ${nominatedEmployee}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nomination');
    } finally {
      setIsLoading(false);
    }
  };

  // Approve nomination
  const handleApproveNomination = async (nominationId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await approveNomination({
        nominationId: nominationId as any, // Type assertion for Convex ID
        approvedBy: 'Admin' // You can get this from auth context
      });
      
      setSuccessMessage('Nomination approved successfully');
      console.log(`✅ Approved nomination: ${nominationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve nomination');
    } finally {
      setIsLoading(false);
    }
  };

  // Decline nomination
  const handleDeclineNomination = async (nominationId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await declineNomination({
        nominationId: nominationId as any, // Type assertion for Convex ID
        declinedBy: 'Admin' // You can get this from auth context
      });
      
      setSuccessMessage('Nomination declined successfully');
      console.log(`✅ Declined nomination: ${nominationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline nomination');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete nomination
  const handleDeleteNomination = async (nominationId: string) => {
    if (!confirm('Are you sure you want to delete this nomination?')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteNomination({
        nominationId: nominationId as any // Type assertion for Convex ID
      });
      
      setSuccessMessage('Nomination deleted successfully');
      console.log(`✅ Deleted nomination: ${nominationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nomination');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear success message
  const clearSuccessMessage = () => {
    setSuccessMessage(null);
  };

  // Loading state
  if (employees === undefined || nominations === undefined || pendingNominations === undefined) {
    return (
      <div className={`p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading nomination data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">KFC Nominations</h2>
        <div className="text-sm text-gray-500">
          {pendingNominations?.length || 0} pending nominations
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex justify-between items-center">
          <span>{successMessage}</span>
          <button
            onClick={clearSuccessMessage}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Nomination Form */}
      <div className="mb-8 p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Create New Nomination</h3>
        <form onSubmit={handleSubmitNomination} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nominator Name</label>
              <input
                type="text"
                value={nominatorName}
                onChange={(e) => setNominatorName(e.target.value)}
                placeholder="Your name"
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nominated Employee</label>
              <select
                value={nominatedEmployee}
                onChange={(e) => setNominatedEmployee(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              >
                <option value="">Select an employee...</option>
                {employees?.map((employee) => (
                  <option key={employee._id} value={employee.name}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nomination Type</label>
            <select
              value={nominationType}
              onChange={(e) => setNominationType(e.target.value as 'Team' | 'Individual' | 'Growth')}
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Team">Team Effort ({getPointsForNominationType('Team')} points)</option>
              <option value="Individual">Individual Achievement ({getPointsForNominationType('Individual')} points)</option>
              <option value="Growth">Growth & Development ({getPointsForNominationType('Growth')} points)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe why you are nominating this employee..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Creating...' : 'Create Nomination'}
          </button>
        </form>
      </div>

      {/* Pending Nominations */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Pending Nominations ({pendingNominations?.length || 0})</h3>
        <div className="space-y-4">
          {pendingNominations?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending nominations
            </div>
          ) : (
            pendingNominations?.map((nomination) => (
              <div
                key={nomination._id}
                className={`p-4 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{nomination.nominatedEmployee}</h4>
                    <p className="text-sm text-gray-500">
                      Nominated by {nomination.nominatedBy} • {nomination.nominationType} • {nomination.pointsAwarded} points
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveNomination(nomination._id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeclineNomination(nomination._id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleDeleteNomination(nomination._id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm">{nomination.description}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* All Nominations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Nominations ({nominations?.length || 0})</h3>
        <div className="space-y-4">
          {nominations?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No nominations found
            </div>
          ) : (
            nominations?.map((nomination) => (
              <div
                key={nomination._id}
                className={`p-4 border rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{nomination.nominatedEmployee}</h4>
                    <p className="text-sm text-gray-500">
                      Nominated by {nomination.nominatedBy} • {nomination.nominationType} • {nomination.pointsAwarded} points
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: <span className={`font-medium ${
                        nomination.status === 'approved' ? 'text-green-600' :
                        nomination.status === 'declined' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {nomination.status.charAt(0).toUpperCase() + nomination.status.slice(1)}
                      </span>
                      {nomination.approvedBy && ` by ${nomination.approvedBy}`}
                    </p>
                  </div>
                  {nomination.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveNomination(nomination._id)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeclineNomination(nomination._id)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm">{nomination.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KfcNomination; 