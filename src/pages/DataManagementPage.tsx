import React, { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Upload, FileText, Database, Search, Trash2, Download, Filter, ChevronDown, ChevronRight, User, Briefcase, RefreshCw } from 'lucide-react';
import { SectionLoadingSpinner } from '../components/LoadingSpinner';

/*
INDEXEDDB CACHING SOLUTION WITH COMPRESSION:

This implementation uses IndexedDB for much larger storage capacity (50MB+ vs 5-10MB for localStorage)
while still compressing data to maximize space efficiency.

Key Features:
- IndexedDB storage with 50MB+ capacity
- Data compression to remove large fields and truncate text
- Automatic cache expiration (30 minutes)
- Graceful fallback to fresh data if IndexedDB fails
- Size monitoring and logging
*/

// Import types from a shared location
interface JobPosting {
  _id?: string;
  jobTitle: string;
  location: string;
  salary: string;
  openDate: string;
  closeDate: string;
  jobLink: string;
  jobType: string;
  jobSummary: string;
  duties: string;
  requirements: string;
  qualifications: string;
  education: string;
  howToApply: string;
  additionalInformation: string;
  department: string;
  seriesGrade: string;
  travelRequired: string;
  workSchedule: string;
  securityClearance: string;
  experienceRequired: string;
  educationRequired: string;
  applicationDeadline: string;
  contactInfo: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    originalIndex?: number;
    importedAt: Date;
    sourceFile?: string;
    dataType: string;
  };
}

interface Resume {
  _id?: string;
  filename: string;
  originalText: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    yearsOfExperience: number;
  };
  professionalSummary: string;
  education: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  skills: string[];
  certifications: string;
  professionalMemberships: string;
  securityClearance: string;
  searchableText?: string;
  extractedSkills?: string[];
  embedding?: number[];
  _metadata?: {
    filePath?: string;
    fileName: string;
    importedAt: Date;
    parsedAt: Date;
  };
}

interface SearchCriteria {
  jobTitle?: string;
  location?: string;
  jobType?: string;
  department?: string;
}

interface ResumeSearchCriteria {
  firstName?: string;
  lastName?: string;
  email?: string;
  skills?: string;
  yearsOfExperience?: string;
}

