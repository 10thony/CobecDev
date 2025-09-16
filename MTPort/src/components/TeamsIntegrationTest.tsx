import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  TextField,
  Dropdown,
  Option,
  MessageBar,
  MessageBarType,
  Spinner,
  makeStyles,
  tokens,
  Text,
  Title3,
  Subtitle2,
  Divider,
  Badge,
} from '@fluentui/react-components';
import { 
  SendIcon, 
  ShareIcon, 
  UserIcon, 
  FileIcon, 
  NotificationIcon,
  CheckmarkIcon,
  ErrorIcon,
} from '@fluentui/react-icons';
import { useTeamsIntegration } from '../hooks/useTeamsIntegration';
import { AdaptiveCardBuilder } from '../utils/adaptiveCards';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  card: {
    marginBottom: tokens.spacingVerticalM,
  },
  controls: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  result: {
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    marginTop: tokens.spacingVerticalS,
  },
  success: {
    backgroundColor: tokens.colorStatusSuccessBackground2,
    color: tokens.colorStatusSuccessForeground2,
  },
  error: {
    backgroundColor: tokens.colorStatusDangerBackground2,
    color: tokens.colorStatusDangerForeground2,
  },
});

interface TestResult {
  id: string;
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export function TeamsIntegrationTest() {
  const styles = useStyles();
  const {
    sendAdaptiveCard,
    sendMessageToChannel,
    sendNotificationToUser,
    openFileInTeams,
    shareFileWithTeam,
    getTeamMembers,
    getUserProfile,
    getCurrentUserProfile,
    createNominationChannel,
    getChannels,
    sendNominationNotification,
    sendJobMatchNotification,
    sendDataUploadNotification,
    isLoading,
    error,
  } = useTeamsIntegration();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [channelId, setChannelId] = useState('');
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [message, setMessage] = useState('Hello from Cobecium Teams Widget!');

  const addTestResult = (test: string, status: 'pending' | 'success' | 'error', message: string) => {
    const result: TestResult = {
      id: Date.now().toString(),
      test,
      status,
      message,
      timestamp: new Date(),
    };
    setTestResults(prev => [result, ...prev]);
  };

  // Test Adaptive Cards
  const testAdaptiveCards = async () => {
    addTestResult('Adaptive Cards', 'pending', 'Testing adaptive card creation...');
    
    try {
      // Test nomination card
      const nominationCard = AdaptiveCardBuilder.createNominationCard({
        id: 'test-nomination-1',
        employeeName: 'John Doe',
        nominatedBy: 'Jane Smith',
        reason: 'Outstanding performance in Q4',
        date: new Date().toISOString(),
      });

      // Test job match card
      const jobMatchCard = AdaptiveCardBuilder.createJobMatchCard({
        id: 'test-job-1',
        title: 'Senior Software Engineer',
        company: 'Microsoft',
        location: 'Redmond, WA',
        matchScore: 95,
      });

      // Test data upload card
      const dataUploadCard = AdaptiveCardBuilder.createDataUploadCard({
        id: 'test-upload-1',
        fileName: 'resumes.xlsx',
        recordsProcessed: 150,
        type: 'resume',
        status: 'completed',
      });

      addTestResult('Adaptive Cards', 'success', 'Successfully created nomination, job match, and data upload cards');
    } catch (error) {
      addTestResult('Adaptive Cards', 'error', `Failed to create adaptive cards: ${error}`);
    }
  };

  // Test Notifications
  const testNotifications = async () => {
    addTestResult('Notifications', 'pending', 'Testing notification sending...');
    
    try {
      if (channelId) {
        const testCard = AdaptiveCardBuilder.createSuccessCard({
          title: 'Test Notification',
          message: 'This is a test notification from Cobecium Teams Widget',
          action: 'test',
        });

        await sendAdaptiveCard(testCard, channelId);
        addTestResult('Notifications', 'success', 'Successfully sent adaptive card to channel');
      } else {
        addTestResult('Notifications', 'error', 'Channel ID is required for notification testing');
      }
    } catch (error) {
      addTestResult('Notifications', 'error', `Failed to send notification: ${error}`);
    }
  };

  // Test User Management
  const testUserManagement = async () => {
    addTestResult('User Management', 'pending', 'Testing user management features...');
    
    try {
      const currentUser = await getCurrentUserProfile();
      addTestResult('User Management', 'success', `Current user: ${currentUser.displayName} (${currentUser.email})`);

      if (teamId) {
        const teamMembers = await getTeamMembers(teamId);
        addTestResult('User Management', 'success', `Found ${teamMembers.length} team members`);
      }
    } catch (error) {
      addTestResult('User Management', 'error', `Failed to get user information: ${error}`);
    }
  };

  // Test File Integration
  const testFileIntegration = async () => {
    addTestResult('File Integration', 'pending', 'Testing file integration features...');
    
    try {
      // Mock file operations
      if (teamId) {
        await shareFileWithTeam('mock-file-id', teamId);
        addTestResult('File Integration', 'success', 'Successfully shared file with team');
      } else {
        addTestResult('File Integration', 'error', 'Team ID is required for file integration testing');
      }
    } catch (error) {
      addTestResult('File Integration', 'error', `Failed to test file integration: ${error}`);
    }
  };

  // Test Channel Management
  const testChannelManagement = async () => {
    addTestResult('Channel Management', 'pending', 'Testing channel management...');
    
    try {
      if (teamId) {
        const channels = await getChannels(teamId);
        addTestResult('Channel Management', 'success', `Found ${channels.length} channels in team`);

        // Test creating a nomination channel
        const channelId = await createNominationChannel(teamId, 'Test Nominations');
        addTestResult('Channel Management', 'success', `Created nomination channel: ${channelId}`);
      } else {
        addTestResult('Channel Management', 'error', 'Team ID is required for channel management testing');
      }
    } catch (error) {
      addTestResult('Channel Management', 'error', `Failed to test channel management: ${error}`);
    }
  };

  // Test All Features
  const testAllFeatures = async () => {
    setTestResults([]);
    
    await testAdaptiveCards();
    await testNotifications();
    await testUserManagement();
    await testFileIntegration();
    await testChannelManagement();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckmarkIcon color="green" />;
      case 'error':
        return <ErrorIcon color="red" />;
      default:
        return <Spinner size="tiny" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'brand';
    }
  };

