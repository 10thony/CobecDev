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

// Color utility for cross-matched results
const getColorForIndex = (index: number) => {
  const colors = [
    'bg-red-100 border-red-300 text-red-800   
    'bg-yale-blue-500 border-blue-300 text-blue-800 bg-yale-blue-500/20  
    'bg-green-100 border-green-300 text-green-800   
    'bg-yellow-100 border-yellow-300 text-yellow-800   
    'bg-purple-100 border-purple-300 text-purple-800   
    'bg-pink-100 border-pink-300 text-pink-800   
    'bg-indigo-100 border-indigo-300 text-indigo-800   
    'bg-orange-100 border-orange-300 text-orange-800   
    'bg-teal-100 border-teal-300 text-teal-800   
    'bg-cyan-100 border-cyan-300 text-cyan-800   
  ];
  return colors[index % colors.length];
};

const getBorderColorForIndex = (index: number) => {
  const colors = [
    'border-l-red-500',
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-yellow-500',
    'border-l-purple-500',
    'border-l-pink-500',
    'border-l-indigo-500',
    'border-l-orange-500',
    'border-l-teal-500',
    'border-l-cyan-500',
  ];
  return colors[index % colors.length];
};

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
  const searchSimilarJobsPure = useAction(api.vectorSearch.searchSimilarJobsPure);
  const searchSimilarResumesPure = useAction(api.vectorSearch.searchSimilarResumesPure);
  const crossMatchedVectorSearch = useAction(api.vectorSearch.crossMatchedVectorSearch);
  const testResumeMapping = useAction(api.vectorSearch.testResumeMapping);
  const navigate = useNavigate();
  
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
      
      if (useCrossMatching) {
        // Use cross-matched vector search
        searchResults = await crossMatchedVectorSearch({
          query: query.trim(),
          limit: limit,
          minSimilarity: minSimilarity,
          crossMatchThreshold: crossMatchThreshold,
        });
        setResults(searchResults);
      } else if (usePureVectorSearch) {
        // Use pure vector search (no text-based substring matching)
        if (searchType === "jobs") {
          searchResults = await searchSimilarJobsPure({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
          });
          setResults({ jobs: searchResults, resumes: [] });
        } else if (searchType === "resumes") {
          searchResults = await searchSimilarResumesPure({
            query: query.trim(),
            limit: limit,
            minSimilarity: minSimilarity,
          });
          setResults({ jobs: [], resumes: searchResults });
        } else {
          // For both, search jobs and resumes separately
          const [jobsResults, resumesResults] = await Promise.all([
            searchSimilarJobsPure({
              query: query.trim(),
              limit: limit,
              minSimilarity: minSimilarity,
            }),
            searchSimilarResumesPure({
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
    <div className="min-h-screen bg-mint-cream-900 bg-oxford-blue-DEFAULT py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-mint-cream-DEFAULT mb-2">
            AI-Powered Job & Resume Matching
          </h1>
          <p className="text-mint-cream-600">
            Search through job postings and resumes using semantic similarity
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                Search Query
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., 'software engineer with Python experience'"
                  className="flex-1 px-4 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                />
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="px-6 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Search size={16} />
                  <span>{isSearching ? "Searching..." : "Search"}</span>
                </button>
                {(results || error) && (
                  <button
                    onClick={handleClearResults}
                    className="px-4 py-2 bg-mint-cream-9000 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    title="Clear search results and stored data (Ctrl+Shift+C)"
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={handleTestMapping}
                  className="px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  title="Test resume mapping function"
                >
                  <span>Test Mapping</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as "jobs" | "resumes" | "both")}
                  className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                >
                  <option value="both">Jobs & Resumes</option>
                  <option value="jobs">Jobs Only</option>
                  <option value="resumes">Resumes Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                  Results Limit
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
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
                  id="useCrossMatching"
                  checked={useCrossMatching}
                  onChange={(e) => setUseCrossMatching(e.target.checked)}
                  className="rounded border-yale-blue-400 text-powder-blue-600 focus:ring-purple-500"
                />
                <label htmlFor="useCrossMatching" className="text-sm font-medium text-mint-cream-500">
                  Use Cross-Matched Search (Only show jobs with matching resumes and vice versa)
                </label>
              </div>

              {useCrossMatching && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                      Minimum Similarity Threshold
                    </label>
                    <select
                      value={minSimilarity}
                      onChange={(e) => setMinSimilarity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
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
                    <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                      Cross-Match Threshold
                    </label>
                    <select
                      value={crossMatchThreshold}
                      onChange={(e) => setCrossMatchThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                    >
                      <option value={0.2}>20% (Very Loose)</option>
                      <option value={0.3}>30% (Loose)</option>
                      <option value={0.4}>40% (Default)</option>
                      <option value={0.5}>50% (Strict)</option>
                      <option value={0.6}>60% (Very Strict)</option>
                      <option value={0.7}>70% (Extremely Strict)</option>
                    </select>
                  </div>

                  {/* Cross-Match Search Info */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">
                      Cross-Matched Search Features:
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• <strong>Strict Matching:</strong> Only shows jobs with matching resumes and vice versa</li>
                      <li>• <strong>Color Coding:</strong> Related jobs and resumes are highlighted with the same color</li>
                      <li>• <strong>Quality Assurance:</strong> Ensures every result has a meaningful match</li>
                      <li>• <strong>Dual Thresholds:</strong> Query similarity + cross-match similarity for precision</li>
                      <li>• <strong>Visual Relationships:</strong> Easy to see which jobs match which resumes</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="usePureVectorSearch"
                  checked={usePureVectorSearch}
                  onChange={(e) => setUsePureVectorSearch(e.target.checked)}
                  className="rounded border-yale-blue-400 text-powder-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="usePureVectorSearch" className="text-sm font-medium text-mint-cream-500">
                  Use Pure Vector Search (Stricter Technical Filtering & Skill Matching)
                </label>
              </div>

              {usePureVectorSearch && !useCrossMatching && (
                <div>
                  <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                    Minimum Similarity Threshold
                  </label>
                  <select
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                  >
                    <option value={0.1}>10% (Very Loose)</option>
                    <option value={0.2}>20% (Loose)</option>
                    <option value={0.3}>30% (Default)</option>
                    <option value={0.4}>40% (Strict)</option>
                    <option value={0.5}>50% (Very Strict)</option>
                    <option value={0.6}>60% (Extremely Strict)</option>
                  </select>
                </div>
              )}

              {/* Pure Vector Search Info */}
              {usePureVectorSearch && !useCrossMatching && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    Pure Vector Search Features:
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• <strong>Semantic Understanding:</strong> Uses AI embeddings for true semantic search</li>
                    <li>• <strong>No Substring Matching:</strong> Won't match "ios" in "bios" or "pios"</li>
                    <li>• <strong>Context Awareness:</strong> Understands meaning, not just keywords</li>
                    <li>• <strong>Quality Results:</strong> Higher quality matches based on semantic similarity</li>
                    <li>• <strong>Configurable Threshold:</strong> Adjust similarity threshold for precision</li>
                  </ul>
                </div>
              )}


            </div>
          </div>
          
          {/* Info about data persistence */}
          <div className="mt-4 p-3 bg-blue-50 bg-yale-blue-500/20 border border-blue-200 rounded-md">
            <p className="text-sm text-mint-cream-DEFAULT">
              💾 Your search results are automatically saved and will persist when you navigate away. 
              Use the Clear button or press Ctrl+Shift+C to remove stored data.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8">
            {/* Results Header with Clear Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Search size={20} className="text-mint-cream-600" />
                <h2 className="text-xl font-semibold text-mint-cream-DEFAULT">
                  Search Results
                </h2>
                {query && (
                  <span className="text-sm text-mint-cream-700">
                    for "{query}"
                  </span>
                )}
                {isLoadedFromStorage && (
                  <span className="text-xs bg-yale-blue-500 text-blue-800 px-2 py-1 rounded-full">
                    Loaded from cache
                  </span>
                )}
              </div>
              <button
                onClick={handleClearResults}
                className="px-3 py-1 bg-mint-cream-800 text-mint-cream-600 rounded-md hover:bg-mint-cream-700 transition-colors flex items-center space-x-1 text-sm"
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
                  <Briefcase size={20} className="text-powder-blue-600" />
                  <h2 className="text-xl font-semibold text-mint-cream-DEFAULT">
                    Job Opportunities ({uniqueJobs.length})
                  </h2>
                  {useCrossMatching && results?.colorGroups && (
                    <span className="text-sm text-mint-cream-700">
                      • {results.colorGroups.length} cross-matched groups
                    </span>
                  )}
                </div>
                <div className="grid gap-4">
                  {uniqueJobs.map((job: any, index: number) => {
                    const colorIndex = job.colorIndex !== undefined ? job.colorIndex : 0;
                    const matchCount = useCrossMatching && results?.crossMatches ? 
                      results.crossMatches.filter((match: any) => match.jobId === job._id).length : 0;
                    
                    return (
                      <div 
                        key={job.UniqueJobPostingId}
                        className={`bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6 border border-yale-blue-300 hover:shadow-lg transition-shadow cursor-pointer group ${ useCrossMatching ? getBorderColorForIndex(colorIndex) + ' border-l-4' : '' }`}
                        onClick={() => handleJobClick(job)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-mint-cream-DEFAULT group-hover:text-powder-blue-600 transition-colors">
                            {job.jobTitle}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {useCrossMatching && matchCount > 0 && (
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getColorForIndex(colorIndex)}`}>
                                {matchCount} match{matchCount !== 1 ? 'es' : ''}
                              </span>
                            )}
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                              {formatSimilarity(job.similarity)}
                            </span>
                            <ExternalLink size={16} className="text-mint-cream-700 group-hover:text-powder-blue-600 transition-colors" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-mint-cream-600 mb-3">
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
                          <p className="text-mint-cream-500 text-sm">
                            {job.jobSummary.substring(0, 200)}...
                          </p>
                        )}
                        <div className="mt-3 text-sm text-powder-blue-600 font-medium">
                          Click to view full details →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resume Results */}
            {uniqueResumes && uniqueResumes.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <User size={20} className="text-mint-cream-600" />
                  <h2 className="text-xl font-semibold text-mint-cream-DEFAULT">
                    Matching Candidates ({uniqueResumes.length})
                  </h2>
                  {useCrossMatching && results?.colorGroups && (
                    <span className="text-sm text-mint-cream-700">
                      • {results.colorGroups.length} cross-matched groups
                    </span>
                  )}
                </div>
                <div className="grid gap-4">
                  {uniqueResumes.map((resume: any, index: number) => {
                    const colorIndex = resume.colorIndex !== undefined ? resume.colorIndex : 0;
                    const matchCount = useCrossMatching && results?.crossMatches ? 
                      results.crossMatches.filter((match: any) => match.resumeId === resume._id).length : 0;
                    
                    return (
                      <div 
                        key={resume.UniqueResumeId}
                        className={`bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6 border border-yale-blue-300 hover:shadow-lg transition-shadow cursor-pointer group ${ useCrossMatching ? getBorderColorForIndex(colorIndex) + ' border-l-4' : '' }`}
                        onClick={() => handleResumeClick(resume)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-mint-cream-DEFAULT group-hover:text-mint-cream-600 transition-colors">
                            {resume.processedMetadata?.name || "Unknown Candidate"}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {useCrossMatching && matchCount > 0 && (
                              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getColorForIndex(colorIndex)}`}>
                                {matchCount} match{matchCount !== 1 ? 'es' : ''}
                              </span>
                            )}
                            <span className="bg-yale-blue-500 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                              {formatSimilarity(resume.similarity)}
                            </span>
                            <ExternalLink size={16} className="text-mint-cream-700 group-hover:text-mint-cream-600 transition-colors" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-mint-cream-600 mb-3">
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
                          <p className="text-mint-cream-500 text-sm">
                            {resume.professionalSummary.substring(0, 200)}...
                          </p>
                        )}
                        <div className="mt-3 text-sm text-mint-cream-600 font-medium">
                          Click to view full details →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {((!uniqueJobs || uniqueJobs.length === 0) && (!uniqueResumes || uniqueResumes.length === 0)) && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-mint-cream-700 mb-4" />
                <h3 className="text-lg font-medium text-mint-cream-DEFAULT mb-2">
                  No matches found
                </h3>
                <p className="text-mint-cream-600">
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