export function DataManagementPage() {
  const navigate = useNavigate();
  
  // Data loading state - declare these first
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Use Convex queries and actions for database operations
  const getAllJobPostingsQuery = useQuery(api.dataManagement.getAllJobPostings, { 
    limit: 50, 
    offset: 0 
  });
  const getAllResumesQuery = useQuery(api.dataManagement.getAllResumes, { 
    limit: 50, 
    offset: 0 
  });
  const searchJobPostingsQuery = useQuery(api.dataManagement.searchJobPostings, { 
    query: '', 
    limit: 50 
  });
  const searchResumesQuery = useQuery(api.dataManagement.searchResumes, { 
    query: '', 
    limit: 50 
  });
  const importDataAction = useAction(api.dataManagement.importData);
  const exportDataAction = useAction(api.dataManagement.exportData);
  const clearAllDataAction = useMutation(api.dataManagement.clearAllData);
  
  // Get data summary
  const dataSummary = useQuery(api.dataManagement.getDataSummary);

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [resumeSearchCriteria, setResumeSearchCriteria] = useState<ResumeSearchCriteria>({});
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);

  
  // Collapsible state
  const [jobsSectionCollapsed, setJobsSectionCollapsed] = useState(false);
  const [resumesSectionCollapsed, setResumesSectionCollapsed] = useState(false);
  const [jobSearchCollapsed, setJobSearchCollapsed] = useState(false);
  const [resumeSearchCollapsed, setResumeSearchCollapsed] = useState(false);



  // Load data from Convex queries
  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // The queries will automatically update when the component re-renders
      // We just need to trigger a re-render by updating the page state
      if (forceRefresh) {
        setCurrentPage(1);
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };



  // Clear cache function (no longer needed with Convex)
  const clearCache = async () => {
    // No-op since we're not using IndexedDB anymore
    console.log('Cache clearing not needed with Convex');
  };

  // Force refresh data
  const handleForceRefresh = async () => {
    await clearCache();
    await loadData(true);
  };

  // Handle query results and update state
  useEffect(() => {
    if (getAllJobPostingsQuery && getAllResumesQuery) {
      setJobPostings(getAllJobPostingsQuery.jobs || []);
      setResumes(getAllResumesQuery.resumes || []);
      setFilteredJobs(getAllJobPostingsQuery.jobs || []);
      setFilteredResumes(getAllResumesQuery.resumes || []);
      setLoading(false);
    }
  }, [getAllJobPostingsQuery, getAllResumesQuery]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle Excel file import
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setLoading(true);
    try {
      // Read and parse Excel file
      const data = await readExcelFile(file);
      const result = await importDataAction({ 
        data: data.jobs || data.resumes || data.employees || data.kfcpoints,
        dataType: determineDataType(data),
        overwrite: false
      });
      setMessage(`Import completed: ${result.importedCount} successful, ${result.errorCount} errors`);
      await loadData(true); // Force refresh to get updated data
    } catch (error) {
      setMessage(`Import failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle JSON file import
  const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage('Please select a JSON file');
      return;
    }

    setLoading(true);
    setMessage('Importing JSON file...');
    try {
      // Read and parse JSON file
      const data = await readJsonFile(file);
      const result = await importDataAction({ 
        data: data.jobs || data.resumes || data.employees || data.kfcpoints,
        dataType: determineDataType(data),
        overwrite: false
      });
      setMessage(`Import completed: ${result.importedCount} successful, ${result.errorCount} errors`);
      await loadData(true); // Force refresh to get updated data
    } catch (error) {
      setMessage(`Import failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Office Open XML document and PDF import
  const handleOfficeDocumentImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      setMessage('Please select a .docx or .pdf file');
      return;
    }

    setLoading(true);
    const fileType = file.name.endsWith('.docx') ? 'DOCX' : 'PDF';
    setMessage(`Processing ${fileType} file...`);
    try {
      // For now, we'll handle this as a simple file import
      // TODO: Implement AI parsing and embedding generation
      setMessage(`File type ${fileType} import not yet implemented for Convex. Please use JSON or Excel import instead.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Import failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

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
      
      // For now, we'll use the main query and filter client-side
      // TODO: Implement proper search functionality
      const results = jobPostings.filter(job => {
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
      // Check if at least one criteria is provided
      const hasCriteria = Object.values(resumeSearchCriteria).some(value => value && value.trim());
      
      if (!hasCriteria) {
        setMessage('Please enter at least one search criteria');
        setLoading(false);
        return;
      }
      
      const searchQuery = Object.values(resumeSearchCriteria).filter(Boolean).join(' ');
      
      // For now, we'll use the main query and filter client-side
      // TODO: Implement proper search functionality
      const results = resumes.filter(resume => {
        const searchLower = searchQuery.toLowerCase();
        return (
          resume.personalInfo.firstName.toLowerCase().includes(searchLower) ||
          resume.personalInfo.lastName.toLowerCase().includes(searchLower) ||
          resume.personalInfo.email.toLowerCase().includes(searchLower) ||
          resume.skills.some(skill => skill.toLowerCase().includes(searchLower))
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
      setJobPostings([]);
      setResumes([]);
      setFilteredJobs([]);
      setFilteredResumes([]);
      setMessage('All data cleared successfully from Convex database');
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
        a.download = `convex-data-export-${new Date().toISOString().split('T')[0]}.json`;
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

  // Helper function to read Excel file
  const readExcelFile = async (file: File): Promise<any> => {
    // TODO: Implement Excel file reading
    // For now, return empty data
    return { jobs: [], resumes: [], employees: [], kfcpoints: [] };
  };

  // Helper function to read JSON file
  const readJsonFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Helper function to determine data type from imported data
  const determineDataType = (data: any): 'jobs' | 'resumes' | 'employees' | 'kfcpoints' => {
    if (data.jobs && Array.isArray(data.jobs)) return 'jobs';
    if (data.resumes && Array.isArray(data.resumes)) return 'resumes';
    if (data.employees && Array.isArray(data.employees)) return 'employees';
    if (data.kfcpoints && Array.isArray(data.kfcpoints)) return 'kfcpoints';
    
    // Try to determine from array content
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const first = data[0];
        if (first.jobTitle) return 'jobs';
        if (first.filename || first.personalInfo) return 'resumes';
        if (first.name && first.events) return 'kfcpoints';
        if (first.name && !first.events) return 'employees';
      }
    }
    
    return 'jobs'; // Default fallback
  };

  // Handle job click for navigation
  const handleJobClick = (job: JobPosting) => {
    const jobId = job._id || job.jobTitle;
    const finalJobId = String(jobId);
    const encodedJobId = encodeURIComponent(finalJobId);
    navigate(`/job/${encodedJobId}`);
  };

  // Handle resume click for navigation
  const handleResumeClick = (resume: Resume) => {
    const resumeId = resume._id || resume.personalInfo?.firstName + ' ' + resume.personalInfo?.lastName;
    const finalResumeId = String(resumeId);
    const encodedResumeId = encodeURIComponent(finalResumeId);
    navigate(`/resume/${encodedResumeId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Data Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import and manage job postings, resumes, employees, and KFC points using Convex database
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 mb-6 rounded-lg ${
          message.includes('Error') || message.includes('Failed') 
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        }`}>
          {message}
        </div>
      )}

      {/* Data Summary */}
      {dataSummary && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataSummary.totalJobs}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Job Postings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataSummary.totalResumes}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Resumes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataSummary.totalEmployees}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dataSummary.totalKfcPoints}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">KFC Points</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleForceRefresh}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Import Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Excel Import */}
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2" />
            Import Job Postings (Excel)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload an Excel file containing job posting data
          </p>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
            />
          </label>
        </div>

        {/* JSON Import */}
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" />
            Import Resumes (JSON)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a JSON file containing resume data
          </p>
          <label className="block">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900 dark:file:text-green-300"
            />
          </label>
        </div>

        {/* Office Open XML and PDF Import */}
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2" />
            Import Resumes (DOCX/PDF)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a .docx or .pdf file - AI will extract and structure the resume data
          </p>
          <label className="block">
            <input
              type="file"
              accept=".docx,.pdf"
              onChange={handleOfficeDocumentImport}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-300"
            />
          </label>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={handleForceRefresh}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Database className="mr-2" />
          Refresh Data
        </button>
        
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

      {/* Search Sections */}
      <div className="space-y-6 mb-8">
        {/* Job Search Section */}
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <button
            onClick={() => setJobSearchCollapsed(!jobSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h2 className="text-xl font-semibold flex items-center">
              <Search className="mr-2" />
              Search Job Postings
            </h2>
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
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={searchCriteria.location || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, location: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Job Type"
                  value={searchCriteria.jobType || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, jobType: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={searchCriteria.department || ''}
                  onChange={(e) => setSearchCriteria({ ...searchCriteria, department: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
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
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <button
            onClick={() => setResumeSearchCollapsed(!resumeSearchCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h2 className="text-xl font-semibold flex items-center">
              <User className="mr-2" />
              Search Resumes
            </h2>
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
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={resumeSearchCriteria.lastName || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, lastName: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={resumeSearchCriteria.email || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, email: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Skills"
                  value={resumeSearchCriteria.skills || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, skills: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="number"
                  placeholder="Years of Experience"
                  value={resumeSearchCriteria.yearsOfExperience || ''}
                  onChange={(e) => setResumeSearchCriteria({ ...resumeSearchCriteria, yearsOfExperience: e.target.value })}
                  className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-800"
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

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Job Postings</h3>
          <p className="text-2xl font-bold text-blue-600">{jobPostings.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total job postings stored</p>
        </div>
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Resumes</h3>
          <p className="text-2xl font-bold text-green-600">{resumes.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total resumes stored</p>
        </div>
      </div>

      {/* Job Postings List */}
      {(jobPostings.length > 0 || filteredJobs.length > 0) && (
        <div className="border rounded-lg p-6 dark:border-gray-700 mb-8">
          <button
            onClick={() => setJobsSectionCollapsed(!jobsSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <Briefcase className="mr-2" />
              Job Postings ({filteredJobs.length > 0 ? filteredJobs.length : jobPostings.length})
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
              {(filteredJobs.length > 0 ? filteredJobs : jobPostings).map((job, index) => (
                <div 
                  key={job._id || index} 
                  className="border rounded-lg p-4 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleJobClick(job)}
                >
                  <h4 className="font-semibold text-lg">{job.jobTitle}</h4>
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
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <button
            onClick={() => setResumesSectionCollapsed(!resumesSectionCollapsed)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <User className="mr-2" />
              Resumes ({filteredResumes.length > 0 ? filteredResumes.length : resumes.length})
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
              {(filteredResumes.length > 0 ? filteredResumes : resumes).map((resume, index) => (
                <div 
                  key={resume._id || index} 
                  className="border rounded-lg p-4 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleResumeClick(resume)}
                >
                  <h4 className="font-semibold text-lg">
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
          <SectionLoadingSpinner text="Loading job postings and resumes..." />
        </div>
      )}
    </div>
  );
} 