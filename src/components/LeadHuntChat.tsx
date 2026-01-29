import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { SystemPromptSelect } from './SystemPromptSelect';
import { LeadReviewPanel } from './LeadReviewPanel';
import { ClickableJsonViewer } from './ClickableJsonViewer';
import { 
  Search, 
  Send, 
  Loader2, 
  History, 
  Trash2, 
  X,
  Clock,
  Play,
  Pause,
  Square,
  Settings,
  Plus,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Star,
  Save,
  Copy,
  RefreshCw,
  Sparkles,
  Filter,
  XCircle,
  CheckSquare2,
  Layers,
  MapPin,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LeadHuntChatProps {
  onLeadsFound?: (workflowId: Id<"leadHuntWorkflows">) => void;
}

interface SystemPrompt {
  _id: Id<"chatSystemPrompts">;
  systemPromptText: string;
  isPrimarySystemPrompt: boolean;
  title: string;
  description?: string;
  type: Id<"chatSystemPromptTypes">;
  createdAt: number;
  updatedAt: number;
}

// Component to display lead count for a prompt
function LeadCountBadge({ promptTitle, promptTypeId, promptTypes }: { promptTitle: string; promptTypeId: Id<"chatSystemPromptTypes">; promptTypes?: any[] }) {
  const extractStateFromTitle = (title: string): string | null => {
    if (!title) return null;
    const titleLower = title.toLowerCase();
    
    const stateMap: Record<string, string> = {
      "district of columbia": "District of Columbia",
      "new hampshire": "New Hampshire",
      "new jersey": "New Jersey",
      "new mexico": "New Mexico",
      "new york": "New York",
      "north carolina": "North Carolina",
      "north dakota": "North Dakota",
      "south carolina": "South Carolina",
      "south dakota": "South Dakota",
      "west virginia": "West Virginia",
      "rhode island": "Rhode Island",
      "alabama": "Alabama",
      "alaska": "Alaska",
      "arizona": "Arizona",
      "arkansas": "Arkansas",
      "california": "California",
      "colorado": "Colorado",
      "connecticut": "Connecticut",
      "delaware": "Delaware",
      "florida": "Florida",
      "georgia": "Georgia",
      "hawaii": "Hawaii",
      "idaho": "Idaho",
      "illinois": "Illinois",
      "indiana": "Indiana",
      "iowa": "Iowa",
      "kansas": "Kansas",
      "kentucky": "Kentucky",
      "louisiana": "Louisiana",
      "maine": "Maine",
      "maryland": "Maryland",
      "massachusetts": "Massachusetts",
      "michigan": "Michigan",
      "minnesota": "Minnesota",
      "mississippi": "Mississippi",
      "missouri": "Missouri",
      "montana": "Montana",
      "nebraska": "Nebraska",
      "nevada": "Nevada",
      "ohio": "Ohio",
      "oklahoma": "Oklahoma",
      "oregon": "Oregon",
      "pennsylvania": "Pennsylvania",
      "tennessee": "Tennessee",
      "texas": "Texas",
      "utah": "Utah",
      "vermont": "Vermont",
      "virginia": "Virginia",
      "washington": "Washington",
      "wisconsin": "Wisconsin",
      "wyoming": "Wyoming"
    };
    
    for (const [key, value] of Object.entries(stateMap)) {
      if (titleLower.includes(key)) {
        return value;
      }
    }
    return null;
  };
  
  const leadsType = promptTypes?.find(t => t.name === "leads");
  const isLeadsPrompt = leadsType && promptTypeId === leadsType._id;
  
  if (!isLeadsPrompt) return null;
  
  const stateName = extractStateFromTitle(promptTitle);
  
  // For default prompts (no state name), show total lead count
  // For state-specific prompts, show state lead count
  const leadCount = stateName
    ? useQuery(api.leads.getLeadCountByState, { stateName })
    : useQuery(api.leads.getLeadsCount, {});
  
  if (leadCount === undefined || leadCount === 0) return null;
  
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-neon-success/20 text-neon-success text-xs rounded-full flex-shrink-0 border border-neon-success/30">
      <span className="font-medium">{leadCount}</span>
      <span className="text-[10px]">leads</span>
    </span>
  );
}

// Component to display procurement link count for a prompt
function ProcurementLinkCountBadge({ promptTitle, promptTypeId, promptTypes }: { promptTitle: string; promptTypeId: Id<"chatSystemPromptTypes">; promptTypes?: any[] }) {
  const extractStateFromTitle = (title: string): string | null => {
    if (!title) return null;
    const titleLower = title.toLowerCase();
    
    const stateMap: Record<string, string> = {
      "district of columbia": "District of Columbia",
      "new hampshire": "New Hampshire",
      "new jersey": "New Jersey",
      "new mexico": "New Mexico",
      "new york": "New York",
      "north carolina": "North Carolina",
      "north dakota": "North Dakota",
      "south carolina": "South Carolina",
      "south dakota": "South Dakota",
      "west virginia": "West Virginia",
      "rhode island": "Rhode Island",
      "alabama": "Alabama",
      "alaska": "Alaska",
      "arizona": "Arizona",
      "arkansas": "Arkansas",
      "california": "California",
      "colorado": "Colorado",
      "connecticut": "Connecticut",
      "delaware": "Delaware",
      "florida": "Florida",
      "georgia": "Georgia",
      "hawaii": "Hawaii",
      "idaho": "Idaho",
      "illinois": "Illinois",
      "indiana": "Indiana",
      "iowa": "Iowa",
      "kansas": "Kansas",
      "kentucky": "Kentucky",
      "louisiana": "Louisiana",
      "maine": "Maine",
      "maryland": "Maryland",
      "massachusetts": "Massachusetts",
      "michigan": "Michigan",
      "minnesota": "Minnesota",
      "mississippi": "Mississippi",
      "missouri": "Missouri",
      "montana": "Montana",
      "nebraska": "Nebraska",
      "nevada": "Nevada",
      "ohio": "Ohio",
      "oklahoma": "Oklahoma",
      "oregon": "Oregon",
      "pennsylvania": "Pennsylvania",
      "tennessee": "Tennessee",
      "texas": "Texas",
      "utah": "Utah",
      "vermont": "Vermont",
      "virginia": "Virginia",
      "washington": "Washington",
      "wisconsin": "Wisconsin",
      "wyoming": "Wyoming"
    };
    
    for (const [key, value] of Object.entries(stateMap)) {
      if (titleLower.includes(key)) {
        return value;
      }
    }
    return null;
  };
  
  const stateName = extractStateFromTitle(promptTitle);
  
  // For default prompts (no state name), show total approved link count
  // For state-specific prompts, show state link count
  const linkCount = stateName
    ? useQuery(api.procurementUrls.getApprovedProcurementLinkCountByState, { stateName })
    : useQuery(api.procurementUrls.getTotalApprovedProcurementLinkCount, {});
  
  if (linkCount === undefined || linkCount === 0) return null;
  
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-tron-cyan/20 text-tron-cyan text-xs rounded-full flex-shrink-0 border border-tron-cyan/30">
      <span className="font-medium">{linkCount}</span>
      <span className="text-[10px]">links</span>
    </span>
  );
}

// Format timestamp for display
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Generate title from workflow
function generateWorkflowTitle(state: string, userInput: string): string {
  if (userInput && userInput.trim() && userInput !== `Find procurement leads in ${state}`) {
    // Use first 50 chars of user input
    const trimmed = userInput.trim().substring(0, 50);
    return trimmed.length < userInput.trim().length ? `${trimmed}...` : trimmed;
  }
  return `Find leads in ${state}`;
}

