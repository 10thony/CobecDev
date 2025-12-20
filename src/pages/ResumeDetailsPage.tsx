import { useParams, useNavigate } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ArrowLeft, User, MapPin, Mail, Phone, Calendar, GraduationCap, Briefcase, Award, FileText, ExternalLink, Save, Edit3, X, Check, Upload } from "lucide-react";

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
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  
  const getResumeById = useQuery(api.resumes.get, 
    resumeId ? { id: decodeURIComponent(resumeId) as Id<"resumes"> } : "skip"
  );
  const updateResume = useAction(api.vectorSearch.updateResume);
  const updateResumeWithDocument = useAction(api.vectorSearch.updateResumeWithDocument);

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
    if (!resumeId) {
      setError("No resume ID provided");
      setLoading(false);
      return;
    }

    if (getResumeById === undefined) {
      setLoading(true);
      return;
    }

    if (getResumeById === null) {
      setError("Resume not found");
      setLoading(false);
      return;
    }

    console.log('ResumeDetailsPage received data:', {
      _id: getResumeById._id,
      filename: getResumeById.filename,
      hasPersonalInfo: !!getResumeById.personalInfo,
      personalInfoKeys: getResumeById.personalInfo ? Object.keys(getResumeById.personalInfo) : [],
      firstName: getResumeById.personalInfo?.firstName,
      email: getResumeById.personalInfo?.email,
      phone: getResumeById.personalInfo?.phone,
      hasProfessionalSummary: !!getResumeById.professionalSummary,
      hasExperience: !!getResumeById.experience,
      hasEducation: !!getResumeById.education,
      hasSkills: !!getResumeById.skills
    });
    
    setResumeDetails(getResumeById);
    
    // Initialize form data using the correct structure from resumes table
    setFormData({
      name: `${getResumeById.personalInfo?.firstName || ''} ${getResumeById.personalInfo?.lastName || ''}`.trim(),
      email: getResumeById.personalInfo?.email || '',
      phone: getResumeById.personalInfo?.phone || '',
      location: '', // This field doesn't exist in the current schema
      yearsOfExperience: getResumeById.personalInfo?.yearsOfExperience || 0,
      professionalSummary: getResumeById.professionalSummary || '',
      workExperience: getResumeById.experience?.map(exp => 
        `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.join('\n')}`
      ).join('\n\n') || '',
      education: getResumeById.education?.join('\n') || '',
      skills: getResumeById.skills?.join(', ') || '',
      certifications: getResumeById.certifications || '',
      projects: '', // This field doesn't exist in the current schema
      languages: '', // This field doesn't exist in the current schema
      additionalInformation: getResumeById.professionalMemberships || '',
    });
    
    setLoading(false);
    setError(null);
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
        name: `${resumeDetails.personalInfo?.firstName || ''} ${resumeDetails.personalInfo?.lastName || ''}`.trim(),
        email: resumeDetails.personalInfo?.email || '',
        phone: resumeDetails.personalInfo?.phone || '',
        location: '', // This field doesn't exist in the current schema
        yearsOfExperience: resumeDetails.personalInfo?.yearsOfExperience || 0,
        professionalSummary: resumeDetails.professionalSummary || '',
        workExperience: resumeDetails.experience?.map(exp => 
          `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.join('\n')}`
        ).join('\n\n') || '',
        education: resumeDetails.education?.join('\n') || '',
        skills: resumeDetails.skills?.join(', ') || '',
        certifications: resumeDetails.certifications || '',
        projects: '', // This field doesn't exist in the current schema
        languages: '', // This field doesn't exist in the current schema
        additionalInformation: resumeDetails.professionalMemberships || '',
      });
    }
    setIsEditing(false);
    setSaveMessage(null);
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle document upload for resume update
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      setUploadMessage('Please select a .docx or .pdf file');
      return;
    }

    setUploadingDocument(true);
    const fileType = file.name.endsWith('.docx') ? 'DOCX' : 'PDF';
    setUploadMessage(`Processing ${fileType} document with AI parsing and generating new embeddings...`);

    try {
      // Convert file to base64 for transmission
      const base64Data = await fileToBase64(file);
      
      const result = await updateResumeWithDocument({
        resumeId: decodeURIComponent(resumeId!),
        fileName: file.name,
        fileData: base64Data
      });

      if (result.success) {
        setUploadMessage('Resume updated successfully with new document!');
        
        // Update the local state with the new data
        if (result.updatedResume) {
          setResumeDetails(result.updatedResume);
          
          // Update form data with new values using correct structure
          setFormData({
            name: `${result.updatedResume.personalInfo?.firstName || ''} ${result.updatedResume.personalInfo?.lastName || ''}`.trim(),
            email: result.updatedResume.personalInfo?.email || '',
            phone: result.updatedResume.personalInfo?.phone || '',
            location: '', // This field doesn't exist in the current schema
            yearsOfExperience: result.updatedResume.personalInfo?.yearsOfExperience || 0,
            professionalSummary: result.updatedResume.professionalSummary || '',
            workExperience: result.updatedResume.experience?.map(exp => 
              `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.join('\n')}`
            ).join('\n\n') || '',
            education: result.updatedResume.education?.join('\n') || '',
            skills: result.updatedResume.skills?.join(', ') || '',
            certifications: result.updatedResume.certifications || '',
            projects: '', // This field doesn't exist in the current schema
            languages: '', // This field doesn't exist in the current schema
            additionalInformation: result.updatedResume.professionalMemberships || '',
          });
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => setUploadMessage(null), 5000);
      } else {
        const errorMessage = result.message || "Failed to update resume with document";
        
        // Provide more helpful error messages for PDF issues
        if (errorMessage.includes('PDF parsing failed')) {
          setUploadMessage('PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.');
        } else {
          setUploadMessage(`Error: ${errorMessage}`);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update resume with document";
      
      // Provide more helpful error messages for PDF issues
      if (errorMessage.includes('PDF parsing failed')) {
        setUploadMessage('PDF parsing failed. Please ensure the PDF is not password-protected and contains readable text. Try converting the PDF to a .docx file and upload that instead.');
      } else {
        setUploadMessage(`Error: ${errorMessage}`);
      }
    } finally {
      setUploadingDocument(false);
    }
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
      <div className="min-h-screen bg-mint-cream-900 bg-oxford-blue-DEFAULT py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-mint-cream-600">Loading resume details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resumeDetails) {
    return (
      <div className="min-h-screen bg-mint-cream-900 bg-oxford-blue-DEFAULT py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-mint-cream-DEFAULT mb-2">
              {error || "Resume not found"}
            </h3>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const candidateName = `${resumeDetails.personalInfo?.firstName || ''} ${resumeDetails.personalInfo?.lastName || ''}`.trim() || "Unknown Candidate";
  const email = resumeDetails.personalInfo?.email || "N/A";
  const phone = resumeDetails.personalInfo?.phone || "N/A";
  const location = "N/A"; // This field doesn't exist in current schema
  const experience = resumeDetails.personalInfo?.yearsOfExperience || "N/A";

  return (
    <div className="min-h-screen bg-mint-cream-900 bg-oxford-blue-DEFAULT py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Back Button and Edit Toggle */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-powder-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Search Results
          </button>
          
          <div className="flex items-center space-x-3">
            {saveMessage && (
              <div className={`px-3 py-2 rounded-md text-sm ${ saveMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }`}>
                {saveMessage}
              </div>
            )}
            {uploadMessage && (
              <div className={`px-3 py-2 rounded-md text-sm ${ uploadMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }`}>
                {uploadMessage}
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
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-yale-blue-400 transition-colors"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 transition-colors"
                >
                  <Edit3 size={16} className="mr-2" />
                  Edit Resume
                </button>
                <label className={`flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${ uploadingDocument ? 'bg-purple-400 cursor-not-allowed' : 'bg-yale-blue-DEFAULT text-white hover:bg-purple-700' }`}>
                  {uploadingDocument ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Upload size={16} className="mr-2" />
                  )}
                  {uploadingDocument ? 'Processing...' : 'Update with Document (.docx/.pdf)'}
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDocument}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-2 flex items-center">
                <Upload size={20} className="mr-2 text-powder-blue-600" />
                Update Resume with New Document
              </h2>
              <p className="text-mint-cream-600 mb-4">
                Upload a new .docx or .pdf file to update this resume with fresh AI parsing and embeddings. 
                This will replace the current content with the new document's parsed data and generate new search vectors.
              </p>
              <div className="text-xs text-mint-cream-700 mb-4">
                <strong>What happens when you upload:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>AI extracts and structures all resume information</li>
                  <li>New searchable text and embeddings are generated</li>
                  <li>All fields are updated with the new document's content</li>
                  <li>Search index is refreshed for better matching</li>
                </ul>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-purple-700 transition-colors cursor-pointer">
                  <Upload size={16} className="mr-2" />
                  {uploadingDocument ? 'Processing...' : 'Choose .docx/.pdf File'}
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDocument}
                    className="hidden"
                  />
                </label>
                {uploadingDocument && (
                  <div className="flex items-center text-powder-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    <span className="text-sm">Processing document...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-mint-cream-700 mb-1">Current File</div>
              <div className="text-sm font-medium text-mint-cream-DEFAULT">
                {resumeDetails.filename || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Resume Header */}
        <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="text-3xl font-bold text-mint-cream-DEFAULT mb-2 bg-transparent border-b-2 border-powder-blue-600 focus:outline-none focus:border-blue-600 w-full"
                  placeholder="Enter your name"
                />
              ) : (
                <h1 className="text-3xl font-bold text-mint-cream-DEFAULT mb-2">
                  {candidateName}
                </h1>
              )}
              
              <div className="flex items-center text-mint-cream-600 mb-2">
                <MapPin size={16} className="mr-2" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="bg-transparent border-b border-yale-blue-400 focus:outline-none focus:border-powder-blue-600 flex-1"
                    placeholder="Enter location"
                  />
                ) : (
                  <span>{location}</span>
                )}
              </div>
              
              <div className="flex items-center text-mint-cream-600 mb-2">
                <Calendar size={16} className="mr-2" />
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                    className="bg-transparent border-b border-yale-blue-400 focus:outline-none focus:border-powder-blue-600 w-20"
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
                <span className="bg-yale-blue-500 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {formatSimilarity(resumeDetails.similarity)} Match
                </span>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center text-mint-cream-600">
              <Mail size={16} className="mr-2" />
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-transparent border-b border-yale-blue-400 focus:outline-none focus:border-powder-blue-600 flex-1"
                  placeholder="Enter email"
                />
              ) : (
                <span className="font-medium">{email}</span>
              )}
            </div>
            <div className="flex items-center text-mint-cream-600">
              <Phone size={16} className="mr-2" />
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-transparent border-b border-yale-blue-400 focus:outline-none focus:border-powder-blue-600 flex-1"
                  placeholder="Enter phone number"
                />
              ) : (
                <span className="font-medium">{phone}</span>
              )}
            </div>
          </div>

          {/* Contact Button */}
          <div className="border-t border-yale-blue-300 pt-4">
            <button className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium">
              Contact Candidate
            </button>
          </div>
        </div>

        {/* Resume Details Sections */}
        <div className="space-y-6">
          {/* Professional Summary */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4 flex items-center">
              <User size={20} className="mr-2" />
              Professional Summary
            </h2>
            {isEditing ? (
              <textarea
                value={formData.professionalSummary}
                onChange={(e) => handleInputChange('professionalSummary', e.target.value)}
                className="w-full h-32 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your professional summary..."
              />
            ) : (
              <div className="prose max-w-none">
                <p className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.professionalSummary || "No professional summary available."}
                </p>
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4 flex items-center">
              <Briefcase size={20} className="mr-2" />
              Work Experience
            </h2>
            {isEditing ? (
              <textarea
                value={formData.workExperience}
                onChange={(e) => handleInputChange('workExperience', e.target.value)}
                className="w-full h-40 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your work experience..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.experience?.map(exp => 
                    `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.join('\n')}`
                  ).join('\n\n') || "No work experience available."}
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4 flex items-center">
              <GraduationCap size={20} className="mr-2" />
              Education
            </h2>
            {isEditing ? (
              <textarea
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                className="w-full h-32 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your education details..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.education?.join('\n') || "No education information available."}
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4 flex items-center">
              <Award size={20} className="mr-2" />
              Skills
            </h2>
            {isEditing ? (
              <textarea
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                className="w-full h-24 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your skills (comma-separated or one per line)..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.skills?.join(', ') || "No skills information available."}
                </div>
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4">
              Certifications
            </h2>
            {isEditing ? (
              <textarea
                value={formData.certifications}
                onChange={(e) => handleInputChange('certifications', e.target.value)}
                className="w-full h-24 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your certifications..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.certifications || "No certifications available."}
                </div>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4">
              Projects
            </h2>
            {isEditing ? (
              <textarea
                value={formData.projects}
                onChange={(e) => handleInputChange('projects', e.target.value)}
                className="w-full h-32 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter your projects..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.projects || "No projects available."}
                </div>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4">
              Languages
            </h2>
            {isEditing ? (
              <textarea
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                className="w-full h-20 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter languages you speak..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.languages || "No language information available."}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-mint-cream-DEFAULT mb-4">
              Additional Information
            </h2>
            {isEditing ? (
              <textarea
                value={formData.additionalInformation}
                onChange={(e) => handleInputChange('additionalInformation', e.target.value)}
                className="w-full h-24 p-3 border border-yale-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-mint-cream-DEFAULT"
                placeholder="Enter any additional information..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-mint-cream-500 whitespace-pre-wrap">
                  {resumeDetails.professionalMemberships || "No additional information available."}
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
              className="flex items-center px-8 py-4 bg-gray-600 text-white rounded-md hover:bg-yale-blue-400 transition-colors font-medium text-lg"
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