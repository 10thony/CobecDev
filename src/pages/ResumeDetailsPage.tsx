import { useParams, useNavigate } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ArrowLeft, User, MapPin, Mail, Phone, Calendar, GraduationCap, Briefcase, Award, FileText, ExternalLink, Save, Edit3, X, Check, Upload, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { TronPanel } from "../components/TronPanel";
import { TronButton } from "../components/TronButton";

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
          `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.filter(r => r.trim()).join('\n')}`
        ).join('\n') || '',
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
      <div className="min-h-screen bg-tron-bg-deep py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-tron-cyan mr-3" />
            <span className="text-tron-gray">Loading resume details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resumeDetails) {
    return (
      <div className="min-h-screen bg-tron-bg-deep py-8">
        <div className="max-w-4xl mx-auto px-4">
          <TronPanel>
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-neon-error mb-4" />
              <h3 className="text-lg font-medium text-tron-white mb-2">
                {error || "Resume not found"}
              </h3>
              <TronButton
                onClick={() => navigate(-1)}
                variant="primary"
                color="cyan"
                className="mt-4"
              >
                <ArrowLeft size={16} className="mr-2" />
                Go Back
              </TronButton>
            </div>
          </TronPanel>
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
    <div className="min-h-screen bg-tron-bg-deep py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header with Back Button and Actions */}
        <div className="flex justify-between items-center">
          <TronButton
            onClick={() => navigate(-1)}
            variant="ghost"
            color="cyan"
            icon={<ArrowLeft size={16} />}
          >
            Back to Search Results
          </TronButton>
          
          <div className="flex items-center gap-3">
            {saveMessage && (
              <TronPanel className="px-3 py-2">
                <div className={`flex items-center gap-2 text-sm ${saveMessage.includes('Error') ? 'text-neon-error' : 'text-neon-success'}`}>
                  {saveMessage.includes('Error') ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span>{saveMessage}</span>
                </div>
              </TronPanel>
            )}
            {uploadMessage && (
              <TronPanel className="px-3 py-2">
                <div className={`flex items-center gap-2 text-sm ${uploadMessage.includes('Error') ? 'text-neon-error' : 'text-neon-success'}`}>
                  {uploadMessage.includes('Error') ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span>{uploadMessage}</span>
                </div>
              </TronPanel>
            )}
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <TronButton
                  onClick={handleSave}
                  disabled={saving}
                  variant="primary"
                  color="cyan"
                  loading={saving}
                  icon={!saving ? <Save size={16} /> : undefined}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </TronButton>
                <TronButton
                  onClick={handleCancel}
                  variant="outline"
                  color="cyan"
                  icon={<X size={16} />}
                >
                  Cancel
                </TronButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <TronButton
                  onClick={() => setIsEditing(true)}
                  variant="primary"
                  color="cyan"
                  icon={<Edit3 size={16} />}
                >
                  Edit Resume
                </TronButton>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDocument}
                    className="hidden"
                  />
                  <div className="relative overflow-hidden group inline-flex items-center justify-center gap-2 border font-medium rounded transition-all duration-250 ease-out px-4 py-2 bg-tron-blue text-tron-bg-deep border-transparent hover:bg-tron-blue/90 hover:shadow-tron-glow-blue disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadingDocument ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploadingDocument ? 'Processing...' : 'Update Document'}
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Resume Header */}
        <TronPanel 
          title={isEditing ? undefined : candidateName}
          glowColor="cyan"
        >
          <div className="space-y-6">
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-tron-gray mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="tron-input w-full text-2xl font-bold"
                  placeholder="Enter candidate name"
                />
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-tron-white mb-4">
                    {candidateName}
                  </h1>
                </div>
                {resumeDetails.similarity && (
                  <div className="px-3 py-1 bg-tron-cyan/20 border border-tron-cyan/40 rounded-full text-sm font-medium text-tron-cyan">
                    {formatSimilarity(resumeDetails.similarity)} Match
                  </div>
                )}
              </div>
            )}

            {/* Contact Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-tron-gray">
                <Mail size={16} className="text-tron-cyan flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="tron-input flex-1"
                    placeholder="Enter email"
                  />
                ) : (
                  <span className="font-medium text-tron-white">{email}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-tron-gray">
                <Phone size={16} className="text-tron-cyan flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="tron-input flex-1"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <span className="font-medium text-tron-white">{phone}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-tron-gray">
                <MapPin size={16} className="text-tron-cyan flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="tron-input flex-1"
                    placeholder="Enter location"
                  />
                ) : (
                  <span>{location}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-tron-gray">
                <Calendar size={16} className="text-tron-cyan flex-shrink-0" />
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      value={formData.yearsOfExperience}
                      onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                      className="tron-input w-20"
                      placeholder="0"
                    />
                    <span className="text-tron-gray">years of experience</span>
                  </div>
                ) : (
                  <span>{experience} years of experience</span>
                )}
              </div>
            </div>

            {/* Contact Button */}
            {!isEditing && (
              <div className="border-t border-tron-cyan/10 pt-4">
                <TronButton
                  variant="primary"
                  color="cyan"
                  className="w-full md:w-auto"
                >
                  Contact Candidate
                </TronButton>
              </div>
            )}
          </div>
        </TronPanel>

        {/* Resume Details Sections */}
        <div className="space-y-6">
          {/* Professional Summary */}
          <TronPanel 
            title="Professional Summary" 
            icon={<User size={20} />}
            glowColor="cyan"
          >
            {isEditing ? (
              <textarea
                value={formData.professionalSummary}
                onChange={(e) => handleInputChange('professionalSummary', e.target.value)}
                className="tron-input w-full h-32 resize-none"
                placeholder="Enter professional summary..."
              />
            ) : (
              <div className="prose max-w-none">
                <p className="text-tron-gray whitespace-pre-wrap">
                  {resumeDetails.professionalSummary || "No professional summary available."}
                </p>
              </div>
            )}
          </TronPanel>

          {/* Work Experience */}
          <TronPanel 
            title="Work Experience" 
            icon={<Briefcase size={20} />}
            glowColor="cyan"
          >
            {isEditing ? (
              <textarea
                value={formData.workExperience}
                onChange={(e) => handleInputChange('workExperience', e.target.value)}
                className="tron-input w-full h-40 resize-none"
                placeholder="Enter work experience..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-tron-gray whitespace-pre-wrap">
                  {resumeDetails.experience?.map(exp => 
                    `${exp.title} at ${exp.company} (${exp.duration})\n${exp.responsibilities.filter(r => r.trim()).join('\n')}`
                  ).join('\n') || "No work experience available."}
                </div>
              </div>
            )}
          </TronPanel>

          {/* Education */}
          <TronPanel 
            title="Education" 
            icon={<GraduationCap size={20} />}
            glowColor="cyan"
          >
            {isEditing ? (
              <textarea
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                className="tron-input w-full h-32 resize-none"
                placeholder="Enter education details..."
              />
            ) : (
              <div className="prose max-w-none">
                <div className="text-tron-gray whitespace-pre-wrap">
                  {resumeDetails.education?.join('\n') || "No education information available."}
                </div>
              </div>
            )}
          </TronPanel>

          {/* Skills */}
          <TronPanel 
            title="Skills" 
            icon={<Award size={20} />}
            glowColor="cyan"
          >
            {isEditing ? (
              <textarea
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                className="tron-input w-full h-24 resize-none"
                placeholder="Enter skills (comma-separated or one per line)..."
              />
            ) : (
              <div className="prose max-w-none">
                {resumeDetails.skills && resumeDetails.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resumeDetails.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-md text-sm bg-tron-bg-elevated text-tron-cyan border border-tron-cyan/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-tron-gray">No skills information available.</p>
                )}
              </div>
            )}
          </TronPanel>

          {/* Certifications */}
          {(resumeDetails.certifications || isEditing) && (
            <TronPanel 
              title="Certifications" 
              glowColor="cyan"
            >
              {isEditing ? (
                <textarea
                  value={formData.certifications}
                  onChange={(e) => handleInputChange('certifications', e.target.value)}
                  className="tron-input w-full h-24 resize-none"
                  placeholder="Enter certifications..."
                />
              ) : (
                <div className="prose max-w-none">
                  <div className="text-tron-gray whitespace-pre-wrap">
                    {resumeDetails.certifications || "No certifications available."}
                  </div>
                </div>
              )}
            </TronPanel>
          )}

          {/* Projects */}
          {(resumeDetails.projects || isEditing) && (
            <TronPanel 
              title="Projects" 
              glowColor="cyan"
            >
              {isEditing ? (
                <textarea
                  value={formData.projects}
                  onChange={(e) => handleInputChange('projects', e.target.value)}
                  className="tron-input w-full h-32 resize-none"
                  placeholder="Enter projects..."
                />
              ) : (
                <div className="prose max-w-none">
                  <div className="text-tron-gray whitespace-pre-wrap">
                    {resumeDetails.projects || "No projects available."}
                  </div>
                </div>
              )}
            </TronPanel>
          )}

          {/* Languages */}
          {(resumeDetails.languages || isEditing) && (
            <TronPanel 
              title="Languages" 
              glowColor="cyan"
            >
              {isEditing ? (
                <textarea
                  value={formData.languages}
                  onChange={(e) => handleInputChange('languages', e.target.value)}
                  className="tron-input w-full h-20 resize-none"
                  placeholder="Enter languages you speak..."
                />
              ) : (
                <div className="prose max-w-none">
                  <div className="text-tron-gray whitespace-pre-wrap">
                    {resumeDetails.languages || "No language information available."}
                  </div>
                </div>
              )}
            </TronPanel>
          )}

          {/* Additional Information */}
          {(resumeDetails.professionalMemberships || isEditing) && (
            <TronPanel 
              title="Additional Information" 
              glowColor="cyan"
            >
              {isEditing ? (
                <textarea
                  value={formData.additionalInformation}
                  onChange={(e) => handleInputChange('additionalInformation', e.target.value)}
                  className="tron-input w-full h-24 resize-none"
                  placeholder="Enter any additional information..."
                />
              ) : (
                <div className="prose max-w-none">
                  <div className="text-tron-gray whitespace-pre-wrap">
                    {resumeDetails.professionalMemberships || "No additional information available."}
                  </div>
                </div>
              )}
            </TronPanel>
          )}
        </div>

        {/* Bottom Action Buttons */}
        {isEditing && (
          <div className="flex justify-center gap-4 pt-4">
            <TronButton
              onClick={handleSave}
              disabled={saving}
              variant="primary"
              color="cyan"
              size="lg"
              loading={saving}
              icon={!saving ? <Save size={20} /> : undefined}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </TronButton>
            <TronButton
              onClick={handleCancel}
              variant="outline"
              color="cyan"
              size="lg"
              icon={<X size={20} />}
            >
              Cancel
            </TronButton>
          </div>
        )}

        {/* Bottom Contact Button */}
        {!isEditing && (
          <div className="text-center pt-4">
            <TronButton
              variant="primary"
              color="cyan"
              size="lg"
            >
              Contact Candidate
            </TronButton>
          </div>
        )}
      </div>
    </div>
  );
}
