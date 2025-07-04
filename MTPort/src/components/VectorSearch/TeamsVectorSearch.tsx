import React, { useState, useEffect } from 'react';
import {
  TextField,
  PrimaryButton,
  DefaultButton,
  Dropdown,
  IDropdownOption,
  Checkbox,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Card,
  CardHeader,
  CardContent,
  Stack,
  IStackTokens,
  IStackStyles,
  Text,
  Link,
  IconButton,
  TooltipHost,
  DirectionalHint,
  Separator,
  Badge,
  ITextStyles,
  IMessageBarStyles,
  ICheckboxStyles,
  IDropdownStyles,
  ITextFieldStyles,
  IButtonStyles
} from '@fluentui/react';
import { 
  SearchIcon, 
  BriefcaseIcon, 
  PersonIcon, 
  DeleteIcon, 
  InfoIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@fluentui/react-icons-mdl2';
import { TeamsContext } from '../../types';
import { useTeamsApi } from '../../hooks/useTeamsApi';
import { useTeamsAuth } from '../../hooks/useTeamsAuth';

interface TeamsVectorSearchProps {
  teamsContext: TeamsContext | null;
  onNavigate: (route: 'search' | 'data' | 'kfc') => void;
}

// Teams storage keys (replacing localStorage)
const STORAGE_KEYS = {
  SEARCH_RESULTS: 'teams_vectorSearch_results',
  SEARCH_QUERY: 'teams_vectorSearch_query',
  SEARCH_TYPE: 'teams_vectorSearch_type',
  SEARCH_LIMIT: 'teams_vectorSearch_limit',
  SEARCH_ERROR: 'teams_vectorSearch_error',
  SEARCH_TIMESTAMP: 'teams_vectorSearch_timestamp'
};

// Utility function to filter unique items by a key
function filterUniqueBy(arr: any[], keyFn: (item: any) => string | number | undefined) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      return true;
    }
    return false;
  });
}

// Color utility for cross-matched results
const getColorForIndex = (index: number) => {
  const colors = [
    'red',
    'blue', 
    'green',
    'yellow',
    'purple',
    'pink',
    'indigo',
    'orange',
    'teal',
    'cyan'
  ];
  return colors[index % colors.length];
};

const getBorderColorForIndex = (index: number) => {
  const colors = [
    'border-red-500',
    'border-blue-500',
    'border-green-500', 
    'border-yellow-500',
    'border-purple-500',
    'border-pink-500',
    'border-indigo-500',
    'border-orange-500',
    'border-teal-500',
    'border-cyan-500'
  ];
  return colors[index % colors.length];
};

