import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';

interface Employee {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface KfcEntry {
  _id?: string;
  name: string;
  events: any[];
  march_status: string | null;
  score: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Nomination {
  _id?: string;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

interface KfcNominationProps {
  mongoClient: any;
}

const KfcNomination: React.FC<KfcNominationProps> = ({ mongoClient }) => {
  const { theme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [nominatorName, setNominatorName] = useState('');
  const [nominatedEmployee, setNominatedEmployee] = useState('');
  const [nominationType, setNominationType] = useState<'Team' | 'Individual' | 'Growth'>('Team');
  const [description, setDescription] = useState('');
  const [showNominationForm, setShowNominationForm] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = await mongoClient.getDatabase();
      
      // Load employees
      const employeesCollection = db.collection('employees');
      const employeesData = await employeesCollection.findToArray({});
      setEmployees(employeesData);
      
      // Load nominations
      const nominationsCollection = db.collection('nominations');
      const nominationsData = await nominationsCollection.findToArray({});
      setNominations(nominationsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
      setError('Please fill in all fields');
      return;
    }

    try {
      const db = await mongoClient.getDatabase();
      
      const pointsAwarded = getPointsForNominationType(nominationType);
      
      // Create nomination
      const nomination: Nomination = {
        nominatedBy: nominatorName.trim(),
        nominatedEmployee: nominatedEmployee.trim(),
        nominationType,
        description: description.trim(),
        pointsAwarded,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const nominationsCollection = db.collection('nominations');
      const result = await nominationsCollection.insertOne(nomination);
      nomination._id = result.insertedId;
      
      // Update KFC points for the nominated employee
      const kfcCollection = db.collection('kfcpoints');
      const kfcEntry = await kfcCollection.findOne({ name: nominatedEmployee });
      
      if (kfcEntry) {
        // Add new event to the employee's KFC entry
        const newEvent = {
          type: nominationType === 'Growth' ? 'Individ' : nominationType,
          month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          quantity: 1
        };
        
        const updatedEvents = [...kfcEntry.events, newEvent];
        const newScore = kfcEntry.score + pointsAwarded;
        
        await kfcCollection.updateOne(
          { _id: kfcEntry._id },
          {
            $set: {
              events: updatedEvents,
              score: newScore,
              updatedAt: new Date()
            }
          }
        );
      } else {
        // Create new KFC entry if it doesn't exist
        const newKfcEntry: KfcEntry = {
          name: nominatedEmployee.trim(),
          events: [{
            type: nominationType === 'Growth' ? 'Individ' : nominationType,
            month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            quantity: 1
          }],
          march_status: null,
          score: pointsAwarded,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await kfcCollection.insertOne(newKfcEntry);
      }
      
      // Update local state
      setNominations(prev => [...prev, nomination]);
      
      // Reset form
      setNominatorName('');
      setNominatedEmployee('');
      setNominationType('Team');
      setDescription('');
      setShowNominationForm(false);
      setError(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit nomination');
    }
  };

  const handleDeleteNomination = async (nominationId: string) => {
    try {
      const db = await mongoClient.getDatabase();
      const collection = db.collection('nominations');
      
      await collection.deleteOne({ _id: nominationId });
      
      setNominations(prev => prev.filter(nom => nom._id !== nominationId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nomination');
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
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">KFC Nominations</h1>
      
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
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee.name}>
                      {employee.name}
                    </option>
                  ))}
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
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Submit Nomination
              </button>
            </form>
          )}
        </div>

        {/* Nominations List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Nominations</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {nominations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No nominations yet</p>
                <p className="text-sm">Submit a nomination to see it here</p>
              </div>
            ) : (
              nominations.map((nomination) => (
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
                        nomination.nominationType === 'Team'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : nomination.nominationType === 'Individual'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {nomination.nominationType}
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
                    <button
                      onClick={() => handleDeleteNomination(nomination._id!)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KfcNomination; 