export function LeadHuntChat({ onLeadsFound }: LeadHuntChatProps = {}) {
  const { isSignedIn } = useAuth();
  
  const [userInput, setUserInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<Id<"leadHuntWorkflows"> | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<Id<"chatSystemPrompts"> | null | undefined>(undefined);
  const [isCanceling, setIsCanceling] = useState(false);
  const [displayedSystemPromptText, setDisplayedSystemPromptText] = useState<string>('');
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [editedSystemPromptText, setEditedSystemPromptText] = useState<string>('');
  const [isSystemPromptCollapsed, setIsSystemPromptCollapsed] = useState(true);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainChatAreaRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isStartingWorkflowRef = useRef(false);
  const hasAutoLoadedRef = useRef(false);
  const userClearedWorkflowRef = useRef(false);

  // System Prompt Management State
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [promptFormData, setPromptFormData] = useState({
    title: '',
    description: '',
    systemPromptText: '',
    isPrimarySystemPrompt: false,
    type: '' as Id<"chatSystemPromptTypes"> | '',
  });
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [promptSearchQuery, setPromptSearchQuery] = useState('');
  const [selectedPromptTypeFilter, setSelectedPromptTypeFilter] = useState<Id<"chatSystemPromptTypes"> | 'all' | 'primary'>('all');
  const [updateResults, setUpdateResults] = useState<{
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    results: Array<{
      promptId: Id<"chatSystemPrompts">;
      promptTitle: string;
      promptType: string;
      stateName: string | null;
      success: boolean;
      message: string;
      linkCount: number;
      errorType?: string;
      errorDetails?: string;
    }>;
  } | null>(null);
  const [showUpdateResults, setShowUpdateResults] = useState(false);
  const [refreshingLinks, setRefreshingLinks] = useState(false);
  const [updatingPromptId, setUpdatingPromptId] = useState<Id<"chatSystemPrompts"> | null>(null);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    currentState: string | null;
    completed: number;
    total: number;
    completedStates: string[];
    failedStates: Array<{ state: string; error: string }>;
    cancelled: boolean;
  } | null>(null);
  const cancellationRef = useRef(false);
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<Id<"chatSystemPrompts">>>(new Set());

  // Convex queries and mutations
  const workflows = useQuery(api.leadHuntWorkflows.list, {});
  const currentWorkflow = useQuery(
    api.leadHuntWorkflows.getWorkflow,
    currentWorkflowId ? { workflowId: currentWorkflowId } : "skip"
  );
  const createWorkflow = useMutation(api.leadHuntWorkflows.createWorkflow);
  const startWorkflow = useAction(api.leadHuntWorkflows.startWorkflow);
  const cancelWorkflow = useAction(api.leadHuntWorkflows.cancelWorkflow);
  const resumeWorkflow = useMutation(api.leadHuntWorkflows.resumeWorkflow);
  const triggerResumeEvent = useAction(api.leadHuntWorkflows.triggerResumeEvent);
  const deleteWorkflow = useMutation(api.leadHuntWorkflows.deleteWorkflow);

  // System prompts
  const systemPrompts = useQuery(api.chatSystemPrompts.list, {});
  const promptTypes = useQuery(api.chatSystemPromptTypes.list, {});
  const fullPromptWithLinks = useQuery(api.chatSystemPrompts.getFullPromptWithLinks, {});
  const createSystemPrompt = useMutation(api.chatSystemPrompts.create);
  const updateSystemPrompt = useMutation(api.chatSystemPrompts.update);
  const deleteSystemPrompt = useMutation(api.chatSystemPrompts.remove);
  const setPromptAsPrimary = useMutation(api.chatSystemPrompts.setPrimary);
  const initializeDefaultPrompt = useMutation(api.chatSystemPrompts.initializeDefault);
  const updatePrimaryWithApprovedLinks = useMutation(api.chatSystemPrompts.updatePrimaryWithApprovedLinks);
  const updatePromptWithStateLinks = useMutation(api.chatSystemPrompts.updatePromptWithStateLinks);
  const updatePromptWithLeadSourceLinks = useMutation(api.chatSystemPrompts.updatePromptWithLeadSourceLinks);
  // @ts-ignore - Type instantiation is excessively deep due to Convex type inference, but the query works correctly at runtime
  const updateAllPromptsWithStateData = useMutation(api.chatSystemPrompts.updateAllPromptsWithStateData);
  const removeDuplicateSystemPrompts = useMutation(api.chatSystemPrompts.removeDuplicateSystemPrompts);
  
  // State System Prompt Generator queries and actions
  const statesWithPrompts = useQuery(api.chatSystemPrompts.getStatesWithPrompts, {});
  const missingStates = useQuery(api.chatSystemPrompts.getMissingStates, {});
  const generateStatePrompt = useAction(api.chatSystemPrompts.generateStatePrompt);

  // Filter to only "leads" type prompts
  const leadsTypeId = useMemo(() => {
    return promptTypes?.find(t => t.name === "leads")?._id;
  }, [promptTypes]);

  // Get primary prompt (must be after leadsTypeId is defined)
  const primaryPrompt = useQuery(
    api.chatSystemPrompts.getPrimary,
    leadsTypeId ? { typeId: leadsTypeId } : "skip"
  );

  const leadsPrompts = useMemo(() => {
    if (!systemPrompts || !leadsTypeId) return undefined;
    return systemPrompts.filter(p => p.type === leadsTypeId);
  }, [systemPrompts, leadsTypeId]);

  // Update displayed system prompt text when selection changes
  useEffect(() => {
    if (!currentWorkflowId) {
      if (selectedSystemPromptId === undefined) {
        // Use primary prompt
        if (primaryPrompt) {
          setDisplayedSystemPromptText(primaryPrompt.systemPromptText);
          setEditedSystemPromptText(primaryPrompt.systemPromptText);
        } else {
          setDisplayedSystemPromptText('');
          setEditedSystemPromptText('');
        }
      } else if (selectedSystemPromptId === null) {
        // No prompt selected
        setDisplayedSystemPromptText('');
        setEditedSystemPromptText('');
      } else {
        // Use selected prompt
        const selectedPrompt = leadsPrompts?.find(p => p._id === selectedSystemPromptId);
        if (selectedPrompt) {
          setDisplayedSystemPromptText(selectedPrompt.systemPromptText);
          setEditedSystemPromptText(selectedPrompt.systemPromptText);
        } else {
          setDisplayedSystemPromptText('');
          setEditedSystemPromptText('');
        }
      }
      setIsEditingSystemPrompt(false);
    }
  }, [selectedSystemPromptId, primaryPrompt, leadsPrompts, currentWorkflowId]);

  // Auto-scroll to bottom when workflow updates or system prompt is displayed/edited
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentWorkflow, displayedSystemPromptText, isEditingSystemPrompt]);

  // Match sidebar height to main chat area height on desktop
  useEffect(() => {
    if (!showHistory || !mainChatAreaRef.current || !sidebarRef.current) return;
    
    const updateSidebarHeight = () => {
      if (window.innerWidth >= 1024) {
        const mainChatHeight = mainChatAreaRef.current?.offsetHeight;
        if (mainChatHeight && sidebarRef.current) {
          sidebarRef.current.style.height = `${mainChatHeight}px`;
          sidebarRef.current.style.maxHeight = `${mainChatHeight}px`;
        }
      } else {
        if (sidebarRef.current) {
          sidebarRef.current.style.height = '100vh';
          sidebarRef.current.style.maxHeight = '100vh';
        }
      }
    };

    updateSidebarHeight();
    window.addEventListener('resize', updateSidebarHeight);
    
    const resizeObserver = new ResizeObserver(updateSidebarHeight);
    if (mainChatAreaRef.current) {
      resizeObserver.observe(mainChatAreaRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateSidebarHeight);
      resizeObserver.disconnect();
    };
  }, [showHistory, currentWorkflow]);

  // Auto-load most recent active workflow ONLY on initial mount
  // Don't auto-load if user has explicitly cleared currentWorkflowId or is starting a new workflow
  useEffect(() => {
    // Don't auto-load if:
    // 1. We've already auto-loaded once
    // 2. User is starting a new workflow
    // 3. User explicitly cleared the workflow (clicked "New Hunt")
    if (hasAutoLoadedRef.current || isStartingWorkflowRef.current || userClearedWorkflowRef.current) {
      return;
    }
    // Only auto-load if there's no current workflow AND we haven't auto-loaded yet
    if (!currentWorkflowId && workflows && workflows.length > 0) {
      const active = workflows.filter(w => w.status === "running" || w.status === "paused");
      if (active.length > 0) {
        const mostRecent = active.sort((a, b) => b.createdAt - a.createdAt)[0];
        setCurrentWorkflowId(mostRecent._id);
        setSelectedSystemPromptId(mostRecent.systemPromptId || undefined);
        setUserInput(mostRecent.userInput);
        hasAutoLoadedRef.current = true;
      }
    }
  }, [currentWorkflowId, workflows]);

  const handleNewHunt = () => {
    setCurrentWorkflowId(null);
    setUserInput('');
    setSelectedSystemPromptId(undefined);
    setError(null);
    // Mark that user explicitly cleared the workflow to prevent auto-load
    userClearedWorkflowRef.current = true;
  };

  const handleOpenPromptSettings = async () => {
    setShowPromptSettings(true);
    // Reset filters when opening
    setPromptSearchQuery('');
    setSelectedPromptTypeFilter('all');
    // Initialize default prompt if none exists
    if (systemPrompts && systemPrompts.length === 0) {
      try {
        await initializeDefaultPrompt({});
      } catch (err) {
        console.error("Failed to initialize default prompt:", err);
      }
    }
  };

  const handleStartCreatePrompt = () => {
    setIsCreatingPrompt(true);
    setEditingPrompt(null);
    const defaultType = promptTypes?.find(t => t.isDefault) || promptTypes?.[0];
    setPromptFormData({
      title: '',
      description: '',
      systemPromptText: '',
      isPrimarySystemPrompt: false,
      type: defaultType?._id || '',
    });
  };

  const handleStartEditPrompt = (prompt: SystemPrompt) => {
    setIsCreatingPrompt(false);
    setEditingPrompt(prompt);
    setPromptFormData({
      title: prompt.title,
      description: prompt.description || '',
      systemPromptText: prompt.systemPromptText,
      isPrimarySystemPrompt: prompt.isPrimarySystemPrompt,
      type: prompt.type,
    });
  };

  const handleCancelPromptForm = () => {
    setIsCreatingPrompt(false);
    setEditingPrompt(null);
    const defaultType = promptTypes?.find(t => t.isDefault) || promptTypes?.[0];
    setPromptFormData({
      title: '',
      description: '',
      systemPromptText: '',
      isPrimarySystemPrompt: false,
      type: defaultType?._id || '',
    });
    setModalMessage(null);
  };

  const handleCopyFullPrompt = async () => {
    if (!fullPromptWithLinks) {
      setError("System prompt with links is not available yet. Please wait a moment.");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(fullPromptWithLinks);
      setModalMessage({
        type: 'success',
        text: 'Full system prompt (with all approved links) copied to clipboard!'
      });
      setTimeout(() => setModalMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleCopyPrompt = async (promptText: string, promptTitle: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setModalMessage({
        type: 'success',
        text: `System prompt "${promptTitle}" copied to clipboard!`
      });
      setTimeout(() => setModalMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setModalMessage({
        type: 'error',
        text: 'Failed to copy to clipboard. Please try again.'
      });
      setTimeout(() => setModalMessage(null), 3000);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptFormData.title.trim() || !promptFormData.systemPromptText.trim() || !promptFormData.type) {
      setError("Title, System Prompt Text, and Type are required");
      return;
    }

    setSavingPrompt(true);
    try {
      if (editingPrompt) {
        await updateSystemPrompt({
          id: editingPrompt._id,
          title: promptFormData.title,
          description: promptFormData.description || undefined,
          systemPromptText: promptFormData.systemPromptText,
          isPrimarySystemPrompt: promptFormData.isPrimarySystemPrompt,
          type: promptFormData.type as Id<"chatSystemPromptTypes">,
        });
      } else {
        await createSystemPrompt({
          title: promptFormData.title,
          description: promptFormData.description || undefined,
          systemPromptText: promptFormData.systemPromptText,
          isPrimarySystemPrompt: promptFormData.isPrimarySystemPrompt,
          type: promptFormData.type as Id<"chatSystemPromptTypes">,
        });
      }
      handleCancelPromptForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: Id<"chatSystemPrompts">) => {
    try {
      await deleteSystemPrompt({ id });
      setSelectedPromptIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const handleTogglePromptSelection = (id: Id<"chatSystemPrompts">) => {
    setSelectedPromptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPrompts = () => {
    if (!filteredSystemPrompts) return;
    const allIds = new Set(filteredSystemPrompts.map(p => p._id));
    setSelectedPromptIds(allIds);
  };

  const handleDeselectAllPrompts = () => {
    setSelectedPromptIds(new Set());
  };

  const handleBatchDeletePrompts = async () => {
    if (selectedPromptIds.size === 0) return;
    
    const idsToDelete = Array.from(selectedPromptIds);
    const deletingCount = idsToDelete.length;
    
    try {
      for (const id of idsToDelete) {
        await deleteSystemPrompt({ id });
      }
      
      setSelectedPromptIds(new Set());
      
      setModalMessage({
        type: 'success',
        text: `Successfully deleted ${deletingCount} prompt${deletingCount > 1 ? 's' : ''}.`
      });
      setTimeout(() => setModalMessage(null), 3000);
    } catch (err) {
      setModalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete prompts'
      });
      setTimeout(() => setModalMessage(null), 5000);
    }
  };

  const handleSetPrimary = async (id: Id<"chatSystemPrompts">) => {
    try {
      await setPromptAsPrimary({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary prompt');
    }
  };

  const handleRemoveDuplicates = async () => {
    try {
      setModalMessage({
        type: 'success',
        text: 'Removing duplicate system prompts...'
      });
      
      const result = await removeDuplicateSystemPrompts({});
      
      if (result.promptsDeleted > 0) {
        setModalMessage({
          type: 'success',
          text: `Successfully removed ${result.promptsDeleted} duplicate prompt${result.promptsDeleted > 1 ? 's' : ''} from ${result.groupsFound} group${result.groupsFound > 1 ? 's' : ''}.`
        });
      } else {
        setModalMessage({
          type: 'success',
          text: 'No duplicate prompts found.'
        });
      }
      
      setTimeout(() => setModalMessage(null), 5000);
    } catch (err) {
      setModalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to remove duplicates'
      });
      setTimeout(() => setModalMessage(null), 5000);
    }
  };

  const handleRefreshApprovedLinks = async () => {
    setRefreshingLinks(true);
    setModalMessage(null);
    setUpdateResults(null);
    try {
      const result = await updateAllPromptsWithStateData({});
      setUpdateResults({
        totalProcessed: result.totalProcessed,
        totalSucceeded: result.totalSucceeded,
        totalFailed: result.totalFailed,
        results: result.results,
      });
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const failedCount = result.results.filter(r => !r.success).length;
        setModalMessage({
          type: failedCount > 0 ? 'error' : 'success',
          text: `Updated ${successCount} prompts successfully${failedCount > 0 ? `, ${failedCount} failed. Click to view details.` : ''}. ${result.message}`
        });
        if (failedCount > 0) {
          setShowUpdateResults(true);
        }
        setTimeout(() => setModalMessage(null), failedCount > 0 ? 12000 : 8000);
      } else {
        setModalMessage({
          type: 'error',
          text: result.message
        });
        setShowUpdateResults(true);
        setTimeout(() => setModalMessage(null), 12000);
      }
    } catch (err) {
      setModalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update prompts with state data'
      });
      setTimeout(() => setModalMessage(null), 5000);
    } finally {
      setRefreshingLinks(false);
    }
  };

  const handleGenerateAllMissingStatePrompts = async () => {
    if (generatingPrompts || !missingStates || missingStates.length === 0) {
      return;
    }

    cancellationRef.current = false;
    
    setGeneratingPrompts(true);
    setGenerationProgress({
      currentState: null,
      completed: 0,
      total: missingStates.length,
      completedStates: [],
      failedStates: [],
      cancelled: false,
    });

    try {
      const leadsType = promptTypes?.find(t => t.name === "leads");
      if (!leadsType) {
        setModalMessage({
          type: 'error',
          text: 'Leads prompt type not found. Please create it first.'
        });
        setGeneratingPrompts(false);
        setGenerationProgress(null);
        return;
      }

      const completedStates: string[] = [];
      const failedStates: Array<{ state: string; error: string }> = [];

      for (let i = 0; i < missingStates.length; i++) {
        if (cancellationRef.current) {
          setGenerationProgress(prev => prev ? {
            ...prev,
            cancelled: true,
            currentState: null,
          } : null);
          break;
        }

        const state = missingStates[i];
        
        setGenerationProgress(prev => prev ? {
          ...prev,
          currentState: state,
        } : null);

        try {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          if (cancellationRef.current) {
            setGenerationProgress(prev => prev ? {
              ...prev,
              cancelled: true,
              currentState: null,
            } : null);
            break;
          }

          const result = await generateStatePrompt({
            stateName: state,
            promptTypeId: leadsType._id,
          });

          if (result.success) {
            completedStates.push(state);
            setGenerationProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              completedStates: [...prev.completedStates, state],
            } : null);
          } else {
            failedStates.push({ state, error: result.error || 'Unknown error' });
            setGenerationProgress(prev => prev ? {
              ...prev,
              completed: prev.completed + 1,
              failedStates: [...prev.failedStates, { state, error: result.error || 'Unknown error' }],
            } : null);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          failedStates.push({ state, error: errorMsg });
          setGenerationProgress(prev => prev ? {
            ...prev,
            completed: prev.completed + 1,
            failedStates: [...prev.failedStates, { state, error: errorMsg }],
          } : null);
        }
      }

      setGeneratingPrompts(false);
      
      if (completedStates.length > 0 || failedStates.length > 0) {
        setModalMessage({
          type: failedStates.length > 0 ? 'error' : 'success',
          text: `Generated ${completedStates.length} prompt${completedStates.length !== 1 ? 's' : ''} successfully${failedStates.length > 0 ? `, ${failedStates.length} failed` : ''}.`
        });
        setTimeout(() => setModalMessage(null), 8000);
      }
    } catch (err) {
      setModalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to generate prompts'
      });
      setTimeout(() => setModalMessage(null), 5000);
    } finally {
      setGeneratingPrompts(false);
      if (!cancellationRef.current) {
        setGenerationProgress(null);
      }
    }
  };

  const handleUpdatePromptWithLeadSourceLinks = async (promptId: Id<"chatSystemPrompts">, isAutoInjection: boolean = false) => {
    setUpdatingPromptId(promptId);
    try {
      const prompt = systemPrompts?.find(p => p._id === promptId);
      if (!prompt) {
        throw new Error('Prompt not found');
      }

      await updatePromptWithLeadSourceLinks({
        promptId,
      });
    } catch (err) {
      console.error('Error updating prompt with lead source links:', err);
    } finally {
      setUpdatingPromptId(null);
    }
  };

  const handleUpdatePromptWithStateLinks = async (promptId: Id<"chatSystemPrompts">, isAutoInjection: boolean = false) => {
    setUpdatingPromptId(promptId);
    try {
      const prompt = systemPrompts?.find(p => p._id === promptId);
      if (!prompt) {
        throw new Error('Prompt not found');
      }

      await updatePromptWithStateLinks({
        promptId,
      });
    } catch (err) {
      console.error('Error updating prompt with state links:', err);
    } finally {
      setUpdatingPromptId(null);
    }
  };

  const handleCancelGeneration = () => {
    cancellationRef.current = true;
    setGeneratingPrompts(false);
  };

  const filteredSystemPrompts = useMemo((): SystemPrompt[] | undefined => {
    if (!systemPrompts) return undefined;
    
    let filtered: SystemPrompt[] = [...systemPrompts];
    
    if (selectedPromptTypeFilter === 'primary') {
      filtered = filtered.filter(p => p.isPrimarySystemPrompt);
    } else if (selectedPromptTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === selectedPromptTypeFilter);
    }
    
    if (promptSearchQuery.trim()) {
      const query = promptSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((prompt: SystemPrompt) => {
        const titleMatch = prompt.title.toLowerCase().includes(query);
        const descriptionMatch = prompt.description?.toLowerCase().includes(query) ?? false;
        const textMatch = prompt.systemPromptText.toLowerCase().includes(query);
        const typeMatch = promptTypes?.find(t => t._id === prompt.type)?.displayName.toLowerCase().includes(query) ?? false;
        return titleMatch || descriptionMatch || textMatch || typeMatch;
      });
    }
    
    return filtered;
  }, [systemPrompts, promptSearchQuery, selectedPromptTypeFilter, promptTypes]);

  const handleSelectWorkflow = (workflowId: Id<"leadHuntWorkflows">) => {
    setCurrentWorkflowId(workflowId);
    const workflow = workflows?.find(w => w._id === workflowId);
    if (workflow) {
      setSelectedSystemPromptId(workflow.systemPromptId || undefined);
      setUserInput(workflow.userInput);
    }
    // Reset the user cleared flag since user is explicitly selecting a workflow
    userClearedWorkflowRef.current = false;
  };

  const handleDeleteWorkflow = async (workflowId: Id<"leadHuntWorkflows">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this hunt?')) return;
    
    try {
      await deleteWorkflow({ workflowId });
      if (currentWorkflowId === workflowId) {
        handleNewHunt();
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert(`Failed to delete hunt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStart = async () => {
    if (selectedSystemPromptId === null) {
      alert('Please select a state lead system prompt');
      return;
    }

    // Extract state from prompt title if a specific prompt is selected
    let stateName = 'Primary';
    if (selectedSystemPromptId) {
      const selectedPrompt = leadsPrompts?.find(p => p._id === selectedSystemPromptId);
      if (selectedPrompt) {
        const titleParts = selectedPrompt.title.split(/[\s-–—]/);
        stateName = titleParts[0] || selectedPrompt.title || 'Selected State';
      }
    } else if (selectedSystemPromptId === undefined) {
      stateName = 'Primary';
    }

    setError(null);
    isStartingWorkflowRef.current = true;
    // Clear the user cleared flag since we're starting a new workflow
    userClearedWorkflowRef.current = false;
    startTransition(async () => {
      try {
        const newWorkflowId = await createWorkflow({
          state: stateName,
          userInput: userInput.trim() || `Find procurement leads in ${stateName}`,
          systemPromptId: selectedSystemPromptId || undefined,
        });

        setCurrentWorkflowId(newWorkflowId);

        // Start the workflow
        await startWorkflow({ workflowId: newWorkflowId });
        
        // Reset the flag once the workflow is started
        // The workflows query will update automatically
        isStartingWorkflowRef.current = false;
        
        // Notify parent if callback provided
        if (onLeadsFound) {
          onLeadsFound(newWorkflowId);
        }
      } catch (error) {
        console.error('Error starting workflow:', error);
        setError(`Failed to start hunt: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Reset the flag on error so auto-load can work again
        isStartingWorkflowRef.current = false;
      }
    });
  };

  const handleCancel = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!currentWorkflowId || isCanceling) {
      return;
    }

    setIsCanceling(true);
    
    try {
      await cancelWorkflow({ workflowId: currentWorkflowId });
    } catch (error) {
      console.error('Error canceling workflow:', error);
      alert(`Failed to cancel hunt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleResume = async () => {
    if (!currentWorkflowId) return;

    try {
      await resumeWorkflow({ workflowId: currentWorkflowId });
      await triggerResumeEvent({ workflowId: currentWorkflowId });
    } catch (error) {
      console.error('Error resuming workflow:', error);
      alert(`Failed to resume hunt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-tron-cyan';
      case 'paused':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'canceled':
        return 'text-gray-400';
      default:
        return 'text-tron-gray';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gray-500',
      running: 'bg-tron-cyan',
      paused: 'bg-yellow-500',
      completed: 'bg-green-500',
      canceled: 'bg-gray-500',
      failed: 'bg-red-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-gray-500'}`}>
        {status.toUpperCase()}
      </span>
    );
  };


  return (
    <div className="flex h-full relative">
      {/* Mobile History Overlay */}
      {showHistory && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[35]"
          onClick={() => setShowHistory(false)}
          style={{ pointerEvents: 'auto' }}
        />
      )}

      {/* History Sidebar */}
      <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 relative flex flex-col`}>
        <div 
          ref={sidebarRef}
          className={`bg-tron-bg-card border-r border-tron-cyan/20 flex flex-col w-64 ${
            showHistory ? 'fixed lg:relative inset-y-0 left-0 z-[40] lg:z-auto' : 'lg:block hidden'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-tron-cyan/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-tron-cyan">
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">Hunt History</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="lg:hidden p-1 text-tron-gray hover:text-tron-white transition-colors"
                aria-label="Close history"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TronButton
              onClick={handleNewHunt}
              variant="outline"
              color="cyan"
              size="sm"
              icon={<Plus className="w-3 h-3" />}
              className="w-full"
            >
              New Hunt
            </TronButton>
            {isSignedIn && (
              <TronButton
                onClick={handleOpenPromptSettings}
                variant="outline"
                color="cyan"
                size="sm"
                icon={<Settings className="w-3 h-3" />}
                className="w-full mt-2"
              >
                System Prompts
              </TronButton>
            )}
          </div>
          
          {/* Workflow List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {workflows === undefined ? (
              <div className="flex items-center justify-center py-4 text-tron-gray">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center text-tron-gray text-xs py-4">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No hunt history yet</p>
              </div>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow._id}
                  onClick={() => handleSelectWorkflow(workflow._id)}
                  className={`group p-2 rounded-lg cursor-pointer transition-colors ${
                    currentWorkflowId === workflow._id
                      ? 'bg-tron-cyan/20 border border-tron-cyan/40'
                      : 'hover:bg-tron-bg-deep border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-tron-white truncate font-medium">
                        {generateWorkflowTitle(workflow.state, workflow.userInput)}
                      </p>
                      <div className="flex items-center gap-1 text-tron-gray text-[10px] mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(workflow.updatedAt || workflow.createdAt)}
                      </div>
                      {workflow.leadsFound > 0 && (
                        <div className="flex items-center gap-1 text-tron-cyan text-[10px] mt-1">
                          <CheckCircle className="w-3 h-3" />
                          {workflow.leadsFound} lead{workflow.leadsFound !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteWorkflow(workflow._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neon-error/20 rounded transition-all"
                      title="Delete hunt"
                    >
                      <Trash2 className="w-3 h-3 text-neon-error" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div ref={mainChatAreaRef} className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10" style={{ flexShrink: 1 }}>
        <TronPanel 
          title="Lead Hunt Assistant" 
          icon={<Search className="w-5 h-5" />}
          glowColor="cyan"
          className="flex-1 flex flex-col overflow-hidden flex-shrink min-h-0"
          headerAction={
            <div className="flex items-center gap-2 sm:gap-3">
              {/* History Toggle Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 relative z-50 ${
                  showHistory 
                    ? 'text-tron-cyan bg-tron-cyan/20' 
                    : 'text-tron-gray hover:text-tron-white hover:bg-tron-cyan/10'
                }`}
                aria-label={showHistory ? "Close hunt history" : "Open hunt history"}
                title={showHistory ? "Close hunt history" : "Open hunt history"}
              >
                <History className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* System Prompt Selector */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <span className="text-xs text-tron-gray group-hover:text-tron-white transition-colors hidden sm:inline">
                  System Prompt
                </span>
                <SystemPromptSelect
                  value={selectedSystemPromptId}
                  onChange={setSelectedSystemPromptId}
                  systemPrompts={leadsPrompts}
                  promptTypes={promptTypes}
                  disabled={leadsPrompts === undefined}
                />
              </div>
            </div>
          }
        >
          {/* Messages/Workflow Status */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-4 px-2 sm:px-0" style={{ flexShrink: 1 }}>
            {!currentWorkflowId && (
              <>
                {/* System Prompt Display */}
                {displayedSystemPromptText && (
                  <div className="flex justify-end">
                    <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-lg p-3 sm:p-4 bg-tron-cyan/20 border border-tron-cyan/30 text-tron-white overflow-hidden">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-tron-cyan/80">System Prompt</span>
                      </div>
                      {isEditingSystemPrompt ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedSystemPromptText}
                            onChange={(e) => setEditedSystemPromptText(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 bg-tron-bg-deep border border-tron-cyan/30 rounded text-tron-white text-sm focus:outline-none focus:border-tron-cyan resize-none"
                            placeholder="System prompt text..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setDisplayedSystemPromptText(editedSystemPromptText);
                                setIsEditingSystemPrompt(false);
                              }}
                              className="px-3 py-1.5 bg-tron-cyan/20 hover:bg-tron-cyan/30 border border-tron-cyan/30 rounded text-tron-cyan text-xs font-medium transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditedSystemPromptText(displayedSystemPromptText);
                                setIsEditingSystemPrompt(false);
                              }}
                              className="px-3 py-1.5 bg-tron-bg-panel hover:bg-tron-bg-deep border border-tron-cyan/20 rounded text-tron-gray text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-xs text-tron-gray/80 mt-1">
                            Note: The workflow will use the original prompt from the database. To use this edited version, update the prompt in System Prompt Settings first.
                          </p>
                        </div>
                      ) : (
                        <>
                          {!isSystemPromptCollapsed && (
                            <p className="text-sm whitespace-pre-wrap mb-2">{displayedSystemPromptText}</p>
                          )}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-tron-cyan/20">
                            <button
                              onClick={() => setIsSystemPromptCollapsed(!isSystemPromptCollapsed)}
                              className="px-2 py-1 text-xs text-tron-cyan hover:bg-tron-cyan/20 rounded transition-colors flex items-center gap-1"
                              title={isSystemPromptCollapsed ? "Expand system prompt" : "Collapse system prompt"}
                            >
                              {isSystemPromptCollapsed ? (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>Expand</span>
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  <span>Collapse</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setIsEditingSystemPrompt(true)}
                              className="px-2 py-1 text-xs text-tron-cyan hover:bg-tron-cyan/20 rounded transition-colors flex items-center gap-1"
                              title="Edit system prompt"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!displayedSystemPromptText && (
                  <div className="text-center text-tron-gray py-8 sm:py-12">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">Start a conversation to find procurement leads!</p>
                    <p className="text-xs sm:text-sm mt-2">Try: "Find procurement leads for Florida focusing on IT services"</p>
                    <TronButton
                      onClick={handleNewHunt}
                      variant="primary"
                      color="cyan"
                      size="sm"
                      icon={<Plus className="w-4 h-4" />}
                      className="mt-4"
                    >
                      Start New Hunt
                    </TronButton>
                  </div>
                )}
              </>
            )}

            {currentWorkflow && (
              <>
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-lg p-3 sm:p-4 bg-tron-cyan/20 border border-tron-cyan/30 text-tron-white overflow-hidden">
                    <p className="text-sm whitespace-pre-wrap">{currentWorkflow.userInput}</p>
                  </div>
                </div>

                {/* Workflow Status */}
                <div className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-lg p-3 sm:p-4 bg-tron-bg-card border border-tron-cyan/10 text-tron-white overflow-hidden">
                    <div className="space-y-3">
                      {/* Status Badge */}
                      <div className="flex items-center gap-3">
                        {getStatusBadge(currentWorkflow.status)}
                        <span className={`text-sm font-medium ${getStatusColor(currentWorkflow.status)}`}>
                          {currentWorkflow.currentTask || 'Idle'}
                        </span>
                      </div>

                      {/* Progress */}
                      {currentWorkflow.currentStep && currentWorkflow.totalSteps && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-tron-gray">
                            <span>Step {currentWorkflow.currentStep} of {currentWorkflow.totalSteps}</span>
                          </div>
                          <div className="w-full bg-tron-bg-panel rounded-full h-2">
                            <div
                              className="bg-tron-cyan h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(currentWorkflow.currentStep / currentWorkflow.totalSteps) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Leads Found */}
                      {currentWorkflow.leadsFound > 0 && (
                        <div className="text-sm text-tron-gray">
                          Found {currentWorkflow.leadsFound} lead{currentWorkflow.leadsFound !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Raw AI Response */}
                      {currentWorkflow.rawAiResponse && (
                        <div className="mt-4 pt-4 border-t border-tron-cyan/10">
                          <h4 className="text-xs font-semibold text-tron-gray mb-2">Raw AI Response</h4>
                          <div className="bg-tron-bg-deep border border-tron-cyan/10 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <ClickableJsonViewer content={currentWorkflow.rawAiResponse} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lead Review Panel */}
                {currentWorkflow.status === 'paused' && currentWorkflow.leadsFound > 0 && (
                  <div className="mt-4">
                    <LeadReviewPanel workflowId={currentWorkflowId!} workflowLeadsFound={currentWorkflow.leadsFound} />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] rounded-lg p-3 sm:p-4 bg-neon-error/10 border border-neon-error/30 text-tron-white">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-neon-error" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-tron-cyan/20 pt-4">
            {!currentWorkflowId ? (
              <div className="space-y-4">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about procurement leads: e.g., 'Find procurement leads for Florida focusing on IT services'"
                  rows={3}
                  className="w-full px-4 py-2 bg-tron-bg-card border border-tron-cyan/30 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:border-tron-cyan resize-none overflow-hidden"
                />
                <TronButton
                  onClick={handleStart}
                  disabled={selectedSystemPromptId === null || leadsPrompts === undefined || isPending}
                  variant="primary"
                  color="cyan"
                  size="sm"
                  icon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  className="w-full"
                >
                  {isPending ? 'Starting Hunt...' : 'Start Hunt'}
                </TronButton>
              </div>
            ) : currentWorkflow && (
              <div className="flex items-center gap-3">
                {currentWorkflow.status === 'paused' && (
                  <TronButton
                    onClick={handleResume}
                    variant="primary"
                    color="cyan"
                    size="sm"
                    icon={<Play className="w-4 h-4" />}
                  >
                    Resume
                  </TronButton>
                )}
                {(currentWorkflow.status === 'running' || currentWorkflow.status === 'paused') && (
                  <>
                    <TronButton
                      onClick={handleCancel}
                      disabled={isCanceling}
                      variant="outline"
                      color="orange"
                      size="sm"
                      icon={isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    >
                      {isCanceling ? 'Canceling...' : 'Cancel'}
                    </TronButton>
                    <TronButton
                      onClick={handleNewHunt}
                      variant="outline"
                      color="cyan"
                      size="sm"
                    >
                      New Hunt
                    </TronButton>
                  </>
                )}
                {(currentWorkflow.status === 'completed' || currentWorkflow.status === 'failed' || currentWorkflow.status === 'canceled') && (
                  <TronButton
                    onClick={handleNewHunt}
                    variant="primary"
                    color="cyan"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    New Hunt
                  </TronButton>
                )}
              </div>
            )}
          </div>
        </TronPanel>
      </div>

      {/* System Prompt Settings Modal */}
      {showPromptSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tron-bg-card border border-tron-cyan/30 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-tron-cyan/20">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-tron-cyan" />
                <h2 className="text-lg font-semibold text-tron-white">System Prompt Management</h2>
              </div>
              <button
                onClick={() => {
                  setShowPromptSettings(false);
                  handleCancelPromptForm();
                  setModalMessage(null);
                  setPromptSearchQuery('');
                  setSelectedPromptTypeFilter('all');
                  setSelectedPromptIds(new Set());
                }}
                className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-tron-gray" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Modal Message */}
              {modalMessage && (
                <div className={`mb-4 p-3 border rounded-lg ${
                  modalMessage.type === 'success'
                    ? 'bg-neon-success/20 border-neon-success'
                    : 'bg-neon-error/20 border-neon-error'
                }`}>
                  <div className="flex items-start gap-2">
                    {modalMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-neon-success mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-neon-error mt-0.5 flex-shrink-0" />
                    )}
                    <p className={`text-xs ${
                      modalMessage.type === 'success'
                        ? 'text-neon-success'
                        : 'text-neon-error'
                    }`}>{modalMessage.text}</p>
                    {updateResults && updateResults.totalFailed > 0 && (
                      <button
                        onClick={() => setShowUpdateResults(!showUpdateResults)}
                        className="ml-2 text-xs underline text-tron-cyan hover:text-tron-cyan/80"
                      >
                        {showUpdateResults ? 'Hide' : 'Show'} details ({updateResults.totalFailed} failures)
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Update Results Modal */}
              {showUpdateResults && updateResults && updateResults.totalFailed > 0 && (
                <div className="mt-4 bg-tron-bg-deep border border-tron-cyan/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-tron-cyan">
                      Update Results - {updateResults.totalFailed} Failed
                    </h3>
                    <button
                      onClick={() => setShowUpdateResults(false)}
                      className="text-tron-gray hover:text-tron-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {updateResults.results
                      .filter(r => !r.success)
                      .map((result, idx) => (
                        <div
                          key={idx}
                          className="bg-tron-bg-card border border-neon-error/30 rounded p-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-tron-white truncate">
                                {result.promptTitle}
                              </div>
                              <div className="text-tron-gray text-[10px] mt-0.5">
                                Type: {result.promptType} | State: {result.stateName || 'N/A'}
                              </div>
                            </div>
                            {result.errorType && (
                              <span className="px-2 py-0.5 bg-neon-error/20 text-neon-error text-[10px] rounded flex-shrink-0">
                                {result.errorType}
                              </span>
                            )}
                          </div>
                          <div className="text-neon-error mt-1">{result.message}</div>
                          {result.errorDetails && (
                            <div className="text-tron-gray text-[10px] mt-1 font-mono bg-tron-bg-deep p-2 rounded border border-tron-cyan/10">
                              {result.errorDetails}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-tron-cyan/20 text-xs text-tron-gray">
                    <div>Total Processed: {updateResults.totalProcessed}</div>
                    <div className="text-neon-success">Succeeded: {updateResults.totalSucceeded}</div>
                    <div className="text-neon-error">Failed: {updateResults.totalFailed}</div>
                  </div>
                </div>
              )}
              
              {/* Create/Edit Form */}
              {(isCreatingPrompt || editingPrompt) ? (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-tron-cyan">
                      {editingPrompt ? 'Edit System Prompt' : 'Create New System Prompt'}
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Title *</label>
                    <input
                      type="text"
                      value={promptFormData.title}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Default Procurement Agent Prompt"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                                 text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                                 focus:ring-tron-cyan focus:border-tron-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Description (optional)</label>
                    <input
                      type="text"
                      value={promptFormData.description}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this prompt's purpose"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                                 text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                                 focus:ring-tron-cyan focus:border-tron-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Type *</label>
                    <select
                      value={promptFormData.type}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, type: e.target.value as Id<"chatSystemPromptTypes"> }))}
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                                 text-tron-white focus:outline-none focus:ring-2 
                                 focus:ring-tron-cyan focus:border-tron-cyan"
                      disabled={promptTypes === undefined}
                    >
                      <option value="">Select a type...</option>
                      {promptTypes && promptTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.displayName}{type.isDefault ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-tron-gray">System Prompt Text *</label>
                      <TronButton
                        onClick={handleCopyFullPrompt}
                        variant="outline"
                        color="cyan"
                        size="sm"
                        disabled={!fullPromptWithLinks}
                        icon={<Copy className="w-3 h-3" />}
                        title="Copy full system prompt with all approved links to clipboard"
                      >
                        Copy Full Prompt
                      </TronButton>
                    </div>
                    <textarea
                      value={promptFormData.systemPromptText}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, systemPromptText: e.target.value }))}
                      placeholder="Enter the full system prompt text..."
                      className="w-full px-4 py-3 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                                 text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                                 focus:ring-tron-cyan focus:border-tron-cyan resize-none font-mono text-sm"
                      rows={12}
                    />
                    <p className="text-xs text-tron-gray/70 mt-1">
                      Click "Copy Full Prompt" to copy the complete system prompt including all approved procurement links to your clipboard.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={promptFormData.isPrimarySystemPrompt}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, isPrimarySystemPrompt: e.target.checked }))}
                      className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-deep text-tron-cyan 
                                 focus:ring-tron-cyan focus:ring-offset-0"
                    />
                    <label htmlFor="isPrimary" className="text-sm text-tron-white">
                      Set as Primary Prompt (will be used for all new chats)
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-tron-cyan/10">
                    <TronButton
                      onClick={handleCancelPromptForm}
                      variant="outline"
                      color="cyan"
                    >
                      Cancel
                    </TronButton>
                    <TronButton
                      onClick={handleSavePrompt}
                      variant="primary"
                      color="cyan"
                      disabled={savingPrompt || !promptFormData.title.trim() || !promptFormData.systemPromptText.trim() || !promptFormData.type}
                      icon={savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                      {savingPrompt ? 'Saving...' : 'Save Prompt'}
                    </TronButton>
                  </div>
                </div>
              ) : (
                <>
                  {/* Prompt List Header */}
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-tron-gray">
                        Manage system prompts for the Lead Hunt Assistant. The primary prompt will be used for all conversations.
                      </p>
                      <div className="flex items-center gap-2">
                        {selectedPromptIds.size > 0 && (
                          <>
                            <TronButton
                              onClick={handleBatchDeletePrompts}
                              variant="primary"
                              color="orange"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4" />}
                              title={`Delete ${selectedPromptIds.size} selected prompt${selectedPromptIds.size > 1 ? 's' : ''}`}
                            >
                              Delete Selected ({selectedPromptIds.size})
                            </TronButton>
                            <TronButton
                              onClick={handleDeselectAllPrompts}
                              variant="outline"
                              color="cyan"
                              size="sm"
                              title="Deselect all prompts"
                            >
                              Deselect All
                            </TronButton>
                          </>
                        )}
                        <TronButton
                          onClick={handleRefreshApprovedLinks}
                          variant="outline"
                          color="cyan"
                          size="sm"
                          disabled={refreshingLinks}
                          icon={refreshingLinks ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          title="Update primary system prompt with approved procurement links"
                        >
                          {refreshingLinks ? 'Updating...' : 'Update Prompt with Links'}
                        </TronButton>
                        {missingStates && missingStates.length > 0 && (
                          <TronButton
                            onClick={handleGenerateAllMissingStatePrompts}
                            variant="primary"
                            color="cyan"
                            size="sm"
                            disabled={generatingPrompts || !missingStates || missingStates.length === 0}
                            icon={generatingPrompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            title="Generate system prompts for all missing states"
                          >
                            {generatingPrompts ? 'Generating...' : 'Generate Missing State Prompts'}
                          </TronButton>
                        )}
                        <TronButton
                          onClick={handleStartCreatePrompt}
                          variant="primary"
                          color="cyan"
                          size="sm"
                          icon={<Plus className="w-4 h-4" />}
                        >
                          New Prompt
                        </TronButton>
                      </div>
                    </div>

                    {/* State Analysis Section */}
                    {missingStates && missingStates.length > 0 && (
                      <div className="p-4 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg">
                        <h3 className="text-sm font-medium text-tron-white mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-tron-cyan" />
                          State Prompt Coverage
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-tron-cyan">51</div>
                            <div className="text-xs text-tron-gray">Total States</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-neon-success">
                              {statesWithPrompts?.length ?? 0}
                            </div>
                            <div className="text-xs text-tron-gray">With Prompts</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-neon-warning">
                              {missingStates?.length ?? 0}
                            </div>
                            <div className="text-xs text-tron-gray">Missing</div>
                          </div>
                        </div>
                        {missingStates && missingStates.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-tron-cyan/10">
                            <p className="text-xs text-tron-gray mb-2">Missing states:</p>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                              {missingStates.map((state) => (
                                <span
                                  key={state}
                                  className="px-2 py-1 bg-tron-bg-card border border-tron-cyan/20 rounded text-xs text-tron-gray"
                                >
                                  {state}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tron-gray" />
                      <input
                        type="text"
                        value={promptSearchQuery}
                        onChange={(e) => setPromptSearchQuery(e.target.value)}
                        placeholder="Search prompts by title, description, content, or type..."
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan/50 focus:border-tron-cyan/40 transition-all"
                      />
                      {promptSearchQuery && (
                        <button
                          onClick={() => setPromptSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-tron-gray hover:text-tron-white transition-colors"
                          title="Clear search"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick Filters and Selection Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-tron-gray">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="font-medium">Filter:</span>
                      </div>
                      <TronButton
                        onClick={() => setSelectedPromptTypeFilter('all')}
                        variant={selectedPromptTypeFilter === 'all' ? 'primary' : 'outline'}
                        color="cyan"
                        size="sm"
                      >
                        All
                      </TronButton>
                      <TronButton
                        onClick={() => setSelectedPromptTypeFilter('primary')}
                        variant={selectedPromptTypeFilter === 'primary' ? 'primary' : 'outline'}
                        color="cyan"
                        size="sm"
                        icon={<Star className="w-3 h-3" />}
                      >
                        Primary
                      </TronButton>
                      {promptTypes && promptTypes.map((type) => (
                        <TronButton
                          key={type._id}
                          onClick={() => setSelectedPromptTypeFilter(type._id)}
                          variant={selectedPromptTypeFilter === type._id ? 'primary' : 'outline'}
                          color="cyan"
                          size="sm"
                        >
                          {type.displayName}
                        </TronButton>
                      ))}
                      {(promptSearchQuery || selectedPromptTypeFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setPromptSearchQuery('');
                            setSelectedPromptTypeFilter('all');
                          }}
                          className="px-3 py-1.5 text-xs text-tron-gray hover:text-tron-cyan transition-colors flex items-center gap-1"
                          title="Clear all filters"
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear Filters
                        </button>
                      )}
                      {filteredSystemPrompts && filteredSystemPrompts.length > 0 && (
                        <>
                          <div className="h-4 w-px bg-tron-cyan/20 mx-1" />
                          <button
                            onClick={handleSelectAllPrompts}
                            className="px-3 py-1.5 text-xs text-tron-gray hover:text-tron-cyan transition-colors flex items-center gap-1.5"
                            title="Select all visible prompts"
                          >
                            <CheckSquare2 className="w-3.5 h-3.5" />
                            Select All
                          </button>
                          {selectedPromptIds.size > 0 && (
                            <button
                              onClick={handleDeselectAllPrompts}
                              className="px-3 py-1.5 text-xs text-tron-gray hover:text-tron-cyan transition-colors flex items-center gap-1.5"
                              title="Deselect all prompts"
                            >
                              <Square className="w-3.5 h-3.5" />
                              Deselect All
                            </button>
                          )}
                          <div className="h-4 w-px bg-tron-cyan/20 mx-1" />
                          <button
                            onClick={handleRemoveDuplicates}
                            className="px-3 py-1.5 text-xs text-tron-gray hover:text-tron-cyan transition-colors flex items-center gap-1.5"
                            title="Remove duplicate system prompts (groups by title or state, keeps largest)"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Remove Duplicates
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Prompts List - Horizontal Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemPrompts === undefined ? (
                      <div className="col-span-full flex items-center justify-center py-8 text-tron-gray">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : filteredSystemPrompts === undefined ? (
                      <div className="col-span-full flex items-center justify-center py-8 text-tron-gray">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : filteredSystemPrompts.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-tron-gray">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>
                          {systemPrompts.length === 0 
                            ? 'No system prompts found.'
                            : 'No prompts match your search or filters.'}
                        </p>
                        <p className="text-sm mt-1">
                          {systemPrompts.length === 0
                            ? 'Click "New Prompt" to create one, or it will be initialized with defaults.'
                            : 'Try adjusting your search query or filters.'}
                        </p>
                      </div>
                    ) : (
                      filteredSystemPrompts.map((prompt: SystemPrompt) => {
                        const isSelected = selectedPromptIds.has(prompt._id);
                        return (
                        <div
                          key={prompt._id}
                          className={`p-4 rounded-lg border transition-colors flex flex-col h-full ${
                            isSelected
                              ? 'bg-tron-cyan/20 border-tron-cyan/50 ring-2 ring-tron-cyan/50'
                              : prompt.isPrimarySystemPrompt
                              ? 'bg-tron-cyan/10 border-tron-cyan/40'
                              : 'bg-tron-bg-deep border-tron-cyan/10 hover:border-tron-cyan/30'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {/* Selection Checkbox */}
                              <button
                                onClick={() => handleTogglePromptSelection(prompt._id)}
                                className={`mt-0.5 p-1 rounded transition-colors flex-shrink-0 ${
                                  isSelected
                                    ? 'text-tron-cyan bg-tron-cyan/20'
                                    : 'text-tron-gray hover:text-tron-cyan hover:bg-tron-cyan/10'
                                }`}
                                title={isSelected ? 'Deselect' : 'Select'}
                              >
                                {isSelected ? (
                                  <CheckSquare2 className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium text-tron-white truncate text-sm">{prompt.title}</h4>
                                {prompt.isPrimarySystemPrompt && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-tron-cyan/20 text-tron-cyan text-xs rounded-full flex-shrink-0">
                                    <Star className="w-3 h-3" />
                                    Primary
                                  </span>
                                )}
                                {promptTypes && (() => {
                                  const promptType = promptTypes.find(t => t._id === prompt.type);
                                  return promptType ? (
                                    <span className="px-2 py-0.5 bg-tron-bg-card text-tron-gray text-xs rounded-full border border-tron-cyan/20 flex-shrink-0">
                                      {promptType.displayName}
                                    </span>
                                  ) : null;
                                })()}
                                <LeadCountBadge 
                                  promptTitle={prompt.title} 
                                  promptTypeId={prompt.type}
                                  promptTypes={promptTypes}
                                />
                                <ProcurementLinkCountBadge 
                                  promptTitle={prompt.title} 
                                  promptTypeId={prompt.type}
                                  promptTypes={promptTypes}
                                />
                              </div>
                              {prompt.description && (
                                <p className="text-xs text-tron-gray mb-2 line-clamp-2">{prompt.description}</p>
                              )}
                              </div>
                            </div>
                            
                            {/* Action Menu - Top Right Corner */}
                            <div className="relative group flex-shrink-0">
                              <button
                                className="p-1.5 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {/* Tooltip Menu - Appears below the button */}
                              <div className="absolute top-full right-0 mt-2 w-48 bg-tron-bg-card border border-tron-cyan/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] overflow-hidden pointer-events-auto">
                                <div className="py-1">
                                  {(() => {
                                    const leadsType = promptTypes?.find(t => t.name === "leads");
                                    const isLeadsPrompt = leadsType && prompt.type === leadsType._id;
                                    
                                    return isLeadsPrompt ? (
                                      <button
                                        onClick={() => handleUpdatePromptWithLeadSourceLinks(prompt._id)}
                                        disabled={updatingPromptId === prompt._id}
                                        className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Update this prompt with existing lead source data links for the state in the title"
                                      >
                                        {updatingPromptId === prompt._id ? (
                                          <Loader2 className="w-4 h-4 text-tron-cyan animate-spin" />
                                        ) : (
                                          <RefreshCw className="w-4 h-4 text-tron-cyan" />
                                        )}
                                        <span>Update Prompt with Links</span>
                                      </button>
                                    ) : null;
                                  })()}
                                  {!prompt.isPrimarySystemPrompt && (
                                    <button
                                      onClick={() => handleSetPrimary(prompt._id)}
                                      className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                                    >
                                      <Star className="w-4 h-4 text-tron-cyan" />
                                      <span>Set as Primary</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCopyPrompt(prompt.systemPromptText, prompt.title)}
                                    className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                                  >
                                    <Copy className="w-4 h-4 text-tron-cyan" />
                                    <span>Copy Prompt</span>
                                  </button>
                                  <button
                                    onClick={() => handleStartEditPrompt(prompt as SystemPrompt)}
                                    className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4 text-tron-cyan" />
                                    <span>Edit Prompt</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePrompt(prompt._id)}
                                    className="w-full px-4 py-2 text-left text-sm text-neon-error hover:bg-neon-error/20 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Prompt</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Card Content - Horizontal Layout */}
                          <div className="flex-1 flex flex-col gap-3">
                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-xs text-tron-gray/70 flex-wrap">
                              <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{prompt.systemPromptText.length.toLocaleString()} chars</span>
                            </div>
                            
                            {/* Preview of prompt text */}
                            <div className="flex-1 p-2.5 bg-tron-bg-card rounded border border-tron-cyan/10 group relative hover:border-tron-cyan/30 transition-colors min-h-[108px]">
                              <p className="text-xs text-tron-gray font-mono line-clamp-5">
                                {prompt.systemPromptText}
                              </p>
                              {/* Hover tooltip showing full text */}
                              <div className="absolute left-0 top-full mt-2 w-full max-w-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-auto">
                                <div className="bg-tron-bg-card border border-tron-cyan/30 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto backdrop-blur-sm">
                                  <p className="text-xs text-tron-white font-mono whitespace-pre-wrap break-words">
                                    {prompt.systemPromptText}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generation Progress Modal */}
      {generationProgress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-tron-bg-card border border-tron-cyan/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-tron-cyan/20">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-tron-cyan" />
                <h2 className="text-lg font-semibold text-tron-white">Generating State Prompts</h2>
              </div>
              <button
                onClick={handleCancelGeneration}
                className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors"
                disabled={!generatingPrompts}
              >
                <X className="w-5 h-5 text-tron-gray" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-tron-white">
                    {generationProgress.currentState 
                      ? `Processing ${generationProgress.currentState}...`
                      : generationProgress.completed === generationProgress.total
                      ? 'Complete!'
                      : 'Preparing...'}
                  </span>
                  <span className="text-sm text-tron-gray">
                    {generationProgress.completed} / {generationProgress.total}
                  </span>
                </div>
                <div className="w-full bg-tron-bg-deep rounded-full h-2.5 border border-tron-cyan/20">
                  <div
                    className="bg-tron-cyan h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(generationProgress.completed / generationProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Completed States */}
              {generationProgress.completedStates.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-neon-success mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed ({generationProgress.completedStates.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {generationProgress.completedStates.map((state) => (
                      <span
                        key={state}
                        className="px-2 py-1 bg-neon-success/20 border border-neon-success/30 rounded text-xs text-neon-success flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {state}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed States */}
              {generationProgress.failedStates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neon-error mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Failed ({generationProgress.failedStates.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {generationProgress.failedStates.map((failed, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-neon-error/10 border border-neon-error/30 rounded text-xs"
                      >
                        <div className="font-medium text-neon-error mb-1">{failed.state}</div>
                        <div className="text-tron-gray">{failed.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Button */}
              {generatingPrompts && (
                <div className="mt-4 pt-4 border-t border-tron-cyan/10">
                  <TronButton
                    onClick={handleCancelGeneration}
                    variant="outline"
                    color="orange"
                    className="w-full"
                  >
                    Cancel Generation
                  </TronButton>
                </div>
              )}

              {/* Close Button (when complete) */}
              {!generatingPrompts && (
                <div className="mt-4 pt-4 border-t border-tron-cyan/10">
                  <TronButton
                    onClick={() => setGenerationProgress(null)}
                    variant="primary"
                    color="cyan"
                    className="w-full"
                  >
                    Close
                  </TronButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
