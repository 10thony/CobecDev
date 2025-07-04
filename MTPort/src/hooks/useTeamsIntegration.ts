import { useState, useCallback } from 'react';
import { useTeamsAuth } from './useTeamsAuth';
import { useTeamsContext } from './useTeamsContext';
import { TeamsIntegrationService, TeamsMember, TeamsUserProfile, TeamsFile } from '../services/teamsIntegration';
import { AdaptiveCard } from '../utils/adaptiveCards';

// Mock Graph Client for development
class MockGraphClient {
  async api(path: string) {
    return {
      get: async () => ({ value: [] }),
      post: async (data: any) => ({ id: 'mock-id' }),
    };
  }
}

export interface UseTeamsIntegrationReturn {
  // Notification methods
  sendAdaptiveCard: (card: AdaptiveCard, channelId: string) => Promise<void>;
  sendMessageToChannel: (channelId: string, message: string) => Promise<void>;
  sendNotificationToUser: (userId: string, card: AdaptiveCard) => Promise<void>;
  
  // File integration methods
  openFileInTeams: (fileId: string) => Promise<void>;
  shareFileWithTeam: (fileId: string, teamId: string) => Promise<void>;
  getTeamsFiles: (teamId: string, channelId: string) => Promise<TeamsFile[]>;
  
  // User management methods
  getTeamMembers: (teamId: string) => Promise<TeamsMember[]>;
  getUserProfile: (userId: string) => Promise<TeamsUserProfile>;
  getCurrentUserProfile: () => Promise<TeamsUserProfile>;
  
  // Channel management
  createNominationChannel: (teamId: string, channelName: string) => Promise<string>;
  getChannels: (teamId: string) => Promise<any[]>;
  
  // Utility methods
  sendNominationNotification: (nomination: any, approvers: TeamsMember[]) => Promise<void>;
  sendJobMatchNotification: (jobMatch: any, userId: string) => Promise<void>;
  sendDataUploadNotification: (uploadResult: any, userId: string) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useTeamsIntegration(): UseTeamsIntegrationReturn {
  const { getAccessToken } = useTeamsAuth();
  const { context } = useTeamsContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create integration service instance with mock client for now
  const integrationService = new TeamsIntegrationService(new MockGraphClient() as any);

  const handleError = useCallback((error: any, operation: string) => {
    console.error(`Teams integration error in ${operation}:`, error);
    setError(`Failed to ${operation}: ${error.message}`);
    return Promise.reject(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Notification methods
  const sendAdaptiveCard = useCallback(async (card: AdaptiveCard, channelId: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendAdaptiveCard(card, channelId);
    } catch (error) {
      handleError(error, 'send adaptive card');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const sendMessageToChannel = useCallback(async (channelId: string, message: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendMessageToChannel(channelId, message);
    } catch (error) {
      handleError(error, 'send message to channel');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const sendNotificationToUser = useCallback(async (userId: string, card: AdaptiveCard) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendNotificationToUser(userId, card);
    } catch (error) {
      handleError(error, 'send notification to user');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  // File integration methods
  const openFileInTeams = useCallback(async (fileId: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.openFileInTeams(fileId);
    } catch (error) {
      handleError(error, 'open file in Teams');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const shareFileWithTeam = useCallback(async (fileId: string, teamId: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.shareFileWithTeam(fileId, teamId);
    } catch (error) {
      handleError(error, 'share file with team');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const getTeamsFiles = useCallback(async (teamId: string, channelId: string): Promise<TeamsFile[]> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const files = await integrationService.getTeamsFiles(teamId, channelId);
      return files;
    } catch (error) {
      handleError(error, 'get Teams files');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  // User management methods
  const getTeamMembers = useCallback(async (teamId: string): Promise<TeamsMember[]> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const members = await integrationService.getTeamMembers(teamId);
      return members;
    } catch (error) {
      handleError(error, 'get team members');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const getUserProfile = useCallback(async (userId: string): Promise<TeamsUserProfile> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const profile = await integrationService.getUserProfile(userId);
      return profile;
    } catch (error) {
      handleError(error, 'get user profile');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const getCurrentUserProfile = useCallback(async (): Promise<TeamsUserProfile> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const profile = await integrationService.getCurrentUserProfile();
      return profile;
    } catch (error) {
      handleError(error, 'get current user profile');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  // Channel management
  const createNominationChannel = useCallback(async (teamId: string, channelName: string): Promise<string> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const channelId = await integrationService.createNominationChannel(teamId, channelName);
      return channelId;
    } catch (error) {
      handleError(error, 'create nomination channel');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const getChannels = useCallback(async (teamId: string): Promise<any[]> => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const channels = await integrationService.getChannels(teamId);
      return channels;
    } catch (error) {
      handleError(error, 'get channels');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  // Utility methods
  const sendNominationNotification = useCallback(async (nomination: any, approvers: TeamsMember[]) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendNominationNotification(nomination, approvers);
    } catch (error) {
      handleError(error, 'send nomination notification');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const sendJobMatchNotification = useCallback(async (jobMatch: any, userId: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendJobMatchNotification(jobMatch, userId);
    } catch (error) {
      handleError(error, 'send job match notification');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  const sendDataUploadNotification = useCallback(async (uploadResult: any, userId: string) => {
    if (!integrationService) {
      throw new Error('Teams integration service not available');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      await integrationService.sendDataUploadNotification(uploadResult, userId);
    } catch (error) {
      handleError(error, 'send data upload notification');
    } finally {
      setIsLoading(false);
    }
  }, [integrationService, handleError, clearError]);

  return {
    // Notification methods
    sendAdaptiveCard,
    sendMessageToChannel,
    sendNotificationToUser,
    
    // File integration methods
    openFileInTeams,
    shareFileWithTeam,
    getTeamsFiles,
    
    // User management methods
    getTeamMembers,
    getUserProfile,
    getCurrentUserProfile,
    
    // Channel management
    createNominationChannel,
    getChannels,
    
    // Utility methods
    sendNominationNotification,
    sendJobMatchNotification,
    sendDataUploadNotification,
    
    // State
    isLoading,
    error
  };
} 