import { useState, useEffect } from 'react';
import { TeamsContext, UseTeamsContextReturn } from '../types';

/**
 * React hook for Teams context
 * Provides access to Teams SDK context information
 */
export function useTeamsContext(): UseTeamsContextReturn {
  const [context, setContext] = useState<TeamsContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTeamsContext = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if we're running in Teams
        if (typeof microsoftTeams !== 'undefined') {
          // Initialize Teams SDK
          microsoftTeams.initialize();

          // Get the current context
          microsoftTeams.getContext((context: TeamsContext) => {
            setContext(context);
            setIsLoading(false);
          });
        } else {
          // Not running in Teams, create mock context for development
          const mockContext: TeamsContext = {
            app: {
              sessionId: 'dev-session-id',
              theme: 'default',
              locale: 'en-US',
            },
            page: {
              id: 'dev-page-id',
              frameContext: 'content',
            },
            user: {
              id: 'dev-user-id',
              displayName: 'Development User',
              email: 'dev@example.com',
              tenantId: 'dev-tenant-id',
            },
            team: {
              id: 'dev-team-id',
              displayName: 'Development Team',
              internalId: 'dev-internal-id',
            },
            channel: {
              id: 'dev-channel-id',
              displayName: 'General',
              relativeUrl: '/teams/dev-team/General',
            },
          };

          setContext(mockContext);
          setIsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Teams context');
        setIsLoading(false);
      }
    };

    initializeTeamsContext();
  }, []);

  // Listen for theme changes
  useEffect(() => {
    if (typeof microsoftTeams !== 'undefined' && context) {
      const handleThemeChange = (theme: string) => {
        setContext(prev => prev ? {
          ...prev,
          app: {
            ...prev.app,
            theme,
          },
        } : null);
      };

      microsoftTeams.registerOnThemeChangeHandler(handleThemeChange);

      return () => {
        // Cleanup theme change handler
        try {
          microsoftTeams.unregisterOnThemeChangeHandler(handleThemeChange);
        } catch (error) {
          console.warn('Failed to unregister theme change handler:', error);
        }
      };
    }
  }, [context]);

  return {
    context,
    isLoading,
    error,
  };
}

/**
 * Hook to get specific Teams context values
 */
export function useTeamsContextValue<T>(
  selector: (context: TeamsContext) => T,
  defaultValue: T
): T {
  const { context } = useTeamsContext();
  
  if (!context) {
    return defaultValue;
  }
  
  try {
    return selector(context);
  } catch (error) {
    console.warn('Failed to select Teams context value:', error);
    return defaultValue;
  }
}

/**
 * Hook to get the current user from Teams context
 */
export function useTeamsUser() {
  return useTeamsContextValue(
    (context) => context.user,
    null
  );
}

/**
 * Hook to get the current team from Teams context
 */
export function useTeamsTeam() {
  return useTeamsContextValue(
    (context) => context.team,
    null
  );
}

/**
 * Hook to get the current channel from Teams context
 */
export function useTeamsChannel() {
  return useTeamsContextValue(
    (context) => context.channel,
    null
  );
}

/**
 * Hook to get the current theme from Teams context
 */
export function useTeamsTheme() {
  return useTeamsContextValue(
    (context) => context.app.theme,
    'default'
  );
}

/**
 * Hook to get the current locale from Teams context
 */
export function useTeamsLocale() {
  return useTeamsContextValue(
    (context) => context.app.locale,
    'en-US'
  );
} 