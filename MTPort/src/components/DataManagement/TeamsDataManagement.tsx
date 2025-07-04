import React, { useState, useEffect } from 'react';
import {
  TextField,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Card,
  CardHeader,
  CardContent,
  Stack,
  IStackTokens,
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
  IButtonStyles,
  Dropdown,
  IDropdownOption,
  Checkbox,
  DetailsList,
  IColumn,
  SelectionMode,
  DetailsListLayoutMode,
  CommandBar,
  ICommandBarItemProps,
  Panel,
  PanelType,
  Label,
  Toggle,
  ProgressIndicator,
  Callout,
  DirectionalHint as CalloutDirectionalHint
} from '@fluentui/react';
import { 
  UploadIcon, 
  FileTextIcon, 
  DatabaseIcon, 
  SearchIcon, 
  DeleteIcon, 
  DownloadIcon, 
  FilterIcon, 
  ChevronDownIcon, 
  ChevronRightIcon, 
  UserIcon, 
  BriefcaseIcon,
  RefreshIcon,
  SettingsIcon,
  InfoIcon,
  WarningIcon,
  CheckMarkIcon
} from '@fluentui/react-icons-mdl2';
import { TeamsContext } from '../../types';
import { useTeamsApi } from '../../hooks/useTeamsApi';
import { useTeamsAuth } from '../../hooks/useTeamsAuth';

interface TeamsDataManagementProps {
  teamsContext: TeamsContext | null;
  onNavigate: (route: 'search' | 'data' | 'kfc') => void;
}

// Teams storage keys (replacing IndexedDB)
const STORAGE_KEYS = {
  JOB_POSTINGS: 'teams_dataManagement_jobPostings',
  RESUMES: 'teams_dataManagement_resumes',
  METADATA: 'teams_dataManagement_metadata',
  CACHE_TIME: 'teams_dataManagement_cacheTime'
};

// Maximum cache size (Teams has different storage limits)
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper function to estimate data size
const estimateDataSize = (data: any): number => {
  return new Blob([JSON.stringify(data)]).size;
};

// Helper function to compress data by removing large fields
const compressDataForCache = (data: any[], dataType: 'jobPostings' | 'resumes'): any[] => {
  return data.map(item => {
    const compressed = { ...item };
    
    // Remove large fields that aren't essential for display
    if (dataType === 'jobPostings') {
      delete compressed.searchableText;
      delete compressed.extractedSkills;
      delete compressed.embedding;
      // Keep only essential fields for display
      const essentialFields = {
        _id: compressed._id,
        jobTitle: compressed.jobTitle,
        location: compressed.location,
        salary: compressed.salary,
        department: compressed.department,
        jobType: compressed.jobType,
        openDate: compressed.openDate,
        closeDate: compressed.closeDate,
        jobLink: compressed.jobLink,
        // Truncate long text fields
        jobSummary: compressed.jobSummary?.substring(0, 200) + (compressed.jobSummary?.length > 200 ? '...' : ''),
        duties: compressed.duties?.substring(0, 200) + (compressed.duties?.length > 200 ? '...' : ''),
        requirements: compressed.requirements?.substring(0, 200) + (compressed.requirements?.length > 200 ? '...' : ''),
        qualifications: compressed.qualifications?.substring(0, 200) + (compressed.qualifications?.length > 200 ? '...' : ''),
        education: compressed.education?.substring(0, 200) + (compressed.education?.length > 200 ? '...' : ''),
        howToApply: compressed.howToApply?.substring(0, 200) + (compressed.howToApply?.length > 200 ? '...' : ''),
        additionalInformation: compressed.additionalInformation?.substring(0, 200) + (compressed.additionalInformation?.length > 200 ? '...' : ''),
        seriesGrade: compressed.seriesGrade,
        travelRequired: compressed.travelRequired,
        workSchedule: compressed.workSchedule,
        securityClearance: compressed.securityClearance,
        experienceRequired: compressed.experienceRequired,
        educationRequired: compressed.educationRequired,
        applicationDeadline: compressed.applicationDeadline,
        contactInfo: compressed.contactInfo,
        _metadata: compressed._metadata
      };
      return essentialFields;
    } else {
      delete compressed.searchableText;
      delete compressed.extractedSkills;
      delete compressed.embedding;
      delete compressed.originalText;
      // Keep only essential fields for display
      const essentialFields = {
        _id: compressed._id,
        filename: compressed.filename,
        personalInfo: compressed.personalInfo,
        // Truncate long text fields
        professionalSummary: compressed.professionalSummary?.substring(0, 200) + (compressed.professionalSummary?.length > 200 ? '...' : ''),
        education: compressed.education,
        experience: compressed.experience?.map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          duration: exp.duration,
          responsibilities: exp.responsibilities?.slice(0, 3) // Keep only first 3 responsibilities
        })),
        skills: compressed.skills,
        certifications: compressed.certifications?.substring(0, 200) + (compressed.certifications?.length > 200 ? '...' : ''),
        professionalMemberships: compressed.professionalMemberships?.substring(0, 200) + (compressed.professionalMemberships?.length > 200 ? '...' : ''),
        securityClearance: compressed.securityClearance,
        _metadata: compressed._metadata
      };
      return essentialFields;
    }
  });
};

