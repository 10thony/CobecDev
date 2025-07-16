import React, { useState } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useNominations, useNominationsData } from '../lib/useNominations';
import { SectionLoadingSpinner } from './LoadingSpinner';
import { Id } from '../../convex/_generated/dataModel';

interface Employee {
  _id: Id<"employees">;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface KfcEntry {
  _id: Id<"kfcpoints">;
  name: string;
  events: any[];
  march_status?: string;
  score: number;
  createdAt: number;
  updatedAt: number;
}

interface Nomination {
  _id: Id<"nominations">;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface KfcNominationProps {
  mongoClient: any;
}

const KfcNomination: React.FC<KfcNominationProps> = ({ mongoClient }) => {
  const { theme } = useTheme();
  
  // Nomination hooks
  const { 
    createNomination, 
    approveNomination, 
    declineNomination, 
    deleteNomination, 
    isLoading: nominationLoading, 
    error: nominationError 
  } = useNominations();
  
  const { 
    nominations, 
    employees,
    isLoading: dataLoading, 
    error: dataError,
    dataSource,
    hasRealTimeFeatures,
    refreshData
  } = useNominationsData();
  
  // Handle case when data is still loading or undefined
  const safeNominations = nominations || [];
  const safeEmployees = employees || [];
  
  // Form state
  const [nominatorName, setNominatorName] = useState('');
  const [nominatedEmployee, setNominatedEmployee] = useState('');
  const [nominationType, setNominationType] = useState<'Team' | 'Individual' | 'Growth'>('Team');
  const [description, setDescription] = useState('');
  const [showNominationForm, setShowNominationForm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [showNominationDetails, setShowNominationDetails] = useState(false);

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

  const handleSubmitNomination = async () => {
    if (!nominatorName.trim() || !nominatedEmployee.trim() || !description.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      const result = await createNomination(
        nominatorName.trim(),
        nominatedEmployee.trim(),
        nominationType,
        description.trim()
      );

      if (result.success) {
        // Reset form - data will update automatically via real-time queries
        setNominatorName('');
        setNominatedEmployee('');
        setNominationType('Team');
        setDescription('');
        setShowNominationForm(false);
        setLocalError(null);
      } else {
        setLocalError(result.error || 'Failed to submit nomination');
      }
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to submit nomination');
    }
  };

  const handleDeleteNomination = async (nominationId: Id<"nominations">) => {
    try {
      const result = await deleteNomination(nominationId);
      
      if (!result.success) {
        setLocalError(result.error || 'Failed to delete nomination');
      }
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete nomination');
    }
  };

  const handleViewNominationDetails = (nomination: Nomination) => {
    setSelectedNomination(nomination);
    setShowNominationDetails(true);
  };

  const handleApproveNomination = async (nominationId: Id<"nominations">, approvedBy: string) => {
    try {
      const result = await approveNomination(nominationId, approvedBy);
      
      if (result.success) {
        // Data will update automatically via real-time queries
        setShowNominationDetails(false);
        setSelectedNomination(null);
      } else {
        setLocalError(result.error || 'Failed to approve nomination');
      }
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to approve nomination');
    }
  };

  const handleDeclineNomination = async (nominationId: Id<"nominations">, declinedBy: string) => {
    try {
      const result = await declineNomination(nominationId, declinedBy);
      
      if (result.success) {
        // Data will update automatically via real-time queries
        setShowNominationDetails(false);
        setSelectedNomination(null);
      } else {
        setLocalError(result.error || 'Failed to decline nomination');
      }
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to decline nomination');
    }
  };

  const getNominationTypeBadgeColor = (type: 'Team' | 'Individual' | 'Growth'): string => {
    switch (type) {
      case 'Team':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'Individual':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'Growth':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status: 'pending' | 'approved' | 'declined'): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'declined':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const isLoading = nominationLoading || dataLoading;
  const error = nominationError || dataError || localError;

  if (isLoading) {
    return <SectionLoadingSpinner text="Loading nominations and employees from MongoDB cluster..." />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <div className="mt-2 space-x-2">
            <button 
              onClick={() => {
                // Data will refresh automatically via real-time queries
                setLocalError(null);
              }}
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KFC Nominations</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span>📊 {safeNominations.length} nominations, {safeEmployees.length} employees</span>
                      {dataSource && (
            <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
              💾 MongoDB {hasRealTimeFeatures && '🔄 + Real-time'}
            </span>
          )}
          </div>
          <button
            onClick={refreshData}
            disabled={dataLoading}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nomination Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Submit Nomination</h2>
            <button
              onClick={() => setShowNominationForm(!showNominationForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {showNominationForm ? 'Cancel' : 'New Nomination'}
            </button>
          </div>

          {showNominationForm && (
            <>
              {safeEmployees.length === 0 && (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded mb-4">
                  <strong>Note:</strong> No employees are available yet. Please add some employees first before creating nominations.
                </div>
              )}
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitNomination(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nominated By
                </label>
                <input
                  type="text"
                  value={nominatorName}
                  onChange={(e) => setNominatorName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nominate Employee
                </label>
                <select
                  value={nominatedEmployee}
                  onChange={(e) => setNominatedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select an employee</option>
                  {safeEmployees.length === 0 ? (
                    <option value="" disabled>No employees available</option>
                  ) : (
                    safeEmployees.map((employee) => (
                      <option key={employee._id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nomination Type
                </label>
                <select
                  value={nominationType}
                  onChange={(e) => setNominationType(e.target.value as 'Team' | 'Individual' | 'Growth')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Team">Team (10 points)</option>
                  <option value="Individual">Individual (20 points)</option>
                  <option value="Growth">Growth (30 points)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe why this person deserves the nomination..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={nominationLoading || !nominatorName.trim() || !nominatedEmployee.trim() || !description.trim()}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nominationLoading ? 'Submitting...' : 'Submit Nomination'}
              </button>
            </form>
            </>
          )}
        </div>

        {/* Nominations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Nominations</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {safeNominations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No nominations yet</p>
                <p className="text-sm">Submit a nomination to see it here</p>
              </div>
            ) : (
              safeNominations.map((nomination) => (
                <div key={nomination._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                        {nomination.nominatedEmployee}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Nominated by <span className="font-medium">{nomination.nominatedBy}</span>
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mb-2 ${
                        getNominationTypeBadgeColor(nomination.nominationType)
                      }`}>
                        {nomination.nominationType}
                      </span>
                      <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mb-2 ${
                        getStatusBadgeColor(nomination.status)
                      }`}>
                        {nomination.status}
                      </span>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        +{nomination.pointsAwarded} pts
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                    {nomination.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(nomination.createdAt).toLocaleDateString()}</span>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleViewNominationDetails(nomination)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteNomination(nomination._id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Nomination Details Modal */}
      {showNominationDetails && selectedNomination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Nomination Details
                </h2>
                <button
                  onClick={() => {
                    setShowNominationDetails(false);
                    setSelectedNomination(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedNomination.nominatedEmployee}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Nominated by <span className="font-medium">{selectedNomination.nominatedBy}</span>
                  </p>
                </div>

                <div className="flex space-x-2">
                  <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
                    getNominationTypeBadgeColor(selectedNomination.nominationType)
                  }`}>
                    {selectedNomination.nominationType}
                  </span>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
                    getStatusBadgeColor(selectedNomination.status)
                  }`}>
                    {selectedNomination.status}
                  </span>
                  <span className="inline-block px-3 py-1 text-sm rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    +{selectedNomination.pointsAwarded} pts
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {selectedNomination.description}
                  </p>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>Created: {new Date(selectedNomination.createdAt).toLocaleString()}</p>
                  {selectedNomination.approvedAt && (
                    <p>Processed: {new Date(selectedNomination.approvedAt).toLocaleString()}</p>
                  )}
                  {selectedNomination.approvedBy && (
                    <p>Processed by: {selectedNomination.approvedBy}</p>
                  )}
                </div>

                {/* Admin Actions */}
                {selectedNomination.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => handleApproveNomination(selectedNomination._id, 'Admin User')}
                      disabled={nominationLoading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {nominationLoading ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDeclineNomination(selectedNomination._id, 'Admin User')}
                      disabled={nominationLoading}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {nominationLoading ? 'Processing...' : 'Decline'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KfcNomination; 