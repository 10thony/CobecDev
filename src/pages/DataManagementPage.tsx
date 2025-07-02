import React, { useState, useEffect } from 'react';
import { useAction } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Upload, FileText, Database, Search, Trash2, Download, Filter, ChevronDown, ChevronRight, User, Briefcase } from 'lucide-react';
import { openDB, IDBPDatabase } from 'idb';
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
  
  // Use Convex actions for database operations
  const getAllJobPostingsAction = useAction(api.mongoSearch.getAllJobPostings);
  const getAllResumesAction = useAction(api.mongoSearch.getAllResumes);
  const searchJobPostingsAction = useAction(api.mongoSearch.searchJobPostings);
  const filterResumesByTextAction = useAction(api.mongoSearch.filterResumesByText);
  const importExcelDataAction = useAction(api.mongoSearch.importExcelData);
  const importJsonDataAction = useAction(api.mongoSearch.importJsonData);
  const importOfficeDocumentAction = useAction(api.mongoSearch.importOfficeDocument);
  const clearAllDataAction = useAction(api.mongoSearch.clearAllData);

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [resumeSearchCriteria, setResumeSearchCriteria] = useState<ResumeSearchCriteria>({});
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [dataCached, setDataCached] = useState(false);
  const [lastCacheTime, setLastCacheTime] = useState<Date | null>(null);
  const [cachingDisabled, setCachingDisabled] = useState(false);
  
  // Collapsible state
  const [jobsSectionCollapsed, setJobsSectionCollapsed] = useState(false);
  const [resumesSectionCollapsed, setResumesSectionCollapsed] = useState(false);
  const [jobSearchCollapsed, setJobSearchCollapsed] = useState(false);
  const [resumeSearchCollapsed, setResumeSearchCollapsed] = useState(false);

  // IndexedDB configuration
  const DB_NAME = 'dataManagementCache';
  const DB_VERSION = 1;
  const STORE_NAMES = {
    JOB_POSTINGS: 'jobPostings',
    RESUMES: 'resumes',
    METADATA: 'metadata'
  };

  // Maximum cache size (50MB in bytes) - IndexedDB can handle much more
  const MAX_CACHE_SIZE = 50 * 1024 * 1024;

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

  // Initialize IndexedDB
  const initDB = async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains(STORE_NAMES.JOB_POSTINGS)) {
          db.createObjectStore(STORE_NAMES.JOB_POSTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.RESUMES)) {
          db.createObjectStore(STORE_NAMES.RESUMES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.METADATA)) {
          db.createObjectStore(STORE_NAMES.METADATA, { keyPath: 'id' });
        }
      },
    });
  };

  // Check if cached data should be used
  const shouldUseCachedData = async (): Promise<boolean> => {
    try {
      const db = await initDB();
      const metadata = await db.get(STORE_NAMES.METADATA, 'cacheInfo');
      
      if (!metadata) return false;
      
      const cacheAge = Date.now() - metadata.timestamp;
      const maxCacheAge = 30 * 60 * 1000; // 30 minutes
      
      return cacheAge < maxCacheAge;
    } catch (error) {
      console.warn('Error checking cache validity:', error);
      return false;
    }
  };

  // Load data from IndexedDB cache
  const loadFromCache = async (): Promise<{ jobPostings: JobPosting[], resumes: Resume[], cacheTime: Date } | null> => {
    try {
      const db = await initDB();
      
      const [jobPostingsData, resumesData, metadata] = await Promise.all([
        db.get(STORE_NAMES.JOB_POSTINGS, 'all'),
        db.get(STORE_NAMES.RESUMES, 'all'),
        db.get(STORE_NAMES.METADATA, 'cacheInfo')
      ]);
      
      if (!jobPostingsData || !resumesData || !metadata) {
        return null;
      }
      
      return {
        jobPostings: jobPostingsData.data,
        resumes: resumesData.data,
        cacheTime: new Date(metadata.timestamp)
      };
    } catch (error) {
      console.error('Error loading from IndexedDB cache:', error);
      return null;
    }
  };

  // Save data to IndexedDB cache with compression
  const saveToCache = async (jobPostingsData: JobPosting[], resumesData: Resume[]): Promise<boolean> => {
    try {
      // First, try to save the full data
      const fullJobPostingsSize = estimateDataSize(jobPostingsData);
      const fullResumesSize = estimateDataSize(resumesData);
      const totalSize = fullJobPostingsSize + fullResumesSize;
      
      console.log(`Cache size estimation: Job postings ${(fullJobPostingsSize / 1024 / 1024).toFixed(2)}MB, Resumes ${(fullResumesSize / 1024 / 1024).toFixed(2)}MB, Total ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      let dataToCache = {
        jobPostings: jobPostingsData,
        resumes: resumesData,
        compressed: false
      };
      
      // If data is too large, compress it
      if (totalSize > MAX_CACHE_SIZE) {
        console.log('Data too large, compressing for cache...');
        const compressedJobPostings = compressDataForCache(jobPostingsData, 'jobPostings');
        const compressedResumes = compressDataForCache(resumesData, 'resumes');
        
        const compressedJobPostingsSize = estimateDataSize(compressedJobPostings);
        const compressedResumesSize = estimateDataSize(compressedResumes);
        const compressedTotalSize = compressedJobPostingsSize + compressedResumesSize;
        
        console.log(`Compressed cache size: Job postings ${(compressedJobPostingsSize / 1024 / 1024).toFixed(2)}MB, Resumes ${(compressedResumesSize / 1024 / 1024).toFixed(2)}MB, Total ${(compressedTotalSize / 1024 / 1024).toFixed(2)}MB`);
        
        if (compressedTotalSize <= MAX_CACHE_SIZE) {
          dataToCache = {
            jobPostings: compressedJobPostings,
            resumes: compressedResumes,
            compressed: true
          };
          console.log('Saved compressed data to IndexedDB cache');
        } else {
          console.warn('Data too large even after compression, skipping cache');
          return false;
        }
      } else {
        console.log('Saved full data to IndexedDB cache');
      }
      
      // Save to IndexedDB
      const db = await initDB();
      const timestamp = Date.now();
      
      await Promise.all([
        db.put(STORE_NAMES.JOB_POSTINGS, { id: 'all', data: dataToCache.jobPostings }),
        db.put(STORE_NAMES.RESUMES, { id: 'all', data: dataToCache.resumes }),
        db.put(STORE_NAMES.METADATA, { 
          id: 'cacheInfo', 
          timestamp,
          compressed: dataToCache.compressed,
          jobPostingsCount: dataToCache.jobPostings.length,
          resumesCount: dataToCache.resumes.length
        })
      ]);
      
      return true;
    } catch (error) {
      console.error('Error saving to IndexedDB cache:', error);
      return false;
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
          setMessage(`Loaded ${cachedData.jobPostings.length} job postings and ${cachedData.resumes.length} resumes from IndexedDB cache (cached at ${cachedData.cacheTime.toLocaleString()})`);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data from database
      const [jobs, resumeData] = await Promise.all([
        getAllJobPostingsAction(),
        getAllResumesAction()
      ]);
      
      const jobPostingsData = jobs as unknown as JobPosting[];
      const resumesData = resumeData as unknown as Resume[];
      
      setJobPostings(jobPostingsData);
      setResumes(resumesData);
      setFilteredJobs(jobPostingsData);
      setFilteredResumes(resumesData);
      setDataCached(false);
      setLastCacheTime(new Date());
      
      // Save to IndexedDB cache
      const cacheSuccess = await saveToCache(jobPostingsData, resumesData);
      if (!cacheSuccess) {
        console.warn('Failed to save data to IndexedDB cache due to size limitations');
        setCachingDisabled(true);
        setMessage(`Loaded ${jobPostingsData.length} job postings and ${resumesData.length} resumes from MongoDB (caching disabled due to data size)`);
      } else {
        setCachingDisabled(false);
        setMessage(`Loaded ${jobPostingsData.length} job postings and ${resumesData.length} resumes from MongoDB`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error loading data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      const db = await initDB();
      await Promise.all([
        db.clear(STORE_NAMES.JOB_POSTINGS),
        db.clear(STORE_NAMES.RESUMES),
        db.clear(STORE_NAMES.METADATA)
      ]);
      setDataCached(false);
      setLastCacheTime(null);
      setCachingDisabled(false);
    } catch (error) {
      console.error('Error clearing IndexedDB cache:', error);
    }
  };

  // Force refresh data
  const handleForceRefresh = async () => {
    await clearCache();
    await loadData(true);
  };

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
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      const result = await importExcelDataAction({ 
        fileName: file.name, 
        fileData: base64Data 
      });
      setMessage(`Import completed: ${result.successCount} successful, ${result.failCount} failed`);
      await clearCache(); // Clear IndexedDB cache since data has changed
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
    setMessage('Importing JSON file and generating embeddings...');
    try {
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      const result = await importJsonDataAction({ 
        fileName: file.name, 
        fileData: base64Data 
      });
      setMessage(`Import completed: ${result.successCount} successful, ${result.failCount} failed. Embeddings generated for vector search.`);
      await clearCache(); // Clear IndexedDB cache since data has changed
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
    setMessage(`Processing ${fileType} file with AI parsing and generating embeddings...`);
    try {
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      const result = await importOfficeDocumentAction({ 
        fileName: file.name, 
        fileData: base64Data 
      });
      setMessage(`Import completed: ${result.successCount} successful, ${result.failCount} failed. AI parsing and embeddings generated for vector search.`);
      await clearCache(); // Clear IndexedDB cache since data has changed
      await loadData(true); // Force refresh to get updated data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more helpful error messages for PDF issues
      if (errorMessage.includes('PDF parsing failed')) {
        setMessage('PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.');
      } else {
        setMessage(`Import failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle job search
  const handleJobSearch = async () => {
    setLoading(true);
    try {
      const results = await searchJobPostingsAction(searchCriteria);
      setFilteredJobs(results as unknown as JobPosting[]);
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
      
      const results = await filterResumesByTextAction({
        firstName: resumeSearchCriteria.firstName,
        lastName: resumeSearchCriteria.lastName,
        email: resumeSearchCriteria.email,
        skills: resumeSearchCriteria.skills,
        yearsOfExperience: resumeSearchCriteria.yearsOfExperience,
        limit: 50
      });
      setFilteredResumes(results as unknown as Resume[]);
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
      await clearAllDataAction();
      setJobPostings([]);
      setResumes([]);
      setFilteredJobs([]);
      setFilteredResumes([]);
      await clearCache(); // Clear IndexedDB cache as well
      setMessage('All data cleared successfully from MongoDB and IndexedDB cache');
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
    a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setMessage('Data exported successfully');
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
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
          Import and manage job postings and resumes using MongoDB cluster storage
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

      {/* Cache Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              cachingDisabled ? 'bg-yellow-500' : 
              dataCached ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <span className="text-sm font-medium">
              {cachingDisabled ? 'Caching disabled (data too large)' :
               dataCached ? 'Using IndexedDB cached data' : 'Using fresh data from database'}
            </span>
          </div>
          {lastCacheTime && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {lastCacheTime.toLocaleString()}
            </span>
          )}
        </div>
        {dataCached && !cachingDisabled && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            IndexedDB cache expires in 30 minutes. Click "Refresh Data" to get the latest data from the database.
          </p>
        )}
        {cachingDisabled && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Data size exceeds IndexedDB limits. Caching is disabled to prevent errors.
          </p>
        )}
        {!dataCached && !cachingDisabled && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Using IndexedDB for caching with 50MB capacity and automatic compression.
          </p>
        )}
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