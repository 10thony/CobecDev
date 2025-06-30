import React, { useState, useEffect } from 'react';
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Upload, FileText, Database, Search, Trash2, Download, Filter } from 'lucide-react';

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

export function DataManagementPage() {
  // Use Convex actions for database operations
  const getAllJobPostingsAction = useAction(api.mongoSearch.getAllJobPostings);
  const getAllResumesAction = useAction(api.mongoSearch.getAllResumes);
  const searchJobPostingsAction = useAction(api.mongoSearch.searchJobPostings);
  const importExcelDataAction = useAction(api.mongoSearch.importExcelData);
  const importJsonDataAction = useAction(api.mongoSearch.importJsonData);
  const importOfficeDocumentAction = useAction(api.mongoSearch.importOfficeDocument);
  const clearAllDataAction = useAction(api.mongoSearch.clearAllData);

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load all data from MongoDB cluster
  const loadData = async () => {
    setLoading(true);
    try {
      const [jobs, resumeData] = await Promise.all([
        getAllJobPostingsAction(),
        getAllResumesAction()
      ]);
      setJobPostings(jobs as unknown as JobPosting[]);
      setResumes(resumeData as unknown as Resume[]);
      setFilteredJobs(jobs as unknown as JobPosting[]);
      setMessage(`Loaded ${jobs.length} job postings and ${resumeData.length} resumes from MongoDB`);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error loading data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

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
      await loadData(); // Reload data
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
    try {
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      const result = await importJsonDataAction({ 
        fileName: file.name, 
        fileData: base64Data 
      });
      setMessage(`Import completed: ${result.successCount} successful, ${result.failCount} failed`);
      await loadData(); // Reload data
    } catch (error) {
      setMessage(`Import failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Office Open XML document import
  const handleOfficeDocumentImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setMessage('Please select a .docx file');
      return;
    }

    setLoading(true);
    try {
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      const result = await importOfficeDocumentAction({ 
        fileName: file.name, 
        fileData: base64Data 
      });
      setMessage(`Import completed: ${result.successCount} successful, ${result.failCount} failed`);
      await loadData(); // Reload data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Import failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await searchJobPostingsAction(searchCriteria);
      setFilteredJobs(results as unknown as JobPosting[]);
      setMessage(`Found ${results.length} matching job postings`);
    } catch (error) {
      setMessage(`Search failed: ${error}`);
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
      setMessage('All data cleared successfully from MongoDB');
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

        {/* Office Open XML Import */}
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2" />
            Import Resumes (DOCX)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a .docx file - AI will extract and structure the resume data
          </p>
          <label className="block">
            <input
              type="file"
              accept=".docx"
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
          onClick={loadData}
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

      {/* Search Section */}
      <div className="border rounded-lg p-6 mb-8 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Search className="mr-2" />
          Search Job Postings
        </h2>
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
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Filter className="mr-2" />
          Search
        </button>
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
      {filteredJobs.length > 0 && (
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Job Postings ({filteredJobs.length})</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredJobs.map((job, index) => (
              <div key={job._id || index} className="border rounded-lg p-4 dark:border-gray-600">
                <h4 className="font-semibold text-lg">{job.jobTitle}</h4>
                <p className="text-gray-600 dark:text-gray-400">{job.location}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{job.department}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{job.salary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading...</span>
        </div>
      )}
    </div>
  );
} 