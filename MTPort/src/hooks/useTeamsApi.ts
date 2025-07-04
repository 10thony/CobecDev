import { TeamsApiService } from '../services/teamsApi';

// Create a singleton instance
const teamsApiInstance = new TeamsApiService();

export const useTeamsApi = () => {
  return { teamsApi: teamsApiInstance };
}; 