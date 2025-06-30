import { useQuery, useMutation } from "convex/react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useCustomTheme } from "../lib/useCustomTheme";

export function Sidebar() {
  const chats = useQuery(api.chats.list) || [];
  const aiModels = useQuery(api.aiModels.listActive) || [];
  const createChat = useMutation(api.chats.create);
  const archiveChat = useMutation(api.chats.archive);
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { getSidebarTheme } = useCustomTheme();
  const sidebarTheme = getSidebarTheme();
  
  const [isCreating, setIsCreating] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<Id<"chats"> | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNewChat = async () => {
    if (aiModels.length === 0) return;
    
    setIsCreating(true);
    try {
      const defaultModel = aiModels[0];
      const newChatId = await createChat({
        title: "New Chat",
        modelId: defaultModel._id,
      });
      navigate(`/chat/${newChatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: Id<"chats">, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking delete
    e.stopPropagation(); // Prevent event bubbling
    
    setDeletingChatId(chatId);
    try {
      await archiveChat({ id: chatId });
      // If we're currently viewing the deleted chat, navigate to home
      if (chatId === chatId) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <div className={`relative flex flex-col transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${sidebarTheme.background} border-r ${sidebarTheme.border}`}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-4 z-10 ${sidebarTheme.background} rounded-full p-1 border ${sidebarTheme.border} ${sidebarTheme.hover}`}
      >
        <svg
          className={`w-4 h-4 ${sidebarTheme.text} transition-transform duration-300 ${
            isCollapsed ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* New Chat Button */}
      <div className={`p-4 border-b ${sidebarTheme.border}`}>
        <button
          onClick={handleNewChat}
          disabled={isCreating || aiModels.length === 0}
          className={`w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${
            isCollapsed ? 'px-2' : ''
          }`}
        >
          {isCollapsed ? (
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            isCreating ? "Creating..." : "New Chat"
          )}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {!isCollapsed && (
            <h3 className={`text-sm font-medium ${sidebarTheme.textSecondary} mb-3`}>Recent Chats</h3>
          )}
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat._id}
                to={`/chat/${chat._id}`}
                className={`block p-3 rounded-md text-sm group relative ${
                  chatId === chat._id
                    ? sidebarTheme.active
                    : `${sidebarTheme.text} ${sidebarTheme.hover}`
                }`}
              >
                {isCollapsed ? (
                  <div className="flex justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                ) : (
                  <>
                    <div className="font-medium truncate">{chat.title}</div>
                    <div className={`text-xs ${sidebarTheme.textSecondary} mt-1`}>
                      {chat.modelId || "Unknown Model"}
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(chat._id, e)}
                      disabled={deletingChatId === chat._id}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                    >
                      {deletingChatId === chat._id ? "Deleting..." : "×"}
                    </button>
                  </>
                )}
              </Link>
            ))}
            {chats.length === 0 && !isCollapsed && (
              <p className={`${sidebarTheme.textSecondary} text-sm`}>No chats yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Model Info */}
      {!isCollapsed && (
        <div className={`p-4 border-t ${sidebarTheme.border}`}>
          <h3 className={`text-sm font-medium ${sidebarTheme.textSecondary} mb-2`}>Available Models</h3>
          <div className="space-y-1">
            {aiModels.map((model) => (
              <div key={model._id} className={`text-xs ${sidebarTheme.text}`}>
                {model.name}
              </div>
            ))}
            {aiModels.length === 0 && (
              <p className={`text-xs ${sidebarTheme.textSecondary}`}>No models configured</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
