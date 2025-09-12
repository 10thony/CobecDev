import { useParams, useNavigate } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ArrowLeft, Briefcase, MapPin, DollarSign, Calendar, Building, Clock, User, CheckCircle, AlertCircle } from "lucide-react";

interface JobDetails {
  _id: string;
  jobTitle: string;
  location: string;
  salary: string;
  jobType: string;
  department: string;
  jobSummary?: string;
  duties?: string;
  requirements?: string;
  qualifications?: string;
  education?: string;
  howToApply?: string;
  additionalInformation?: string;
  openDate?: string;
  closeDate?: string;
  similarity?: number;
  [key: string]: any;
}

export function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchSimilarJobs = useAction(api.vectorSearch.searchSimilarJobs);
  const getJobById = useQuery(api.jobPostings.get, 
    jobId ? { id: decodeURIComponent(jobId) as Id<"jobpostings"> } : "skip"
  );

  console.log('JobDetailsPage rendered with jobId:', jobId);

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided");
      setLoading(false);
      return;
    }

    if (getJobById === undefined) {
      setLoading(true);
      return;
    }

    if (getJobById === null) {
      setError("Job not found");
      setLoading(false);
      return;
    }

    console.log('JobDetailsPage received data:', {
      _id: getJobById._id,
      jobTitle: getJobById.jobTitle,
      location: getJobById.location,
      department: getJobById.department,
      salary: getJobById.salary,
      hasJobSummary: !!getJobById.jobSummary,
      hasDuties: !!getJobById.duties,
      hasRequirements: !!getJobById.requirements,
      hasQualifications: !!getJobById.qualifications
    });
    
    setJobDetails(getJobById);
    setLoading(false);
    setError(null);
  }, [jobId, getJobById]);

  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading job details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !jobDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {error || "Job not found"}
            </h3>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Search Results
        </button>

        {/* Job Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {jobDetails.jobTitle}
              </h1>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <Building size={16} className="mr-2" />
                <span>{jobDetails.department}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <MapPin size={16} className="mr-2" />
                <span>{jobDetails.location}</span>
              </div>
            </div>
            {jobDetails.similarity && (
              <div className="text-right">
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                  {formatSimilarity(jobDetails.similarity)} Match
                </span>
              </div>
            )}
          </div>

          {/* Job Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <DollarSign size={16} className="mr-2" />
              <span className="font-medium">{jobDetails.salary || "Salary not specified"}</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock size={16} className="mr-2" />
              <span className="font-medium">{jobDetails.jobType || "Full-time"}</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar size={16} className="mr-2" />
              <span className="font-medium">
                {jobDetails.openDate && jobDetails.closeDate 
                  ? `${formatDate(jobDetails.openDate)} - ${formatDate(jobDetails.closeDate)}`
                  : "Dates not specified"
                }
              </span>
            </div>
          </div>

          {/* Apply Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
              Apply for this Position
            </button>
          </div>
        </div>

        {/* Job Details Sections */}
        <div className="space-y-6">
          {/* Job Summary */}
          {jobDetails.jobSummary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Briefcase size={20} className="mr-2" />
                Job Summary
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.jobSummary}
                </p>
              </div>
            </div>
          )}

          {/* Duties */}
          {jobDetails.duties && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <CheckCircle size={20} className="mr-2" />
                Duties
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.duties}
                </div>
              </div>
            </div>
          )}

          {/* Requirements */}
          {jobDetails.requirements && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <User size={20} className="mr-2" />
                Requirements
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.requirements}
                </div>
              </div>
            </div>
          )}

          {/* Qualifications */}
          {jobDetails.qualifications && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Qualifications
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.qualifications}
                </div>
              </div>
            </div>
          )}

          {/* Education */}
          {jobDetails.education && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Education
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.education}
                </div>
              </div>
            </div>
          )}

          {/* How to Apply */}
          {jobDetails.howToApply && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                How to Apply
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.howToApply}
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {jobDetails.additionalInformation && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Additional Information
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {jobDetails.additionalInformation}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Apply Button */}
        <div className="mt-8 text-center">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-lg">
            Apply for this Position
          </button>
        </div>
      </div>
    </div>
  );
} 