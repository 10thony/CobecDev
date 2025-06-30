import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Plus, X } from "lucide-react";

type HelpLink = {
  title: string;
  url: string;
  description?: string;
};

export function AdminPage() {
  const aiModels = useQuery(api.aiModels.listAll) || [];
  const createModel = useMutation(api.aiModels.create);
  const updateModel = useMutation(api.aiModels.update);
  const removeModel = useMutation(api.aiModels.remove);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    provider: "",
    modelId: "",
    apiKeyEnvVar: "",
    description: "",
    maxTokens: "",
    temperature: "",
    helpLinks: [] as HelpLink[],
  });

  const [newHelpLink, setNewHelpLink] = useState<HelpLink>({
    title: "",
    url: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "",
      modelId: "",
      apiKeyEnvVar: "",
      description: "",
      maxTokens: "",
      temperature: "",
      helpLinks: [],
    });
    setNewHelpLink({
      title: "",
      url: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const data = {
        name: formData.name,
        provider: formData.provider,
        modelId: formData.modelId,
        apiKeyEnvVar: formData.apiKeyEnvVar,
        description: formData.description || undefined,
        maxTokens: formData.maxTokens ? parseInt(formData.maxTokens) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        helpLinks: formData.helpLinks,
      };

      if (editingId) {
        await updateModel({ id: editingId as any, ...data });
      } else {
        await createModel(data);
      }
      
      resetForm();
    } catch (error) {
      console.error("Failed to save model:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (model: any) => {
    setFormData({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      apiKeyEnvVar: model.apiKeyEnvVar,
      description: model.description || "",
      maxTokens: model.maxTokens?.toString() || "",
      temperature: model.temperature?.toString() || "",
      helpLinks: model.helpLinks || [],
    });
    setEditingId(model._id);
  };

  const addHelpLink = () => {
    if (newHelpLink.title && newHelpLink.url) {
      setFormData({
        ...formData,
        helpLinks: [...formData.helpLinks, { ...newHelpLink }],
      });
      setNewHelpLink({
        title: "",
        url: "",
        description: "",
      });
    }
  };

  const removeHelpLink = (index: number) => {
    setFormData({
      ...formData,
      helpLinks: formData.helpLinks.filter((_, i) => i !== index),
    });
  };

  const handleToggleActive = async (model: any) => {
    try {
      await updateModel({
        id: model._id,
        isActive: !model.isActive,
      });
    } catch (error) {
      console.error("Failed to toggle model:", error);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    
    try {
      await removeModel({ id: modelId as any });
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  };

  return (
    <div className="h-full flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
      <div className="max-w-6xl mx-auto min-h-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add/Edit Model Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingId ? "Edit Model" : "Add New AI Model"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., GPT-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="cohere">Cohere</option>
                  <option value="huggingface">Hugging Face</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model ID
                </label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., gpt-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key Environment Variable
                </label>
                <input
                  type="text"
                  value={formData.apiKeyEnvVar}
                  onChange={(e) => setFormData({ ...formData, apiKeyEnvVar: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., OPENAI_API_KEY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Brief description of the model"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Tokens (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="4096"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temperature (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.7"
                  />
                </div>
              </div>

              {/* Help Links Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Help Links</h3>
                
                {/* Existing Help Links */}
                {formData.helpLinks.length > 0 && (
                  <div className="space-y-2">
                    {formData.helpLinks.map((link, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{link.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{link.url}</div>
                          {link.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{link.description}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHelpLink(index)}
                          className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Help Link Form */}
                <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link Title
                    </label>
                    <input
                      type="text"
                      value={newHelpLink.title}
                      onChange={(e) => setNewHelpLink({ ...newHelpLink, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., API Documentation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      value={newHelpLink.url}
                      onChange={(e) => setNewHelpLink({ ...newHelpLink, url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., https://docs.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newHelpLink.description}
                      onChange={(e) => setNewHelpLink({ ...newHelpLink, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Brief description of the link"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addHelpLink}
                    disabled={!newHelpLink.title || !newHelpLink.url}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    <span>Add Help Link</span>
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
                >
                  {isCreating ? "Saving..." : editingId ? "Update Model" : "Add Model"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Models List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Configured Models</h2>
            
            <div className="space-y-4">
              {aiModels.map((model) => (
                <div
                  key={model._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{model.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            model.isActive
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {model.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {model.provider} • {model.modelId}
                      </p>
                      {model.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{model.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(model)}
                        className={`px-3 py-1 text-xs rounded ${
                          model.isActive
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                        }`}
                      >
                        {model.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleEdit(model)}
                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(model._id)}
                        className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {aiModels.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No AI models configured yet. Add your first model above.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Setup Instructions</h3>
          <div className="text-blue-800 dark:text-blue-300 space-y-2">
            <p>1. Add AI models using the form above</p>
            <p>2. Set up environment variables for API keys in your Convex deployment</p>
            <p>3. Users will be able to select from active models when creating chats</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-4">
              <strong>Note:</strong> Currently using mock responses. Configure real API keys to enable actual AI responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