export const TeamsDataManagement: React.FC<TeamsDataManagementProps> = ({
  teamsContext,
  onNavigate
}) => {
  const { teamsApi } = useTeamsApi();
  const { user } = useTeamsAuth();
  
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<any>({});
  const [resumeSearchCriteria, setResumeSearchCriteria] = useState<any>({});
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<any[]>([]);
  const [dataCached, setDataCached] = useState(false);
  const [lastCacheTime, setLastCacheTime] = useState<Date | null>(null);
  const [cachingDisabled, setCachingDisabled] = useState(false);
  
  // Collapsible state
  const [jobsSectionCollapsed, setJobsSectionCollapsed] = useState(false);
  const [resumesSectionCollapsed, setResumesSectionCollapsed] = useState(false);
  const [jobSearchCollapsed, setJobSearchCollapsed] = useState(false);
  const [resumeSearchCollapsed, setResumeSearchCollapsed] = useState(false);

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'job' | 'resume'>('job');

  // Teams file picker state
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Load data from Teams storage on component mount
  useEffect(() => {
    loadData();
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

  // Load data from Teams storage
  const loadFromStorage = async (key: string): Promise<string | null> => {
    try {
      if (teamsContext?.microsoftTeams) {
        return await teamsContext.microsoftTeams.settings.getSetting(key);
      }
      return null;
    } catch (error) {
      console.error(`Error loading from Teams storage: ${key}`, error);
      return null;
    }
  };

  // Check if we should use cached data
  const shouldUseCachedData = async (): Promise<boolean> => {
    try {
      const cacheTime = await loadFromStorage(STORAGE_KEYS.CACHE_TIME);
      if (!cacheTime) return false;

      const timestamp = parseInt(cacheTime);
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes

      return now - timestamp < thirtyMinutes;
    } catch (error) {
      console.error('Error checking cache time:', error);
      return false;
    }
  };

  // Save data to cache
  const saveToCache = async (jobPostingsData: any[], resumesData: any[]): Promise<boolean> => {
    try {
      const compressedJobs = compressDataForCache(jobPostingsData, 'jobPostings');
      const compressedResumes = compressDataForCache(resumesData, 'resumes');

      const cacheData = {
        jobPostings: compressedJobs,
        resumes: compressedResumes,
        cacheTime: new Date().toISOString()
      };

      const cacheSize = estimateDataSize(cacheData);
      if (cacheSize > MAX_CACHE_SIZE) {
        console.warn('Cache data too large, skipping cache save');
        return false;
      }

      await Promise.all([
        saveToStorage(STORAGE_KEYS.JOB_POSTINGS, JSON.stringify(compressedJobs)),
        saveToStorage(STORAGE_KEYS.RESUMES, JSON.stringify(compressedResumes)),
        saveToStorage(STORAGE_KEYS.METADATA, JSON.stringify({ cacheTime: new Date().toISOString() })),
        saveToStorage(STORAGE_KEYS.CACHE_TIME, Date.now().toString())
      ]);

      return true;
    } catch (error) {
      console.error('Error saving to cache:', error);
      return false;
    }
  };

  // Load data from cache
  const loadFromCache = async (): Promise<{ jobPostings: any[], resumes: any[], cacheTime: Date } | null> => {
    try {
      const [jobsData, resumesData, metadataData] = await Promise.all([
        loadFromStorage(STORAGE_KEYS.JOB_POSTINGS),
        loadFromStorage(STORAGE_KEYS.RESUMES),
        loadFromStorage(STORAGE_KEYS.METADATA)
      ]);

      if (jobsData && resumesData && metadataData) {
        const metadata = JSON.parse(metadataData);
        return {
          jobPostings: JSON.parse(jobsData),
          resumes: JSON.parse(resumesData),
          cacheTime: new Date(metadata.cacheTime)
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      if (teamsContext?.microsoftTeams) {
        await Promise.all([
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.JOB_POSTINGS),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.RESUMES),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.METADATA),
          teamsContext.microsoftTeams.settings.removeSetting(STORAGE_KEYS.CACHE_TIME)
        ]);
      }
      setDataCached(false);
      setLastCacheTime(null);
      setCachingDisabled(false);
    } catch (error) {
      console.error('Error clearing Teams storage cache:', error);
    }
  };

  // Load data from cache or database
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      // Check if we should use cached data
      if (!forceRefresh && await shouldUseCachedData()) {
        const cachedData = await loadFromCache();
        if (cachedData) {
          setJobPostings(cachedData.jobPostings);
          setResumes(cachedData.resumes);
          setFilteredJobs(cachedData.jobPostings);
          setDataCached(true);
          setLastCacheTime(cachedData.cacheTime);
          setCachingDisabled(false);
          setMessage(`Loaded ${cachedData.jobPostings.length} job postings and ${cachedData.resumes.length} resumes from Teams cache (cached at ${cachedData.cacheTime.toLocaleString()})`);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data from database
      const [jobs, resumeData] = await Promise.all([
        teamsApi.getAllJobs(),
        teamsApi.getAllResumes()
      ]);
      
      setJobPostings(jobs);
      setResumes(resumeData);
      setFilteredJobs(jobs);
      setFilteredResumes(resumeData);
      setDataCached(false);
      setLastCacheTime(new Date());
      
      // Save to Teams storage cache
      const cacheSuccess = await saveToCache(jobs, resumeData);
      if (!cacheSuccess) {
        console.warn('Failed to save data to Teams storage cache due to size limitations');
        setCachingDisabled(true);
        setMessage(`Loaded ${jobs.length} job postings and ${resumeData.length} resumes from database (caching disabled due to data size)`);
      } else {
        setCachingDisabled(false);
        setMessage(`Loaded ${jobs.length} job postings and ${resumeData.length} resumes from database`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error loading data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh data
  const handleForceRefresh = async () => {
    await clearCache();
    await loadData(true);
  };

  // Handle Teams file picker
  const handleTeamsFilePicker = async () => {
    try {
      if (!teamsContext?.microsoftTeams) {
        setMessage('Teams context not available for file picker');
        return;
      }

      // Use Teams file picker API
      const files = await teamsContext.microsoftTeams.dialog.open({
        url: `${window.location.origin}/file-picker`,
        title: 'Select File',
        size: { width: 600, height: 400 }
      });

      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        setShowFilePicker(false);
      }
    } catch (error) {
      console.error('Error with Teams file picker:', error);
      setMessage('Error opening file picker. Please try again.');
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'job' | 'resume') => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      setMessage(`Uploading ${file.name} and processing with AI...`);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await teamsApi.uploadFile(file, type);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setMessage(`Upload completed: ${result.successCount} successful, ${result.failCount} failed. AI processing and embeddings generated.`);
      
      // Clear cache and reload data
      await clearCache();
      await loadData(true);
      
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more helpful error messages
      if (errorMessage.includes('PDF parsing failed')) {
        setMessage('PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.');
      } else {
        setMessage(`Upload failed: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle job search
  const handleJobSearch = async () => {
    setLoading(true);
    try {
      const results = await teamsApi.searchJobPostings(searchCriteria.jobTitle || '', searchCriteria);
      setFilteredJobs(results);
      setMessage(`Found ${results.length} matching job postings`);
    } catch (error) {
      setMessage(`Job search failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle resume search
  const handleResumeSearch = async () => {
    setLoading(true);
    try {
      const hasCriteria = Object.values(resumeSearchCriteria).some(value => value && value.trim());
      
      if (!hasCriteria) {
        setMessage('Please enter at least one search criteria');
        setLoading(false);
        return;
      }
      
      const results = await teamsApi.searchResumesByText(resumeSearchCriteria.firstName || '', resumeSearchCriteria);
      setFilteredResumes(results);
      setMessage(`Found ${results.length} matching resumes`);
    } catch (error) {
      setMessage(`Resume search failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear all data
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await teamsApi.clearAllData();
      setJobPostings([]);
      setResumes([]);
      setFilteredJobs([]);
      setFilteredResumes([]);
      await clearCache();
      setMessage('All data cleared successfully from database and Teams cache');
    } catch (error) {
      setMessage(`Failed to clear data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Export data as JSON
  const handleExportData = () => {
    const data = {
      jobPostings,
      resumes,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teams-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setMessage('Data exported successfully');
  };

  // Handle job click for navigation
  const handleJobClick = (job: any) => {
    console.log('Job clicked:', job);
    // TODO: Implement Teams-specific job detail view
  };

  // Handle resume click for navigation
  const handleResumeClick = (resume: any) => {
    console.log('Resume clicked:', resume);
    // TODO: Implement Teams-specific resume detail view
  };

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

  // Command bar items
  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'refresh',
      text: 'Refresh Data',
      iconProps: { iconName: 'Refresh' },
      onClick: handleForceRefresh,
      disabled: loading
    },
    {
      key: 'export',
      text: 'Export Data',
      iconProps: { iconName: 'Download' },
      onClick: handleExportData,
      disabled: loading || (jobPostings.length === 0 && resumes.length === 0)
    },
    {
      key: 'clear',
      text: 'Clear All Data',
      iconProps: { iconName: 'Delete' },
      onClick: handleClearData,
      disabled: loading
    }
  ];

  return (
    <Stack tokens={stackTokens}>
      {/* Header */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Text variant="xLarge" styles={{ root: { fontWeight: 'bold' } }}>
            Data Management
          </Text>
          <Text variant="medium" styles={{ root: { color: '#666' } }}>
            Import and manage job postings and resumes using SharePoint integration
          </Text>
        </CardHeader>
      </Card>

      {/* Status Message */}
      {message && (
        <MessageBar 
          messageBarType={message.includes('Error') || message.includes('Failed') ? MessageBarType.error : MessageBarType.success}
          styles={messageBarStyles}
        >
          {message}
        </MessageBar>
      )}

      {/* Cache Status */}
      <Card styles={cardStyles}>
        <CardContent>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: cachingDisabled ? '#ffaa00' : 
                               dataCached ? '#107c10' : '#0078d4'
              }} />
              <Text variant="medium">
                {cachingDisabled ? 'Caching disabled (data too large)' :
                 dataCached ? 'Using Teams cached data' : 'Using fresh data from database'}
              </Text>
            </Stack>
            {lastCacheTime && (
              <Text variant="small" styles={{ root: { color: '#666' } }}>
                Last updated: {lastCacheTime.toLocaleString()}
              </Text>
            )}
          </Stack>
          {dataCached && !cachingDisabled && (
            <Text variant="small" styles={{ root: { color: '#666', marginTop: 8 } }}>
              Teams cache expires in 30 minutes. Click "Refresh Data" to get the latest data from the database.
            </Text>
          )}
          {cachingDisabled && (
            <Text variant="small" styles={{ root: { color: '#ffaa00', marginTop: 8 } }}>
              Data size exceeds Teams storage limits. Caching is disabled to prevent errors.
            </Text>
          )}
          {!dataCached && !cachingDisabled && (
            <Text variant="small" styles={{ root: { color: '#0078d4', marginTop: 8 } }}>
              Using Teams storage for caching with automatic compression.
            </Text>
          )}
        </CardContent>
      </Card>

      {/* Command Bar */}
      <CommandBar
        items={commandBarItems}
        styles={{ root: { marginBottom: 16 } }}
      />

      {/* Import Section */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
            Import Data
          </Text>
        </CardHeader>
        <CardContent>
          <Stack horizontal tokens={{ childrenGap: 16 }}>
            <PrimaryButton
              onClick={() => setShowFilePicker(true)}
              iconProps={{ iconName: 'Upload' }}
              text="Upload File (Teams)"
              disabled={uploading}
            />
            <DefaultButton
              onClick={handleTeamsFilePicker}
              iconProps={{ iconName: 'OpenFile' }}
              text="Teams File Picker"
              disabled={uploading}
            />
          </Stack>
          
          {uploading && (
            <Stack tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
              <ProgressIndicator percentComplete={uploadProgress / 100} />
              <Text variant="small">Uploading and processing file...</Text>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card styles={cardStyles}>
        <CardContent>
          <Stack horizontal tokens={{ childrenGap: 32 }}>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#0078d4' } }}>
                {jobPostings.length}
              </Text>
              <Text variant="medium">Job Postings</Text>
            </Stack>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#107c10' } }}>
                {resumes.length}
              </Text>
              <Text variant="medium">Resumes</Text>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Search Sections */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
              Search & Filter
            </Text>
            <DefaultButton
              onClick={() => setJobSearchCollapsed(!jobSearchCollapsed)}
              iconProps={{ iconName: jobSearchCollapsed ? 'ChevronRight' : 'ChevronDown' }}
              text={jobSearchCollapsed ? 'Expand' : 'Collapse'}
            />
          </Stack>
        </CardHeader>
        {!jobSearchCollapsed && (
          <CardContent>
            <Stack tokens={{ childrenGap: 16 }}>
              <Stack horizontal tokens={{ childrenGap: 16 }}>
                <TextField
                  label="Job Title"
                  placeholder="Search by job title"
                  value={searchCriteria.jobTitle || ''}
                  onChange={(_, newValue) => setSearchCriteria({ ...searchCriteria, jobTitle: newValue })}
                  styles={textFieldStyles}
                />
                <TextField
                  label="Location"
                  placeholder="Search by location"
                  value={searchCriteria.location || ''}
                  onChange={(_, newValue) => setSearchCriteria({ ...searchCriteria, location: newValue })}
                  styles={textFieldStyles}
                />
                <TextField
                  label="Department"
                  placeholder="Search by department"
                  value={searchCriteria.department || ''}
                  onChange={(_, newValue) => setSearchCriteria({ ...searchCriteria, department: newValue })}
                  styles={textFieldStyles}
                />
              </Stack>
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton
                  onClick={handleJobSearch}
                  iconProps={{ iconName: 'Search' }}
                  text="Search Jobs"
                  disabled={loading}
                />
                <DefaultButton
                  onClick={() => {
                    setSearchCriteria({});
                    setFilteredJobs([]);
                    setMessage('Job search cleared');
                  }}
                  iconProps={{ iconName: 'Clear' }}
                  text="Clear Search"
                  disabled={loading}
                />
              </Stack>
            </Stack>
          </CardContent>
        )}
      </Card>

      {/* Job Postings List */}
      {(jobPostings.length > 0 || filteredJobs.length > 0) && (
        <Card styles={cardStyles}>
          <CardHeader>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <BriefcaseIcon />
                <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                  Job Postings ({filteredJobs.length > 0 ? filteredJobs.length : jobPostings.length})
                </Text>
                {filteredJobs.length > 0 && filteredJobs.length !== jobPostings.length && (
                  <Badge text="filtered" />
                )}
              </Stack>
              <DefaultButton
                onClick={() => setJobsSectionCollapsed(!jobsSectionCollapsed)}
                iconProps={{ iconName: jobsSectionCollapsed ? 'ChevronRight' : 'ChevronDown' }}
                text={jobsSectionCollapsed ? 'Expand' : 'Collapse'}
              />
            </Stack>
          </CardHeader>
          {!jobsSectionCollapsed && (
            <CardContent>
              <Stack tokens={{ childrenGap: 12 }} styles={{ root: { maxHeight: 400, overflow: 'auto' } }}>
                {(filteredJobs.length > 0 ? filteredJobs : jobPostings).map((job, index) => (
                  <Card 
                    key={job._id || index}
                    styles={{ root: { cursor: 'pointer' } }}
                    onClick={() => handleJobClick(job)}
                  >
                    <CardContent>
                      <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                        <Stack tokens={{ childrenGap: 4 }}>
                          <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                            {job.jobTitle}
                          </Text>
                          <Text variant="medium">{job.location}</Text>
                          <Text variant="small" styles={{ root: { color: '#666' } }}>
                            {job.department} • {job.jobType}
                          </Text>
                          {job.jobSummary && (
                            <Text variant="small" styles={{ root: { color: '#666' } }}>
                              {job.jobSummary.substring(0, 150)}...
                            </Text>
                          )}
                        </Stack>
                        <ChevronRightIcon />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          )}
        </Card>
      )}

      {/* Resume Search Section */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
              Resume Search
            </Text>
            <DefaultButton
              onClick={() => setResumeSearchCollapsed(!resumeSearchCollapsed)}
              iconProps={{ iconName: resumeSearchCollapsed ? 'ChevronRight' : 'ChevronDown' }}
              text={resumeSearchCollapsed ? 'Expand' : 'Collapse'}
            />
          </Stack>
        </CardHeader>
        {!resumeSearchCollapsed && (
          <CardContent>
            <Stack tokens={{ childrenGap: 16 }}>
              <Stack horizontal tokens={{ childrenGap: 16 }}>
                <TextField
                  label="First Name"
                  placeholder="Search by first name"
                  value={resumeSearchCriteria.firstName || ''}
                  onChange={(_, newValue) => setResumeSearchCriteria({ ...resumeSearchCriteria, firstName: newValue })}
                  styles={textFieldStyles}
                />
                <TextField
                  label="Last Name"
                  placeholder="Search by last name"
                  value={resumeSearchCriteria.lastName || ''}
                  onChange={(_, newValue) => setResumeSearchCriteria({ ...resumeSearchCriteria, lastName: newValue })}
                  styles={textFieldStyles}
                />
                <TextField
                  label="Email"
                  placeholder="Search by email"
                  value={resumeSearchCriteria.email || ''}
                  onChange={(_, newValue) => setResumeSearchCriteria({ ...resumeSearchCriteria, email: newValue })}
                  styles={textFieldStyles}
                />
              </Stack>
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton
                  onClick={handleResumeSearch}
                  iconProps={{ iconName: 'Search' }}
                  text="Search Resumes"
                  disabled={loading}
                />
                <DefaultButton
                  onClick={() => {
                    setResumeSearchCriteria({});
                    setFilteredResumes([]);
                    setMessage('Resume search cleared');
                  }}
                  iconProps={{ iconName: 'Clear' }}
                  text="Clear Search"
                  disabled={loading}
                />
              </Stack>
            </Stack>
          </CardContent>
        )}
      </Card>

      {/* Resumes List */}
      {(resumes.length > 0 || filteredResumes.length > 0) && (
        <Card styles={cardStyles}>
          <CardHeader>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <UserIcon />
                <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                  Resumes ({filteredResumes.length > 0 ? filteredResumes.length : resumes.length})
                </Text>
                {filteredResumes.length > 0 && filteredResumes.length !== resumes.length && (
                  <Badge text="filtered" />
                )}
              </Stack>
              <DefaultButton
                onClick={() => setResumesSectionCollapsed(!resumesSectionCollapsed)}
                iconProps={{ iconName: resumesSectionCollapsed ? 'ChevronRight' : 'ChevronDown' }}
                text={resumesSectionCollapsed ? 'Expand' : 'Collapse'}
              />
            </Stack>
          </CardHeader>
          {!resumesSectionCollapsed && (
            <CardContent>
              <Stack tokens={{ childrenGap: 12 }} styles={{ root: { maxHeight: 400, overflow: 'auto' } }}>
                {(filteredResumes.length > 0 ? filteredResumes : resumes).map((resume, index) => (
                  <Card 
                    key={resume._id || index}
                    styles={{ root: { cursor: 'pointer' } }}
                    onClick={() => handleResumeClick(resume)}
                  >
                    <CardContent>
                      <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                        <Stack tokens={{ childrenGap: 4 }}>
                          <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                            {resume.personalInfo?.firstName} {resume.personalInfo?.lastName}
                          </Text>
                          <Text variant="medium">{resume.personalInfo?.email}</Text>
                          <Text variant="small" styles={{ root: { color: '#666' } }}>
                            {resume.personalInfo?.yearsOfExperience} years of experience
                          </Text>
                          <Text variant="small" styles={{ root: { color: '#666' } }}>
                            {resume.filename}
                          </Text>
                          {resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0 && (
                            <Text variant="small" styles={{ root: { color: '#666' } }}>
                              Skills: {resume.skills.slice(0, 3).join(', ')}
                              {resume.skills.length > 3 && '...'}
                            </Text>
                          )}
                        </Stack>
                        <ChevronRightIcon />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          )}
        </Card>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Card styles={cardStyles}>
          <CardContent>
            <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
              <Spinner size={SpinnerSize.large} label="Loading job postings and resumes..." />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 16 }}>
        <DefaultButton
          onClick={() => onNavigate('search')}
          text="Go to Vector Search"
          iconProps={{ iconName: 'Search' }}
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