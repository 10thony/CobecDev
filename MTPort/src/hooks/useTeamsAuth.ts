import { useState, useEffect, useCallback } from 'react';
import { TeamsUser, UseTeamsAuthReturn } from '../types';
import teamsAuthService from '../services/teamsAuth';

/**
 * React hook for Teams authentication
 * Provides authentication state and methods for Teams integration
 */
export function useTeamsAuth(): UseTeamsAuthReturn {
  const [user, setUser] = useState<TeamsUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication service
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        await teamsAuthService.initialize();
        
        // Check if user is already authenticated
        const currentUser = teamsAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = await teamsAuthService.signIn();
      setUser(user);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await teamsAuthService.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get access token function
  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      return await teamsAuthService.getAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get access token');
      throw err;
    }
  }, []);

  // Check authentication status periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAuthStatus = async () => {
      try {
        const isExpired = await teamsAuthService.isTokenExpired();
        if (isExpired) {
          // Token expired, try to refresh
          await teamsAuthService.refreshToken();
        }
      } catch (err) {
        console.warn('Token refresh failed:', err);
        // If refresh fails, user might need to re-authenticate
        setError('Authentication expired. Please sign in again.');
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    getAccessToken,
  };
} 