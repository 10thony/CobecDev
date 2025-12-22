import { useState, useTransition, useRef, useEffect } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Download, 
  AlertTriangle, 
  ExternalLink, 
  Globe, 
  MapPin, 
  Building2, 
  Plus, 
  History, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  RefreshCw,
  Wrench,
  Upload,
  CheckCircle,
  Settings,
  X,
  Edit2,
  Star,
  Save
} from 'lucide-react';

interface ProcurementLink {
  state: string;
  capital: string;
  official_website: string;
  procurement_link: string;
  entity_type?: string;
  link_type?: string;
  confidence_score?: number;
}

interface ChatResponse {
  search_metadata: {
    target_regions: string[];
    count_found: number;
    timestamp?: string;
  };
  procurement_links: ProcurementLink[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: ChatResponse;
  timestamp: number;
  isError?: boolean;
}

interface SystemPrompt {
  _id: Id<"procurementChatSystemPrompts">;
  systemPromptText: string;
  isPrimarySystemPrompt: boolean;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface ProcurementChatProps {
  onExportToVerifier?: () => void;
}

export function ProcurementChat({ onExportToVerifier }: ProcurementChatProps = {}) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<Id<"procurementChatSessions"> | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // System Prompt Management State
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [promptFormData, setPromptFormData] = useState({
    title: '',
    description: '',
    systemPromptText: '',
    isPrimarySystemPrompt: false,
  });
  const [savingPrompt, setSavingPrompt] = useState(false);
  
  // Convex queries and mutations
  const sessions = useQuery(api.procurementChatSessions.list, { includeArchived: false });
  const sessionMessages = useQuery(
    api.procurementChatMessages.list, 
    currentSessionId ? { sessionId: currentSessionId } : "skip"
  );
  const createSession = useMutation(api.procurementChatSessions.create);
  const deleteSession = useMutation(api.procurementChatSessions.deleteSession);
  const addUserMessage = useMutation(api.procurementChatMessages.addUserMessage);
  const deleteMessagePair = useMutation(api.procurementChatMessages.deleteMessagePair);
  const clearCorruptedThreadIds = useMutation(api.procurementChatSessions.clearCorruptedThreadIds);
  const sendChatMessage = useAction(api.simpleChat.sendMessage);
  const importToVerifier = useMutation(api.procurementUrls.importFromChatResponse);
  const [isClearing, setIsClearing] = useState(false);
  const [exportingMessageId, setExportingMessageId] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{ messageId: string; result: { imported: number; skipped: number } } | null>(null);
  
