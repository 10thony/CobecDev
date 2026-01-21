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
  Settings,
  Sparkles,
  Wand2,
  X
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
  sourceLeadId?: string;
  generationMetadata?: {
    systemPromptId?: string;
    generatedAt: number;
    model: string;
    tokensUsed?: number;
    generationTimeMs?: number;
  };
  metadata?: {
    dataType?: string;
    fileName: string;
    importedAt: number;
    parsedAt: number;
  };
}

const ResumeManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showActionsTooltip, setShowActionsTooltip] = useState(false);
  const [showAIGenerationModal, setShowAIGenerationModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(null);
  const [batchLeadIds, setBatchLeadIds] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<'single' | 'batch'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [cancelled, setCancelled] = useState(false);
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
  const parseResumeFileWithAIAction = useAction(api.aiResumeParser.parseResumeFileWithAI);
  const generateResumeFromLeadAction = useAction(api.aiResumeGenerator.generateResumeFromLead);
  const generateResumesFromLeadsAction = useAction(api.aiResumeGenerator.generateResumesFromLeads);
  const clearAIGeneratedResumesAction = useMutation(api.aiResumeManagement.clearAIGeneratedResumes);
  
  // Convex queries for AI generation
  const leadsQuery = useQuery(api.leads.getLeadsForResumeGeneration, { limit: 100, offset: 0 });
  const systemPromptsQuery = useQuery(api.resumeGenerationSystemPrompts.list, {});
  const activeJobsQuery = useQuery(api.aiResumeManagement.getActiveGenerationJobs, {});

  const resumes = (resumesQuery?.resumes || []) as Resume[];
  const isLoadingResumes = resumesQuery === undefined;

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

  // Handle AI-powered DOCX/PDF file import (Beta)
  const handleAIDocumentImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setMessage(`Processing ${fileType} file with AI parser (Beta)...`);
    
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

      // Call AI parser via Convex action
      setMessage(`AI is analyzing ${fileType} file...`);
      const parseResult = await parseResumeFileWithAIAction({
        fileData: base64Data,
        filename: file.name,
      });

      if (!parseResult.success || !parseResult.data) {
        throw new Error('Failed to parse resume file with AI');
      }

      // Import the parsed resume data
      setMessage('Importing AI-parsed resume data...');
      const result = await importDataAction({ 
        data: [parseResult.data],
        dataType: 'resumes',
        overwrite: false
      });
      
      setMessage(`AI import completed: ${result.importedCount} resume imported successfully${result.errorCount > 0 ? `, ${result.errorCount} errors` : ''}`);
      if (result.errorCount > 0) {
        setError(`Some data failed to import. Check console for details.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`AI import failed: ${errorMessage}`);
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

  // Clear AI-generated resumes only
  const handleClearAIGeneratedResumes = async () => {
    if (!window.confirm('WARNING: This will clear all AI-generated resumes from the database. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await clearAIGeneratedResumesAction({ confirm: true });
      setMessage(result.message || 'AI-generated resumes cleared successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to clear AI-generated resumes: ${errorMessage}`);
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    setCancelled(true);
    setIsGenerating(false);
    setGenerationProgress(null);
    setMessage('Generation cancelled');
    // Note: The action will continue running server-side, but we stop tracking it
  };

  // Generate single resume from lead
  const handleGenerateResume = async () => {
    if (!selectedLeadId) {
      setError('Please select a lead');
      return;
    }

    setLoading(true);
    setIsGenerating(true);
    setCancelled(false);
    setError(null);
    setMessage('Generating resume...');
    setGenerationProgress({ current: 0, total: 1 });
    
    try {
      const result = await generateResumeFromLeadAction({
        leadId: selectedLeadId as any,
        systemPromptId: selectedSystemPromptId ? (selectedSystemPromptId as any) : undefined,
      });
      
      if (cancelled) {
        return; // User cancelled, don't update UI
      }
      
      if (result.success) {
        setMessage('Resume generated successfully!');
        setIsGenerating(false);
        setGenerationProgress(null);
        // Keep modal open for a moment to show success, then close
        setTimeout(() => {
          setShowAIGenerationModal(false);
          setSelectedLeadId(null);
          setSelectedSystemPromptId(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to generate resume');
        setMessage(null);
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    } catch (error) {
      if (cancelled) {
        return; // User cancelled, don't update UI
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to generate resume: ${errorMessage}`);
      setMessage(null);
      setIsGenerating(false);
      setGenerationProgress(null);
    } finally {
      setLoading(false);
      if (!cancelled) {
        setIsGenerating(false);
      }
    }
  };

  // Generate batch of resumes
  const handleGenerateBatchResumes = async () => {
    if (batchLeadIds.length === 0) {
      setError('Please select at least one lead');
      return;
    }

    setLoading(true);
    setIsGenerating(true);
    setCancelled(false);
    setError(null);
    setMessage(`Generating ${batchLeadIds.length} resumes...`);
    setGenerationProgress({ current: 0, total: batchLeadIds.length });
    
    try {
      const result = await generateResumesFromLeadsAction({
        leadIds: batchLeadIds as any[],
        systemPromptId: selectedSystemPromptId ? (selectedSystemPromptId as any) : undefined,
        batchSize: 5,
      });
      
      if (cancelled) {
        return; // User cancelled, don't update UI
      }
      
      if (result.success) {
        setMessage(`Successfully generated ${result.successful} out of ${result.total} resumes${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setIsGenerating(false);
        setGenerationProgress(null);
        // Keep modal open for a moment to show success, then close
        setTimeout(() => {
          setShowAIGenerationModal(false);
          setBatchLeadIds([]);
          setSelectedSystemPromptId(null);
        }, 2000);
      } else {
        setError(`Failed to generate some resumes. ${result.successful} succeeded, ${result.failed} failed.`);
        setMessage(null);
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    } catch (error) {
      if (cancelled) {
        return; // User cancelled, don't update UI
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to generate resumes: ${errorMessage}`);
      setMessage(null);
      setIsGenerating(false);
      setGenerationProgress(null);
    } finally {
      setLoading(false);
      if (!cancelled) {
        setIsGenerating(false);
      }
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
            color="blue"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/60"
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
                  color="blue"
                  size="sm"
                  className="text-purple-300 hover:bg-purple-500/20"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        onClick={() => {
                          document.getElementById('json-upload')?.click();
                          setShowActionsTooltip(false);
                        }}
                        disabled={loading}
                        variant="primary"
                        color="blue"
                        icon={<Upload className="w-4 h-4" />}
                        className="w-full border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                      >
                        {loading ? 'Importing...' : 'Choose File'}
                      </TronButton>
                    </label>
                  </div>

                  {/* DOCX/PDF Import (Regex Parser) */}
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
                        onClick={() => {
                          document.getElementById('doc-upload')?.click();
                          setShowActionsTooltip(false);
                        }}
                        disabled={loading}
                        variant="primary"
                        color="blue"
                        icon={<Upload className="w-4 h-4" />}
                        className="w-full border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                      >
                        {loading ? 'Processing...' : 'Choose File'}
                      </TronButton>
                    </label>
                  </div>

                  {/* AI-Powered DOCX/PDF Import (Beta) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-tron-white">
                        AI Parser (Beta)
                        <span className="ml-1 text-xs text-purple-400">NEW</span>
                      </span>
                    </div>
                    <p className="text-xs text-tron-gray">
                      Upload a .docx or .pdf file - AI-powered parsing extracts experience and skills intelligently (Beta testing)
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".docx,.pdf"
                        onChange={handleAIDocumentImport}
                        disabled={loading}
                        className="hidden"
                        id="ai-doc-upload"
                      />
                      <TronButton
                        onClick={() => {
                          document.getElementById('ai-doc-upload')?.click();
                          setShowActionsTooltip(false);
                        }}
                        disabled={loading}
                        variant="primary"
                        color="blue"
                        icon={<Sparkles className="w-4 h-4 text-purple-300" />}
                        className="w-full border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                      >
                        {loading ? 'AI Processing...' : 'Choose File'}
                      </TronButton>
                    </label>
                  </div>
                </div>
              </div>

              {/* AI Resume Generation Section */}
              <div className="border-t border-tron-cyan/20 pt-4">
                <h4 className="text-lg font-semibold text-tron-white mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  AI Resume Generation
                </h4>
                <div className="space-y-3">
                  <p className="text-xs text-tron-gray">
                    Generate synthetic resumes tailored to lead data using GPT-5-mini
                  </p>
                  
                  {/* Active Jobs Indicator */}
                  {activeJobsQuery && activeJobsQuery.length > 0 && (
                    <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-300 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {activeJobsQuery.length} generation job(s) currently running
                        </span>
                      </div>
                      {activeJobsQuery.map((job) => (
                        <div key={job._id} className="mt-2 text-xs text-yellow-200">
                          {job.jobType === 'batch' ? 'Batch' : 'Single'} job: {job.progress?.current || 0} / {job.progress?.total || job.leadIds.length} resumes
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    <TronButton
                      onClick={() => {
                        setGenerationMode('single');
                        setShowAIGenerationModal(true);
                        setShowActionsTooltip(false);
                      }}
                      disabled={loading}
                      variant="primary"
                      color="blue"
                      icon={<Sparkles className="w-4 h-4 text-purple-300" />}
                      className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                    >
                      Generate from Lead
                    </TronButton>
                    
                    <TronButton
                      onClick={() => {
                        setGenerationMode('batch');
                        setShowAIGenerationModal(true);
                        setShowActionsTooltip(false);
                      }}
                      disabled={loading}
                      variant="primary"
                      color="blue"
                      icon={<Sparkles className="w-4 h-4 text-purple-300" />}
                      className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                    >
                      Batch Generate
                    </TronButton>
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
                    onClick={() => {
                      handleExportResumes();
                      setShowActionsTooltip(false);
                    }}
                    disabled={loading || resumes.length === 0}
                    variant="primary"
                    color="blue"
                    icon={<Download className="w-4 h-4" />}
                    className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                  >
                    Export Resumes
                  </TronButton>
                  
                  <TronButton
                    onClick={() => {
                      handleClearAIGeneratedResumes();
                      setShowActionsTooltip(false);
                    }}
                    disabled={loading}
                    variant="primary"
                    color="blue"
                    icon={<Trash2 className="w-4 h-4" />}
                    className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                  >
                    Clear AI Resumes
                  </TronButton>
                  
                  <TronButton
                    onClick={() => {
                      handleClearResumes();
                      setShowActionsTooltip(false);
                    }}
                    disabled={loading}
                    variant="primary"
                    color="blue"
                    icon={<Trash2 className="w-4 h-4" />}
                    className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                  >
                    Clear All Resumes
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

      {/* Loading State - Show spinner while query is loading */}
      {isLoadingResumes && (
        <TronPanel>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-tron-cyan mr-2" />
            <span className="text-tron-gray">Loading resumes...</span>
          </div>
        </TronPanel>
      )}

      {/* Empty State - Only show when query has loaded but no resumes */}
      {!isLoadingResumes && resumes.length === 0 && !loading && (
        <TronPanel>
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-tron-gray" />
            <h3 className="text-lg font-medium text-tron-white mb-2">No Resumes Yet</h3>
            <p className="text-tron-gray mb-4">Import your first resume using the upload cards above</p>
          </div>
        </TronPanel>
      )}

      {/* Loading State for manual operations */}
      {loading && !isLoadingResumes && resumes.length === 0 && (
        <TronPanel>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-tron-cyan mr-2" />
            <span className="text-tron-gray">Processing...</span>
          </div>
        </TronPanel>
      )}

      {/* AI Generation Modal */}
      {showAIGenerationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-tron-bg-panel border border-tron-cyan/30 rounded-lg shadow-tron-glow p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-tron-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" />
                {generationMode === 'single' ? 'Generate Resume from Lead' : 'Batch Generate Resumes'}
              </h3>
              <button
                onClick={() => {
                  if (isGenerating) {
                    handleCancelGeneration();
                  }
                  setShowAIGenerationModal(false);
                  setSelectedLeadId(null);
                  setBatchLeadIds([]);
                  setSelectedSystemPromptId(null);
                  setIsGenerating(false);
                  setGenerationProgress(null);
                  setCancelled(false);
                }}
                className="text-tron-gray hover:text-tron-white transition-colors"
                disabled={isGenerating && !cancelled}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Generation Progress */}
            {isGenerating && generationProgress && (
              <div className="mb-4 p-4 bg-tron-bg-elevated rounded-lg border border-tron-cyan/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-tron-white">
                    {cancelled ? 'Cancelling...' : 'Generating resumes...'}
                  </span>
                  <span className="text-sm text-tron-cyan">
                    {generationProgress.current} / {generationProgress.total}
                  </span>
                </div>
                <div className="w-full bg-tron-bg-panel rounded-full h-2">
                  <div
                    className="bg-tron-cyan h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                  />
                </div>
                {generationMode === 'batch' && (
                  <p className="text-xs text-tron-gray mt-2">
                    Processing in batches of 5. This may take a while...
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* System Prompt Selection */}
              <div>
                <label className="block text-sm font-medium text-tron-white mb-2">
                  System Prompt (Optional)
                </label>
                <select
                  value={selectedSystemPromptId || ''}
                  onChange={(e) => setSelectedSystemPromptId(e.target.value || null)}
                  className="tron-input w-full"
                  disabled={loading || isGenerating}
                >
                  <option value="">Use Default Prompt</option>
                  {systemPromptsQuery?.map((prompt) => (
                    <option key={prompt._id} value={prompt._id}>
                      {prompt.title} {prompt.isPrimarySystemPrompt ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead Selection */}
              {generationMode === 'single' ? (
                <div>
                  <label className="block text-sm font-medium text-tron-white mb-2">
                    Select Lead *
                  </label>
                  <select
                    value={selectedLeadId || ''}
                    onChange={(e) => setSelectedLeadId(e.target.value || null)}
                    className="tron-input w-full"
                    disabled={loading || isGenerating}
                  >
                    <option value="">-- Select a lead --</option>
                    {leadsQuery?.map((lead) => (
                      <option key={lead._id} value={lead._id}>
                        {lead.opportunityTitle} - {lead.location?.region || 'Unknown Region'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-tron-white">
                      Select Leads (Multiple) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (batchLeadIds.length === leadsQuery?.length) {
                          // Deselect all
                          setBatchLeadIds([]);
                        } else {
                          // Select all
                          setBatchLeadIds(leadsQuery?.map(lead => lead._id) || []);
                        }
                      }}
                      disabled={loading || isGenerating || !leadsQuery || leadsQuery.length === 0}
                      className="text-xs text-tron-cyan hover:text-tron-white transition-colors disabled:text-tron-gray disabled:cursor-not-allowed"
                    >
                      {batchLeadIds.length === leadsQuery?.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-tron-cyan/20 rounded p-2 space-y-2">
                    {leadsQuery?.map((lead) => (
                      <label key={lead._id} className="flex items-center gap-2 text-sm text-tron-white cursor-pointer hover:bg-tron-bg-elevated p-2 rounded">
                        <input
                          type="checkbox"
                          checked={batchLeadIds.includes(lead._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchLeadIds([...batchLeadIds, lead._id]);
                            } else {
                              setBatchLeadIds(batchLeadIds.filter(id => id !== lead._id));
                            }
                          }}
                          disabled={loading || isGenerating}
                          className="rounded"
                        />
                        <span>{lead.opportunityTitle} - {lead.location?.region || 'Unknown Region'}</span>
                      </label>
                    ))}
                  </div>
                  {batchLeadIds.length > 0 && (
                    <p className="text-xs text-tron-gray mt-2">
                      {batchLeadIds.length} lead(s) selected
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-tron-cyan/20">
                {!isGenerating ? (
                  <>
                    <TronButton
                      onClick={generationMode === 'single' ? handleGenerateResume : handleGenerateBatchResumes}
                      disabled={loading || (generationMode === 'single' ? !selectedLeadId : batchLeadIds.length === 0)}
                      variant="primary"
                      color="blue"
                      icon={<Sparkles className="w-4 h-4 text-purple-300" />}
                      className="border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/60"
                    >
                      Generate
                    </TronButton>
                    <TronButton
                      onClick={() => {
                        setShowAIGenerationModal(false);
                        setSelectedLeadId(null);
                        setBatchLeadIds([]);
                        setSelectedSystemPromptId(null);
                        setIsGenerating(false);
                        setGenerationProgress(null);
                        setCancelled(false);
                      }}
                      disabled={loading}
                      variant="outline"
                      color="cyan"
                    >
                      Cancel
                    </TronButton>
                  </>
                ) : (
                  <TronButton
                    onClick={handleCancelGeneration}
                    disabled={cancelled}
                    variant="primary"
                    color="blue"
                    icon={<X className="w-4 h-4" />}
                    className="border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:border-red-500/60"
                  >
                    {cancelled ? 'Cancelling...' : 'Cancel Generation'}
                  </TronButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeManager;
