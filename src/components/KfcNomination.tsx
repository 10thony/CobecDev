import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';

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
      <TronPanel>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
          <span className="ml-2 text-tron-white">Loading nomination data...</span>
        </div>
      </TronPanel>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-tron-white">KFC Nominations</h2>
        <div className="text-sm text-tron-gray">
          {pendingNominations?.length || 0} pending nominations
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-neon-success/20 border border-neon-success text-neon-success rounded-lg flex justify-between items-center">
          <span>{successMessage}</span>
          <button
            onClick={clearSuccessMessage}
            className="text-tron-gray hover:text-neon-success"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-neon-error/20 border border-neon-error text-neon-error rounded-lg">
          {error}
        </div>
      )}

      {/* Create Nomination Form */}
      <TronPanel title="Create New Nomination">
        <form onSubmit={handleSubmitNomination} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-tron-gray">Nominator Name</label>
              <input
                type="text"
                value={nominatorName}
                onChange={(e) => setNominatorName(e.target.value)}
                placeholder="Your name"
                className="tron-input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-tron-gray">Nominated Employee</label>
              <select
                value={nominatedEmployee}
                onChange={(e) => setNominatedEmployee(e.target.value)}
                className="tron-select w-full"
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
            <label className="block text-sm font-medium mb-1 text-tron-gray">Nomination Type</label>
            <select
              value={nominationType}
              onChange={(e) => setNominationType(e.target.value as 'Team' | 'Individual' | 'Growth')}
              className="tron-select w-full"
            >
              <option value="Team">Team Effort ({getPointsForNominationType('Team')} points)</option>
              <option value="Individual">Individual Achievement ({getPointsForNominationType('Individual')} points)</option>
              <option value="Growth">Growth & Development ({getPointsForNominationType('Growth')} points)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-tron-gray">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe why you are nominating this employee..."
              rows={4}
              className="tron-input w-full"
              required
            />
          </div>
          
          <TronButton
            type="submit"
            disabled={isLoading}
            variant="primary"
            color="cyan"
            loading={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Nomination'}
          </TronButton>
        </form>
      </TronPanel>

      {/* Pending Nominations */}
      <TronPanel title={`Pending Nominations (${pendingNominations?.length || 0})`}>
        <div className="space-y-4">
          {pendingNominations?.length === 0 ? (
            <div className="text-center py-8 text-tron-gray">
              No pending nominations
            </div>
          ) : (
            pendingNominations?.map((nomination) => (
              <div
                key={nomination._id}
                className="p-4 border border-tron-cyan/20 rounded-lg bg-tron-bg-card"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-tron-white">{nomination.nominatedEmployee}</h4>
                    <p className="text-sm text-tron-gray">
                      Nominated by {nomination.nominatedBy} • {nomination.nominationType} • {nomination.pointsAwarded} points
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <TronButton
                      onClick={() => handleApproveNomination(nomination._id)}
                      disabled={isLoading}
                      variant="primary"
                      color="cyan"
                      size="sm"
                    >
                      Approve
                    </TronButton>
                    <TronButton
                      onClick={() => handleDeclineNomination(nomination._id)}
                      disabled={isLoading}
                      variant="outline"
                      color="orange"
                      size="sm"
                    >
                      Decline
                    </TronButton>
                    <TronButton
                      onClick={() => handleDeleteNomination(nomination._id)}
                      disabled={isLoading}
                      variant="ghost"
                      color="orange"
                      size="sm"
                    >
                      Delete
                    </TronButton>
                  </div>
                </div>
                <p className="text-sm text-tron-gray">{nomination.description}</p>
              </div>
            ))
          )}
        </div>
      </TronPanel>

      {/* All Nominations */}
      <TronPanel title={`All Nominations (${nominations?.length || 0})`}>
        <div className="space-y-4">
          {nominations?.length === 0 ? (
            <div className="text-center py-8 text-tron-gray">
              No nominations found
            </div>
          ) : (
            nominations?.map((nomination) => (
              <div
                key={nomination._id}
                className="p-4 border border-tron-cyan/20 rounded-lg bg-tron-bg-card"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-tron-white">{nomination.nominatedEmployee}</h4>
                    <p className="text-sm text-tron-gray">
                      Nominated by {nomination.nominatedBy} • {nomination.nominationType} • {nomination.pointsAwarded} points
                    </p>
                    <p className="text-sm text-tron-gray">
                      Status: <span className={`font-medium ${nomination.status === 'approved' ? 'text-neon-success' : nomination.status === 'declined' ? 'text-neon-error' : 'text-neon-warning'}`}>
                        {nomination.status.charAt(0).toUpperCase() + nomination.status.slice(1)}
                      </span>
                      {nomination.approvedBy && ` by ${nomination.approvedBy}`}
                    </p>
                  </div>
                  {nomination.status === 'pending' && (
                    <div className="flex gap-2">
                      <TronButton
                        onClick={() => handleApproveNomination(nomination._id)}
                        disabled={isLoading}
                        variant="primary"
                        color="cyan"
                        size="sm"
                      >
                        Approve
                      </TronButton>
                      <TronButton
                        onClick={() => handleDeclineNomination(nomination._id)}
                        disabled={isLoading}
                        variant="outline"
                        color="orange"
                        size="sm"
                      >
                        Decline
                      </TronButton>
                    </div>
                  )}
                </div>
                <p className="text-sm text-tron-gray">{nomination.description}</p>
              </div>
            ))
          )}
        </div>
      </TronPanel>
    </div>
  );
};

export default KfcNomination; 