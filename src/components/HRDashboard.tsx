import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { 
  Briefcase, 
  User, 
  TrendingUp, 
  Target, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Lightbulb,
  ExternalLink,
  FileText,
  ArrowRight
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';

interface HRDashboardProps {
  className?: string;
}

interface MatchInsight {
  type: 'skill-gap' | 'recruitment-need' | 'high-match' | 'low-coverage';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  action?: string;
}

export function HRDashboard({ className = '' }: HRDashboardProps) {
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [matchLimit, setMatchLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch data
  const jobPostings = useQuery(api.jobPostings.list);
  const resumes = useQuery(api.resumes.list);
  const totalJobsCount = useQuery(api.jobPostings.count);
  const totalResumesCount = useQuery(api.resumes.count);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);

  // Queries for matching (these are actually queries, not actions)
  const findMatchingResumesForJob = useQuery(api.vectorSearch.findMatchingResumesForJob, 
    selectedJobId ? { 
      jobPostingId: selectedJobId as Id<"jobpostings">, 
      limit: matchLimit, 
      similarityThreshold 
    } : "skip"
  );
  const findMatchingJobsForResume = useQuery(api.vectorSearch.findMatchingJobsForResume,
    selectedResumeId ? {
      resumeId: selectedResumeId as Id<"resumes">,
      limit: matchLimit,
      similarityThreshold
    } : "skip"
  );

  // Actions for enhanced search with proper vector similarity
  const searchResumesWithEmbedding = useAction(api.vectorSearch.searchResumesWithEmbedding);
  const searchJobPostingsWithEmbedding = useAction(api.vectorSearch.searchJobPostingsWithEmbedding);
  const unifiedSearchWithEmbedding = useAction(api.vectorSearch.unifiedSemanticSearchWithEmbedding);
  // Native vector search using Convex's built-in vector search
  const nativeUnifiedSearch = useAction(api.nativeVectorSearch.unifiedSearch);

  // State for matching results
  const [jobMatches, setJobMatches] = useState<any>(null);
  const [resumeMatches, setResumeMatches] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate dashboard metrics - use count queries for accurate totals
  const totalJobs = totalJobsCount ?? 0;
  const totalResumes = totalResumesCount ?? 0;
  const jobsWithEmbeddings = jobPostings?.filter(job => job.embedding)?.length || 0;
  const resumesWithEmbeddings = resumes?.filter(resume => resume.embedding)?.length || 0;
  const embeddingCoverage = {
    jobs: totalJobs > 0 ? (jobsWithEmbeddings / totalJobs) * 100 : 0,
    resumes: totalResumes > 0 ? (resumesWithEmbeddings / totalResumes) * 100 : 0
  };

  // Generate business insights
  const generateInsights = (): MatchInsight[] => {
    const insights: MatchInsight[] = [];

    // Skill gap analysis
    if (embeddingCoverage.jobs < 50) {
      insights.push({
        type: 'skill-gap',
        title: 'Low Job Embedding Coverage',
        description: `Only ${embeddingCoverage.jobs.toFixed(1)}% of job postings have semantic embeddings. This limits the system's ability to find optimal matches.`,
        severity: 'warning',
        action: 'Generate embeddings for job postings'
      });
    }

    if (embeddingCoverage.resumes < 50) {
      insights.push({
        type: 'skill-gap',
        title: 'Low Resume Embedding Coverage',
        description: `Only ${embeddingCoverage.resumes.toFixed(1)}% of resumes have semantic embeddings. This reduces the quality of candidate matching.`,
        severity: 'warning',
        action: 'Generate embeddings for resumes'
      });
    }

    // High match opportunities
    if (embeddingCoverage.jobs > 80 && embeddingCoverage.resumes > 80) {
      insights.push({
        type: 'high-match',
        title: 'High-Quality Matching Available',
        description: 'Both job postings and resumes have excellent embedding coverage, enabling precise semantic matching.',
        severity: 'success'
      });
    }

    // Recruitment recommendations
    if (totalJobs > totalResumes * 2) {
      insights.push({
        type: 'recruitment-need',
        title: 'High Job-to-Candidate Ratio',
        description: `You have ${totalJobs} job postings but only ${totalResumes} resumes. Consider expanding your candidate pool.`,
        severity: 'info',
        action: 'Review recruitment strategies'
      });
    }

    return insights;
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedResumeId(null);
    setResumeMatches(null);
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setSelectedJobId(null);
    setJobMatches(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Use native vector search for better performance
      const nativeResults = await nativeUnifiedSearch({
        query: searchQuery,
        searchType: "both",
        limit: matchLimit,
        minScore: similarityThreshold,
        useQueryEnhancement: true,
      });
      
      // Transform results to match expected format
      const results = {
        query: nativeResults.query,
        enhancedQuery: nativeResults.enhancedQuery,
        results: {
          resumes: nativeResults.resumes || [],
          jobPostings: nativeResults.jobs || [],
        },
        totalFound: {
          resumes: nativeResults.resumes?.length || 0,
          jobPostings: nativeResults.jobs?.length || 0,
          total: (nativeResults.resumes?.length || 0) + (nativeResults.jobs?.length || 0),
        },
        similarityThreshold,
        model: "text-embedding-3-small",
        skillEnhancement: true,
        skillAnalysis: null,
      };
      
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to old search if native search fails
      try {
        const results = await unifiedSearchWithEmbedding({
          query: searchQuery,
          limit: matchLimit,
          similarityThreshold,
          useSkillEnhancement: true,
          includeSkillAnalysis: true
        });
        setSearchResults(results);
      } catch (fallbackError) {
        console.error("Fallback search error:", fallbackError);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Update matches when queries return results
  React.useEffect(() => {
    if (findMatchingResumesForJob && selectedJobId) {
      setJobMatches(findMatchingResumesForJob);
      setIsLoading(false);
    }
  }, [findMatchingResumesForJob, selectedJobId]);

  React.useEffect(() => {
    if (findMatchingJobsForResume && selectedResumeId) {
      setResumeMatches(findMatchingJobsForResume);
      setIsLoading(false);
    }
  }, [findMatchingJobsForResume, selectedResumeId]);

  // Set loading state when queries are triggered
  React.useEffect(() => {
    if (selectedJobId) {
      setIsLoading(true);
    }
  }, [selectedJobId]);

  React.useEffect(() => {
    if (selectedResumeId) {
      setIsLoading(true);
    }
  }, [selectedResumeId]);

  const insights = generateInsights();

  return (
    <div className={`space-y-6 ${className} tron-grid-bg`}>
      {/* Dashboard Header */}
      <TronPanel title="HR Dashboard" icon={<Target className="w-6 h-6" />} glowColor="cyan">
        <div className="mb-6">
          <p className="text-tron-gray">
            AI-powered job-resume matching with business intelligence
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <TronStatCard
            title="Total Jobs"
            value={totalJobs}
            icon={<Briefcase className="w-6 h-6" />}
            color="cyan"
          />

          <TronStatCard
            title="Total Resumes"
            value={totalResumes}
            icon={<User className="w-6 h-6" />}
            color="blue"
          />

          <TronStatCard
            title="Job Coverage"
            value={`${embeddingCoverage.jobs.toFixed(1)}%`}
            icon={<BarChart3 className="w-6 h-6" />}
            color="cyan"
          />

          <TronStatCard
            title="Resume Coverage"
            value={`${embeddingCoverage.resumes.toFixed(1)}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
          />
        </div>

        {/* Business Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-tron-white tron-glow-text flex items-center">
              <Lightbulb className="h-5 w-5 text-neon-warning mr-2 tron-icon-glow" />
              Business Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, index) => {
                const severityStyles = {
                  success: 'bg-tron-bg-card border-neon-success/30',
                  warning: 'bg-tron-bg-card border-neon-warning/30',
                  error: 'bg-tron-bg-card border-neon-error/30',
                  info: 'bg-tron-bg-card border-tron-cyan/30',
                };
                const severityIcons = {
                  success: <CheckCircle className="h-5 w-5 text-neon-success mr-2 mt-0.5" />,
                  warning: <AlertTriangle className="h-5 w-5 text-neon-warning mr-2 mt-0.5" />,
                  error: <AlertTriangle className="h-5 w-5 text-neon-error mr-2 mt-0.5" />,
                  info: <Lightbulb className="h-5 w-5 text-tron-cyan mr-2 mt-0.5" />,
                };
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${severityStyles[insight.severity]}`}
                  >
                    <div className="flex items-start">
                      {severityIcons[insight.severity]}
                      <div className="flex-1">
                        <h4 className="font-medium text-tron-white">{insight.title}</h4>
                        <p className="text-sm text-tron-gray mt-1">{insight.description}</p>
                        {insight.action && (
                          <TronButton
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-tron-cyan hover:text-tron-cyan-bright"
                          >
                            {insight.action}
                          </TronButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </TronPanel>

      {/* Quick Access Cards */}
      <TronPanel title="Quick Access" glowColor="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job Postings Grid Button */}
          <button
            onClick={() => navigate('/job-postings')}
            className="group p-6 tron-card hover:border-tron-cyan/40 hover:shadow-tron-glow transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-tron-cyan/10 rounded-lg group-hover:bg-tron-cyan/20 transition-colors">
                <Briefcase className="h-6 w-6 text-tron-cyan" />
              </div>
              <ArrowRight className="h-5 w-5 text-tron-gray group-hover:text-tron-cyan group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="text-lg font-semibold text-tron-white mb-2">
              View All Job Postings
            </h4>
            <p className="text-sm text-tron-gray">
              Browse, search, and sort through all job postings with advanced filtering
            </p>
            <div className="mt-3 flex items-center text-sm font-medium text-tron-cyan">
              <span>{totalJobs} job postings available</span>
            </div>
          </button>

          {/* Resumes Grid Button */}
          <button
            onClick={() => navigate('/resumes')}
            className="group p-6 tron-card hover:border-tron-blue/40 hover:shadow-tron-glow-blue transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-tron-blue/10 rounded-lg group-hover:bg-tron-blue/20 transition-colors">
                <FileText className="h-6 w-6 text-tron-blue" />
              </div>
              <ArrowRight className="h-5 w-5 text-tron-gray group-hover:text-tron-blue group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="text-lg font-semibold text-tron-white mb-2">
              View All Resumes
            </h4>
            <p className="text-sm text-tron-gray">
              Browse, search, and sort through all candidate resumes with detailed profiles
            </p>
            <div className="mt-3 flex items-center text-sm font-medium text-tron-blue">
              <span>{totalResumes} resumes available</span>
            </div>
          </button>
        </div>
      </TronPanel>

      {/* Search Controls */}
      <TronPanel title="AI-Powered Search" icon={<Target className="w-5 h-5" />} glowColor="cyan">
        {/* Search Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-tron-gray mb-2">
            Search Query
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., 'who can build apps for the iPhone' or 'iOS developers'"
              className="tron-input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <TronButton
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              variant="primary"
              icon={<Target className="h-4 w-4" />}
              loading={isSearching}
            >
              Search
            </TronButton>
          </div>
          <p className="text-xs text-tron-muted mt-1">
            Use natural language to find candidates or job postings. Try queries like "iOS developers", "project managers with 5+ years", or "cybersecurity experts".
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Similarity Threshold
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-tron-bg-elevated rounded-lg appearance-none cursor-pointer tron-progress-bar"
                style={{ background: `linear-gradient(90deg, rgba(0, 212, 255, 0.3) 0%, rgba(0, 212, 255, 0.3) ${(similarityThreshold * 100)}%, rgba(0, 212, 255, 0.1) ${(similarityThreshold * 100)}%)` }}
              />
              <span className="text-sm font-medium text-tron-white min-w-[3rem]">
                {(similarityThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-tron-muted mt-1">
              Minimum similarity score for matches (50% recommended for HR)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-gray mb-2">
              Match Limit
            </label>
            <select
              value={matchLimit}
              onChange={(e) => setMatchLimit(parseInt(e.target.value))}
              className="tron-select w-full"
            >
              <option value={5}>5 matches</option>
              <option value={10}>10 matches</option>
              <option value={15}>15 matches</option>
              <option value={20}>20 matches</option>
            </select>
          </div>
        </div>
      </TronPanel>

      {/* Job-Resume Matching Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Selection */}
        <TronPanel title="Select Job Posting" icon={<Briefcase className="h-5 w-5" />} glowColor="cyan">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jobPostings?.map((job) => (
              <div
                key={job._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors tron-card ${
                  selectedJobId === job._id 
                    ? 'border-tron-cyan bg-tron-cyan/10 shadow-tron-glow' 
                    : 'border-tron-cyan/20 hover:border-tron-cyan/40'
                }`}
                onClick={() => handleJobSelect(job._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-tron-white">{job.jobTitle}</h4>
                    <p className="text-sm text-tron-gray">{job.location}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {job.embedding ? (
                      <CheckCircle className="h-4 w-4 text-neon-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-neon-warning" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TronPanel>

        {/* Resume Selection */}
        <TronPanel title="Select Resume" icon={<User className="h-5 w-5" />} glowColor="blue">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {resumes?.map((resume) => (
              <div
                key={resume._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors tron-card ${
                  selectedResumeId === resume._id 
                    ? 'border-tron-blue bg-tron-blue/10 shadow-tron-glow-blue' 
                    : 'border-tron-blue/20 hover:border-tron-blue/40'
                }`}
                onClick={() => handleResumeSelect(resume._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-tron-white">
                      {resume.personalInfo ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}` : resume.filename}
                    </h4>
                    <p className="text-sm text-tron-gray">
                      {resume.personalInfo?.email || 'No email'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {resume.embedding ? (
                      <CheckCircle className="h-4 w-4 text-neon-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-neon-warning" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TronPanel>
      </div>

      {/* Search Results */}
      {searchResults && (
        <TronPanel title={`Search Results for: "${searchQuery}"`} glowColor="cyan">
          <div className="mb-4 text-sm text-tron-gray">
            Found {searchResults.totalFound.total} total matches ({searchResults.totalFound.resumes} resumes, {searchResults.totalFound.jobPostings} job postings)
          </div>

          {/* Resume Results */}
          {searchResults.results.resumes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-tron-white mb-3 flex items-center">
                <User className="h-5 w-5 text-tron-gray mr-2" />
                Matching Resumes ({searchResults.results.resumes.length})
              </h4>
              <div className="space-y-3">
                {searchResults.results.resumes.map((resume: any, index: number) => (
                  <div
                    key={resume._id}
                    className="p-4 border border-tron-cyan/20 rounded-lg tron-card hover:border-tron-cyan/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-tron-white">
                        {resume.personalInfo ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}` : resume.filename}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-tron-gray">
                          Similarity: {(resume.similarity * 100).toFixed(1)}%
                        </span>
                        <div className={`w-3 h-3 rounded-full ${ resume.similarity >= 0.8 ? 'bg-neon-success' : resume.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Email:</span> {resume.personalInfo?.email || 'N/A'}
                        </p>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Skills:</span> {resume.skills?.slice(0, 3).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Experience:</span> {resume.personalInfo?.yearsOfExperience ? `${resume.personalInfo.yearsOfExperience} years` : 'N/A'}
                        </p>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Education:</span> {resume.education?.join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Posting Results */}
          {searchResults.results.jobPostings.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-tron-white mb-3 flex items-center">
                <Briefcase className="h-5 w-5 text-tron-cyan mr-2" />
                Matching Job Postings ({searchResults.results.jobPostings.length})
              </h4>
              <div className="space-y-3">
                {searchResults.results.jobPostings.map((job: any, index: number) => (
                  <div
                    key={job._id}
                    className="p-4 border border-tron-cyan/20 rounded-lg tron-card hover:border-tron-cyan/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-tron-white">{job.jobTitle}</h5>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-tron-gray">
                          Similarity: {(job.similarity * 100).toFixed(1)}%
                        </span>
                        <div className={`w-3 h-3 rounded-full ${ job.similarity >= 0.8 ? 'bg-neon-success' : job.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Location:</span> {job.location || 'N/A'}
                        </p>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Type:</span> {job.jobType || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Requirements:</span> {job.experiencedRequired || 'N/A'}
                        </p>
                        <p className="text-tron-gray">
                          <span className="font-medium text-tron-white">Education:</span> {job.educationRequired || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.results.resumes.length === 0 && searchResults.results.jobPostings.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-neon-warning mx-auto mb-4 tron-icon-glow" />
              <h4 className="text-lg font-medium text-tron-white mb-2">
                No Matches Found
              </h4>
              <p className="text-tron-gray">
                No results found for "{searchQuery}" with the current similarity threshold of {(similarityThreshold * 100).toFixed(0)}%.
              </p>
              <p className="text-tron-gray mt-2">
                Try lowering the similarity threshold or using different search terms.
              </p>
            </div>
          )}
        </TronPanel>
      )}

      {/* Matching Results */}
      {isLoading && (
        <TronPanel glowColor="cyan">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
            <span className="ml-3 text-tron-gray">Finding matches...</span>
          </div>
        </TronPanel>
      )}

      {/* Job Matches Results */}
      {jobMatches && !isLoading && (
        <TronPanel title={`Matching Resumes for: ${jobMatches.jobPosting?.jobTitle}`} glowColor="cyan">
          
          {jobMatches.matchingResumes.length > 0 ? (
            <div className="space-y-4">
              {jobMatches.matchingResumes.map((resume: any, index: number) => (
                <div
                  key={resume._id}
                  className="p-4 border border-tron-cyan/20 rounded-lg tron-card hover:border-tron-cyan/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-tron-white">
                      {resume.personalInfo ? `${resume.personalInfo.firstName} ${resume.personalInfo.lastName}` : resume.filename}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-tron-gray">
                        Similarity: {(resume.similarity * 100).toFixed(1)}%
                      </span>
                      <div className={`w-3 h-3 rounded-full ${ resume.similarity >= 0.8 ? 'bg-neon-success' : resume.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Email:</span> {resume.personalInfo?.email || 'N/A'}
                      </p>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Skills:</span> {resume.skills?.slice(0, 3).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Experience:</span> {resume.personalInfo?.yearsOfExperience ? `${resume.personalInfo.yearsOfExperience} years` : 'N/A'}
                      </p>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Education:</span> {resume.education?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-neon-warning mx-auto mb-4 tron-icon-glow" />
              <h4 className="text-lg font-medium text-tron-white mb-2">
                No Matching Resumes Found
              </h4>
              <p className="text-tron-gray">
                No resumes meet the {similarityThreshold * 100}% similarity threshold for this job posting.
              </p>
              {jobMatches.businessInsights && (
                <div className="mt-4 p-4 bg-tron-bg-card rounded-lg border border-neon-warning/30">
                  <p className="text-sm text-neon-warning">
                    <strong>Business Insight:</strong> {jobMatches.businessInsights.skillGap}
                  </p>
                  <p className="text-sm text-neon-warning mt-1">
                    <strong>Recommendation:</strong> {jobMatches.businessInsights.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </TronPanel>
      )}

      {/* System Overview Section */}
      <TronPanel title="System Performance Overview" icon={<BarChart3 className="w-6 h-6" />} glowColor="cyan">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-tron-bg-card rounded-lg shadow-sm border border-tron-cyan/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-8 w-8 text-tron-cyan" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-tron-gray">Total Jobs</p>
                <p className="text-2xl font-semibold text-tron-white">
                  {totalJobs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-tron-bg-card rounded-lg shadow-sm border border-tron-cyan/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-tron-gray" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-tron-gray">Total Resumes</p>
                <p className="text-2xl font-semibold text-tron-white">
                  {totalResumes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-tron-bg-card rounded-lg shadow-sm border border-tron-cyan/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-tron-cyan" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-tron-gray">Search Quality</p>
                <p className="text-2xl font-semibold text-tron-white">
                  {(similarityThreshold * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-tron-bg-card rounded-lg shadow-sm border border-tron-cyan/20 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-tron-orange" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-tron-gray">AI Model</p>
                <p className="text-2xl font-semibold text-tron-white">
                  Gemini MRL
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started with HR Dashboard Help */}
        <div className="mt-8 bg-tron-bg-card border-tron-cyan/30 rounded-lg border p-6">
          <div className="flex items-start">
            <Lightbulb className="h-6 w-6 text-tron-cyan mr-3 mt-1" />
            <div>
              <h4 className="text-lg font-medium text-tron-white mb-2">
                Getting Started with HR Dashboard
              </h4>
              <div className="text-tron-gray space-y-2 text-sm">
                <p><strong>1. Select a Job or Resume:</strong> Click on any job posting or resume in the selection panels above to begin matching.</p>
                <p><strong>2. Adjust Match Settings:</strong> Use the similarity threshold slider to control match quality (50% recommended for HR).</p>
                <p><strong>3. Review Results:</strong> View matching candidates or positions with similarity scores and business insights.</p>
                <p><strong>4. Generate Embeddings:</strong> If coverage is low, use the embedding management tools to improve search quality.</p>
              </div>
              <div className="mt-4 flex items-center text-sm text-tron-white">
                <ExternalLink className="h-4 w-4 mr-1" />
                <span>Current embedding coverage: Jobs {embeddingCoverage.jobs.toFixed(1)}% | Resumes {embeddingCoverage.resumes.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </TronPanel>

      {/* Resume Matches Results */}
      {resumeMatches && !isLoading && (
        <TronPanel 
          title={`Matching Jobs for: ${resumeMatches.resume?.personalInfo ? `${resumeMatches.resume.personalInfo.firstName} ${resumeMatches.resume.personalInfo.lastName}` : resumeMatches.resume?.filename}`}
          icon={<Briefcase className="w-6 h-6" />}
          glowColor="blue"
        >
          {resumeMatches.matchingJobs.length > 0 ? (
            <div className="space-y-4">
              {resumeMatches.matchingJobs.map((job: any, index: number) => (
                <div
                  key={job._id}
                  className="p-4 border border-tron-cyan/20 rounded-lg bg-tron-bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-tron-white">{job.jobTitle}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-tron-gray">
                        Similarity: {(job.similarity * 100).toFixed(1)}%
                      </span>
                      <div className={`w-3 h-3 rounded-full ${ job.similarity >= 0.8 ? 'bg-neon-success' : job.similarity >= 0.6 ? 'bg-neon-warning' : 'bg-neon-error' }`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Location:</span> {job.location || 'N/A'}
                      </p>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Type:</span> {job.jobType || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Requirements:</span> {job.experiencedRequired || 'N/A'}
                      </p>
                      <p className="text-tron-gray">
                        <span className="font-medium text-tron-white">Education:</span> {job.educationRequired || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-neon-warning mx-auto mb-4 tron-icon-glow" />
              <h4 className="text-lg font-medium text-tron-white mb-2">
                No Matching Jobs Found
              </h4>
              <p className="text-tron-gray">
                No job postings meet the {similarityThreshold * 100}% similarity threshold for this resume.
              </p>
              {resumeMatches.businessInsights && (
                <div className="mt-4 p-4 bg-tron-bg-card border-neon-warning/30 rounded-lg border">
                  <p className="text-sm text-neon-warning">
                    <strong>Business Insight:</strong> {resumeMatches.businessInsights.skillGap}
                  </p>
                  <p className="text-sm text-neon-warning mt-1">
                    <strong>Recommendation:</strong> {resumeMatches.businessInsights.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </TronPanel>
      )}
    </div>
  );
}
