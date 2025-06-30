import { useParams, useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ArrowLeft, User, MapPin, Mail, Phone, Calendar, GraduationCap, Briefcase, Award, FileText, ExternalLink } from "lucide-react";

interface ResumeDetails {
  _id: string;
  processedMetadata?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    yearsOfExperience?: number;
    education?: string[];
    skills?: string[];
  };
  professionalSummary?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
  projects?: string;
  languages?: string;
  similarity?: number;
  [key: string]: any;
}

export function ResumeDetailsPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const [resumeDetails, setResumeDetails] = useState<ResumeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const getResumeById = useAction(api.vectorSearch.getResumeById);

  console.log('ResumeDetailsPage rendered with resumeId:', resumeId);

  useEffect(() => {
    const fetchResumeDetails = async () => {
      if (!resumeId) {
        setError("No resume ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Decode the resume ID from URL
        const decodedResumeId = decodeURIComponent(resumeId);
        console.log('Decoded Resume ID:', decodedResumeId);
        
        // Use the getResumeById action
        const resumeDetails = await getResumeById({
          resumeId: decodedResumeId,
        });
        
        console.log('ResumeDetailsPage received data:', {
          _id: resumeDetails._id,
          filename: resumeDetails.filename,
          hasProcessedMetadata: !!resumeDetails.processedMetadata,
          processedMetadataKeys: resumeDetails.processedMetadata ? Object.keys(resumeDetails.processedMetadata) : [],
          name: resumeDetails.processedMetadata?.name,
          email: resumeDetails.processedMetadata?.email,
          phone: resumeDetails.processedMetadata?.phone,
          hasProfessionalSummary: !!resumeDetails.professionalSummary,
          hasWorkExperience: !!resumeDetails.workExperience,
          hasEducation: !!resumeDetails.education,
          hasSkills: !!resumeDetails.skills
        });
        
        if (resumeDetails) {
          setResumeDetails(resumeDetails);
        } else {
          setError("Resume not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load resume details");
      } finally {
        setLoading(false);
      }
    };

    fetchResumeDetails();
  }, [resumeId, getResumeById]);

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
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading resume details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resumeDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {error || "Resume not found"}
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

  const candidateName = resumeDetails.processedMetadata?.name || "Unknown Candidate";
  const email = resumeDetails.processedMetadata?.email || "N/A";
  const phone = resumeDetails.processedMetadata?.phone || "N/A";
  const location = resumeDetails.processedMetadata?.location || "N/A";
  const experience = resumeDetails.processedMetadata?.yearsOfExperience || "N/A";

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

        {/* Resume Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {candidateName}
              </h1>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <MapPin size={16} className="mr-2" />
                <span>{location}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <Calendar size={16} className="mr-2" />
                <span>{experience} years of experience</span>
              </div>
            </div>
            {resumeDetails.similarity && (
              <div className="text-right">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                  {formatSimilarity(resumeDetails.similarity)} Match
                </span>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Mail size={16} className="mr-2" />
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Phone size={16} className="mr-2" />
              <span className="font-medium">{phone}</span>
            </div>
          </div>

          {/* Contact Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium">
              Contact Candidate
            </button>
          </div>
        </div>

        {/* Resume Details Sections */}
        <div className="space-y-6">
          {/* Professional Summary */}
          {resumeDetails.professionalSummary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <User size={20} className="mr-2" />
                Professional Summary
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.professionalSummary}
                </p>
              </div>
            </div>
          )}

          {/* Work Experience */}
          {resumeDetails.workExperience && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Briefcase size={20} className="mr-2" />
                Work Experience
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.workExperience}
                </div>
              </div>
            </div>
          )}

          {/* Education */}
          {resumeDetails.education && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <GraduationCap size={20} className="mr-2" />
                Education
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.education}
                </div>
              </div>
            </div>
          )}

          {/* Skills */}
          {resumeDetails.skills && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award size={20} className="mr-2" />
                Skills
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.skills}
                </div>
              </div>
            </div>
          )}

          {/* Certifications */}
          {resumeDetails.certifications && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Certifications
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.certifications}
                </div>
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeDetails.projects && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Projects
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.projects}
                </div>
              </div>
            </div>
          )}

          {/* Languages */}
          {resumeDetails.languages && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Languages
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.languages}
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {resumeDetails.additionalInformation && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Additional Information
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.additionalInformation}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Contact Button */}
        <div className="mt-8 text-center">
          <button className="px-8 py-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-lg">
            Contact Candidate
          </button>
        </div>
      </div>
    </div>
  );
} 