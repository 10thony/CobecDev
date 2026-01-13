import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export function HomePage() {
  const chats = useQuery(api.chats.list) || [];
  const aiModels = useQuery(api.aiModels.listActive) || [];
  const loggedInUser = useQuery(api.auth.getCurrentUser);
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const isCobecAdmin = useQuery(api.cobecAdmins.checkIfUserIsCobecAdmin);
  const { userId } = useAuth();
  
  const makeAdmin = useMutation(api.userRoles.makeCurrentUserAdmin);
  const seedModels = useMutation(api.aiModels.seedModels);
  const [isSeeding, setIsSeeding] = useState(false);

  // Store the admin status in localStorage when it's available
  useEffect(() => {
    if (isCobecAdmin !== undefined && isCobecAdmin !== null) {
      console.log('✅ Cobecadmins check completed:', isCobecAdmin);
      localStorage.setItem('isCobecAdmin', JSON.stringify(isCobecAdmin));
      localStorage.setItem('cobecAdminCheckTime', Date.now().toString());
    }
  }, [isCobecAdmin]);

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
        <h1 className="text-4xl md:text-5xl font-display font-bold text-mint_cream-500 mb-4">
          Welcome to Cobecium
        </h1>
        <p className="text-xl text-powder_blue-700 mb-8">
          Build tools that help you find opportunities faster
        </p>

        {loggedInUser && (
          <div className="mb-8">
            <p className="text-lg text-mint-cream-500">
              Hello, {loggedInUser.email}!
            </p>
            {isCobecAdmin !== undefined && isCobecAdmin !== null && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ isCobecAdmin ? 'bg-yale_blue-500 text-mint_cream-500' : 'bg-berkeley_blue-400 text-mint_cream-500' }`}>
                  {isCobecAdmin ? 'Cobec Admin' : 'Standard User'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-berkeley_blue-500 p-6 rounded-lg shadow-sm border border-powder_blue-400">
            <h3 className="text-lg font-semibold mb-2 text-mint_cream-500">Your Chats</h3>
            <p className="text-powder_blue-700 mb-4">
              {chats.length} active conversation{chats.length !== 1 ? "s" : ""}
            </p>
            {chats.length > 0 && (
              <div className="space-y-2">
                {chats.slice(0, 3).map((chat) => (
                  <Link
                    key={chat._id}
                    to={`/chat/${chat._id}`}
                    className="block p-2 bg-oxford_blue-400 rounded text-left hover:bg-yale_blue-400"
                  >
                    <div className="font-medium text-sm text-mint_cream-500">{chat.title}</div>
                    <div className="text-xs text-powder_blue-700">
                      {chat.modelId}
                    </div>
                  </Link>
                ))}
                {chats.length > 3 && (
                  <p className="text-sm text-powder_blue-700">
                    +{chats.length - 3} more chats
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-berkeley_blue-500 p-6 rounded-lg shadow-sm border border-powder_blue-400">
            <h3 className="text-lg font-semibold mb-2 text-mint_cream-500">AI Models</h3>
            <p className="text-powder_blue-700 mb-4">
              {aiModels.length} model{aiModels.length !== 1 ? "s" : ""} available
            </p>
            <div className="space-y-2">
              {aiModels.map((model) => (
                <div
                  key={model._id}
                  className="p-2 bg-oxford_blue-400 rounded text-left"
                >
                  <div className="font-medium text-sm text-mint_cream-500">{model.name}</div>
                  <div className="text-xs text-powder_blue-700">
                    {model.provider} • {model.modelId}
                  </div>
                </div>
              ))}
              {aiModels.length === 0 && (
                <p className="text-sm text-mint-cream-700">
                  No models configured yet
                </p>
              )}
            </div>
          </div>
        </div>

        {aiModels.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 mb-4">
              No AI models are configured yet.
            </p>
            {userRole !== "admin" && (
              <button
                onClick={handleSetupApp}
                disabled={isSeeding}
                className="bg-yale_blue-500 text-mint_cream-500 px-4 py-2 rounded-md hover:bg-yale_blue-600 disabled:opacity-50"
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
