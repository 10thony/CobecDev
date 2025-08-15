import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
  ExternalLink
} from 'lucide-react';

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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [matchLimit, setMatchLimit] = useState(10);

  // Fetch data
  const jobPostings = useQuery(api.jobPostings.list);
  const resumes = useQuery(api.resumes.list);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);

  // Actions
  const findMatchingResumesForJob = useAction(api.vectorSearch.findMatchingResumesForJob);
  const findMatchingJobsForResume = useAction(api.vectorSearch.findMatchingJobsForResume);

  // State for matching results
  const [jobMatches, setJobMatches] = useState<any>(null);
  const [resumeMatches, setResumeMatches] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate dashboard metrics
  const totalJobs = jobPostings?.length || 0;
  const totalResumes = resumes?.length || 0;
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

  const handleJobSelect = async (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedResumeId(null);
    setIsLoading(true);

    try {
      const matches = await findMatchingResumesForJob({
        jobPostingId: jobId,
        limit: matchLimit,
        similarityThreshold
      });
      setJobMatches(matches);
      setResumeMatches(null);
    } catch (error) {
      console.error('Failed to find matching resumes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSelect = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setSelectedJobId(null);
    setIsLoading(true);

    try {
      const matches = await findMatchingJobsForResume({
        resumeId: resumeId,
        limit: matchLimit,
        similarityThreshold
      });
      setResumeMatches(matches);
      setJobMatches(null);
    } catch (error) {
      console.error('Failed to find matching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const insights = generateInsights();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              HR Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered job-resume matching with business intelligence
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Jobs</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <User className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Resumes</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalResumes}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Job Coverage</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {embeddingCoverage.jobs.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Resume Coverage</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {embeddingCoverage.resumes.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
              Business Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    insight.severity === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                    insight.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                    insight.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start">
                    {insight.severity === 'success' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />}
                    {insight.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />}
                    {insight.severity === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />}
                    {insight.severity === 'info' && <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{insight.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                      {insight.action && (
                        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2">
                          {insight.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Matching Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[3rem]">
                {(similarityThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum similarity score for matches (50% recommended for HR)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Match Limit
            </label>
            <select
              value={matchLimit}
              onChange={(e) => setMatchLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={5}>5 matches</option>
              <option value={10}>10 matches</option>
              <option value={15}>15 matches</option>
              <option value={20}>20 matches</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job-Resume Matching Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            Select Job Posting
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jobPostings?.map((job) => (
              <div
                key={job._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedJobId === job._id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleJobSelect(job._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{job.jobTitle}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{job.location}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {job.embedding ? (
                      <CheckCircle className="h-4 w-4 text-green-500" title="Has embeddings" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" title="Needs embeddings" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resume Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            Select Resume
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {resumes?.map((resume) => (
              <div
                key={resume._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedResumeId === resume._id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleResumeSelect(resume._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {resume.processedMetadata?.name || resume.filename}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {resume.processedMetadata?.email || 'No email'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {resume.embedding ? (
                      <CheckCircle className="h-4 w-4 text-green-500" title="Has embeddings" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" title="Needs embeddings" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matching Results */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Finding matches...</span>
          </div>
        </div>
      )}

      {/* Job Matches Results */}
      {jobMatches && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Matching Resumes for: {jobMatches.jobPosting?.jobTitle}
          </h3>
          
          {jobMatches.matchingResumes.length > 0 ? (
            <div className="space-y-4">
              {jobMatches.matchingResumes.map((resume: any, index: number) => (
                <div
                  key={resume._id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {resume.processedMetadata?.name || resume.filename}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Similarity: {(resume.similarity * 100).toFixed(1)}%
                      </span>
                      <div className={`w-3 h-3 rounded-full ${
                        resume.similarity >= 0.8 ? 'bg-green-500' :
                        resume.similarity >= 0.6 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Email:</span> {resume.processedMetadata?.email || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Skills:</span> {resume.processedMetadata?.skills?.slice(0, 3).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Experience:</span> {resume.processedMetadata?.experience || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Education:</span> {resume.processedMetadata?.education || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Matching Resumes Found
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                No resumes meet the {similarityThreshold * 100}% similarity threshold for this job posting.
              </p>
              {jobMatches.businessInsights && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Business Insight:</strong> {jobMatches.businessInsights.skillGap}
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    <strong>Recommendation:</strong> {jobMatches.businessInsights.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resume Matches Results */}
      {resumeMatches && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Matching Jobs for: {resumeMatches.resume?.processedMetadata?.name || resumeMatches.resume?.filename}
          </h3>
          
          {resumeMatches.matchingJobs.length > 0 ? (
            <div className="space-y-4">
              {resumeMatches.matchingJobs.map((job: any, index: number) => (
                <div
                  key={job._id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{job.jobTitle}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Similarity: {(job.similarity * 100).toFixed(1)}%
                      </span>
                      <div className={`w-3 h-3 rounded-full ${
                        job.similarity >= 0.8 ? 'bg-green-500' :
                        job.similarity >= 0.6 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Location:</span> {job.location || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Type:</span> {job.jobType || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Requirements:</span> {job.experiencedRequired || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Education:</span> {job.educationRequired || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Matching Jobs Found
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                No job postings meet the {similarityThreshold * 100}% similarity threshold for this resume.
              </p>
              {resumeMatches.businessInsights && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Business Insight:</strong> {resumeMatches.businessInsights.skillGap}
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    <strong>Recommendation:</strong> {resumeMatches.businessInsights.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
