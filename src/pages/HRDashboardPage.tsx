import React, { useState } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { HRDashboard } from '../components/HRDashboard';
import { EmbeddingManagement } from '../components/EmbeddingManagement';
import { EnhancedSearchInterface } from '../components/EnhancedSearchInterface';
import { SearchExplanation } from '../components/SearchExplanation';
import KfcPointsManager from '../components/KfcPointsManager';
import KfcNomination from '../components/KfcNomination';

// Data Management Component for HR Dashboard
function DataManagementContent() {
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
      const hasCriteria = Object.values(resumeSearchCriteria).some(value => value && value.trim());
      
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
        <div className={`p-4 rounded-lg ${
          message.includes('Error') || message.includes('Failed') 
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        }`}>
          {message}
        </div>
      )}

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Postings</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {jobPostings.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resumes</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {resumes.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExportData}
            disabled={loading || (jobPostings.length === 0 && resumes.length === 0)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="mr-2" />
            Export Data
          </button>
          
          <button
            onClick={handleClearData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="mr-2" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Search Sections */}
      <div className="space-y-6">
        {/* Job Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => setJobSearchCollapsed(!jobSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Search className="mr-2" />
              Search Job Postings
            </h3>
            {jobSearchCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
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
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={searchCriteria.location || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, location: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Job Type"
                  value={searchCriteria.jobType || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, jobType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={searchCriteria.department || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, department: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleJobSearch}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Filter className="mr-2" />
                  Search Jobs
                </button>
                <button
                  onClick={() => {
                    setSearchCriteria({});
                    setFilteredJobs([]);
                    setMessage('Job search cleared');
                  }}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <Trash2 className="mr-2" />
                  Clear Search
                </button>
              </div>
            </>
          )}
        </div>

        {/* Resume Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => setResumeSearchCollapsed(!resumeSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UserIcon className="mr-2" />
              Search Resumes
            </h3>
            {resumeSearchCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
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
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={resumeSearchCriteria.lastName || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, lastName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={resumeSearchCriteria.email || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, email: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Skills"
                  value={resumeSearchCriteria.skills || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, skills: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Years of Experience"
                  value={resumeSearchCriteria.yearsOfExperience || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, yearsOfExperience: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResumeSearch}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Filter className="mr-2" />
                  Search Resumes
                </button>
                <button
                  onClick={() => {
                    setResumeSearchCriteria({});
                    setFilteredResumes([]);
                    setMessage('Resume search cleared');
                  }}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <Trash2 className="mr-2" />
                  Clear Search
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Job Postings List */}
      {(jobPostings.length > 0 || filteredJobs.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => setJobsSectionCollapsed(!jobsSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Briefcase className="mr-2" />
              Job Postings ({(filteredJobs.length > 0 ? filteredJobs.length : jobPostings.length)})
              {filteredJobs.length > 0 && filteredJobs.length !== jobPostings.length && (
                <span className="ml-2 text-sm text-gray-500">(filtered)</span>
              )}
            </h3>
            {jobsSectionCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          
          {!jobsSectionCollapsed && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(filteredJobs.length > 0 ? filteredJobs : jobPostings).map((job: any, index: number) => (
                <div 
                  key={job._id || index} 
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleJobClick(job)}
                >
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{job.jobTitle}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{job.location}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{job.department}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{job.salary}</p>
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Click to view full details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumes List */}
      {(resumes.length > 0 || filteredResumes.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => setResumesSectionCollapsed(!resumesSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UserIcon className="mr-2" />
              Resumes ({(filteredResumes.length > 0 ? filteredResumes.length : resumes.length)})
              {filteredResumes.length > 0 && filteredResumes.length !== resumes.length && (
                <span className="ml-2 text-sm text-gray-500">(filtered)</span>
              )}
            </h3>
            {resumesSectionCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          
          {!resumesSectionCollapsed && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(filteredResumes.length > 0 ? filteredResumes : resumes).map((resume: any, index: number) => (
                <div 
                  key={resume._id || index} 
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleResumeClick(resume)}
                >
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {resume.personalInfo?.firstName} {resume.personalInfo?.lastName}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">{resume.personalInfo?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {resume.personalInfo?.yearsOfExperience} years of experience
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{resume.filename}</p>
                  {resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Skills: {resume.skills.slice(0, 3).join(', ')}
                        {resume.skills.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Click to view full details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
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
  RefreshCw
} from 'lucide-react';

export function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'embeddings' | 'data-management' | 'kfc-management'>('overview');
  const [kfcSubTab, setKfcSubTab] = useState<'points' | 'nominations'>('points');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const navigate = useNavigate();

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

  const tabs = [
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
      id: 'kfc-management',
      name: 'KFC Management',
      icon: Users,
      description: 'Manage KFC points and employee nominations'
    },
    {
      id: 'data-management',
      name: 'Data Management',
      icon: Database,
      description: 'Import, export, and manage job postings and resumes'
    },
    {
      id: 'embeddings',
      name: 'Embedding Management',
      icon: Settings,
      description: 'Manage AI embeddings and system optimization'
    }
  ];

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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Search Results
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Click on any result to view details
                  </p>
                </div>
                <div className="space-y-4">
                  {searchResults.jobs?.results && searchResults.jobs.results.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-blue-600" />
                        Jobs ({searchResults.jobs.results.length})
                      </h4>
                      <div className="space-y-2">
                        {searchResults.jobs.results.map((job: any, index: number) => (
                          <div
                            key={job._id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors"
                            onClick={() => handleJobClick(job)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">{job.jobTitle}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{job.location}</p>
                              </div>
                              <div className="text-right flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {(job.similarity * 100).toFixed(1)}% match
                                </span>
                                <div className={`w-3 h-3 rounded-full ${
                                  job.similarity >= 0.8 ? 'bg-green-500' :
                                  job.similarity >= 0.6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultSelect(job);
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title="View explanation"
                                >
                                  <Info className="h-4 w-4 text-blue-500" />
                                </button>
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.resumes?.results && searchResults.resumes.results.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <User className="h-4 w-4 mr-2 text-green-600" />
                        Resumes ({searchResults.resumes.results.length})
                      </h4>
                      <div className="space-y-2">
                        {searchResults.resumes.results.map((resume: any, index: number) => (
                          <div
                            key={resume._id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors"
                            onClick={() => handleResumeClick(resume)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">
                                  {resume.processedMetadata?.name || resume.filename}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {resume.processedMetadata?.email || 'No email'}
                                </p>
                              </div>
                              <div className="text-right flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {(resume.similarity * 100).toFixed(1)}% match
                                </span>
                                <div className={`w-3 h-3 rounded-full ${
                                  resume.similarity >= 0.8 ? 'bg-green-500' :
                                  resume.similarity >= 0.6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResultSelect(resume);
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title="View explanation"
                                >
                                  <Info className="h-4 w-4 text-blue-500" />
                                </button>
                                <ExternalLink className="h-4 w-4 text-gray-400" />
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
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Results Found
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Try adjusting your search query or filters to find more results.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex justify-center space-x-8">
                <button
                  onClick={() => setKfcSubTab('points')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    kfcSubTab === 'points'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Points Manager
                </button>
                <button
                  onClick={() => setKfcSubTab('nominations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    kfcSubTab === 'nominations'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Nominations
                </button>
              </nav>
            </div>
            {kfcSubTab === 'points' && <KfcPointsManager />}
            {kfcSubTab === 'nominations' && <KfcNomination />}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                HR Dashboard
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                AI-powered job-resume matching and semantic search for HR professionals
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderTabContent()}
        </div>


        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Getting Started with HR Dashboard
              </h3>
              <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                <p className="mb-2">
                  <strong>1. Overview Tab:</strong> View job-resume matching statistics and business insights
                </p>
                <p className="mb-2">
                  <strong>2. Search Tab:</strong> Use AI-powered semantic search to find optimal matches
                </p>
                <p className="mb-2">
                  <strong>3. KFC Management Tab:</strong> Manage KFC points and employee nominations with sub-tabs for Points Manager and Nominations
                </p>
                <p className="mb-2">
                  <strong>4. Data Management Tab:</strong> Import, export, and manage job postings and resumes
                </p>
                <p className="mb-2">
                  <strong>5. Embeddings Tab:</strong> Manage AI embeddings for system optimization (Admin only)
                </p>
                <p>
                  <strong>Tip:</strong> Use the 50% similarity threshold for optimal HR matching results
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
