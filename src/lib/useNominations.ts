import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { Nomination } from './nominationService';

export function useNominations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex actions - using any type to avoid TypeScript errors until API is regenerated
  // These will be properly typed once the Convex API is regenerated
  const createNominationAction = useAction('nominations:createNomination' as any);
  const approveNominationAction = useAction('nominations:approveNomination' as any);
  const declineNominationAction = useAction('nominations:declineNomination' as any);
  const deleteNominationAction = useAction('nominations:deleteNomination' as any);

  // Create a new nomination
  const createNomination = async (
    nominatedBy: string,
    nominatedEmployee: string,
    nominationType: 'Team' | 'Individual' | 'Growth',
    description: string
  ): Promise<{ success: boolean; nominationId?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createNominationAction({
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
    nominationId: string,
    approvedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await approveNominationAction({
        nominationId,
        approvedBy,
      });

      return result;
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
    nominationId: string,
    declinedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await declineNominationAction({
        nominationId,
        declinedBy,
      });

      return result;
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
    nominationId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteNominationAction({
        nominationId,
      });

      return result;
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

// Hook for fetching nominations
export function useNominationsData() {
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Move useAction calls to the top level of the hook
  const getAllNominationsAction = useAction('nominations:getAllNominations' as any);
  const getPendingNominationsAction = useAction('nominations:getPendingNominations' as any);

  // Function to fetch all nominations
  const fetchAllNominations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllNominationsAction({});
      setNominations(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nominations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch pending nominations
  const fetchPendingNominations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPendingNominationsAction({});
      setNominations(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending nominations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    nominations,
    isLoading,
    error,
    fetchAllNominations,
    fetchPendingNominations,
    clearError: () => setError(null),
  };
} 