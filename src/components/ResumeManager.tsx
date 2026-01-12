import React, { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  Download, 
  Trash2, 
  User, 
  Search,
  CheckCircle,
  AlertTriangle,
  FileJson,
  FileType,
  ChevronDown,
  Settings
} from 'lucide-react';

interface Resume {
  _id: string;
  filename: string;
  originalText: string;
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    yearsOfExperience: number;
  };
  professionalSummary: string;
  education: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    duration: string;
    responsibilities: string[];
  }>;
  skills: string[];
  certifications: string;
  professionalMemberships: string;
  securityClearance: string;
  embedding?: number[];
  createdAt?: number;
  updatedAt?: number;
}

const ResumeManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showActionsTooltip, setShowActionsTooltip] = useState(false);
  const searchHeaderRef = React.useRef<HTMLDivElement>(null);
  const actionsTooltipRef = React.useRef<HTMLDivElement>(null);

  // Convex queries
  const resumesQuery = useQuery(api.dataManagement.getAllResumes, { 
    limit: 500, 
    offset: 0 
  });

  // Convex actions and mutations
  const importDataAction = useAction(api.dataManagement.importData);
  const exportDataAction = useAction(api.dataManagement.exportData);
  const clearResumesAction = useMutation(api.dataManagement.clearResumes);
  const parseResumeFileAction = useAction(api.resumeParser.parseResumeFile);

  const resumes = (resumesQuery?.resumes || []) as Resume[];

  // Filter resumes based on search term
  const filteredResumes = React.useMemo(() => {
    if (!searchTerm.trim()) return resumes;
    
    const searchLower = searchTerm.toLowerCase();
    return resumes.filter(resume => 
      resume.personalInfo.firstName.toLowerCase().includes(searchLower) ||
      resume.personalInfo.lastName.toLowerCase().includes(searchLower) ||
      resume.personalInfo.email.toLowerCase().includes(searchLower) ||
      resume.filename.toLowerCase().includes(searchLower) ||
      resume.professionalSummary.toLowerCase().includes(searchLower) ||
      resume.skills.some(skill => skill.toLowerCase().includes(searchLower))
    );
  }, [resumes, searchTerm]);

  // Handle JSON file import
  const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage('Please select a JSON file');
      setError('Invalid file type. Please select a JSON file.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Importing JSON file...');
    
    try {
      const data = await readJsonFile(file);
      
      // Determine if this is resume data
      const resumeData = Array.isArray(data) ? data : (data.resumes || []);
      
      if (!Array.isArray(resumeData) || resumeData.length === 0) {
        throw new Error('No resume data found in JSON file');
      }

      const result = await importDataAction({ 
        data: resumeData,
        dataType: 'resumes',
        overwrite: false
      });
      
      setMessage(`Import completed: ${result.importedCount} resumes imported successfully, ${result.errorCount} errors`);
      if (result.errorCount > 0) {
        setError(`Some resumes failed to import. Check console for details.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Import failed: ${errorMessage}`);
      setMessage(null);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Handle DOCX/PDF file import
  const handleDocumentImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      setMessage('Please select a .docx or .pdf file');
      setError('Invalid file type. Please select a .docx or .pdf file.');
      return;
    }

    setLoading(true);
    setError(null);
    const fileType = file.name.endsWith('.docx') ? 'DOCX' : 'PDF';
    setMessage(`Processing ${fileType} file...`);
    
    try {
      // Read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call Python script via Convex action to parse the resume
      setMessage(`Extracting data from ${fileType} file...`);
      const parseResult = await parseResumeFileAction({
        fileData: base64Data,
        filename: file.name,
      });

      if (!parseResult.success || !parseResult.data) {
        throw new Error('Failed to parse resume file');
      }

      // Import the parsed resume data
      setMessage('Importing parsed resume data...');
      const result = await importDataAction({ 
        data: [parseResult.data],
        dataType: 'resumes',
        overwrite: false
      });
      
      setMessage(`Import completed: ${result.importedCount} resume imported successfully${result.errorCount > 0 ? `, ${result.errorCount} errors` : ''}`);
      if (result.errorCount > 0) {
        setError(`Some data failed to import. Check console for details.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Import failed: ${errorMessage}`);
      setMessage(null);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Export resumes as JSON
  const handleExportResumes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await exportDataAction({ dataType: 'resumes' });
      
      if (result.success && result.data) {
        // Export data structure is { resumes: [...] }
        const exportData = result.data.resumes || result.data;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumes-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const recordCount = Array.isArray(exportData) ? exportData.length : result.recordCount || 0;
        setMessage(`Resumes exported successfully: ${recordCount} records`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Export failed: ${errorMessage}`);
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Clear only resume data
  const handleClearResumes = async () => {
    if (!window.confirm('WARNING: This will clear all resume data from the database. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await clearResumesAction({ confirm: true });
      setMessage('Resume data cleared successfully');
      setSelectedResume(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to clear resume data: ${errorMessage}`);
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setMessage('Refreshing data...');
    setError(null);
    // Data will automatically refresh via Convex reactive queries
    setTimeout(() => {
      setMessage('Data refreshed successfully');
    }, 500);
  };

  // Helper function to read JSON file
  const readJsonFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Clear messages after a delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle click outside to close actions tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showActionsTooltip &&
        searchHeaderRef.current &&
        actionsTooltipRef.current &&
        !searchHeaderRef.current.contains(event.target as Node) &&
        !actionsTooltipRef.current.contains(event.target as Node)
      ) {
        setShowActionsTooltip(false);
      }
    };

    if (showActionsTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActionsTooltip]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Resume Management</h1>
          <p className="text-lg text-tron-gray">Import and manage candidate resumes using Convex database</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <TronButton
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            color="cyan"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </TronButton>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <TronPanel>
          <div className="flex items-center gap-3 text-neon-success">
            <CheckCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        </TronPanel>
      )}

      {error && (
        <TronPanel>
          <div className="flex items-center gap-3 text-neon-error">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </TronPanel>
      )}

      {/* Search Section with Actions Tooltip */}
      <div className="relative">
        <TronPanel>
          <div
            ref={searchHeaderRef}
            className="flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-tron-cyan/10 min-w-0 relative z-50"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <span className="text-tron-cyan tron-icon-glow flex-shrink-0">
                <Search className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-tron-white tron-glow-text truncate">
                Search Resumes
              </h3>
            </div>
            <div 
              className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:bg-tron-bg-elevated rounded px-2 py-1 transition-colors"
              onClick={() => setShowActionsTooltip(!showActionsTooltip)}
              onMouseEnter={() => setShowActionsTooltip(true)}
            >
              <Settings className="w-4 h-4 text-tron-gray hover:text-tron-cyan transition-colors" />
              <ChevronDown 
                className={`w-4 h-4 text-tron-gray transition-transform duration-200 ${
                  showActionsTooltip ? 'rotate-180 text-tron-cyan' : ''
                }`} 
              />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tron-gray w-5 h-5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search resumes by name, email, skills, or filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="tron-input w-full pr-4 py-3"
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
              
              {searchTerm && (
                <TronButton
                  onClick={() => setSearchTerm('')}
                  variant="ghost"
                  color="cyan"
                  size="sm"
                >
                  Clear Search
                </TronButton>
              )}
            </div>
          </div>
        </TronPanel>

        {/* Actions Tooltip - Contains Import and Actions */}
        {showActionsTooltip && (
          <div
            ref={actionsTooltipRef}
            className="absolute z-[60] top-full left-0 right-0 mt-2 bg-tron-bg-panel border border-tron-cyan/30 rounded-lg shadow-tron-glow p-6 max-h-[80vh] overflow-y-auto"
            onMouseLeave={() => {
              // Keep tooltip open if user is interacting with it
              if (!loading) {
                setTimeout(() => {
                  if (actionsTooltipRef.current && !actionsTooltipRef.current.matches(':hover')) {
                    setShowActionsTooltip(false);
                  }
                }, 200);
              }
            }}
          >
            <div className="space-y-6">
              {/* Import Section */}
              <div>
                <h4 className="text-lg font-semibold text-tron-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-tron-cyan" />
                  Import Resumes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* JSON Import */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-tron-cyan" />
                      <span className="text-sm font-medium text-tron-white">Import Resumes (JSON)</span>
                    </div>
                    <p className="text-xs text-tron-gray">
                      Upload a JSON file containing resume data
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleJsonImport}
                        disabled={loading}
                        className="hidden"
                        id="json-upload"
                      />
                      <TronButton
                        onClick={() => document.getElementById('json-upload')?.click()}
                        disabled={loading}
                        variant="primary"
                        color="cyan"
                        icon={<Upload className="w-4 h-4" />}
                        className="w-full"
                      >
                        {loading ? 'Importing...' : 'Choose File'}
                      </TronButton>
                    </label>
                  </div>

                  {/* DOCX/PDF Import */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileType className="w-4 h-4 text-tron-blue" />
                      <span className="text-sm font-medium text-tron-white">Import Resumes (DOCX/PDF)</span>
                    </div>
                    <p className="text-xs text-tron-gray">
                      Upload a .docx or .pdf file - local parsing will extract and structure the resume data (no AI, PII-safe)
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".docx,.pdf"
                        onChange={handleDocumentImport}
                        disabled={loading}
                        className="hidden"
                        id="doc-upload"
                      />
                      <TronButton
                        onClick={() => document.getElementById('doc-upload')?.click()}
                        disabled={loading}
                        variant="primary"
                        color="blue"
                        icon={<Upload className="w-4 h-4" />}
                        className="w-full"
                      >
                        {loading ? 'Processing...' : 'Choose File'}
                      </TronButton>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="border-t border-tron-cyan/20 pt-4">
                <h4 className="text-lg font-semibold text-tron-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-tron-cyan" />
                  Actions
                </h4>
                <div className="flex flex-wrap gap-4">
                  <TronButton
                    onClick={handleExportResumes}
                    disabled={loading || resumes.length === 0}
                    variant="primary"
                    color="cyan"
                    icon={<Download className="w-4 h-4" />}
                  >
                    Export Resumes
                  </TronButton>
                  
                  <TronButton
                    onClick={handleClearResumes}
                    disabled={loading}
                    variant="primary"
                    color="orange"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Clear Resume Data
                  </TronButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumes List */}
      {filteredResumes.length > 0 && (
        <TronPanel 
          title={`Resumes (${filteredResumes.length}${searchTerm ? ' filtered' : ''})`}
          icon={<User className="w-5 h-5" />}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {filteredResumes.map((resume) => (
              <div
                key={resume._id}
                className={`p-5 border rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedResume?._id === resume._id
                    ? 'border-tron-cyan bg-tron-bg-card shadow-md'
                    : 'border-tron-cyan/20 hover:border-tron-cyan/40 hover:bg-tron-bg-card hover:shadow-sm'
                }`}
                onClick={() => {
                  if (resume._id) {
                    const encodedResumeId = encodeURIComponent(resume._id);
                    navigate(`/resume/${encodedResumeId}`);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-semibold text-tron-white text-lg">
                      {resume.personalInfo.firstName} {resume.personalInfo.middleName} {resume.personalInfo.lastName}
                    </h3>
                    <p className="text-sm text-tron-gray">{resume.personalInfo.email}</p>
                    <p className="text-sm text-tron-gray">{resume.filename}</p>
                    {resume.skills && resume.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {resume.skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded text-xs bg-tron-bg-elevated text-tron-cyan border border-tron-cyan/20"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.skills.length > 5 && (
                          <span className="px-2 py-1 rounded text-xs bg-tron-bg-elevated text-tron-gray">
                            +{resume.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-tron-gray mt-2">
                      <span>{resume.personalInfo.yearsOfExperience} years experience</span>
                      {resume.embedding && (
                        <span className="text-neon-success">✓ Has embedding</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TronPanel>
      )}

      {/* No Results */}
      {filteredResumes.length === 0 && resumes.length > 0 && (
        <TronPanel>
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-tron-gray" />
            <h3 className="text-lg font-medium text-tron-white mb-2">No Resumes Found</h3>
            <p className="text-tron-gray">Try adjusting your search terms</p>
          </div>
        </TronPanel>
      )}

      {/* Empty State */}
      {resumes.length === 0 && !loading && (
        <TronPanel>
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-tron-gray" />
            <h3 className="text-lg font-medium text-tron-white mb-2">No Resumes Yet</h3>
            <p className="text-tron-gray mb-4">Import your first resume using the upload cards above</p>
          </div>
        </TronPanel>
      )}

      {/* Loading State */}
      {loading && resumes.length === 0 && (
        <TronPanel>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-tron-cyan mr-2" />
            <span className="text-tron-gray">Loading resumes...</span>
          </div>
        </TronPanel>
      )}
    </div>
  );
};

export default ResumeManager;
