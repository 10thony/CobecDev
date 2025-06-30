// ChatPage.tsx (Client-side - UNSAFE FOR PRODUCTION)
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, Settings, Bot, User } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import "./App.css";

type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  chatId: Id<"chats">;
  content: string;
  role: "user" | "assistant";
  userId?: Id<"users">;
};

type LocalMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

function TempChatPage() {
  // Convex state
  const createChat = useMutation(api.chats.create);
  const [currentChatId, setCurrentChatId] = useState<Id<"chats"> | null>(null);
  const messages = useQuery(api.messages.list, currentChatId ? { chatId: currentChatId } : "skip") || [];
  const sendMessage = useMutation(api.messages.send);
  const activeModels = useQuery(api.aiModels.listActive) || [];

  // Local state
  const [localMessages, setLocalMessages] = useState<(Message | LocalMessage)[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<Id<"aiModels"> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem("hf_api_key") || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create a chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (!activeModels.length) return;
      
      try {
        const chatId = await createChat({
          title: "New Chat",
          modelId: activeModels[0]._id,
        });
        setCurrentChatId(chatId);
        setSelectedModelId(activeModels[0]._id);
      } catch (error) {
        console.error("Failed to create chat:", error);
      }
    };
    initializeChat();
  }, [activeModels]);

  // Update local messages only when Convex messages change
  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages(messages);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const saveApiKey = () => {
    localStorage.setItem("hf_api_key", apiKey);
    setShowSettings(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentChatId) return;
    if (!apiKey) {
      alert("Please set your Hugging Face API key in settings");
      setShowSettings(true);
      return;
    }

    const userMessage: LocalMessage = {
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };
    setLocalMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await sendMessage({
        chatId: currentChatId,
        content: userMessage.content,
        apiKey: apiKey,
      });
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: LocalMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: Date.now(),
      };
      setLocalMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Open LLM Chat</h1>
        <div className="header-controls">
          <select
            value={selectedModelId || ""}
            onChange={(e) => setSelectedModelId(e.target.value as Id<"aiModels">)}
            className="model-select"
          >
            {activeModels.map((model) => (
              <option key={model._id} value={model._id}>
                {model.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="settings-btn"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            <h3>Settings</h3>
            <div className="setting-item">
              <label>Hugging Face API Key:</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your HF API key"
              />
              <button onClick={saveApiKey}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-container">
        <div className="messages">
          {localMessages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-icon">
                {message.role === "user" ? (
                  <User size={20} />
                ) : (
                  <Bot size={20} />
                )}
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-icon">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={isLoading}
          />
          <button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TempChatPage;