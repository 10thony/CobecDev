import { api } from "../../convex/_generated/api";
import { useMutation, useAction } from "convex/react";

// Nomination interface
export interface Nomination {
  _id?: string;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Client-side nomination service
class NominationService {
  // Create a new nomination
  static async createNomination(
    nominatedBy: string,
    nominatedEmployee: string,
    nominationType: 'Team' | 'Individual' | 'Growth',
    description: string
  ): Promise<{ success: boolean; nominationId?: string; error?: string }> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return a promise that will be resolved by the component
      return new Promise((resolve) => {
        // The actual implementation will be in the component using useAction
        resolve({ success: false, error: 'Use useAction hook in component' });
      });
    } catch (error) {
      console.error('❌ Error creating nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create nomination',
      };
    }
  }

  // Get all nominations
  static async getAllNominations(): Promise<Nomination[]> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('❌ Error getting nominations:', error);
      return [];
    }
  }

  // Get pending nominations
  static async getPendingNominations(): Promise<Nomination[]> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('❌ Error getting pending nominations:', error);
      return [];
    }
  }

  // Approve a nomination
  static async approveNomination(
    nominationId: string,
    approvedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return a promise that will be resolved by the component
      return new Promise((resolve) => {
        // The actual implementation will be in the component using useAction
        resolve({ success: false, error: 'Use useAction hook in component' });
      });
    } catch (error) {
      console.error('❌ Error approving nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve nomination',
      };
    }
  }

  // Decline a nomination
  static async declineNomination(
    nominationId: string,
    declinedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return a promise that will be resolved by the component
      return new Promise((resolve) => {
        // The actual implementation will be in the component using useAction
        resolve({ success: false, error: 'Use useAction hook in component' });
      });
    } catch (error) {
      console.error('❌ Error declining nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decline nomination',
      };
    }
  }

  // Delete a nomination
  static async deleteNomination(
    nominationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This will be called from a component that has access to Convex
      // For now, we'll return a promise that will be resolved by the component
      return new Promise((resolve) => {
        // The actual implementation will be in the component using useAction
        resolve({ success: false, error: 'Use useAction hook in component' });
      });
    } catch (error) {
      console.error('❌ Error deleting nomination:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete nomination',
      };
    }
  }

  // Get points for nomination type
  static getPointsForNominationType(type: 'Team' | 'Individual' | 'Growth'): number {
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
  }

  // Get status badge color
  static getStatusBadgeColor(status: 'pending' | 'approved' | 'declined'): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100  text-yellow-800 
      case 'approved':
        return 'bg-green-100  text-green-800 
      case 'declined':
        return 'bg-red-100  text-red-800 
      default:
        return 'bg-mint-cream-800 bg-oxford-blue-DEFAULT/30 text-mint-cream-DEFAULT 
    }
  }

  // Get nomination type badge color
  static getNominationTypeBadgeColor(type: 'Team' | 'Individual' | 'Growth'): string {
    switch (type) {
      case 'Team':
        return 'bg-yale-blue-500 bg-yale-blue-500/30 text-blue-800 text-mint-cream-DEFAULT';
      case 'Individual':
        return 'bg-purple-100  text-purple-800 
      case 'Growth':
        return 'bg-green-100  text-green-800 
      default:
        return 'bg-mint-cream-800 bg-oxford-blue-DEFAULT/30 text-mint-cream-DEFAULT 
    }
  }
}

export default NominationService; 