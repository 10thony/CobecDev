import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function HomePage() {
  const chats = useQuery(api.chats.list) || [];
  const aiModels = useQuery(api.aiModels.listActive) || [];
  const loggedInUser = useQuery(api.auth.getCurrentUser);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  
  const makeAdmin = useMutation(api.userRoles.makeCurrentUserAdmin);
  const seedModels = useMutation(api.aiModels.seedModels);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSetupApp = async () => {
    setIsSeeding(true);
    try {
      await makeAdmin();
      await seedModels();
    } catch (error) {
      console.error("Setup failed:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to AJ.Chat
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Chat with AI models in real-time
        </p>

        {loggedInUser && (
          <div className="mb-8">
            <p className="text-lg text-gray-700 dark:text-gray-200">
              Hello, {loggedInUser.email}!
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Your Chats</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {chats.length} active conversation{chats.length !== 1 ? "s" : ""}
            </p>
            {chats.length > 0 && (
              <div className="space-y-2">
                {chats.slice(0, 3).map((chat) => (
                  <Link
                    key={chat._id}
                    to={`/chat/${chat._id}`}
                    className="block p-2 bg-gray-50 dark:bg-gray-700 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{chat.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.modelId}
                    </div>
                  </Link>
                ))}
                {chats.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{chats.length - 3} more chats
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">AI Models</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {aiModels.length} model{aiModels.length !== 1 ? "s" : ""} available
            </p>
            <div className="space-y-2">
              {aiModels.map((model) => (
                <div
                  key={model._id}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-left"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{model.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {model.provider} • {model.modelId}
                  </div>
                </div>
              ))}
              {aiModels.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No models configured yet
                </p>
              )}
            </div>
          </div>
        </div>

        {aiModels.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 mb-4">
              No AI models are configured yet.
            </p>
            {userRole !== "admin" && (
              <button
                onClick={handleSetupApp}
                disabled={isSeeding}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
              >
                {isSeeding ? "Setting up..." : "Setup App (Make me admin & add models)"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
