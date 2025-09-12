import React, { useState, useEffect } from 'react';
import { useAction, useQuery, useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  Filter, 
  Sliders, 
  Target, 
  Briefcase, 
  User, 
  Star, 
  Clock,
  TrendingUp,
  MapPin,
  Building,
  GraduationCap,
  Zap,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EnhancedSearchInterfaceProps {
  className?: string;
  onResultsUpdate?: (results: any) => void;
}

interface SearchFilters {
  location: string[];
  jobType: string[];
  experienceLevel: string[];
  educationLevel: string[];
  skills: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface SearchOptions {
  useSemanticSearch: boolean;
  useKeywordSearch: boolean;
  useHybridSearch: boolean;
  similarityThreshold: number;
  resultLimit: number;
  sortBy: 'relevance' | 'date' | 'similarity' | 'title';
  sortOrder: 'asc' | 'desc';
}

export function EnhancedSearchInterface({ className = '', onResultsUpdate }: EnhancedSearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'jobs' | 'resumes' | 'both'>('both');
  const [filters, setFilters] = useState<SearchFilters>({
    location: [],
    jobType: [],
    experienceLevel: [],
    educationLevel: [],
    skills: [],
    dateRange: { start: '', end: '' }
  });
  const [options, setOptions] = useState<SearchOptions>({
    useSemanticSearch: true,
    useKeywordSearch: false,
    useHybridSearch: true,
    similarityThreshold: 0.5,
    resultLimit: 20,
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Actions
  const vectorAwareSearch = useAction(api.vectorEmbeddingService.vectorAwareSemanticSearch);
  
  // Convex client for queries
  const convex = useConvex();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Generate search suggestions based on query
  useEffect(() => {
    if (query.length > 2) {
      const commonTerms = [
        'software engineer', 'project manager', 'data analyst', 'marketing specialist',
        'sales representative', 'customer service', 'administrative assistant',
        'graphic designer', 'accountant', 'nurse', 'teacher', 'manager',
        'developer', 'analyst', 'coordinator', 'specialist', 'assistant'
      ];
      
      const filtered = commonTerms.filter(term => 
        term.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Handle search execution
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    saveRecentSearch(query.trim());

    try {
      // Prepare search context from filters
      const searchContext = {
        industry: filters.location.length > 0 ? undefined : undefined, // Could be derived from location
        skills: filters.skills,
        location: filters.location.length > 0 ? filters.location[0] : undefined,
        experience_level: filters.experienceLevel.length > 0 ? filters.experienceLevel[0] : undefined,
      };

      // Use vector-aware search
      const results = await vectorAwareSearch({
        query: query.trim(),
        targetCollection: searchType,
        limit: options.resultLimit,
        minSimilarity: options.similarityThreshold,
        context: searchContext
      });

      // Apply additional filters if any are set
      let processedResults = results;
      if (Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== '')) {
        processedResults = { ...results, results: applyFilters(results.results) };
      }

      // Apply sorting
      processedResults = { ...processedResults, results: applySorting(processedResults.results) };

      // Notify parent component
      if (onResultsUpdate) {
        onResultsUpdate(processedResults);
      }

    } catch (error) {
      console.error('Vector-aware search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Apply filters to results
  const applyFilters = (results: any) => {
    if (!results) return results;

    let filtered = { ...results };

    if (searchType === 'jobs' || searchType === 'both') {
      if (results.jobs?.results) {
        filtered.jobs.results = results.jobs.results.filter((job: any) => {
          // Location filter
          if (filters.location.length > 0 && !filters.location.some(loc => 
            job.location?.toLowerCase().includes(loc.toLowerCase())
          )) return false;

          // Job type filter
          if (filters.jobType.length > 0 && !filters.jobType.includes(job.jobType)) return false;

          // Experience level filter
          if (filters.experienceLevel.length > 0 && !filters.experienceLevel.includes(job.experiencedRequired)) return false;

          // Education level filter
          if (filters.educationLevel.length > 0 && !filters.educationLevel.includes(job.educationRequired)) return false;

          // Skills filter
          if (filters.skills.length > 0 && !filters.skills.some(skill => 
            job.searchableText?.toLowerCase().includes(skill.toLowerCase())
          )) return false;

          return true;
        });
      }
    }

    if (searchType === 'resumes' || searchType === 'both') {
      if (results.resumes?.results) {
        filtered.resumes.results = results.resumes.results.filter((resume: any) => {
          // Skills filter
          if (filters.skills.length > 0 && !filters.skills.some(skill => 
            resume.processedMetadata?.skills?.some((s: string) => 
              s.toLowerCase().includes(skill.toLowerCase())
            )
          )) return false;

          // Education level filter
          if (filters.educationLevel.length > 0 && !filters.educationLevel.some(level => 
            resume.processedMetadata?.education?.toLowerCase().includes(level.toLowerCase())
          )) return false;

          return true;
        });
      }
    }

    return filtered;
  };

  // Apply sorting to results
  const applySorting = (results: any) => {
    if (!results) return results;

    let sorted = { ...results };

    if (searchType === 'jobs' || searchType === 'both') {
      if (results.jobs?.results) {
        sorted.jobs.results = [...results.jobs.results].sort((a: any, b: any) => {
          let aValue, bValue;

          switch (options.sortBy) {
            case 'similarity':
              aValue = a.similarity || 0;
              bValue = b.similarity || 0;
              break;
            case 'date':
              aValue = new Date(a.createdAt || 0).getTime();
              bValue = new Date(b.createdAt || 0).getTime();
              break;
            case 'title':
              aValue = a.jobTitle?.toLowerCase() || '';
              bValue = b.jobTitle?.toLowerCase() || '';
              break;
            default: // relevance
              aValue = a.similarity || 0;
              bValue = b.similarity || 0;
          }

          if (options.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }
    }

    if (searchType === 'resumes' || searchType === 'both') {
      if (results.resumes?.results) {
        sorted.resumes.results = [...results.resumes.results].sort((a: any, b: any) => {
          let aValue, bValue;

          switch (options.sortBy) {
            case 'similarity':
              aValue = a.similarity || 0;
              bValue = b.similarity || 0;
              break;
            case 'date':
              aValue = new Date(a.createdAt || 0).getTime();
              bValue = new Date(b.createdAt || 0).getTime();
              break;
            case 'title':
              aValue = a.processedMetadata?.name?.toLowerCase() || '';
              bValue = b.processedMetadata?.name?.toLowerCase() || '';
              break;
            default: // relevance
              aValue = a.similarity || 0;
              bValue = b.similarity || 0;
          }

          if (options.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }
    }

    return sorted;
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle option changes
  const handleOptionChange = (optionType: keyof SearchOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [optionType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      location: [],
      jobType: [],
      experienceLevel: [],
      educationLevel: [],
      skills: [],
      dateRange: { start: '', end: '' }
    });
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
  };

  return (
    <div className={`space-y-4 pt-6 px-6 ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for jobs, skills, or candidates..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Type and Quick Options */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search:</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'jobs' | 'resumes' | 'both')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="both">Jobs & Resumes</option>
            <option value="jobs">Jobs Only</option>
            <option value="resumes">Resumes Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showFilters 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showAdvanced 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Sliders className="h-4 w-4 mr-1" />
            Advanced
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Search Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                placeholder="Enter locations..."
                value={filters.location.join(', ')}
                onChange={(e) => handleFilterChange('location', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Job Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Job Type
              </label>
              <select
                multiple
                value={filters.jobType}
                onChange={(e) => handleFilterChange('jobType', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Experience Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Experience Level
              </label>
              <select
                multiple
                value={filters.experienceLevel}
                onChange={(e) => handleFilterChange('experienceLevel', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive Level</option>
              </select>
            </div>

            {/* Education Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <GraduationCap className="h-4 w-4 inline mr-1" />
                Education Level
              </label>
              <select
                multiple
                value={filters.educationLevel}
                onChange={(e) => handleFilterChange('educationLevel', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="high school">High School</option>
                <option value="associate">Associate's Degree</option>
                <option value="bachelor">Bachelor's Degree</option>
                <option value="master">Master's Degree</option>
                <option value="doctorate">Doctorate</option>
              </select>
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Zap className="h-4 w-4 inline mr-1" />
                Skills
              </label>
              <input
                type="text"
                placeholder="Enter skills..."
                value={filters.skills.join(', ')}
                onChange={(e) => handleFilterChange('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Advanced Search Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.useSemanticSearch}
                    onChange={(e) => handleOptionChange('useSemanticSearch', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Semantic Search</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.useKeywordSearch}
                    onChange={(e) => handleOptionChange('useKeywordSearch', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Keyword Search</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.useHybridSearch}
                    onChange={(e) => handleOptionChange('useHybridSearch', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Hybrid Search</span>
                </label>
              </div>
            </div>

            {/* Similarity Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Similarity Threshold: {(options.similarityThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={options.similarityThreshold}
                onChange={(e) => handleOptionChange('similarityThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                50% recommended for HR matching
              </p>
            </div>

            {/* Result Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Result Limit
              </label>
              <select
                value={options.resultLimit}
                onChange={(e) => handleOptionChange('resultLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={10}>10 results</option>
                <option value={20}>20 results</option>
                <option value={50}>50 results</option>
                <option value={100}>100 results</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={options.sortBy}
                onChange={(e) => handleOptionChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="relevance">Relevance</option>
                <option value="similarity">Similarity Score</option>
                <option value="date">Date</option>
                <option value="title">Title</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={options.sortOrder}
                onChange={(e) => handleOptionChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearchClick(search)}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
