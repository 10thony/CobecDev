import React, { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { HRDashboard } from '../components/HRDashboard';
import { EmbeddingManagement } from '../components/EmbeddingManagement';
import { EnhancedSearchInterface } from '../components/EnhancedSearchInterface';
import { SearchExplanation } from '../components/SearchExplanation';
import { LeadsManagement } from '../components/LeadsManagement';
import { ProcurementLinkVerifier } from '../components/ProcurementLinkVerifier';
import { ProcurementChat } from '../components/ProcurementChat';
import { FeedbackComponent } from '../components/FeedbackComponent';
import KfcPointsManager from '../components/KfcPointsManager';
import KfcNomination from '../components/KfcNomination';
import { TronPanel } from '../components/TronPanel';
import { TronButton } from '../components/TronButton';
import { TronStatCard } from '../components/TronStatCard';
import ResumeManager from '../components/ResumeManager';

// Resume Management Component for HR Dashboard
function DataManagementContent() {
  return <ResumeManager />;
}

// Legacy component - keeping for reference but now uses ResumeManager
function DataManagementContentOld() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Data queries
  const jobPostings = useQuery(api.jobPostings.list) || [];
  const resumes = useQuery(api.resumes.list) || [];
  
  // Search states
  const [searchCriteria, setSearchCriteria] = useState<any>({});
  const [resumeSearchCriteria, setResumeSearchCriteria] = useState<any>({});
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<any[]>([]);
  
  // Collapsible states
  const [jobsSectionCollapsed, setJobsSectionCollapsed] = useState(false);
  const [resumesSectionCollapsed, setResumesSectionCollapsed] = useState(false);
  const [jobSearchCollapsed, setJobSearchCollapsed] = useState(false);
  const [resumeSearchCollapsed, setResumeSearchCollapsed] = useState(false);

  // Convex actions
  const importDataAction = useAction(api.dataManagement.importData);
  const exportDataAction = useAction(api.dataManagement.exportData);
  const clearAllDataAction = useMutation(api.dataManagement.clearAllData);

  // Handle job search
  const handleJobSearch = async () => {
    setLoading(true);
    try {
      const searchQuery = Object.values(searchCriteria).filter(Boolean).join(' ');
      if (!searchQuery.trim()) {
        setMessage('Please enter at least one search criteria');
        setLoading(false);
        return;
      }
      
      const results = jobPostings.filter((job: any) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          job.jobTitle.toLowerCase().includes(searchLower) ||
          job.location.toLowerCase().includes(searchLower) ||
          job.department.toLowerCase().includes(searchLower) ||
          job.jobType.toLowerCase().includes(searchLower)
        );
      });
      
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
      const hasCriteria = Object.values(resumeSearchCriteria).some(value => 
        typeof value === 'string' && value.trim().length > 0
      );
      
      if (!hasCriteria) {
        setMessage('Please enter at least one search criteria');
        setLoading(false);
        return;
      }
      
      const searchQuery = Object.values(resumeSearchCriteria).filter(Boolean).join(' ');
      
      const results = resumes.filter((resume: any) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          resume.personalInfo?.firstName?.toLowerCase().includes(searchLower) ||
          resume.personalInfo?.lastName?.toLowerCase().includes(searchLower) ||
          resume.personalInfo?.email?.toLowerCase().includes(searchLower) ||
          resume.skills?.some((skill: string) => skill.toLowerCase().includes(searchLower))
        );
      });
      
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
      await clearAllDataAction({ confirm: true });
      setFilteredJobs([]);
      setFilteredResumes([]);
      setMessage('All data cleared successfully');
    } catch (error) {
      setMessage(`Failed to clear data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Export data as JSON
  const handleExportData = async () => {
    setLoading(true);
    try {
      const result = await exportDataAction({ dataType: 'all' });
      
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hr-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage(`Data exported successfully: ${result.recordCount} records`);
      } else {
        setMessage('Export failed');
      }
    } catch (error) {
      setMessage(`Export failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle job click for navigation
  const handleJobClick = (job: any) => {
    if (!job._id) {
      console.error('Job has no _id:', job);
      setMessage('Error: Job ID not found');
      return;
    }
    const encodedJobId = encodeURIComponent(job._id);
    navigate(`/job/${encodedJobId}`);
  };

  // Handle resume click for navigation
  const handleResumeClick = (resume: any) => {
    if (!resume._id) {
      console.error('Resume has no _id:', resume);
      setMessage('Error: Resume ID not found');
      return;
    }
    const encodedResumeId = encodeURIComponent(resume._id);
    navigate(`/resume/${encodedResumeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${ message.includes('Error') || message.includes('Failed') ? 'bg-tron-bg-card border-neon-error/30 text-neon-error' : 'bg-tron-bg-card border-neon-success/30 text-neon-success' }`}>
          {message}
        </div>
      )}

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TronStatCard
          title="Job Postings"
          value={jobPostings.length}
          icon={<Briefcase className="w-6 h-6" />}
          color="cyan"
        />
        <TronStatCard
          title="Resumes"
          value={resumes.length}
          icon={<UserIcon className="w-6 h-6" />}
          color="blue"
        />
      </div>

      {/* Actions */}
      <TronPanel title="Data Actions" icon={<Database className="w-6 h-6" />} glowColor="cyan">
        <div className="flex flex-wrap gap-4">
          <TronButton
            onClick={handleExportData}
            disabled={loading || (jobPostings.length === 0 && resumes.length === 0)}
            variant="primary"
            color="cyan"
            icon={<Download className="w-4 h-4" />}
          >
            Export Data
          </TronButton>
          
          <TronButton
            onClick={handleClearData}
            disabled={loading}
            variant="outline"
            color="orange"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Clear All Data
          </TronButton>
        </div>
      </TronPanel>

      {/* Search Sections */}
      <div className="space-y-6">
        {/* Job Search Section */}
        <TronPanel glowColor="cyan">
          <button
            onClick={() => setJobSearchCollapsed(!jobSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-tron-white flex items-center">
              <Search className="mr-2" />
              Search Job Postings
            </h3>
            {jobSearchCollapsed ? (
              <ChevronRight className="h-5 w-5 text-tron-gray" />
            ) : (
              <ChevronDown className="h-5 w-5 text-tron-gray" />
            )}
          </button>
          
          {!jobSearchCollapsed && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={searchCriteria.jobTitle || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, jobTitle: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={searchCriteria.location || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, location: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="text"
                  placeholder="Job Type"
                  value={searchCriteria.jobType || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, jobType: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={searchCriteria.department || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, department: e.target.value })}
                  className="tron-input"
                />
              </div>
              <div className="flex gap-2">
                <TronButton
                  onClick={handleJobSearch}
                  disabled={loading}
                  variant="primary"
                  color="cyan"
                  icon={<Filter className="w-4 h-4" />}
                >
                  Search Jobs
                </TronButton>
                <TronButton
                  onClick={() => {
                    setSearchCriteria({});
                    setFilteredJobs([]);
                    setMessage('Job search cleared');
                  }}
                  disabled={loading}
                  variant="outline"
                  color="cyan"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Clear Search
                </TronButton>
              </div>
            </>
          )}
        </TronPanel>

        {/* Resume Search Section */}
        <TronPanel glowColor="blue">
          <button
            onClick={() => setResumeSearchCollapsed(!resumeSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-tron-white flex items-center">
              <UserIcon className="mr-2" />
              Search Resumes
            </h3>
            {resumeSearchCollapsed ? (
              <ChevronRight className="h-5 w-5 text-tron-gray" />
            ) : (
              <ChevronDown className="h-5 w-5 text-tron-gray" />
            )}
          </button>
          
          {!resumeSearchCollapsed && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={resumeSearchCriteria.firstName || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, firstName: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={resumeSearchCriteria.lastName || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, lastName: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={resumeSearchCriteria.email || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, email: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="text"
                  placeholder="Skills"
                  value={resumeSearchCriteria.skills || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, skills: e.target.value })}
                  className="tron-input"
                />
                <input
                  type="number"
                  placeholder="Years of Experience"
                  value={resumeSearchCriteria.yearsOfExperience || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, yearsOfExperience: e.target.value })}
                  className="tron-input"
                />
              </div>
              <div className="flex gap-2">
                <TronButton
                  onClick={handleResumeSearch}
                  disabled={loading}
                  variant="primary"
                  color="cyan"
                  icon={<Filter className="w-4 h-4" />}
                >
                  Search Resumes
                </TronButton>
                <TronButton
                  onClick={() => {
                    setResumeSearchCriteria({});
                    setFilteredResumes([]);
                    setMessage('Resume search cleared');
                  }}
                  disabled={loading}
                  variant="outline"
                  color="cyan"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Clear Search
                </TronButton>
              </div>
            </>
          )}
        </TronPanel>
      </div>

      {/* Job Postings List */}
      {(jobPostings.length > 0 || filteredJobs.length > 0) && (
        <TronPanel glowColor="cyan">
          <button
            onClick={() => setJobsSectionCollapsed(!jobsSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-tron-white flex items-center">
              <Briefcase className="mr-2" />
              Job Postings ({(filteredJobs.length > 0 ? filteredJobs.length : jobPostings.length)})
              {filteredJobs.length > 0 && filteredJobs.length !== jobPostings.length && (
                <span className="ml-2 text-sm text-tron-gray">(filtered)</span>
              )}
            </h3>
            {jobsSectionCollapsed ? (
              <ChevronRight className="h-5 w-5 text-tron-gray" />
            ) : (
              <ChevronDown className="h-5 w-5 text-tron-gray" />
            )}
          </button>
          
          {!jobsSectionCollapsed && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(filteredJobs.length > 0 ? filteredJobs : jobPostings).map((job: any, index: number) => (
                <div 
                  key={job._id || index} 
                  className="border border-tron-cyan/20 rounded-lg p-4 hover:bg-tron-bg-elevated cursor-pointer transition-colors tron-card"
                  onClick={() => handleJobClick(job)}
                >
                  <h4 className="font-semibold text-lg text-tron-white">{job.jobTitle}</h4>
                  <p className="text-tron-gray">{job.location}</p>
                  <p className="text-sm text-tron-gray">{job.department}</p>
                  <p className="text-sm text-tron-gray">{job.salary}</p>
                  <div className="mt-2 text-sm text-tron-cyan font-medium">
                    Click to view full details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </TronPanel>
      )}

      {/* Resumes List */}
      {(resumes.length > 0 || filteredResumes.length > 0) && (
        <TronPanel glowColor="blue">
          <button
            onClick={() => setResumesSectionCollapsed(!resumesSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-tron-white flex items-center">
              <UserIcon className="mr-2" />
              Resumes ({(filteredResumes.length > 0 ? filteredResumes.length : resumes.length)})
              {filteredResumes.length > 0 && filteredResumes.length !== resumes.length && (
                <span className="ml-2 text-sm text-tron-gray">(filtered)</span>
              )}
            </h3>
            {resumesSectionCollapsed ? (
              <ChevronRight className="h-5 w-5 text-tron-gray" />
            ) : (
              <ChevronDown className="h-5 w-5 text-tron-gray" />
            )}
          </button>
          
          {!resumesSectionCollapsed && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(filteredResumes.length > 0 ? filteredResumes : resumes).map((resume: any, index: number) => (
                <div 
                  key={resume._id || index} 
                  className="border border-tron-cyan/20 rounded-lg p-4 hover:bg-tron-bg-elevated cursor-pointer transition-colors tron-card"
                  onClick={() => handleResumeClick(resume)}
                >
                  <h4 className="font-semibold text-lg text-tron-white">
                    {resume.personalInfo?.firstName} {resume.personalInfo?.lastName}
                  </h4>
                  <p className="text-tron-gray">{resume.personalInfo?.email}</p>
                  <p className="text-sm text-tron-gray">
                    {resume.personalInfo?.yearsOfExperience} years of experience
                  </p>
                  <p className="text-sm text-tron-gray">{resume.filename}</p>
                  {resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-tron-gray">
                        Skills: {resume.skills.slice(0, 3).join(', ')}
                        {resume.skills.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-tron-cyan font-medium">
                    Click to view full details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </TronPanel>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-tron-cyan" />
          <span className="ml-3 text-tron-gray">Loading...</span>
        </div>
      )}
    </div>
  );
}
import { 
  Target, 
  Search, 
  Database, 
  Users, 
  Settings,
  ExternalLink,
  Info,
  Upload,
  FileText,
  Download,
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Briefcase,
  RefreshCw,
  FileSearch,
  Globe
} from 'lucide-react';

export function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'embeddings' | 'data-management' | 'kfc-management' | 'leads-management' | 'procurement-links'>('overview');
  const [kfcSubTab, setKfcSubTab] = useState<'points' | 'nominations'>('points');
  const [procurementSubTab, setProcurementSubTab] = useState<'chat' | 'verifier' | 'feedback'>('chat');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const navigate = useNavigate();
  
  // Get visible components
  const visibleComponents = useQuery(api.hrDashboardComponents.getVisibleComponents);

  // Navigation handlers for search results
  const handleJobClick = (job: any) => {
    if (!job._id) {
      console.error('Job has no _id:', job);
      return;
    }
    const encodedJobId = encodeURIComponent(job._id);
    navigate(`/job/${encodedJobId}`);
  };

  const handleResumeClick = (resume: any) => {
    if (!resume._id) {
      console.error('Resume has no _id:', resume);
      return;
    }
    const encodedResumeId = encodeURIComponent(resume._id);
    navigate(`/resume/${encodedResumeId}`);
  };

  const handleResultSelect = (result: any) => {
    setSelectedResult(selectedResult?._id === result._id ? null : result);
  };

  const allTabs = [
    {
      id: 'overview',
      name: 'HR Overview',
      icon: Target,
      description: 'Job-resume matching and business insights'
    },
    {
      id: 'search',
      name: 'Semantic Search',
      icon: Search,
      description: 'AI-powered search across jobs and resumes'
    },
    {
      id: 'leads-management',
      name: 'Leads Management',
      icon: FileSearch,
      description: 'Manage procurement opportunity leads'
    },
    {
      id: 'procurement-links',
      name: 'Procurement Links',
      icon: Globe,
      description: 'Import and verify procurement URLs for the map'
    },
    {
      id: 'kfc-management',
      name: 'KFC Management',
      icon: Users,
      description: 'Manage KFC points and employee nominations'
    },
    {
      id: 'data-management',
      name: 'Resume Management',
      icon: Database,
      description: 'Import, export, and manage candidate resumes'
    },
    {
      id: 'embeddings',
      name: 'Embedding Management',
      icon: Settings,
      description: 'Manage AI embeddings and system optimization'
    }
  ];

  // Filter tabs based on visibility settings
  // If visibleComponents is undefined (loading) or empty, show all tabs by default
  // Otherwise, only show tabs that are in the visibleComponents array
  const tabs = visibleComponents === undefined || visibleComponents.length === 0
    ? allTabs
    : allTabs.filter(tab => visibleComponents.includes(tab.id));
  
  // Ensure activeTab is valid - if current tab is not visible, switch to first visible tab
  useEffect(() => {
    if (visibleComponents !== undefined) {
      const filteredTabs = visibleComponents.length === 0
        ? allTabs
        : allTabs.filter(tab => visibleComponents.includes(tab.id));
      
      if (filteredTabs.length > 0) {
        const isCurrentTabVisible = filteredTabs.some(tab => tab.id === activeTab);
        if (!isCurrentTabVisible) {
          setActiveTab(filteredTabs[0].id as any);
        }
      }
    }
  }, [visibleComponents, activeTab]);

  const handleSearchResults = (results: any) => {
    setSearchResults(results);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <HRDashboard />;
      case 'search':
        return (
          <div className="space-y-6">
            <EnhancedSearchInterface onResultsUpdate={handleSearchResults} />
            {searchResults && (
              <TronPanel title="Search Results" icon={<Search className="w-6 h-6" />} glowColor="cyan">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-tron-gray flex items-center">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Click on any result to view details
                  </p>
                </div>
                <div className="space-y-4">
                  {searchResults.jobs?.results && searchResults.jobs.results.length > 0 && (
                    <div>
                      <h4 className="font-medium text-tron-white mb-2 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-tron-cyan" />
                        Jobs ({searchResults.jobs.results.length})
                      </h4>
                      <div className="space-y-2">
                        {searchResults.jobs.results.map((job: any, index: number) => (
                          <div
                            key={job._id}
                            className="p-3 border border-tron-cyan/20 rounded-lg bg-tron-bg-card hover:bg-tron-bg-elevated cursor-pointer transition-colors"
                            onClick={() => handleJobClick(job)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-tron-white">{job.jobTitle}</h5>
                                <p className="text-sm text-tron-gray">{job.location}</p>
                              </div>
                              <div className="text-right flex items-center space-x-2">
                                <span className="text-sm font-medium text-tron-white">
                                  {(job.similarity * 100).toFixed(1)}% match
                                </span>
                                <div className={`w-3 h-3 rounded-full ${ job.similarity >= 0.8 ? 'bg-neon-success' : job.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultSelect(job);
                                  }}
                                  className="p-1 hover:bg-tron-bg-elevated rounded transition-colors"
                                  title="View explanation"
                                >
                                  <Info className="h-4 w-4 text-tron-cyan" />
                                </button>
                                <ExternalLink className="h-4 w-4 text-tron-gray" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.resumes?.results && searchResults.resumes.results.length > 0 && (
                    <div>
                      <h4 className="font-medium text-tron-white mb-2 flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-tron-gray" />
                        Resumes ({searchResults.resumes.results.length})
                      </h4>
                      <div className="space-y-2">
                        {searchResults.resumes.results.map((resume: any, index: number) => (
                          <div
                            key={resume._id}
                            className="p-3 border border-tron-cyan/20 rounded-lg bg-tron-bg-card hover:bg-tron-bg-elevated cursor-pointer transition-colors"
                            onClick={() => handleResumeClick(resume)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-tron-white">
                                  {resume.processedMetadata?.name || resume.filename}
                                </h5>
                                <p className="text-sm text-tron-gray">
                                  {resume.processedMetadata?.email || 'No email'}
                                </p>
                              </div>
                              <div className="text-right flex items-center space-x-2">
                                <span className="text-sm font-medium text-tron-white">
                                  {(resume.similarity * 100).toFixed(1)}% match
                                </span>
                                <div className={`w-3 h-3 rounded-full ${ resume.similarity >= 0.8 ? 'bg-neon-success' : resume.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultSelect(resume);
                                  }}
                                  className="p-1 hover:bg-tron-bg-elevated rounded transition-colors"
                                  title="View explanation"
                                >
                                  <Info className="h-4 w-4 text-tron-cyan" />
                                </button>
                                <ExternalLink className="h-4 w-4 text-tron-gray" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!searchResults.jobs?.results || searchResults.jobs.results.length === 0) &&
                   (!searchResults.resumes?.results || searchResults.resumes.results.length === 0) && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-tron-gray mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-tron-white mb-2">
                        No Results Found
                      </h4>
                      <p className="text-tron-gray">
                        Try adjusting your search query or filters to find more results.
                      </p>
                    </div>
                  )}
                </div>
              </TronPanel>
            )}

            {/* Search Explanation */}
            {selectedResult && selectedResult.explanation && (
              <div className="mt-6">
                <SearchExplanation explanation={selectedResult.explanation} />
              </div>
            )}
          </div>
        );
      case 'kfc-management':
        return (
          <div className="space-y-6">
            <div className="border-b border-tron-cyan/20">
              <nav className="-mb-px flex justify-center space-x-8">
                <button
                  onClick={() => setKfcSubTab('points')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${ kfcSubTab === 'points' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
                >
                  Points Manager
                </button>
                <button
                  onClick={() => setKfcSubTab('nominations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${ kfcSubTab === 'nominations' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
                >
                  Nominations
                </button>
              </nav>
            </div>
            {kfcSubTab === 'points' && <KfcPointsManager />}
            {kfcSubTab === 'nominations' && <KfcNomination />}
          </div>
        );
      case 'leads-management':
        return <LeadsManagement />;
      case 'procurement-links':
        return (
          <div className="space-y-6">
            <div className="border-b border-tron-cyan/20">
              <nav className="-mb-px flex justify-center space-x-8">
                <button
                  onClick={() => setProcurementSubTab('chat')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'chat' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
                >
                  AI Chat Assistant
                </button>
                <button
                  onClick={() => setProcurementSubTab('verifier')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'verifier' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
                >
                  Link Verifier
                </button>
                <button
                  onClick={() => setProcurementSubTab('feedback')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${ procurementSubTab === 'feedback' ? 'border-tron-cyan text-tron-cyan' : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40' }`}
                >
                  Feedback
                </button>
              </nav>
            </div>
            {procurementSubTab === 'chat' && (
              <ProcurementChat 
                onExportToVerifier={() => setProcurementSubTab('verifier')}
              />
            )}
            {procurementSubTab === 'verifier' && <ProcurementLinkVerifier />}
            {procurementSubTab === 'feedback' && <FeedbackComponent />}
          </div>
        );
      case 'data-management':
        return <DataManagementContent />;
      case 'embeddings':
        return <EmbeddingManagement />;
      default:
        return <HRDashboard />;
    }
  };

  // If only one tab is visible, render it directly without navigation
  const shouldShowNavigation = tabs.length > 1;

  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${shouldShowNavigation ? 'py-8' : 'py-0'}`}>
        {/* Page Header - only show if multiple tabs */}
        {shouldShowNavigation && (
          <div className="mb-8">
          </div>
        )}

        {/* Navigation Tabs - only show if multiple tabs */}
        {shouldShowNavigation && (
          <div className="mb-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${ activeTab === tab.id ? 'bg-tron-cyan/20 text-tron-white border-b-2 border-tron-cyan' : 'text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated' }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {shouldShowNavigation ? (
          <div className="bg-tron-bg-panel rounded-lg shadow-sm border border-tron-cyan/20">
            {renderTabContent()}
          </div>
        ) : (
          // When only one tab, render content directly without wrapper for full screen usage
          <div className="w-full">
            {renderTabContent()}
          </div>
        )}
      </div>
    </div>
  );
}