  return (
    <div className={styles.root}>
      <Title3>Teams Integration Test Suite</Title3>
      <Subtitle2>Test all Milestone 5 features and integration capabilities</Subtitle2>

      {error && (
        <MessageBar intent="error">
          Integration Error: {error}
        </MessageBar>
      )}

      {/* Configuration Section */}
      <Card className={styles.card}>
        <CardHeader>
          <Title3>Configuration</Title3>
        </CardHeader>
        <CardContent>
          <div className={styles.controls}>
            <TextField
              label="Channel ID"
              placeholder="Enter channel ID for testing"
              value={channelId}
              onChange={(e, data) => setChannelId(data.value)}
            />
            <TextField
              label="User ID"
              placeholder="Enter user ID for testing"
              value={userId}
              onChange={(e, data) => setUserId(data.value)}
            />
            <TextField
              label="Team ID"
              placeholder="Enter team ID for testing"
              value={teamId}
              onChange={(e, data) => setTeamId(data.value)}
            />
            <TextField
              label="Test Message"
              placeholder="Enter test message"
              value={message}
              onChange={(e, data) => setMessage(data.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className={styles.card}>
        <CardHeader>
          <Title3>Test Controls</Title3>
        </CardHeader>
        <CardContent>
          <div className={styles.controls}>
            <Button
              appearance="primary"
              icon={<SendIcon />}
              onClick={testAllFeatures}
              disabled={isLoading}
            >
              Test All Features
            </Button>
            <Button
              appearance="outline"
              icon={<NotificationIcon />}
              onClick={testAdaptiveCards}
              disabled={isLoading}
            >
              Test Adaptive Cards
            </Button>
            <Button
              appearance="outline"
              icon={<SendIcon />}
              onClick={testNotifications}
              disabled={isLoading}
            >
              Test Notifications
            </Button>
            <Button
              appearance="outline"
              icon={<UserIcon />}
              onClick={testUserManagement}
              disabled={isLoading}
            >
              Test User Management
            </Button>
            <Button
              appearance="outline"
              icon={<FileIcon />}
              onClick={testFileIntegration}
              disabled={isLoading}
            >
              Test File Integration
            </Button>
            <Button
              appearance="outline"
              icon={<ShareIcon />}
              onClick={testChannelManagement}
              disabled={isLoading}
            >
              Test Channel Management
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className={styles.card}>
        <CardHeader>
          <div className={styles.status}>
            <Title3>Test Results</Title3>
            <Badge appearance="filled" color="brand">
              {testResults.length} tests
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <Text>No tests run yet. Click "Test All Features" to start testing.</Text>
          ) : (
            <div className={styles.section}>
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className={`${styles.result} ${
                    result.status === 'success' ? styles.success : 
                    result.status === 'error' ? styles.error : ''
                  }`}
                >
                  <div className={styles.status}>
                    {getStatusIcon(result.status)}
                    <Text weight="semibold">{result.test}</Text>
                    <Badge appearance="filled" color={getStatusColor(result.status) as any}>
                      {result.status}
                    </Badge>
                  </div>
                  <Text>{result.message}</Text>
                  <Text size={200} color="neutral">
                    {result.timestamp.toLocaleTimeString()}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      {isLoading && (
        <MessageBar intent="info">
          <div className={styles.status}>
            <Spinner size="tiny" />
            <Text>Processing Teams integration request...</Text>
          </div>
        </MessageBar>
      )}
    </div>
  );
} 