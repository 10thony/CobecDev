import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface Nomination {
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

export function useNominations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex mutations (for future real-time features, but not primary data source)
  const createNominationMutation = useMutation(api.nominations.create);
  const approveNominationMutation = useMutation(api.nominations.approve);
  const declineNominationMutation = useMutation(api.nominations.decline);
  const deleteNominationMutation = useMutation(api.nominations.remove);

  // Create a new nomination (Convex primary)
  const createNomination = async (
    nominatedBy: string,
    nominatedEmployee: string,
    nominationType: 'Team' | 'Individual' | 'Growth',
    description: string
  ): Promise<{ success: boolean; nominationId?: Id<"nominations">; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const nominationId = await createNominationMutation({
        nominatedBy: nominatedBy.trim(),
        nominatedEmployee: nominatedEmployee.trim(),
        nominationType,
        description: description.trim(),
      });
      
      console.log(`✅ Created nomination in Convex: ${nominationId}`);
      return { success: true, nominationId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Approve a nomination (Convex primary)
  const approveNomination = async (
    nominationId: Id<"nominations">,
    approvedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await approveNominationMutation({
        nominationId,
        approvedBy,
      });
      
      console.log('✅ Approved nomination in Convex');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Decline a nomination (Convex primary)
  const declineNomination = async (
    nominationId: Id<"nominations">,
    declinedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await declineNominationMutation({
        nominationId,
        declinedBy,
      });
      
      console.log('✅ Declined nomination in Convex');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a nomination (Convex primary)
  const deleteNomination = async (
    nominationId: Id<"nominations">,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteNominationMutation({
        nominationId,
      });
      
      console.log('✅ Deleted nomination from Convex');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function for points calculation
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

  return {
    createNomination,
    approveNomination,
    declineNomination,
    deleteNomination,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for fetching nominations (MongoDB primary, Convex optional)
export function useNominationsData() {
  // State for MongoDB data (primary source)
  const [mongoData, setMongoData] = useState<{
    nominations: any[];
    employees: any[];
    kfcPoints: any[];
  }>({
    nominations: [],
    employees: [],
    kfcPoints: []
  });
  const [isLoadingMongo, setIsLoadingMongo] = useState(true);
  const [mongoError, setMongoError] = useState<string | null>(null);

  // Optional: Convex queries for real-time features (if available)
  const convexNominations = useQuery(api.nominations.list);
  const convexPendingNominations = useQuery(api.nominations.listPending);
  const convexEmployees = useQuery(api.nominations.listEmployees);
  const convexKfcPoints = useQuery(api.nominations.listKfcPoints);

  // Function to load MongoDB data
  const loadMongoData = async () => {
    setIsLoadingMongo(true);
    setMongoError(null);
    
    try {
      console.log('🔄 Loading data from MongoDB (primary source)...');
      const kfcService = await getKfcMongoService();
      
      // Load employees, KFC points, and nominations from MongoDB
      const [employees, kfcPoints, nominations] = await Promise.all([
        kfcService.getAllEmployees(),
        kfcService.getAllKfcEntries(),
        kfcService.getAllNominations()
      ]);
      
      setMongoData({
        nominations: nominations.map((nom: any) => ({
          _id: nom._id ? nom._id.toString() : `mongo-${nom.nominatedEmployee}-${Date.now()}`,
          nominatedBy: nom.nominatedBy,
          nominatedEmployee: nom.nominatedEmployee,
          nominationType: nom.nominationType,
          description: nom.description,
          pointsAwarded: nom.pointsAwarded,
          status: nom.status || 'pending',
          approvedBy: nom.approvedBy,
          approvedAt: nom.approvedAt?.getTime(),
          createdAt: nom.createdAt?.getTime() || Date.now(),
          updatedAt: nom.updatedAt?.getTime() || Date.now()
        })),
        employees: employees.map((emp: any) => ({
          _id: emp._id ? emp._id.toString() : `mongo-${emp.name}`,
          name: emp.name,
          createdAt: emp.createdAt?.getTime() || Date.now(),
          updatedAt: emp.updatedAt?.getTime() || Date.now()
        })),
        kfcPoints: kfcPoints.map((kfc: any) => ({
          _id: kfc._id ? kfc._id.toString() : `mongo-${kfc.name}`,
          name: kfc.name,
          events: kfc.events || [],
          march_status: kfc.march_status,
          score: kfc.score || 0,
          createdAt: kfc.createdAt?.getTime() || Date.now(),
          updatedAt: kfc.updatedAt?.getTime() || Date.now()
        }))
      });
      
      console.log(`✅ Loaded ${employees.length} employees, ${kfcPoints.length} KFC entries, and ${nominations.length} nominations from MongoDB`);
    } catch (error) {
      console.error('❌ Error loading MongoDB data:', error);
      setMongoError(error instanceof Error ? error.message : 'Failed to load MongoDB data');
    } finally {
      setIsLoadingMongo(false);
    }
  };

  // Load MongoDB data as primary source
  useEffect(() => {
    loadMongoData();
  }, []); // Only load once on mount

  // Use MongoDB as primary source, Convex as optional enhancement
  const nominations = mongoData.nominations;
  const pendingNominations = mongoData.nominations.filter((n: any) => n.status === 'pending');
  const employees = mongoData.employees;
  const kfcPoints = mongoData.kfcPoints;

  // Check if Convex data is available for real-time features
  const hasConvexData = convexNominations && convexNominations.length > 0;

  return {
    nominations: nominations || [],
    pendingNominations: pendingNominations || [],
    employees: employees || [],
    kfcPoints: kfcPoints || [],
    isLoading: isLoadingMongo,
    error: mongoError,
    dataSource: 'mongodb',
    hasRealTimeFeatures: hasConvexData,
    refreshData: loadMongoData
  };
}

// Hook for getting nominations by employee
export function useNominationsByEmployee(employeeName: string) {
  const { nominations } = useNominationsData();
  const employeeNominations = nominations.filter(n => n.nominatedEmployee === employeeName);

  return {
    nominations: employeeNominations,
    kfcPoints: null, // Would need to implement this
    isLoading: false,
    error: null,
  };
} 