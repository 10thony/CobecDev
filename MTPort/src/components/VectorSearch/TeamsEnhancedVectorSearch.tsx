import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Dropdown,
  Option,
  Spinner,
  MessageBar,
  MessageBarType,
  Badge,
  makeStyles,
  tokens,
  Text,
  Title3,
  Subtitle2,
  Divider,
} from '@fluentui/react-components';
import { SearchIcon, ShareIcon, NotificationIcon, FilterIcon } from '@fluentui/react-icons';
import { useTeamsApi } from '../../hooks/useTeamsApi';
import { useTeamsIntegration } from '../../hooks/useTeamsIntegration';
import { AdaptiveCardBuilder } from '../../utils/adaptiveCards';
import { SearchFilters, JobResult, ResumeResult, SearchType } from '../../types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    height: '100%',
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  searchControls: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
  },
  searchInput: {
    flex: 1,
  },
  filtersSection: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultsSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    overflow: 'hidden',
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsContent: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  resultCard: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow16,
    },
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalXXS,
  },
  resultSubtitle: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  resultScore: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
  },
  resultActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXXS,
    marginTop: tokens.spacingVerticalS,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground3,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXXL,
  },
  notificationButton: {
    position: 'fixed',
    bottom: tokens.spacingVerticalL,
    right: tokens.spacingHorizontalL,
    zIndex: 1000,
  },
});

interface TeamsEnhancedVectorSearchProps {
  teamsContext: any;
  onNavigate: (route: string) => void;
}