export const TeamsVectorSearch: React.FC<TeamsVectorSearchProps> = ({
  teamsContext,
  onNavigate
}) => {
  const { teamsApi } = useTeamsApi();
  const { user } = useTeamsAuth();
  
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"jobs" | "resumes" | "both">("both");
  const [limit, setLimit] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [usePureVectorSearch, setUsePureVectorSearch] = useState(true);
  const [useCrossMatching, setUseCrossMatching] = useState(false);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [crossMatchThreshold, setCrossMatchThreshold] = useState(0.4);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  // Load saved data from Teams storage on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        if (!teamsContext?.microsoftTeams) return;
        
        const savedResults = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_RESULTS);
        const savedQuery = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_QUERY);
        const savedSearchType = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_TYPE);
        const savedLimit = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_LIMIT);
        const savedError = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_ERROR);
        const savedTimestamp = await teamsContext.microsoftTeams.settings.getSetting(STORAGE_KEYS.SEARCH_TIMESTAMP);

        // Check if saved data is less than 24 hours old
        if (savedTimestamp) {
          const timestamp = parseInt(savedTimestamp);
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;
          
          if (now - timestamp < twentyFourHours) {
            if (savedResults) {
              setResults(JSON.parse(savedResults));
              setIsLoadedFromStorage(true);
            }
            if (savedQuery) {
              setQuery(savedQuery);
            }
            if (savedSearchType) {
              setSearchType(savedSearchType as "jobs" | "resumes" | "both");
            }
            if (savedLimit) {
              setLimit(parseInt(savedLimit));
            }
            if (savedError) {
              setError(savedError);
            }
          } else {
            // Clear expired data
            await clearStoredData();
          }
        }
      } catch (error) {
        console.error('Error loading saved search data:', error);
        await clearStoredData();
      }
    };

    loadSavedData();
  }, [teamsContext]);

  // Keyboard shortcut for clearing results (Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        handleClearResults();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save data to Teams storage
  const saveToStorage = async (key: string, value: string) => {
    try {
      if (teamsContext?.microsoftTeams) {
        await teamsContext.microsoftTeams.settings.setSetting(key, value);
      }
    } catch (error) {
      console.error(`Error saving to Teams storage: ${key}`, error);
    }
  };

  // Clear stored data
  const clearStoredData = async () => {
    try {
      if (teamsContext?.microsoftTeams) {
        await Promise.all([
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_RESULTS),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_QUERY),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_TYPE),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_LIMIT),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_ERROR),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.SEARCH_TIMESTAMP)
        ]);
      }
    } catch (error) {
      console.error('Error clearing Teams storage:', error);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults(null);
    
    // Clear any previous error from storage
    await saveToStorage(STORAGE_KEYS.SEARCH_ERROR, '');
    
    try {
      let searchResults;
      
      if (useCrossMatching) {
        // Use cross-matched vector search
        searchResults = await teamsApi.searchBoth({
          query: query.trim(),
          limit: limit,
          minSimilarity: minSimilarity,
          crossMatchThreshold: crossMatchThreshold,
        });
        setResults(searchResults);
      } else if (usePureVectorSearch) {
        // Use pure vector search (no text-based substring matching)
        if (searchType === "jobs") {
          searchResults = await teamsApi.searchJobs({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
          });
          setResults({ jobs: searchResults, resumes: [] });
        } else if (searchType === "resumes") {
          searchResults = await teamsApi.searchResumes({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
          });
          setResults({ jobs: [], resumes: searchResults });
        } else {
          // For both, search jobs and resumes separately
          const [jobsResults, resumesResults] = await Promise.all([
            teamsApi.searchJobs({
              query: query.trim(),
              limit: limit,
              minSimilarity: minSimilarity,
            }),
            teamsApi.searchResumes({
              query: query.trim(),
              limit: limit,
              minSimilarity: minSimilarity,
            })
          ]);
          
          setResults({ 
            jobs: jobsResults, 
            resumes: resumesResults 
          });
        }
      } else {
        // Use original search functions
        if (searchType === "jobs") {
          searchResults = await teamsApi.searchJobs({
            query: query.trim(),
            limit: limit,
          });
          setResults({ jobs: searchResults, resumes: [] });
        } else if (searchType === "resumes") {
          searchResults = await teamsApi.searchResumes({
            query: query.trim(),
            limit: limit,
          });
          setResults({ jobs: [], resumes: searchResults });
        } else {
          searchResults = await teamsApi.searchBoth({
            query: query.trim(),
            searchType: "both",
            limit: limit,
          });
          setResults(searchResults);
        }
      }

      // Save results to Teams storage
      await Promise.all([
        saveToStorage(STORAGE_KEYS.SEARCH_RESULTS, JSON.stringify(searchResults)),
        saveToStorage(STORAGE_KEYS.SEARCH_QUERY, query),
        saveToStorage(STORAGE_KEYS.SEARCH_TYPE, searchType),
        saveToStorage(STORAGE_KEYS.SEARCH_LIMIT, limit.toString()),
        saveToStorage(STORAGE_KEYS.SEARCH_TIMESTAMP, Date.now().toString())
      ]);

      setIsLoadedFromStorage(false);
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during search";
      setError(errorMessage);
      await saveToStorage(STORAGE_KEYS.SEARCH_ERROR, errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle clear results
  const handleClearResults = async () => {
    setResults(null);
    setError(null);
    setIsLoadedFromStorage(false);
    await clearStoredData();
  };

  // Handle test mapping
  const handleTestMapping = async () => {
    setIsSearching(true);
    setError(null);
    try {
      const testResults = await teamsApi.testResumeMapping({
        query: "Test resume mapping functionality"
      });
      setResults(testResults);
    } catch (err: any) {
      setError(err.message || "Test mapping failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Format similarity score
  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  // Handle job click
  const handleJobClick = (job: any) => {
    // In Teams, we might want to open in a new tab or show in a dialog
    console.log('Job clicked:', job);
    // TODO: Implement Teams-specific job detail view
  };

  // Handle resume click
  const handleResumeClick = (resume: any) => {
    // In Teams, we might want to open in a new tab or show in a dialog
    console.log('Resume clicked:', resume);
    // TODO: Implement Teams-specific resume detail view
  };

  // Get unique jobs and resumes
  const uniqueJobs = results?.jobs ? filterUniqueBy(results.jobs, (job: any) => job.UniqueJobPostingId || job._id) : [];
  const uniqueResumes = results?.resumes ? filterUniqueBy(results.resumes, (resume: any) => resume.UniqueResumeId || resume._id) : [];

  // Fluent UI styles
  const stackTokens: IStackTokens = {
    childrenGap: 16,
    padding: 20
  };

  const cardStyles = {
    root: {
      marginBottom: 16
    }
  };

  const buttonStyles: IButtonStyles = {
    root: {
      marginRight: 8
    }
  };

  const dropdownStyles: IDropdownStyles = {
    root: {
      width: 200
    }
  };

  const textFieldStyles: ITextFieldStyles = {
    root: {
      width: '100%'
    }
  };

  const messageBarStyles: IMessageBarStyles = {
    root: {
      marginBottom: 16
    }
  };

  const checkboxStyles: ICheckboxStyles = {
    root: {
      marginBottom: 8
    }
  };

  // Dropdown options
  const searchTypeOptions: IDropdownOption[] = [
    { key: 'both', text: 'Jobs & Resumes' },
    { key: 'jobs', text: 'Jobs Only' },
    { key: 'resumes', text: 'Resumes Only' }
  ];

  const limitOptions: IDropdownOption[] = [
    { key: 3, text: '3 results' },
    { key: 5, text: '5 results' },
    { key: 10, text: '10 results' }
  ];

  const similarityOptions: IDropdownOption[] = [
    { key: 0.1, text: '10% (Very Loose)' },
    { key: 0.2, text: '20% (Loose)' },
    { key: 0.3, text: '30% (Default)' },
    { key: 0.4, text: '40% (Strict)' },
    { key: 0.5, text: '50% (Very Strict)' },
    { key: 0.6, text: '60% (Extremely Strict)' }
  ];

  const crossMatchOptions: IDropdownOption[] = [
    { key: 0.2, text: '20% (Very Loose)' },
    { key: 0.3, text: '30% (Loose)' },
    { key: 0.4, text: '40% (Default)' },
    { key: 0.5, text: '50% (Strict)' },
    { key: 0.6, text: '60% (Very Strict)' },
    { key: 0.7, text: '70% (Extremely Strict)' }
  ];

  return (
    <Stack tokens={stackTokens}>
      {/* Header */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Text variant="xLarge" styles={{ root: { fontWeight: 'bold' } }}>
            AI-Powered Job & Resume Matching
          </Text>
          <Text variant="medium" styles={{ root: { color: '#666' } }}>
            Search through job postings and resumes using semantic similarity
          </Text>
        </CardHeader>
      </Card>

      {/* Search Form */}
      <Card styles={cardStyles}>
        <CardContent>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Search Input */}
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { alignItems: 'flex-end' } }}>
              <TextField
                label="Search Query"
                value={query}
                onChange={(_, newValue) => setQuery(newValue || '')}
                placeholder="e.g., 'software engineer with Python experience'"
                styles={textFieldStyles}
              />
              <PrimaryButton
                onClick={handleSearch}
                disabled={!query.trim() || isSearching}
                iconProps={{ iconName: 'Search' }}
                text={isSearching ? "Searching..." : "Search"}
              />
              {(results || error) && (
                <DefaultButton
                  onClick={handleClearResults}
                  iconProps={{ iconName: 'Delete' }}
                  text="Clear"
                  title="Clear search results and stored data (Ctrl+Shift+C)"
                />
              )}
              <DefaultButton
                onClick={handleTestMapping}
                text="Test Mapping"
                title="Test resume mapping function"
                styles={{ root: { backgroundColor: '#6b46c1', color: 'white' } }}
              />
            </Stack>

            {/* Search Controls */}
            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Dropdown
                label="Search Type"
                selectedKey={searchType}
                options={searchTypeOptions}
                onChange={(_, option) => option && setSearchType(option.key as "jobs" | "resumes" | "both")}
                styles={dropdownStyles}
              />
              <Dropdown
                label="Results Limit"
                selectedKey={limit}
                options={limitOptions}
                onChange={(_, option) => option && setLimit(option.key as number)}
                styles={dropdownStyles}
              />
            </Stack>

            {/* Enhanced Search Controls */}
            <Stack tokens={{ childrenGap: 12 }}>
              <Checkbox
                label="Use Cross-Matched Search (Only show jobs with matching resumes and vice versa)"
                checked={useCrossMatching}
                onChange={(_, checked) => setUseCrossMatching(checked || false)}
                styles={checkboxStyles}
              />

              {useCrossMatching && (
                <Stack tokens={{ childrenGap: 16 }}>
                  <Stack horizontal tokens={{ childrenGap: 16 }}>
                    <Dropdown
                      label="Minimum Similarity Threshold"
                      selectedKey={minSimilarity}
                      options={similarityOptions}
                      onChange={(_, option) => option && setMinSimilarity(option.key as number)}
                      styles={dropdownStyles}
                    />
                    <Dropdown
                      label="Cross-Match Threshold"
                      selectedKey={crossMatchThreshold}
                      options={crossMatchOptions}
                      onChange={(_, option) => option && setCrossMatchThreshold(option.key as number)}
                      styles={dropdownStyles}
                    />
                  </Stack>
                  
                  <MessageBar messageBarType={MessageBarType.info}>
                    <Text variant="small">
                      <strong>Cross-Matched Search Features:</strong><br />
                      • <strong>Strict Matching:</strong> Only shows jobs with matching resumes and vice versa<br />
                      • <strong>Color Coding:</strong> Related jobs and resumes are highlighted with the same color<br />
                      • <strong>Quality Assurance:</strong> Ensures every result has a meaningful match<br />
                      • <strong>Dual Thresholds:</strong> Query similarity + cross-match similarity for precision<br />
                      • <strong>Visual Relationships:</strong> Easy to see which jobs match which resumes
                    </Text>
                  </MessageBar>
                </Stack>
              )}

              <Checkbox
                label="Use Pure Vector Search (Stricter Technical Filtering & Skill Matching)"
                checked={usePureVectorSearch}
                onChange={(_, checked) => setUsePureVectorSearch(checked || false)}
                styles={checkboxStyles}
              />

              {usePureVectorSearch && (
                <Stack tokens={{ childrenGap: 16 }}>
                  <Dropdown
                    label="Minimum Similarity Threshold"
                    selectedKey={minSimilarity}
                    options={similarityOptions}
                    onChange={(_, option) => option && setMinSimilarity(option.key as number)}
                    styles={dropdownStyles}
                  />
                  
                  <MessageBar messageBarType={MessageBarType.success}>
                    <Text variant="small">
                      <strong>Pure Vector Search Features:</strong><br />
                      • <strong>Semantic Understanding:</strong> Uses AI embeddings for true semantic search<br />
                      • <strong>No Substring Matching:</strong> Won't match "ios" in "bios" or "pios"<br />
                      • <strong>Context Awareness:</strong> Understands meaning, not just keywords<br />
                      • <strong>Quality Results:</strong> Higher quality matches based on semantic similarity<br />
                      • <strong>Configurable Threshold:</strong> Adjust similarity threshold for precision
                    </Text>
                  </MessageBar>
                </Stack>
              )}
            </Stack>

            {/* Info about data persistence */}
            <MessageBar messageBarType={MessageBarType.info}>
              <Text variant="small">
                💾 Your search results are automatically saved and will persist when you navigate away. 
                Use the Clear button or press Ctrl+Shift+C to remove stored data.
              </Text>
            </MessageBar>
          </Stack>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} styles={messageBarStyles}>
          {error}
        </MessageBar>
      )}

      {/* Results */}
      {results && (
        <Stack tokens={{ childrenGap: 24 }}>
          {/* Results Header */}
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <SearchIcon />
              <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                Search Results
              </Text>
              {query && (
                <Text variant="medium" styles={{ root: { color: '#666' } }}>
                  for "{query}"
                </Text>
              )}
              {isLoadedFromStorage && (
                <Badge text="Loaded from cache" />
              )}
            </Stack>
            <DefaultButton
              onClick={handleClearResults}
              iconProps={{ iconName: 'Delete' }}
              text="Clear Results"
              title="Clear search results and stored data (Ctrl+Shift+C)"
            />
          </Stack>

          {/* Job Results */}
          {uniqueJobs.length > 0 && (
            <Card styles={cardStyles}>
              <CardHeader>
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <BriefcaseIcon />
                  <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                    Job Opportunities ({uniqueJobs.length})
                  </Text>
                  {useCrossMatching && results?.colorGroups && (
                    <Text variant="medium" styles={{ root: { color: '#666' } }}>
                      • {results.colorGroups.length} cross-matched groups
                    </Text>
                  )}
                </Stack>
              </CardHeader>
              <CardContent>
                <Stack tokens={{ childrenGap: 16 }}>
                  {uniqueJobs.map((job: any, index: number) => {
                    const colorIndex = job.colorIndex !== undefined ? job.colorIndex : 0;
                    const matchCount = useCrossMatching && results?.crossMatches ? 
                      results.crossMatches.filter((match: any) => match.jobId === job._id).length : 0;
                    
                    return (
                      <Card 
                        key={job.UniqueJobPostingId}
                        styles={{ 
                          root: { 
                            cursor: 'pointer',
                            borderLeft: useCrossMatching ? `4px solid ${getColorForIndex(colorIndex)}` : undefined
                          }
                        }}
                        onClick={() => handleJobClick(job)}
                      >
                        <CardContent>
                          <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                            <Stack tokens={{ childrenGap: 8 }}>
                              <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                                {job.jobTitle}
                              </Text>
                              <Stack tokens={{ childrenGap: 4 }}>
                                <Text variant="medium">
                                  <strong>Location:</strong> {job.location}
                                </Text>
                                <Text variant="medium">
                                  <strong>Type:</strong> {job.jobType}
                                </Text>
                                <Text variant="medium">
                                  <strong>Department:</strong> {job.department}
                                </Text>
                                <Text variant="medium">
                                  <strong>Salary:</strong> {job.salary}
                                </Text>
                              </Stack>
                              {job.jobSummary && (
                                <Text variant="small" styles={{ root: { color: '#666' } }}>
                                  {job.jobSummary.substring(0, 200)}...
                                </Text>
                              )}
                              <Text variant="small" styles={{ root: { color: '#0078d4', fontWeight: 'medium' } }}>
                                Click to view full details →
                              </Text>
                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                              {useCrossMatching && matchCount > 0 && (
                                <Badge 
                                  text={`${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
                                  styles={{ root: { backgroundColor: getColorForIndex(colorIndex) } }}
                                />
                              )}
                              <Badge 
                                text={formatSimilarity(job.similarity)}
                                styles={{ root: { backgroundColor: '#107c10' } }}
                              />
                              <ChevronRightIcon />
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Resume Results */}
          {uniqueResumes.length > 0 && (
            <Card styles={cardStyles}>
              <CardHeader>
                <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                  <PersonIcon />
                  <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                    Matching Candidates ({uniqueResumes.length})
                  </Text>
                  {useCrossMatching && results?.colorGroups && (
                    <Text variant="medium" styles={{ root: { color: '#666' } }}>
                      • {results.colorGroups.length} cross-matched groups
                    </Text>
                  )}
                </Stack>
              </CardHeader>
              <CardContent>
                <Stack tokens={{ childrenGap: 16 }}>
                  {uniqueResumes.map((resume: any, index: number) => {
                    const colorIndex = resume.colorIndex !== undefined ? resume.colorIndex : 0;
                    const matchCount = useCrossMatching && results?.crossMatches ? 
                      results.crossMatches.filter((match: any) => match.resumeId === resume._id).length : 0;
                    
                    return (
                      <Card 
                        key={resume.UniqueResumeId}
                        styles={{ 
                          root: { 
                            cursor: 'pointer',
                            borderLeft: useCrossMatching ? `4px solid ${getColorForIndex(colorIndex)}` : undefined
                          }
                        }}
                        onClick={() => handleResumeClick(resume)}
                      >
                        <CardContent>
                          <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                            <Stack tokens={{ childrenGap: 8 }}>
                              <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                                {resume.processedMetadata?.name || "Unknown Candidate"}
                              </Text>
                              <Stack tokens={{ childrenGap: 4 }}>
                                <Text variant="medium">
                                  <strong>Email:</strong> {resume.processedMetadata?.email || "N/A"}
                                </Text>
                                <Text variant="medium">
                                  <strong>Experience:</strong> {resume.processedMetadata?.yearsOfExperience || "N/A"} years
                                </Text>
                                <Text variant="medium">
                                  <strong>Phone:</strong> {resume.processedMetadata?.phone || "N/A"}
                                </Text>
                                <Text variant="medium">
                                  <strong>Location:</strong> {resume.processedMetadata?.location || "N/A"}
                                </Text>
                              </Stack>
                              {resume.professionalSummary && (
                                <Text variant="small" styles={{ root: { color: '#666' } }}>
                                  {resume.professionalSummary.substring(0, 200)}...
                                </Text>
                              )}
                              <Text variant="small" styles={{ root: { color: '#107c10', fontWeight: 'medium' } }}>
                                Click to view full details →
                              </Text>
                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                              {useCrossMatching && matchCount > 0 && (
                                <Badge 
                                  text={`${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
                                  styles={{ root: { backgroundColor: getColorForIndex(colorIndex) } }}
                                />
                              )}
                              <Badge 
                                text={formatSimilarity(resume.similarity)}
                                styles={{ root: { backgroundColor: '#0078d4' } }}
                              />
                              <ChevronRightIcon />
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {uniqueJobs.length === 0 && uniqueResumes.length === 0 && (
            <Card styles={cardStyles}>
              <CardContent>
                <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                  <SearchIcon style={{ fontSize: 48, color: '#666' }} />
                  <Text variant="large" styles={{ root: { fontWeight: 'medium' } }}>
                    No matches found
                  </Text>
                  <Text variant="medium" styles={{ root: { color: '#666' } }}>
                    Try adjusting your search query or search type
                  </Text>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* Loading Indicator */}
      {isSearching && (
        <Card styles={cardStyles}>
          <CardContent>
            <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
              <Spinner size={SpinnerSize.large} label="Searching..." />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 16 }}>
        <DefaultButton
          onClick={() => onNavigate('data')}
          text="Go to Data Management"
          iconProps={{ iconName: 'Database' }}
        />
        <DefaultButton
          onClick={() => onNavigate('kfc')}
          text="Go to KFC Management"
          iconProps={{ iconName: 'Trophy' }}
        />
      </Stack>
    </Stack>
  );
}; 