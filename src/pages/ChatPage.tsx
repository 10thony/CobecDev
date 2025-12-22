import { useQuery, useMutation, useAction } from "convex/react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { Settings, Maximize2, Minimize2, GripVertical, RefreshCw, Search } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { HelpWidget } from "../components/HelpWidget";

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  chatId: Id<"chats">;
  content: string;
  role: "user" | "assistant";
  userId?: string;
};

type LocalMessage = {
  content: string;
  role: "user" | "assistant";
  createdAt: number;
};

// Make LLMProvider dynamic based on available providers
type LLMProvider = string;

type DynamicModel = {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: number;
    completion: number;
  };
};

type GroupedModels = {
  [key: string]: DynamicModel[];
};

type VectorSearchType = "jobs" | "resumes" | "both";

function formatMessageContent(content: string) {
  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Extract language and code
      const [lang, ...codeParts] = part.slice(3, -3).split('\n');
      const code = codeParts.join('\n');
      
      return (
        <SyntaxHighlighter
          key={index}
          language={lang || 'text'}
          customStyle={{
            margin: '0.5em 0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useQuery(api.chats.get, chatId ? { id: chatId as Id<"chats"> } : "skip");
  const messages = useQuery(api.messages.list, chatId ? { chatId: chatId as Id<"chats"> } : "skip");
  const sendMessage = useMutation(api.messages.send);
  // Temporary workaround until Convex API is regenerated
  const sendMessageWithVectorSearch = async (params: {
    message: string;
    modelId: string;
    includeVectorSearch?: boolean;
    searchType?: "jobs" | "resumes" | "both";
  }) => {
    // For now, just return a simple response
    // This will be replaced with the actual action once the API is regenerated
    return { response: `This is a temporary response for: ${params.message}. The vector search functionality will be available once the Convex API is regenerated.` };
  };
  const fetchModelsForProvider = useAction(api.chat.fetchModelsForProvider);
  
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [localMessages, setLocalMessages] = useState<(Message | LocalMessage)[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("anthropic");
  const [showSettings, setShowSettings] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [dynamicModels, setDynamicModels] = useState<GroupedModels>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settingsHeight, setSettingsHeight] = useState(200); // Default height for settings panel
  const [isResizing, setIsResizing] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  // Vector search state
  const [enableVectorSearch, setEnableVectorSearch] = useState(true);
  const [vectorSearchType, setVectorSearchType] = useState<VectorSearchType>("both");
  const [isVectorSearching, setIsVectorSearching] = useState(false);

  // Function to fetch models for a specific provider
  const fetchModels = async (provider: string, key: string) => {
    if (!key.trim()) return;
    
    setIsLoadingModels(true);
    setModelError(null);
    
    try {
      const models = await fetchModelsForProvider({
        provider,
        apiKey: key
      });
      
      setDynamicModels(prev => ({
        ...prev,
        [provider]: models
      }));
      
      // Clear any previous model selection if it's no longer available
      if (selectedModelId && !models.find((m: any) => m.id === selectedModelId)) {
        setSelectedModelId(null);
      }
    } catch (error: any) {
      console.error(`Error fetching ${provider} models:`, error);
      setModelError(`Failed to fetch ${provider} models: ${error.message}`);
      setDynamicModels(prev => ({
        ...prev,
        [provider]: []
      }));
      // Clear model selection on error
      setSelectedModelId(null);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Fetch models when API key or provider changes
  useEffect(() => {
    if (apiKey.trim() && selectedProvider) {
      fetchModels(selectedProvider, apiKey);
    } else {
      // Clear models when API key is empty
      setDynamicModels(prev => ({
        ...prev,
        [selectedProvider]: []
      }));
      setSelectedModelId(null);
    }
  }, [apiKey, selectedProvider]);

  // Set initial model when chat loads
  useEffect(() => {
    if (chat && dynamicModels[selectedProvider]?.length > 0) {
      // Try to find a model that matches the chat's modelId
      const matchingModel = dynamicModels[selectedProvider]?.find(m => m.id === chat.modelId);
      if (matchingModel) {
        setSelectedModelId(matchingModel.id);
      } else if (dynamicModels[selectedProvider]?.length > 0) {
        // Fall back to first available model
        setSelectedModelId(dynamicModels[selectedProvider][0].id);
      }
    }
  }, [chat, dynamicModels, selectedProvider]);

  // Mirror convex messages to local state
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // Check if AI is currently generating a response
  useEffect(() => {
    if (messages) {
      const hasEmptyAssistantMessage = messages.some(msg => 
        msg.role === "assistant" && (!msg.content || msg.content.trim() === "")
      );
      setIsAIGenerating(hasEmptyAssistantMessage);
    }
  }, [messages]);

  // Define help content with provider-specific and model-specific links
  const helpContent = {
    defaultLinks: [
      {
        title: "Getting Started",
        url: "https://docs.example.com/getting-started",
        description: "Learn the basics of using the chat interface"
      },
      {
        title: "Support",
        url: "https://support.example.com",
        description: "Get help with any issues"
      }
    ],
    providerSpecificLinks: {
      anthropic: [
        {
          title: "Get Anthropic API Key",
          url: "https://console.anthropic.com/account/keys",
          description: "Create an API key to use Claude models"
        },
        {
          title: "Anthropic Documentation",
          url: "https://docs.anthropic.com/claude/reference/getting-started-with-the-api",
          description: "Learn about Anthropic's API and models"
        }
      ],
      openai: [
        {
          title: "Get OpenAI API Key",
          url: "https://platform.openai.com/api-keys",
          description: "Create an API key to use OpenAI models"
        },
        {
          title: "OpenAI Documentation",
          url: "https://platform.openai.com/docs/api-reference",
          description: "Learn about OpenAI's API and models"
        }
      ],
      huggingface: [
        {
          title: "Get Hugging Face API Key",
          url: "https://huggingface.co/settings/tokens",
          description: "Create an API key to use Hugging Face models"
        },
        {
          title: "Hugging Face Documentation",
          url: "https://huggingface.co/docs/inference-endpoints/index",
          description: "Learn about Hugging Face's API and models"
        }
      ],
      google: [
        {
          title: "Get Google AI API Key",
          url: "https://makersuite.google.com/app/apikey",
          description: "Create an API key to use Google Gemini models"
        },
        {
          title: "Google AI Documentation",
          url: "https://ai.google.dev/docs/gemini_api_overview",
          description: "Learn about Google's Gemini API and models"
        }
      ],
      openrouter: [
        {
          title: "Get OpenRouter API Key",
          url: "https://openrouter.ai/keys",
          description: "Create an API key to use OpenRouter models (including Google Gemini)"
        },
        {
          title: "OpenRouter Documentation",
          url: "https://openrouter.ai/docs",
          description: "Learn about OpenRouter's unified API for multiple AI models"
        },
        {
          title: "OpenRouter Models",
          url: "https://openrouter.ai/models",
          description: "Browse available models and pricing on OpenRouter"
        }
      ]
    },
    modelSpecificLinks: {
      // Add model-specific links here if needed
      // Example:
      // "claude-3-opus": [
      //   {
      //     title: "Claude 3 Opus Guide",
      //     url: "https://docs.anthropic.com/claude/docs/claude-3-opus",
      //     description: "Learn about Claude 3 Opus capabilities"
      //   }
      // ]
    }
  };

  if (!chatId) {
    return <Navigate to="/" replace />;
  }

  if (chat === undefined || messages === undefined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
        </div>
        <p className="text-mint-cream-600">Loading chat...</p>
      </div>
    );
  }

  if (chat === null) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAIGenerating || !apiKey.trim() || !selectedModelId || !chatId) return;

    const messageContent = input.trim();
    setInput("");

    try {
      if (enableVectorSearch) {
        // Use enhanced chat with vector search
        setIsVectorSearching(true);
        
        // Add user message to local state immediately
        const userMessage: LocalMessage = {
          role: "user",
          content: messageContent,
          createdAt: Date.now(),
        };
        setLocalMessages(prev => [...prev, userMessage]);
        
        // Add placeholder for assistant response
        const assistantPlaceholder: LocalMessage = {
          role: "assistant",
          content: "",
          createdAt: Date.now(),
        };
        setLocalMessages(prev => [...prev, assistantPlaceholder]);
        
        try {
          const result = await sendMessageWithVectorSearch({
            message: messageContent,
            modelId: selectedModelId,
            includeVectorSearch: true,
            searchType: vectorSearchType,
          });
          
          // Update the assistant message with the response
          setLocalMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = result.response;
            }
            return newMessages;
          });
          
          // Also save to Convex for persistence
          await sendMessage({
            chatId: chatId as Id<"chats">,
            content: result.response,
            apiKey: apiKey,
            modelId: selectedModelId
          });
          
        } catch (error) {
          console.error("Vector search failed:", error);
          // Fall back to regular message sending
          await sendMessage({
            chatId: chatId as Id<"chats">,
            content: messageContent,
            apiKey: apiKey,
            modelId: selectedModelId
          });
        } finally {
          setIsVectorSearching(false);
        }
      } else {
        // Use regular message sending
        await sendMessage({
          chatId: chatId as Id<"chats">,
          content: messageContent,
          apiKey: apiKey,
          modelId: selectedModelId
        });
      }

      // The AI response will be automatically updated in real-time through the messages query
      // which will reflect the streaming updates from the backend
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(messageContent); // Restore input on error
      setIsVectorSearching(false);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = settingsHeight;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = e.clientY - resizeStartY.current;
    const newHeight = Math.max(100, Math.min(400, resizeStartHeight.current - deltaY));
    setSettingsHeight(newHeight);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleRefreshModels = () => {
    if (apiKey.trim() && selectedProvider) {
      fetchModels(selectedProvider, apiKey);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-mint-cream-900 bg-oxford-blue-DEFAULT">
      {/* Chat Header */}
      <div className="flex-none bg-berkeley-blue-DEFAULT border-b border-yale-blue-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mint-cream-DEFAULT">{chat.title}</h2>
            <p className="text-sm text-mint-cream-700">
              Using {selectedModelId || "No model selected"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {dynamicModels[selectedProvider] && dynamicModels[selectedProvider].length > 0 && (
              <select
                value={selectedModelId || ""}
                onChange={(e) => {
                  const modelId = e.target.value;
                  setSelectedModelId(modelId);
                }}
                className="px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
              >
                <option value="">Select a model</option>
                {dynamicModels[selectedProvider].map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {localMessages.length === 0 && (
            <div className="text-center text-mint-cream-700 py-12">
              <p>Start a conversation with the AI!</p>
            </div>
          )}
          
          {localMessages.map((message, index) => (
            <div
              key={'_id' in message ? message._id : `local-${index}`}
              className={`flex ${ message.role === "user" ? "justify-end" : "justify-start" }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${ message.role === "user" ? "bg-yale-blue-DEFAULT text-white" : "bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT border border-yale-blue-300 text-mint-cream-DEFAULT text-mint-cream-DEFAULT" }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.content ? (
                    formatMessageContent(message.content)
                  ) : (message.role === "assistant" ? (
                    <span className="inline-flex items-center space-x-1">
                      <span>AI is thinking</span>
                      <span className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </span>
                  ) : null)}
                </p>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form with Settings */}
      <div className="flex-none bg-berkeley-blue-DEFAULT border-t border-yale-blue-300 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Settings Panel */}
          <div 
            ref={settingsRef}
            className={`transition-all duration-200 ease-in-out overflow-hidden ${ showSettings ? 'mb-4' : 'mb-0' }`}
            style={{ height: showSettings ? `${settingsHeight}px` : '0px' }}
          >
            <div className="bg-mint-cream-900 border border-yale-blue-300 rounded-lg p-4 h-full overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-mint-cream-500 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="w-full px-4 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mint-cream-500 mb-1">
                    AI Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      const provider = e.target.value as LLMProvider;
                      setSelectedProvider(provider);
                      setSelectedModelId(null);
                    }}
                    className="w-full px-4 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="google">Google</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="huggingface">Hugging Face</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-mint-cream-500">
                      Available Models
                    </label>
                    <button
                      type="button"
                      onClick={handleRefreshModels}
                      disabled={isLoadingModels || !apiKey.trim()}
                      className="p-1 text-mint-cream-700 hover:text-mint-cream-500 rounded-md hover:bg-mint-cream-800 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isLoadingModels ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {isLoadingModels && (
                    <div className="text-sm text-mint-cream-700 mb-2">
                      Loading models...
                    </div>
                  )}
                  {modelError && (
                    <div className="text-sm text-red-500 mb-2">
                      {modelError}
                    </div>
                  )}
                  {dynamicModels[selectedProvider] && dynamicModels[selectedProvider].length > 0 && (
                    <select
                      value={selectedModelId || ""}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="w-full px-4 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT"
                    >
                      <option value="">Select a model</option>
                      {dynamicModels[selectedProvider].map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedModelId && dynamicModels[selectedProvider]?.find(m => m.id === selectedModelId)?.pricing && (
                    <div className="mt-2 p-2 bg-mint-cream-800 rounded text-xs text-mint-cream-600">
                      <p className="font-semibold">Pricing:</p>
                      <p>Prompt: ${dynamicModels[selectedProvider].find(m => m.id === selectedModelId)?.pricing?.prompt.toFixed(6)} per 1k tokens</p>
                      <p>Completion: ${dynamicModels[selectedProvider].find(m => m.id === selectedModelId)?.pricing?.completion.toFixed(6)} per 1k tokens</p>
                    </div>
                  )}
                  {dynamicModels[selectedProvider] && dynamicModels[selectedProvider].length === 0 && !isLoadingModels && !modelError && (
                    <div className="text-sm text-mint-cream-700">
                      {apiKey.trim() ? (
                        <div>
                          <p>No models available for your API key.</p>
                          <p className="mt-1">This could mean:</p>
                          <ul className="mt-1 ml-4 list-disc">
                            <li>Your subscription doesn't include these models</li>
                            <li>Your API key has restricted access</li>
                            <li>The service is temporarily unavailable</li>
                          </ul>
                        </div>
                      ) : (
                        "Enter your API key to see available models."
                      )}
                    </div>
                  )}
                  {selectedModelId && dynamicModels[selectedProvider]?.find(m => m.id === selectedModelId)?.description && (
                    <p className="mt-1 text-sm text-mint-cream-700">
                      {dynamicModels[selectedProvider].find(m => m.id === selectedModelId)?.description}
                    </p>
                  )}
                </div>
                
                {/* Vector Search Settings */}
                <div className="border-t border-yale-blue-300 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Search size={16} className="text-powder-blue-600" />
                    <label className="text-sm font-medium text-mint-cream-500">
                      Vector Search (Job/Resume Matching)
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableVectorSearch"
                        checked={enableVectorSearch}
                        onChange={(e) => setEnableVectorSearch(e.target.checked)}
                        className="rounded border-yale-blue-400 text-powder-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="enableVectorSearch" className="text-sm text-mint-cream-500">
                        Enable AI-powered job and resume matching
                      </label>
                    </div>
                    
                    {enableVectorSearch && (
                      <div>
                        <label className="block text-sm font-medium text-mint-cream-500 mb-1">
                          Search Type
                        </label>
                        <select
                          value={vectorSearchType}
                          onChange={(e) => setVectorSearchType(e.target.value as VectorSearchType)}
                          className="w-full px-3 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT text-sm"
                        >
                          <option value="both">Jobs & Resumes</option>
                          <option value="jobs">Jobs Only</option>
                          <option value="resumes">Resumes Only</option>
                        </select>
                        <p className="mt-1 text-xs text-mint-cream-700">
                          Automatically searches for relevant job postings and candidate resumes when you ask about careers, hiring, or employment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {showSettings && (
              <div 
                className="h-2 bg-mint-cream-800 cursor-ns-resize flex items-center justify-center"
                onMouseDown={handleResizeStart}
              >
                <GripVertical className="w-4 h-4 text-mint-cream-700" />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center space-x-4 bg-berkeley-blue-DEFAULT rounded-lg border border-yale-blue-300 p-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-mint-cream-700 hover:text-mint-cream-500 rounded-md hover:bg-mint-cream-800 transition-colors"
            >
              {showSettings ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isAIGenerating || !apiKey.trim() || !selectedModelId}
              className="flex-1 px-4 py-2 border border-yale-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-berkeley-blue-DEFAULT text-mint-cream-DEFAULT disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isAIGenerating || isVectorSearching || !apiKey.trim() || !selectedModelId}
              className="px-6 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAIGenerating ? "AI is responding..." : isVectorSearching ? "Searching..." : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Add HelpWidget with provider and model context */}
      <HelpWidget 
        content={helpContent}
        selectedProvider={selectedProvider}
        selectedModelId={selectedModelId === null ? undefined : selectedModelId}
      />
    </div>
  );
}
