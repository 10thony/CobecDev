import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Briefcase, User, TrendingUp, ExternalLink, Trash2 } from "lucide-react";

// Local storage keys
const STORAGE_KEYS = {
  SEARCH_RESULTS: 'vectorSearch_results',
  SEARCH_QUERY: 'vectorSearch_query',
  SEARCH_TYPE: 'vectorSearch_type',
  SEARCH_LIMIT: 'vectorSearch_limit',
  SEARCH_ERROR: 'vectorSearch_error',
  SEARCH_TIMESTAMP: 'vectorSearch_timestamp'
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

// Helper to create UniqueJobPostingId
function getUniqueJobPostingId(job: any) {
  const jobTitle = job.jobTitle || "";
  const location = job.location || "";
  return `${jobTitle}-${location}`.toLowerCase();
}

// Helper to create UniqueResumeId
function getUniqueResumeId(resume: any) {
  const name = resume.processedMetadata?.name || "";
  const email = resume.processedMetadata?.email || "";
  return `${name}-${email}`.toLowerCase();
}

export function VectorSearchPage() {
  const searchSimilarJobs = useAction(api.vectorSearch.searchSimilarJobs);
  const searchSimilarResumes = useAction(api.vectorSearch.searchSimilarResumes);
  const aiAgentSearch = useAction(api.vectorSearch.aiAgentSearch);
  const searchSimilarJobsEnhanced = useAction(api.vectorSearch.searchSimilarJobsEnhanced);
  const searchSimilarResumesEnhanced = useAction(api.vectorSearch.searchSimilarResumesEnhanced);
  const aiAgentSearchEnhanced = useAction(api.vectorSearch.aiAgentSearchEnhanced);
  const testResumeMapping = useAction(api.vectorSearch.testResumeMapping);
  const navigate = useNavigate();
  
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"jobs" | "resumes" | "both">("both");
  const [limit, setLimit] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [useEnhancedSearch, setUseEnhancedSearch] = useState(true);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const savedResults = localStorage.getItem(STORAGE_KEYS.SEARCH_RESULTS);
      const savedQuery = localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY);
      const savedSearchType = localStorage.getItem(STORAGE_KEYS.SEARCH_TYPE);
      const savedLimit = localStorage.getItem(STORAGE_KEYS.SEARCH_LIMIT);
      const savedError = localStorage.getItem(STORAGE_KEYS.SEARCH_ERROR);
      const savedTimestamp = localStorage.getItem(STORAGE_KEYS.SEARCH_TIMESTAMP);

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
          clearStoredData();
        }
      }
    } catch (error) {
      console.error('Error loading saved search data:', error);
      clearStoredData();
    }
  }, []);

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

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (results || error) {
      try {
        if (results) {
          localStorage.setItem(STORAGE_KEYS.SEARCH_RESULTS, JSON.stringify(results));
        }
        if (query) {
          localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, query);
        }
        localStorage.setItem(STORAGE_KEYS.SEARCH_TYPE, searchType);
        localStorage.setItem(STORAGE_KEYS.SEARCH_LIMIT, limit.toString());
        if (error) {
          localStorage.setItem(STORAGE_KEYS.SEARCH_ERROR, error);
        }
        localStorage.setItem(STORAGE_KEYS.SEARCH_TIMESTAMP, Date.now().toString());
        setIsLoadedFromStorage(false); // Reset flag when new data is saved
      } catch (error) {
        console.error('Error saving search data to localStorage:', error);
      }
    }
  }, [results, query, searchType, limit, error]);

  // Function to clear stored data
  const clearStoredData = () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  };

  // Function to clear current results and stored data
  const handleClearResults = () => {
    setResults(null);
    setError(null);
    setQuery("");
    setIsLoadedFromStorage(false);
    clearStoredData();
  };

  const handleTestMapping = async () => {
    try {
      console.log('Testing resume mapping for Micah Kimel...');
      const testResult = await testResumeMapping({
        resumeId: '6862cce8e689af1f155d7b9d'
      });
      console.log('Test mapping result:', testResult);
      alert('Check console for test results!');
    } catch (error) {
      console.error('Test mapping error:', error);
      alert('Test failed - check console for error');
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults(null);
    
    // Clear any previous error from localStorage
    localStorage.removeItem(STORAGE_KEYS.SEARCH_ERROR);
    
    try {
      let searchResults;
      
      if (useEnhancedSearch) {
        // Use enhanced search with skill filtering
        if (searchType === "jobs") {
          searchResults = await searchSimilarJobsEnhanced({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
            skillFilter: skillFilter.length > 0 ? skillFilter : undefined,
          });
          setResults({ jobs: searchResults, resumes: [] });
        } else if (searchType === "resumes") {
          searchResults = await searchSimilarResumesEnhanced({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
            skillFilter: skillFilter.length > 0 ? skillFilter : undefined,
          });
          setResults({ jobs: [], resumes: searchResults });
        } else {
          searchResults = await aiAgentSearchEnhanced({
            query: query.trim(),
            searchType: "both",
            limit: limit,
            minSimilarity: minSimilarity,
            skillFilter: skillFilter.length > 0 ? skillFilter : undefined,
          });
          setResults(searchResults);
          
          // Update extracted skills from the enhanced search
          if (searchResults.filters?.extractedSkills) {
            setExtractedSkills(searchResults.filters.extractedSkills);
          }
        }
      } else {
        // Use original search functions
        if (searchType === "jobs") {
          searchResults = await searchSimilarJobs({
            query: query.trim(),
            limit: limit,
          });
          setResults({ jobs: searchResults, resumes: [] });
        } else if (searchType === "resumes") {
          searchResults = await searchSimilarResumes({
            query: query.trim(),
            limit: limit,
          });
          setResults({ jobs: [], resumes: searchResults });
        } else {
          searchResults = await aiAgentSearch({
            query: query.trim(),
            searchType: "both",
            limit: limit,
          });
          setResults(searchResults);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleJobClick = (job: any) => {
    // Navigate to job details page with the job ID
    const jobId = job._id || job.jobTitle;
    console.log('Job clicked:', job);
    console.log('Job ID being used:', jobId);
    console.log('Job ID type:', typeof jobId);
    
    // For ObjectIds, we need to convert to string and handle special characters
    let finalJobId = jobId;
    if (typeof jobId === 'object' && jobId.toString) {
      finalJobId = jobId.toString();
    }
    
    // Encode the job ID to handle special characters
    const encodedJobId = encodeURIComponent(finalJobId);
    console.log('Final Job ID:', finalJobId);
    console.log('Encoded Job ID:', encodedJobId);
    console.log('Navigating to:', `/job/${encodedJobId}`);
    
    // Infrastructure for test route forwarding (disabled but kept for future use)
    // console.log('Testing navigation to test route...');
    // navigate('/test-job');
    
    // Navigate directly to the job details page
    navigate(`/job/${encodedJobId}`);
    
    // Alternative: If you need to re-enable test route forwarding, uncomment below:
    // setTimeout(() => {
    //   console.log('Navigating to job details...');
    //   navigate(`/job/${encodedJobId}`);
    // }, 1000);
  };

  const handleResumeClick = (resume: any) => {
    // Navigate to resume details page with the resume ID
    const resumeId = resume._id || resume.processedMetadata?.name;
    console.log('Resume clicked:', resume);
    console.log('Resume ID being used:', resumeId);
    console.log('Resume ID type:', typeof resumeId);
    
    // For ObjectIds, we need to convert to string and handle special characters
    let finalResumeId = resumeId;
    if (typeof resumeId === 'object' && resumeId.toString) {
      finalResumeId = resumeId.toString();
    }
    
    // Encode the resume ID to handle special characters
    const encodedResumeId = encodeURIComponent(finalResumeId);
    console.log('Final Resume ID:', finalResumeId);
    console.log('Encoded Resume ID:', encodedResumeId);
    console.log('Navigating to:', `/resume/${encodedResumeId}`);
    
    // Navigate directly to the resume details page
    navigate(`/resume/${encodedResumeId}`);
  };

  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  // Prepare unique, deduplicated results before rendering
  const uniqueJobs = results?.jobs
    ? filterUniqueBy(
        results.jobs.map((job: any) => ({
          ...job,
          UniqueJobPostingId: getUniqueJobPostingId(job),
        })),
        (job: any) => job.UniqueJobPostingId
      )
    : [];

  const uniqueResumes = results?.resumes
    ? filterUniqueBy(
        results.resumes.map((resume: any) => ({
          ...resume,
          UniqueResumeId: getUniqueResumeId(resume),
        })),
        (resume: any) => resume.UniqueResumeId
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI-Powered Job & Resume Matching
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search through job postings and resumes using semantic similarity
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Query
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., 'software engineer with Python experience'"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Search size={16} />
                  <span>{isSearching ? "Searching..." : "Search"}</span>
                </button>
                {(results || error) && (
                  <button
                    onClick={handleClearResults}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    title="Clear search results and stored data (Ctrl+Shift+C)"
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={handleTestMapping}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  title="Test resume mapping function"
                >
                  <span>Test Mapping</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as "jobs" | "resumes" | "both")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="both">Jobs & Resumes</option>
                  <option value="jobs">Jobs Only</option>
                  <option value="resumes">Resumes Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Results Limit
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={3}>3 results</option>
                  <option value={5}>5 results</option>
                  <option value={10}>10 results</option>
                </select>
              </div>
            </div>

            {/* Enhanced Search Controls */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useEnhancedSearch"
                  checked={useEnhancedSearch}
                  onChange={(e) => setUseEnhancedSearch(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="useEnhancedSearch" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Use Enhanced Search (Stricter Technical Filtering & Skill Matching)
                </label>
              </div>

              {useEnhancedSearch && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Similarity Threshold
                    </label>
                    <select
                      value={minSimilarity}
                      onChange={(e) => setMinSimilarity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={0.1}>10% (Very Loose)</option>
                      <option value={0.2}>20% (Loose)</option>
                      <option value={0.3}>30% (Default)</option>
                      <option value={0.4}>40% (Strict)</option>
                      <option value={0.5}>50% (Very Strict)</option>
                      <option value={0.6}>60% (Extremely Strict)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Skill Filter (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ios, swift, react (comma separated)"
                      value={skillFilter.join(', ')}
                      onChange={(e) => {
                        const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        setSkillFilter(skills);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Enhanced Search Info */}
              {useEnhancedSearch && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Enhanced Search Features:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• <strong>Technical Query Detection:</strong> Automatically detects software/engineering queries</li>
                    <li>• <strong>Skill Matching:</strong> Requires specific skills for technical searches</li>
                    <li>• <strong>Related Terms:</strong> Matches related technical skills (e.g., "ios" matches "swift", "xcode")</li>
                    <li>• <strong>Penalty System:</strong> Reduces scores for non-technical content in technical searches</li>
                    <li>• <strong>Stricter Filtering:</strong> Rejects results without required skills for technical queries</li>
                  </ul>
                </div>
              )}

              {/* Extracted Skills Display */}
              {extractedSkills.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    <strong>Skills detected in your query:</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {extractedSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Info about data persistence */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💾 Your search results are automatically saved and will persist when you navigate away. 
              Use the Clear button or press Ctrl+Shift+C to remove stored data.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8">
            {/* Results Header with Clear Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Search size={20} className="text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Search Results
                </h2>
                {query && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    for "{query}"
                  </span>
                )}
                {isLoadedFromStorage && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    Loaded from cache
                  </span>
                )}
              </div>
              <button
                onClick={handleClearResults}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-1 text-sm"
                title="Clear search results and stored data (Ctrl+Shift+C)"
              >
                <Trash2 size={14} />
                <span>Clear Results</span>
              </button>
            </div>

            {/* Job Results */}
            {uniqueJobs && uniqueJobs.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Briefcase size={20} className="text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Job Opportunities ({uniqueJobs.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {uniqueJobs.map((job: any, index: number) => (
                    <div 
                      key={job.UniqueJobPostingId}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleJobClick(job)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {job.jobTitle}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm font-medium">
                            {formatSimilarity(job.similarity)}
                          </span>
                          {useEnhancedSearch && job.hasRequiredSkills && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm font-medium">
                              Skills Match
                            </span>
                          )}
                          {useEnhancedSearch && job.baseSimilarity && job.baseSimilarity !== job.similarity && (
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium" title={`Base similarity: ${formatSimilarity(job.baseSimilarity)}`}>
                              Enhanced
                            </span>
                          )}
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div>
                          <strong>Location:</strong> {job.location}
                        </div>
                        <div>
                          <strong>Type:</strong> {job.jobType}
                        </div>
                        <div>
                          <strong>Department:</strong> {job.department}
                        </div>
                        <div>
                          <strong>Salary:</strong> {job.salary}
                        </div>
                      </div>
                      {job.jobSummary && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {job.jobSummary.substring(0, 200)}...
                        </p>
                      )}
                      <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Click to view full details →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resume Results */}
            {uniqueResumes && uniqueResumes.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <User size={20} className="text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Matching Candidates ({uniqueResumes.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {uniqueResumes.map((resume: any, index: number) => (
                    <div 
                      key={resume.UniqueResumeId}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleResumeClick(resume)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {resume.processedMetadata?.name || "Unknown Candidate"}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm font-medium">
                            {formatSimilarity(resume.similarity)}
                          </span>
                          {useEnhancedSearch && resume.hasRequiredSkills && (
                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm font-medium">
                              Skills Match
                            </span>
                          )}
                          {useEnhancedSearch && resume.baseSimilarity && resume.baseSimilarity !== resume.similarity && (
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium" title={`Base similarity: ${formatSimilarity(resume.baseSimilarity)}`}>
                              Enhanced
                            </span>
                          )}
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div>
                          <strong>Email:</strong> {resume.processedMetadata?.email || "N/A"}
                        </div>
                        <div>
                          <strong>Experience:</strong> {resume.processedMetadata?.yearsOfExperience || "N/A"} years
                        </div>
                        <div>
                          <strong>Phone:</strong> {resume.processedMetadata?.phone || "N/A"}
                        </div>
                        <div>
                          <strong>Location:</strong> {resume.processedMetadata?.location || "N/A"}
                        </div>
                      </div>
                      {resume.professionalSummary && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {resume.professionalSummary.substring(0, 200)}...
                        </p>
                      )}
                      <div className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                        Click to view full details →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {((!uniqueJobs || uniqueJobs.length === 0) && (!uniqueResumes || uniqueResumes.length === 0)) && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No matches found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search query or search type
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 