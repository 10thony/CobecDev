import { useParams, useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ArrowLeft, User, MapPin, Mail, Phone, Calendar, GraduationCap, Briefcase, Award, FileText, ExternalLink, Save, Edit3, X, Check } from "lucide-react";

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
  additionalInformation?: string;
  similarity?: number;
  [key: string]: any;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  yearsOfExperience: number;
  professionalSummary: string;
  workExperience: string;
  education: string;
  skills: string;
  certifications: string;
  projects: string;
  languages: string;
  additionalInformation: string;
}

export function ResumeDetailsPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const [resumeDetails, setResumeDetails] = useState<ResumeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  const getResumeById = useAction(api.vectorSearch.getResumeById);
  const updateResume = useAction(api.vectorSearch.updateResume);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    yearsOfExperience: 0,
    professionalSummary: '',
    workExperience: '',
    education: '',
    skills: '',
    certifications: '',
    projects: '',
    languages: '',
    additionalInformation: '',
  });

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
          
          // Initialize form data
          setFormData({
            name: resumeDetails.processedMetadata?.name || '',
            email: resumeDetails.processedMetadata?.email || '',
            phone: resumeDetails.processedMetadata?.phone || '',
            location: resumeDetails.processedMetadata?.location || '',
            yearsOfExperience: resumeDetails.processedMetadata?.yearsOfExperience || 0,
            professionalSummary: resumeDetails.professionalSummary || '',
            workExperience: resumeDetails.workExperience || '',
            education: resumeDetails.education || '',
            skills: resumeDetails.skills || '',
            certifications: resumeDetails.certifications || '',
            projects: resumeDetails.projects || '',
            languages: resumeDetails.languages || '',
            additionalInformation: resumeDetails.additionalInformation || '',
          });
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

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!resumeId) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const decodedResumeId = decodeURIComponent(resumeId);
      
      const result = await updateResume({
        resumeId: decodedResumeId,
        updates: formData
      });

      if (result.success) {
        setSaveMessage("Resume updated successfully!");
        setIsEditing(false);
        
        // Update the local state with the new data
        if (result.updatedResume) {
          setResumeDetails(result.updatedResume);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(`Error: ${result.message}`);
      }
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message || "Failed to update resume"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (resumeDetails) {
      setFormData({
        name: resumeDetails.processedMetadata?.name || '',
        email: resumeDetails.processedMetadata?.email || '',
        phone: resumeDetails.processedMetadata?.phone || '',
        location: resumeDetails.processedMetadata?.location || '',
        yearsOfExperience: resumeDetails.processedMetadata?.yearsOfExperience || 0,
        professionalSummary: resumeDetails.professionalSummary || '',
        workExperience: resumeDetails.workExperience || '',
        education: resumeDetails.education || '',
        skills: resumeDetails.skills || '',
        certifications: resumeDetails.certifications || '',
        projects: resumeDetails.projects || '',
        languages: resumeDetails.languages || '',
        additionalInformation: resumeDetails.additionalInformation || '',
      });
    }
    setIsEditing(false);
    setSaveMessage(null);
  };

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
        {/* Header with Back Button and Edit Toggle */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Search Results
          </button>
          
          <div className="flex items-center space-x-3">
            {saveMessage && (
              <div className={`px-3 py-2 rounded-md text-sm ${
                saveMessage.includes('Error') 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {saveMessage}
              </div>
            )}
            
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Edit3 size={16} className="mr-2" />
                Edit Resume
              </button>
            )}
          </div>
        </div>

        {/* Resume Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 w-full"
                  placeholder="Enter your name"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {candidateName}
                </h1>
              )}
              
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <MapPin size={16} className="mr-2" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1"
                    placeholder="Enter location"
                  />
                ) : (
                  <span>{location}</span>
                )}
              </div>
              
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <Calendar size={16} className="mr-2" />
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className="bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 w-20"
                    placeholder="0"
                  />
                ) : (
                  <span>{experience} years of experience</span>
                )}
                {isEditing && <span className="ml-1">years of experience</span>}
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
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1"
                  placeholder="Enter email"
                />
              ) : (
                <span className="font-medium">{email}</span>
              )}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Phone size={16} className="mr-2" />
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1"
                  placeholder="Enter phone number"
                />
              ) : (
                <span className="font-medium">{phone}</span>
              )}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User size={20} className="mr-2" />
              Professional Summary
            </h2>
            {isEditing ? (
              <textarea
                value={formData.professionalSummary}
                onChange={(e) => handleInputChange('professionalSummary', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your professional summary..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.professionalSummary || "No professional summary available."}
                </p>
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Briefcase size={20} className="mr-2" />
              Work Experience
            </h2>
            {isEditing ? (
              <textarea
                value={formData.workExperience}
                onChange={(e) => handleInputChange('workExperience', e.target.value)}
                className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your work experience..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.workExperience || "No work experience available."}
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <GraduationCap size={20} className="mr-2" />
              Education
            </h2>
            {isEditing ? (
              <textarea
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your education details..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.education || "No education information available."}
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Award size={20} className="mr-2" />
              Skills
            </h2>
            {isEditing ? (
              <textarea
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your skills (comma-separated or one per line)..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.skills || "No skills information available."}
                </div>
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Certifications
            </h2>
            {isEditing ? (
              <textarea
                value={formData.certifications}
                onChange={(e) => handleInputChange('certifications', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your certifications..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.certifications || "No certifications available."}
                </div>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Projects
            </h2>
            {isEditing ? (
              <textarea
                value={formData.projects}
                onChange={(e) => handleInputChange('projects', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your projects..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.projects || "No projects available."}
                </div>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Languages
            </h2>
            {isEditing ? (
              <textarea
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                className="w-full h-20 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter languages you speak..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.languages || "No language information available."}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Additional Information
            </h2>
            {isEditing ? (
              <textarea
                value={formData.additionalInformation}
                onChange={(e) => handleInputChange('additionalInformation', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter any additional information..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {resumeDetails.additionalInformation || "No additional information available."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Buttons */}
        {isEditing && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-8 py-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-lg"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Save size={20} className="mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center px-8 py-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium text-lg"
            >
              <X size={20} className="mr-2" />
              Cancel
            </button>
          </div>
        )}

        {/* Bottom Contact Button */}
        {!isEditing && (
          <div className="mt-8 text-center">
            <button className="px-8 py-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-lg">
              Contact Candidate
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 