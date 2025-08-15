import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { HRDashboard } from '../components/HRDashboard';
import { EmbeddingManagement } from '../components/EmbeddingManagement';
import { EnhancedSearchInterface } from '../components/EnhancedSearchInterface';
import { SearchExplanation } from '../components/SearchExplanation';
import { 
  Target, 
  Search, 
  Database, 
  Users, 
  BarChart3,
  Settings,
  Briefcase,
  User,
  TrendingUp,
  ExternalLink,
  Info
} from 'lucide-react';

export function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'embeddings'>('overview');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const navigate = useNavigate();

  // Navigation handlers for search results
  const handleJobClick = (job: any) => {
    const jobId = job._id || job.jobTitle;
    const finalJobId = String(jobId);
    const encodedJobId = encodeURIComponent(finalJobId);
    navigate(`/job/${encodedJobId}`);
  };

  const handleResumeClick = (resume: any) => {
    const resumeId = resume._id || resume.processedMetadata?.name;
    const finalResumeId = String(resumeId);
    const encodedResumeId = encodeURIComponent(finalResumeId);
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
      id: 'embeddings',
      name: 'Embedding Management',
      icon: Database,
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

        {/* Quick Stats Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {searchResults?.jobs?.totalFound || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Resumes</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {searchResults?.resumes?.totalFound || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Search Quality</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {searchResults?.similarityThreshold ? `${(searchResults.similarityThreshold * 100).toFixed(0)}%` : '50%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Model</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Gemini MRL
                </p>
              </div>
            </div>
          </div>
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
                  <strong>3. Embeddings Tab:</strong> Manage AI embeddings for system optimization (Admin only)
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
