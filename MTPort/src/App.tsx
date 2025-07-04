import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  TabList,
  Tab,
  TabValue,
  makeStyles,
  tokens,
  Spinner,
  MessageBar,
  MessageBarType,
  Button,
  Text,
  Title3,
  Subtitle2,
} from '@fluentui/react-components';
import { useTeamsAuth } from './hooks/useTeamsAuth';
import { useTeamsContext, useTeamsTheme } from './hooks/useTeamsContext';
import { TeamsVectorSearch } from './components/TeamsVectorSearch';
import { TeamsDataManagement } from './components/TeamsDataManagement';
import { TeamsKfcManagement } from './components/TeamsKfcManagement';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabList: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tabPanel: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingHorizontalM,
  },
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: tokens.spacingHorizontalL,
    gap: tokens.spacingVerticalL,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: tokens.spacingHorizontalL,
    gap: tokens.spacingVerticalL,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
});

type TabValue = 'vector-search' | 'data-management' | 'kfc-management';

export function App() {
  const styles = useStyles();
  const { user, isAuthenticated, isLoading: authLoading, error: authError, login, logout } = useTeamsAuth();
  const { context, isLoading: contextLoading, error: contextError } = useTeamsContext();
  const theme = useTeamsTheme();
  
  const [selectedTab, setSelectedTab] = useState<TabValue>('vector-search');
  const [isLoading, setIsLoading] = useState(true);

  // Determine the theme based on Teams context
  const currentTheme = theme === 'dark' ? webDarkTheme : webLightTheme;

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Wait for both auth and context to be ready
        if (!authLoading && !contextLoading) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [authLoading, contextLoading]);

  // Handle navigation between tabs
  const handleTabChange = (event: any, data: { value: TabValue }) => {
    setSelectedTab(data.value);
  };

  // Handle authentication
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading state
  if (isLoading || authLoading || contextLoading) {
    return (
      <FluentProvider theme={currentTheme}>
        <div className={styles.root}>
          <LoadingSpinner message="Initializing AJAI Teams Widget..." />
        </div>
      </FluentProvider>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <FluentProvider theme={currentTheme}>
        <div className={styles.root}>
          <div className={styles.errorContainer}>
            <Title3>Authentication Error</Title3>
            <MessageBar intent="error">
              {authError}
            </MessageBar>
            <Button appearance="primary" onClick={handleLogin}>
              Try Again
            </Button>
          </div>
        </div>
      </FluentProvider>
    );
  }

  // Show context error
  if (contextError) {
    return (
      <FluentProvider theme={currentTheme}>
        <div className={styles.root}>
          <div className={styles.errorContainer}>
            <Title3>Teams Context Error</Title3>
            <MessageBar intent="error">
              {contextError}
            </MessageBar>
            <Text>Please ensure you're running this app within Microsoft Teams.</Text>
          </div>
        </div>
      </FluentProvider>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <FluentProvider theme={currentTheme}>
        <div className={styles.root}>
          <div className={styles.authContainer}>
            <Title3>Welcome to AJAI Teams Widget</Title3>
            <Subtitle2>AI-powered job and resume matching for Microsoft Teams</Subtitle2>
            <MessageBar intent="info">
              Please sign in with your Microsoft account to continue.
            </MessageBar>
            <Button appearance="primary" size="large" onClick={handleLogin}>
              Sign In with Microsoft
            </Button>
          </div>
        </div>
      </FluentProvider>
    );
  }

  // Main app interface
  return (
    <FluentProvider theme={currentTheme}>
      <ErrorBoundary>
        <div className={styles.root}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerLeft}>
                <Title3>AJAI Teams Widget</Title3>
                <Subtitle2>AI-powered job and resume matching</Subtitle2>
              </div>
              <div className={styles.headerRight}>
                {user && (
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <Text>{user.displayName}</Text>
                  </div>
                )}
                <Button appearance="subtle" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.content}>
            <TabList
              className={styles.tabList}
              selectedValue={selectedTab}
              onTabSelect={handleTabChange}
            >
              <Tab value="vector-search">Vector Search</Tab>
              <Tab value="data-management">Data Management</Tab>
              <Tab value="kfc-management">KFC Management</Tab>
            </TabList>

            {/* Tab Content */}
            <div className={styles.tabPanel}>
              {selectedTab === 'vector-search' && (
                <TeamsVectorSearch
                  teamsContext={context!}
                  onNavigate={(route) => setSelectedTab(route as TabValue)}
                />
              )}
              {selectedTab === 'data-management' && (
                <TeamsDataManagement
                  teamsContext={context!}
                  onNavigate={(route) => setSelectedTab(route as TabValue)}
                />
              )}
              {selectedTab === 'kfc-management' && (
                <TeamsKfcManagement
                  teamsContext={context!}
                  onNavigate={(route) => setSelectedTab(route as TabValue)}
                />
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </FluentProvider>
  );
}

export default App; 