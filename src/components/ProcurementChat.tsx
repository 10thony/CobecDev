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
  Wrench
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

export function ProcurementChat() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<Id<"procurementChatSessions"> | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  const [isClearing, setIsClearing] = useState(false);
  
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

  const handleExportToVerifier = (response: ChatResponse) => {
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
                      <div className="flex items-center justify-between text-xs text-tron-gray">
                        <span>
                          Found {message.response.search_metadata.count_found} links for: {message.response.search_metadata.target_regions.join(', ')}
                        </span>
                        <TronButton
                          onClick={() => handleExportToVerifier(message.response!)}
                          variant="outline"
                          color="cyan"
                          size="sm"
                          icon={<Download className="w-3 h-3" />}
                        >
                          Export
                        </TronButton>
                      </div>

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
    </div>
  );
}
