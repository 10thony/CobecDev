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

  // Convex mutations
  const createNominationMutation = useMutation(api.nominations.create);
  const approveNominationMutation = useMutation(api.nominations.approve);
  const declineNominationMutation = useMutation(api.nominations.decline);
  const deleteNominationMutation = useMutation(api.nominations.remove);

  // Create a new nomination
  const createNomination = async (
    nominatedBy: string,
    nominatedEmployee: string,
    nominationType: 'Team' | 'Individual' | 'Growth',
    description: string
  ): Promise<{ success: boolean; nominationId?: Id<"nominations">; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createNominationMutation({
        nominatedBy,
        nominatedEmployee,
        nominationType,
        description,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Approve a nomination
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

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Decline a nomination
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

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a nomination
  const deleteNomination = async (
    nominationId: Id<"nominations">
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteNominationMutation({
        nominationId,
      });

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete nomination';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
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

// Hook for fetching nominations (real-time)
export function useNominationsData() {
  // Real-time queries - these will automatically update when data changes
  const allNominations = useQuery(api.nominations.list);
  const pendingNominations = useQuery(api.nominations.listPending);
  const employees = useQuery(api.nominations.listEmployees);
  const kfcPoints = useQuery(api.nominations.listKfcPoints);

  return {
    nominations: allNominations || [],
    pendingNominations: pendingNominations || [],
    employees: employees || [],
    kfcPoints: kfcPoints || [],
    isLoading: false, // Convex handles loading state automatically
    error: null, // Convex handles error state automatically
  };
}

// Hook for getting nominations by employee
export function useNominationsByEmployee(employeeName: string) {
  const nominations = useQuery(api.nominations.listByEmployee, { employeeName }) || [];
  const kfcPoints = useQuery(api.nominations.getKfcPointsByEmployee, { employeeName });

  return {
    nominations,
    kfcPoints,
    isLoading: false,
    error: null,
  };
} 