  // System Prompt queries and mutations
  const systemPrompts = useQuery(api.procurementChatSystemPrompts.list, {});
  const createSystemPrompt = useMutation(api.procurementChatSystemPrompts.create);
  const updateSystemPrompt = useMutation(api.procurementChatSystemPrompts.update);
  const deleteSystemPrompt = useMutation(api.procurementChatSystemPrompts.remove);
  const setPromptAsPrimary = useMutation(api.procurementChatSystemPrompts.setPrimary);
  const initializeDefaultPrompt = useMutation(api.procurementChatSystemPrompts.initializeDefault);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sessionMessages]);
  
  // Sync messages from database when session changes
  useEffect(() => {
    if (sessionMessages) {
      const formattedMessages: ChatMessage[] = sessionMessages.map((msg) => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        response: msg.responseData as ChatResponse | undefined,
        timestamp: msg.createdAt,
        isError: msg.isError,
      }));
      setMessages(formattedMessages);
    } else if (!currentSessionId) {
      setMessages([]);
    }
  }, [sessionMessages, currentSessionId]);

  const handleNewChat = async () => {
    try {
      const newSessionId = await createSession({});
      setCurrentSessionId(newSessionId);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new chat');
    }
  };

  const handleSelectSession = (sessionId: Id<"procurementChatSessions">) => {
    setCurrentSessionId(sessionId);
    setError(null);
  };

  const handleDeleteSession = async (sessionId: Id<"procurementChatSessions">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession({ id: sessionId });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userPrompt = prompt.trim();
    setError(null);
    
    // Create a session if we don't have one
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        sessionId = await createSession({ title: userPrompt.substring(0, 50) + (userPrompt.length > 50 ? "..." : "") });
        setCurrentSessionId(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create chat session');
        return;
      }
    }
    
    // Add user message locally for immediate feedback
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setPrompt(''); // Clear input
    
    startTransition(async () => {
      try {
        // Add user message to database
        await addUserMessage({ 
          sessionId: sessionId!, 
          content: userPrompt 
        });
        
        // Send chat message (this also saves the assistant response)
        await sendChatMessage({ 
          prompt: userPrompt,
          sessionId: sessionId!,
        });
        
        // The response will be loaded via the sessionMessages query
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Add error message locally
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
          timestamp: Date.now(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  const handleDownloadJson = (response: ChatResponse) => {
    if (!response?.procurement_links) return;
    
    // Create downloadable JSON file
    const jsonData = {
      us_state_capitals_procurement: response.procurement_links.map(link => ({
        state: link.state,
        capital: link.capital,
        official_website: link.official_website,
        procurement_link: link.procurement_link,
      }))
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-links-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToVerifier = async (messageId: string, response: ChatResponse) => {
    if (!response?.procurement_links || response.procurement_links.length === 0) return;
    
    setExportingMessageId(messageId);
    setExportResult(null);
    
    try {
      const result = await importToVerifier({
        links: response.procurement_links,
        sessionId: currentSessionId || undefined,
      });
      
      setExportResult({
        messageId,
        result: { imported: result.imported, skipped: result.skipped },
      });
      
      // Notify parent component to switch to verifier tab if callback provided
      if (onExportToVerifier && result.imported > 0) {
        onExportToVerifier();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setExportResult(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export links to verifier');
    } finally {
      setExportingMessageId(null);
    }
  };

  const handleRetryMessage = async (messageId: string, content: string) => {
    if (!currentSessionId || retryingMessageId) return;
    
    setRetryingMessageId(messageId);
    setError(null);
    
    try {
      // First, delete the old message pair if this is a database message (not a local temp message)
      // Database IDs from Convex don't start with "user-" or "error-" prefixes
      const isLocalMessage = messageId.startsWith('user-') || messageId.startsWith('error-');
      
      if (!isLocalMessage) {
        // Delete the old message pair from the database
        // This will remove the user message and its associated assistant response
        await deleteMessagePair({ 
          messageId: messageId as Id<"procurementChatMessages">
        });
      }
      
      // Add the new user message to database
      await addUserMessage({ 
        sessionId: currentSessionId, 
        content: content 
      });
      
      // Send new chat message
      await sendChatMessage({ 
        prompt: content,
        sessionId: currentSessionId,
      });
      
      // The response will be loaded via the sessionMessages query which will
      // automatically update the UI with the new message pair
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry request');
      // Add error message locally
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to retry request'}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleClearCorruptedThreadIds = async () => {
    setIsClearing(true);
    try {
      const result = await clearCorruptedThreadIds({});
      if (result.cleared > 0) {
        setError(null);
        // Show success message briefly
        setError(`Cleared ${result.cleared} corrupted thread ID(s). Try your request again.`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError('No corrupted thread IDs found.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear thread IDs');
    } finally {
      setIsClearing(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // System Prompt Handlers
  const handleOpenPromptSettings = async () => {
    setShowPromptSettings(true);
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
    setPromptFormData({
      title: '',
      description: '',
      systemPromptText: '',
      isPrimarySystemPrompt: false,
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
    });
  };

  const handleCancelPromptForm = () => {
    setIsCreatingPrompt(false);
    setEditingPrompt(null);
    setPromptFormData({
      title: '',
      description: '',
      systemPromptText: '',
      isPrimarySystemPrompt: false,
    });
  };

  const handleSavePrompt = async () => {
    if (!promptFormData.title.trim() || !promptFormData.systemPromptText.trim()) {
      setError("Title and System Prompt Text are required");
      return;
    }

    setSavingPrompt(true);
    try {
      if (editingPrompt) {
        // Update existing prompt
        await updateSystemPrompt({
          id: editingPrompt._id,
          title: promptFormData.title,
          description: promptFormData.description || undefined,
          systemPromptText: promptFormData.systemPromptText,
          isPrimarySystemPrompt: promptFormData.isPrimarySystemPrompt,
        });
      } else {
        // Create new prompt
        await createSystemPrompt({
          title: promptFormData.title,
          description: promptFormData.description || undefined,
          systemPromptText: promptFormData.systemPromptText,
          isPrimarySystemPrompt: promptFormData.isPrimarySystemPrompt,
        });
      }
      handleCancelPromptForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: Id<"procurementChatSystemPrompts">) => {
    try {
      await deleteSystemPrompt({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const handleSetPrimary = async (id: Id<"procurementChatSystemPrompts">) => {
    try {
      await setPromptAsPrimary({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary prompt');
    }
  };

  return (
    <div className="flex h-full">
      {/* History Sidebar */}
      <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="h-full bg-tron-bg-card border-r border-tron-cyan/20 flex flex-col w-64">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-tron-cyan/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-tron-cyan">
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">Chat History</span>
              </div>
            </div>
            <TronButton
              onClick={handleNewChat}
              variant="outline"
              color="cyan"
              size="sm"
              icon={<Plus className="w-3 h-3" />}
              className="w-full"
            >
              New Chat
            </TronButton>
            <TronButton
              onClick={handleClearCorruptedThreadIds}
              variant="outline"
              color="orange"
              size="sm"
              icon={isClearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
              className="w-full mt-2"
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Fix Thread Errors'}
            </TronButton>
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
          </div>
          
          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions === undefined ? (
              <div className="flex items-center justify-center py-4 text-tron-gray">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-tron-gray text-xs py-4">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No chat history yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session._id}
                  onClick={() => handleSelectSession(session._id)}
                  className={`group p-2 rounded cursor-pointer transition-colors ${
                    currentSessionId === session._id
                      ? 'bg-tron-cyan/20 border border-tron-cyan/40'
                      : 'hover:bg-tron-bg-deep border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-tron-white truncate font-medium">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-1 text-tron-gray text-[10px] mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(session.lastMessageAt || session.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neon-error/20 rounded transition-all"
                      title="Delete chat"
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
      
      {/* Toggle History Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-tron-bg-card border border-tron-cyan/30 rounded-r-lg p-1 hover:bg-tron-cyan/10 transition-colors"
        style={{ left: showHistory ? '256px' : '0' }}
      >
        {showHistory ? (
          <ChevronLeft className="w-4 h-4 text-tron-cyan" />
        ) : (
          <ChevronRight className="w-4 h-4 text-tron-cyan" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TronPanel 
          title="Procurement Link Assistant" 
          icon={<MessageSquare className="w-5 h-5" />}
          glowColor="cyan"
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Messages History */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[400px] max-h-[600px]">
            {messages.length === 0 && !currentSessionId && (
              <div className="text-center text-tron-gray py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation to find procurement links!</p>
                <p className="text-sm mt-2">Try: "Get me procurement links for all Texas cities with population over 500k"</p>
                <TronButton
                  onClick={handleNewChat}
                  variant="primary"
                  color="cyan"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  className="mt-4"
                >
                  Start New Chat
                </TronButton>
              </div>
            )}
            
            {messages.length === 0 && currentSessionId && (
              <div className="text-center text-tron-gray py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask about procurement links for any region!</p>
                <p className="text-sm mt-2">Try: "Get me procurement links for all Texas cities with population over 500k"</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] lg:max-w-[75%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-tron-cyan/20 border border-tron-cyan/30 text-tron-white'
                      : message.isError
                      ? 'bg-neon-error/10 border border-neon-error/30 text-tron-white'
                      : 'bg-tron-bg-card border border-tron-cyan/10 text-tron-white'
                  }`}
                >
                  {/* Message Content */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
                    {message.role === 'user' && (
                      <button
                        onClick={() => handleRetryMessage(message.id, message.content)}
                        disabled={retryingMessageId === message.id || isPending}
                        className="flex-shrink-0 p-1.5 rounded-full hover:bg-tron-cyan/30 
                                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                   text-tron-cyan hover:text-tron-cyan-bright"
                        title="Retry this request"
                      >
                        {retryingMessageId === message.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Assistant Response with Links */}
                  {message.role === 'assistant' && message.response && !message.isError && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-tron-cyan/10">
                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-tron-gray flex-wrap gap-2">
                        <span>
                          Found {message.response.search_metadata.count_found} links for: {message.response.search_metadata.target_regions.join(', ')}
                        </span>
                        <div className="flex gap-2">
                          <TronButton
                            onClick={() => handleDownloadJson(message.response!)}
                            variant="outline"
                            color="cyan"
                            size="sm"
                            icon={<Download className="w-3 h-3" />}
                          >
                            JSON
                          </TronButton>
                          <TronButton
                            onClick={() => handleExportToVerifier(message.id, message.response!)}
                            variant="primary"
                            color="cyan"
                            size="sm"
                            disabled={exportingMessageId === message.id}
                            icon={exportingMessageId === message.id 
                              ? <Loader2 className="w-3 h-3 animate-spin" /> 
                              : <Upload className="w-3 h-3" />}
                          >
                            {exportingMessageId === message.id ? 'Exporting...' : 'To Verifier'}
                          </TronButton>
                        </div>
                      </div>
                      
                      {/* Export Success Message */}
                      {exportResult && exportResult.messageId === message.id && (
                        <div className="p-2 bg-neon-success/20 border border-neon-success/40 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-neon-success">
                            <CheckCircle className="w-3 h-3" />
                            <span>
                              Exported to Link Verifier: {exportResult.result.imported} imported
                              {exportResult.result.skipped > 0 && `, ${exportResult.result.skipped} skipped (duplicates)`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Links Preview */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {message.response.procurement_links.map((link, idx) => (
                          <div key={idx} className="p-3 bg-tron-bg-deep rounded border border-tron-cyan/10 hover:border-tron-cyan/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-tron-white flex items-center gap-2 mb-1 text-sm">
                                  <MapPin className="w-3 h-3 text-tron-cyan flex-shrink-0" />
                                  <span className="truncate">{link.state} - {link.capital}</span>
                                </h4>
                                <p className="text-xs text-tron-gray flex items-center gap-1 mb-2">
                                  <Building2 className="w-3 h-3" />
                                  {link.entity_type || 'Government Entity'} • {link.link_type || 'Procurement Link'}
                                </p>
                              </div>
                              {link.confidence_score !== undefined && (
                                <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-2 ${
                                  link.confidence_score >= 0.8 ? 'bg-neon-success/20 text-neon-success border border-neon-success/30' :
                                  link.confidence_score >= 0.5 ? 'bg-neon-warning/20 text-neon-warning border border-neon-warning/30' :
                                  'bg-neon-error/20 text-neon-error border border-neon-error/30'
                                }`}>
                                  {Math.round(link.confidence_score * 100)}%
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-1.5">
                              <a 
                                href={link.official_website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-tron-gray hover:text-tron-cyan transition-colors group"
                              >
                                <Globe className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate group-hover:underline">{link.official_website}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                              <a 
                                href={link.procurement_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-tron-cyan hover:text-tron-cyan-bright transition-colors group"
                              >
                                <span className="truncate group-hover:underline">{link.procurement_link}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isPending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] lg:max-w-[75%] rounded-lg p-4 bg-tron-bg-card border border-tron-cyan/10">
                  <div className="flex items-center gap-2 text-tron-gray">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-tron-cyan/10 pt-4">
            {error && (
              <div className="p-3 bg-neon-error/20 border border-neon-error rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-neon-error mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-neon-error">{error}</p>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm text-tron-gray mb-2">
                Ask about procurement links or portals:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'How do I find procurement links for Texas cities?' or 'What are common patterns for government procurement portals?'"
                className="w-full px-4 py-3 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                           text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                           focus:ring-tron-cyan focus:border-tron-cyan resize-none"
                rows={3}
                disabled={isPending}
              />
            </div>
            
            <TronButton
              type="submit"
              variant="primary"
              color="cyan"
              disabled={isPending || !prompt.trim()}
              icon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {isPending ? 'Sending...' : 'Send Message'}
            </TronButton>
          </form>
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
                }}
                className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-tron-gray" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Create/Edit Form */}
              {(isCreatingPrompt || editingPrompt) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-tron-cyan">
                      {editingPrompt ? 'Edit System Prompt' : 'Create New System Prompt'}
                    </h3>
                    <TronButton
                      onClick={handleCancelPromptForm}
                      variant="outline"
                      color="cyan"
                      size="sm"
                    >
                      Cancel
                    </TronButton>
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
                    <label className="block text-sm text-tron-gray mb-2">System Prompt Text *</label>
                    <textarea
                      value={promptFormData.systemPromptText}
                      onChange={(e) => setPromptFormData(prev => ({ ...prev, systemPromptText: e.target.value }))}
                      placeholder="Enter the full system prompt text..."
                      className="w-full px-4 py-3 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg 
                                 text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 
                                 focus:ring-tron-cyan focus:border-tron-cyan resize-none font-mono text-sm"
                      rows={12}
                    />
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
                      disabled={savingPrompt || !promptFormData.title.trim() || !promptFormData.systemPromptText.trim()}
                      icon={savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                      {savingPrompt ? 'Saving...' : 'Save Prompt'}
                    </TronButton>
                  </div>
                </div>
              ) : (
                <>
                  {/* Prompt List Header */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-tron-gray">
                      Manage system prompts for the Procurement Chat AI. The primary prompt will be used for all conversations.
                    </p>
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

                  {/* Prompts List */}
                  <div className="space-y-3">
                    {systemPrompts === undefined ? (
                      <div className="flex items-center justify-center py-8 text-tron-gray">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : systemPrompts.length === 0 ? (
                      <div className="text-center py-8 text-tron-gray">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No system prompts found.</p>
                        <p className="text-sm mt-1">Click "New Prompt" to create one, or it will be initialized with defaults.</p>
                      </div>
                    ) : (
                      systemPrompts.map((prompt) => (
                        <div
                          key={prompt._id}
                          className={`p-4 rounded-lg border transition-colors ${
                            prompt.isPrimarySystemPrompt
                              ? 'bg-tron-cyan/10 border-tron-cyan/40'
                              : 'bg-tron-bg-deep border-tron-cyan/10 hover:border-tron-cyan/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-tron-white truncate">{prompt.title}</h4>
                                {prompt.isPrimarySystemPrompt && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-tron-cyan/20 text-tron-cyan text-xs rounded-full">
                                    <Star className="w-3 h-3" />
                                    Primary
                                  </span>
                                )}
                              </div>
                              {prompt.description && (
                                <p className="text-sm text-tron-gray mb-2">{prompt.description}</p>
                              )}
                              <p className="text-xs text-tron-gray/70">
                                Updated: {new Date(prompt.updatedAt).toLocaleDateString()} • 
                                {prompt.systemPromptText.length.toLocaleString()} characters
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!prompt.isPrimarySystemPrompt && (
                                <TronButton
                                  onClick={() => handleSetPrimary(prompt._id)}
                                  variant="outline"
                                  color="cyan"
                                  size="sm"
                                  icon={<Star className="w-3 h-3" />}
                                  title="Set as Primary"
                                >
                                  Set Primary
                                </TronButton>
                              )}
                              <TronButton
                                onClick={() => handleStartEditPrompt(prompt as SystemPrompt)}
                                variant="outline"
                                color="cyan"
                                size="sm"
                                icon={<Edit2 className="w-3 h-3" />}
                              >
                                Edit
                              </TronButton>
                              <button
                                onClick={() => handleDeletePrompt(prompt._id)}
                                className="p-2 hover:bg-neon-error/20 rounded-lg transition-colors"
                                title="Delete Prompt"
                              >
                                <Trash2 className="w-4 h-4 text-neon-error" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Preview of prompt text */}
                          <div className="mt-3 p-3 bg-tron-bg-card rounded border border-tron-cyan/10">
                            <p className="text-xs text-tron-gray font-mono line-clamp-3">
                              {prompt.systemPromptText}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