export function TeamsEnhancedVectorSearch({ teamsContext, onNavigate }: TeamsEnhancedVectorSearchProps) {
  const styles = useStyles();
  const { searchJobs, searchResumes, searchBoth, isLoading, error } = useTeamsApi();
  const {
    sendJobMatchNotification,
    shareFileWithTeam,
    getCurrentUserProfile,
    isLoading: integrationLoading,
    error: integrationError,
  } = useTeamsIntegration();

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('both');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<{ jobs: JobResult[]; resumes: ResumeResult[] }>({ jobs: [], resumes: [] });
  const [selectedResult, setSelectedResult] = useState<JobResult | ResumeResult | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    try {
      let searchResults;
      switch (searchType) {
        case 'jobs':
          const jobs = await searchJobs(query, filters);
          searchResults = { jobs, resumes: [] };
          break;
        case 'resumes':
          const resumes = await searchResumes(query, filters);
          searchResults = { jobs: [], resumes };
          break;
        case 'both':
        default:
          searchResults = await searchBoth(query, filters);
          break;
      }
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [query, searchType, filters, searchJobs, searchResumes, searchBoth]);

  // Handle result selection
  const handleResultSelect = useCallback((result: JobResult | ResumeResult) => {
    setSelectedResult(result);
  }, []);

  // Handle share with team
  const handleShareWithTeam = useCallback(async (result: JobResult | ResumeResult) => {
    try {
      if (teamsContext?.team?.id) {
        // In a real implementation, you would share the file or create a link
        await shareFileWithTeam(result._id || 'mock-file-id', teamsContext.team.id);
        
        // Send notification to team members
        const userProfile = await getCurrentUserProfile();
        const jobMatchCard = AdaptiveCardBuilder.createJobMatchCard({
          id: result._id || 'mock-id',
          title: 'jobTitle' in result ? result.jobTitle : result.filename,
          company: 'jobTitle' in result ? result.department : 'Resume',
          location: 'jobTitle' in result ? result.location : 'N/A',
          matchScore: Math.round((result.similarity || 0) * 100),
        });
        
        await sendJobMatchNotification(jobMatchCard, userProfile.id);
      }
    } catch (error) {
      console.error('Failed to share with team:', error);
    }
  }, [teamsContext, shareFileWithTeam, getCurrentUserProfile, sendJobMatchNotification]);

  // Handle notification toggle
  const handleNotificationToggle = useCallback(() => {
    setShowNotifications(!showNotifications);
  }, [showNotifications]);

  // Auto-search on query change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  const totalResults = results.jobs.length + results.resumes.length;

  return (
    <div className={styles.root}>
      {/* Search Section */}
      <Card>
        <CardHeader>
          <Title3>AI-Powered Search</Title3>
          <Subtitle2>Find jobs and resumes using semantic search</Subtitle2>
        </CardHeader>
        <CardContent className={styles.searchSection}>
          <div className={styles.searchControls}>
            <TextField
              className={styles.searchInput}
              placeholder="Search for jobs, skills, or requirements..."
              value={query}
              onChange={(e, data) => setQuery(data.value)}
              contentBefore={<SearchIcon />}
            />
            <Dropdown
              value={searchType}
              onOptionSelect={(e, data) => setSearchType(data.optionValue as SearchType)}
            >
              <Option value="both">Jobs & Resumes</Option>
              <Option value="jobs">Jobs Only</Option>
              <Option value="resumes">Resumes Only</Option>
            </Dropdown>
            <Button appearance="primary" onClick={handleSearch} disabled={isLoading}>
              Search
            </Button>
          </div>

          <div className={styles.filtersSection}>
            <FilterIcon />
            <Text>Filters:</Text>
            <TextField
              placeholder="Job title"
              value={filters.jobTitle || ''}
              onChange={(e, data) => setFilters(prev => ({ ...prev, jobTitle: data.value }))}
            />
            <TextField
              placeholder="Location"
              value={filters.location || ''}
              onChange={(e, data) => setFilters(prev => ({ ...prev, location: data.value }))}
            />
            <TextField
              placeholder="Min similarity %"
              type="number"
              value={filters.minSimilarity?.toString() || ''}
              onChange={(e, data) => setFilters(prev => ({ ...prev, minSimilarity: parseFloat(data.value) || undefined }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className={styles.resultsSection}>
        <CardHeader>
          <div className={styles.resultsHeader}>
            <Title3>Search Results</Title3>
            <Badge appearance="filled" color="brand">
              {totalResults} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={styles.resultsContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Spinner size="large" label="Searching..." />
            </div>
          ) : error ? (
            <MessageBar intent="error">{error}</MessageBar>
          ) : totalResults === 0 ? (
            <div className={styles.emptyState}>
              <SearchIcon size={48} />
              <Text>No results found. Try adjusting your search terms or filters.</Text>
            </div>
          ) : (
            <>
              {/* Jobs Results */}
              {results.jobs.length > 0 && (
                <>
                  <Title3>Jobs ({results.jobs.length})</Title3>
                  {results.jobs.map((job) => (
                    <Card
                      key={job._id}
                      className={styles.resultCard}
                      onClick={() => handleResultSelect(job)}
                    >
                      <CardContent>
                        <div className={styles.resultHeader}>
                          <div>
                            <div className={styles.resultTitle}>{job.jobTitle}</div>
                            <div className={styles.resultSubtitle}>
                              {job.department} • {job.location}
                            </div>
                          </div>
                          <div className={styles.resultScore}>
                            <Badge appearance="filled" color="success">
                              {Math.round((job.similarity || 0) * 100)}%
                            </Badge>
                          </div>
                        </div>
                        <Text>{job.jobSummary}</Text>
                        <div className={styles.resultActions}>
                          <Button
                            appearance="subtle"
                            icon={<ShareIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareWithTeam(job);
                            }}
                          >
                            Share with Team
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* Resumes Results */}
              {results.resumes.length > 0 && (
                <>
                  <Divider />
                  <Title3>Resumes ({results.resumes.length})</Title3>
                  {results.resumes.map((resume) => (
                    <Card
                      key={resume._id}
                      className={styles.resultCard}
                      onClick={() => handleResultSelect(resume)}
                    >
                      <CardContent>
                        <div className={styles.resultHeader}>
                          <div>
                            <div className={styles.resultTitle}>
                              {resume.personalInfo.firstName} {resume.personalInfo.lastName}
                            </div>
                            <div className={styles.resultSubtitle}>
                              {resume.personalInfo.yearsOfExperience} years experience • {resume.filename}
                            </div>
                          </div>
                          <div className={styles.resultScore}>
                            <Badge appearance="filled" color="success">
                              {Math.round((resume.similarity || 0) * 100)}%
                            </Badge>
                          </div>
                        </div>
                        <Text>{resume.professionalSummary}</Text>
                        <div className={styles.resultActions}>
                          <Button
                            appearance="subtle"
                            icon={<ShareIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareWithTeam(resume);
                            }}
                          >
                            Share with Team
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Toggle Button */}
      <Button
        className={styles.notificationButton}
        appearance="primary"
        icon={<NotificationIcon />}
        onClick={handleNotificationToggle}
        disabled={integrationLoading}
      >
        {showNotifications ? 'Hide' : 'Show'} Notifications
      </Button>

      {/* Integration Error */}
      {integrationError && (
        <MessageBar intent="error">
          Teams integration error: {integrationError}
        </MessageBar>
      )}
    </div>
  );
} 