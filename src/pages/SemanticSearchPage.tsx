import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedSearchInterface } from '../components/EnhancedSearchInterface';
import { SearchExplanation } from '../components/SearchExplanation';
import { TronPanel } from '../components/TronPanel';
import {
  Search,
  ExternalLink,
  Info,
  Briefcase,
  User as UserIcon,
} from 'lucide-react';

export function SemanticSearchPage() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const navigate = useNavigate();

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

  const handleSearchResults = (results: any) => {
    setSearchResults(results);
  };

  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  job.similarity >= 0.8
                                    ? 'bg-neon-success'
                                    : job.similarity >= 0.6
                                    ? 'bg-neon-warning'
                                    : 'bg-neon-error'
                                }`}
                              />
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
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  resume.similarity >= 0.8
                                    ? 'bg-neon-success'
                                    : resume.similarity >= 0.6
                                    ? 'bg-neon-warning'
                                    : 'bg-neon-error'
                                }`}
                              />
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
      </div>
    </div>
  );
}

