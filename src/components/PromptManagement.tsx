import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  Search,
  Filter
} from 'lucide-react';

interface PromptManagementProps {
  className?: string;
}

interface VectorSearchPrompt {
  id: string;
  text: string;
  category: string;
  isDefault: boolean;
  usageCount: number;
  effectiveness: number;
  createdAt: number;
}

export function PromptManagement({ className = '' }: PromptManagementProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  const prompts = useQuery(api.vectorSearchPrompts.getVectorSearchPrompts);
  const regenerationStatus = useQuery(api.vectorSearchPrompts.getEmbeddingRegenerationStatus);

  // Mutations
  const addPrompt = useMutation(api.vectorSearchPrompts.addVectorSearchPrompt);
  const updatePrompt = useMutation(api.vectorSearchPrompts.updateVectorSearchPrompt);
  const deletePrompt = useMutation(api.vectorSearchPrompts.deleteVectorSearchPrompt);
  const markAsRegenerated = useMutation(api.vectorSearchPrompts.markPromptsAsRegenerated);
  const initializeDefaults = useMutation(api.vectorSearchPrompts.initializeDefaultPrompts);
  const forceRegenerateAll = useMutation(api.vectorSearchPrompts.forceRegenerateAllEmbeddings);

  // Filter and search prompts
  const filteredPrompts = prompts?.prompts?.filter((prompt: VectorSearchPrompt) => {
    const matchesCategory = filterCategory === 'All' || prompt.category === filterCategory;
    const matchesSearch = searchTerm === '' || 
      prompt.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Get unique categories
  const categories = ['All', ...new Set(prompts?.prompts?.map((p: VectorSearchPrompt) => p.category) || [])];

  const handleAddPrompt = async () => {
    if (!newPrompt.trim()) return;
    
    try {
      await addPrompt({
        text: newPrompt,
        category: newCategory
      });
      setNewPrompt('');
      setNewCategory('Custom');
    } catch (error) {
      console.error('Error adding prompt:', error);
    }
  };

  const handleEditPrompt = (prompt: VectorSearchPrompt) => {
    setEditingPrompt(prompt.id);
    setEditText(prompt.text);
    setEditCategory(prompt.category);
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt || !editText.trim()) return;
    
    try {
      await updatePrompt({
        id: editingPrompt as any,
        text: editText,
        category: editCategory
      });
      setEditingPrompt(null);
      setEditText('');
      setEditCategory('');
    } catch (error) {
      console.error('Error updating prompt:', error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      await deletePrompt({ id: promptId as any });
    } catch (error) {
      console.error('Error deleting prompt:', error);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      await initializeDefaults({});
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  };

  const handleMarkAsRegenerated = async () => {
    try {
      await markAsRegenerated({});
    } catch (error) {
      console.error('Error marking as regenerated:', error);
    }
  };

  const handleForceRegenerateAll = async () => {
    if (!confirm('This will regenerate ALL embeddings. This may take several minutes. Continue?')) return;
    
    try {
      const result = await forceRegenerateAll({ batchSize: 5 });
      alert(`Regeneration completed! Processed ${result.results.jobPostings.processed} job postings and ${result.results.resumes.processed} resumes.`);
    } catch (error) {
      console.error('Error forcing regeneration:', error);
      alert('Error during regeneration. Check console for details.');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-sm border border-yale-blue-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-mint-cream-DEFAULT">
              Vector Search Prompts
            </h2>
            <p className="text-mint-cream-600">
              Manage prompts used for embedding generation and semantic search
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        {/* Regeneration Status */}
        {regenerationStatus?.needsRegeneration && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">
                  Embeddings Need Regeneration
                </h4>
                <p className="text-sm text-yellow-700">
                  {regenerationStatus.promptsNeedingRegeneration} prompts have been modified. 
                  Regenerate embeddings for optimal search results.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleMarkAsRegenerated}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                >
                  Mark as Regenerated
                </button>
                <button
                  onClick={handleForceRegenerateAll}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Force Regenerate All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 bg-yale-blue-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <Search className="h-5 w-5 text-powder-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-powder-blue-600">Total Prompts</p>
                <p className="text-2xl font-bold text-blue-900">
                  {prompts?.totalCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-mint-cream-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-mint-cream-600">Categories</p>
                <p className="text-2xl font-bold text-green-900">
                  {categories.length - 1}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-powder-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-powder-blue-600">Status</p>
                <p className="text-2xl font-bold text-purple-900">
                  {regenerationStatus?.needsRegeneration ? 'Update Needed' : 'Up to Date'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Prompt */}
      <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-sm border border-yale-blue-300 p-6">
        <h3 className="text-lg font-semibold text-mint-cream-DEFAULT mb-4">
          Add New Prompt
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-mint-cream-500 mb-2">
              Prompt Text
            </label>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g., 'Find candidates with iOS development experience'"
              className="w-full px-3 py-2 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
              rows={3}
            />
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-mint-cream-500 mb-2">
                Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Mobile Development, Technical Skills"
                className="w-full px-3 py-2 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddPrompt}
                disabled={!newPrompt.trim()}
                className="px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Prompt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Initialize Defaults */}
      {prompts?.totalCount === 0 && (
        <div className="bg-blue-50 bg-yale-blue-500/20 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center">
            <Lightbulb className="h-6 w-6 text-powder-blue-600 mr-3" />
            <div className="flex-1">
              <h4 className="text-lg font-medium text-blue-900 mb-2">
                Initialize Default Prompts
              </h4>
              <p className="text-blue-800 text-sm">
                Load pre-configured prompts from the VECTOR_SEARCH_PROMPTS.md file to get started quickly.
              </p>
            </div>
            <button
              onClick={handleInitializeDefaults}
              className="px-4 py-2 bg-yale-blue-DEFAULT text-white rounded-md hover:bg-yale-blue-600"
            >
              Initialize Defaults
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-berkeley-blue-DEFAULT rounded-lg shadow-sm border border-yale-blue-300 p-6">
        <h3 className="text-lg font-semibold text-mint-cream-DEFAULT mb-4">
          Manage Prompts
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-mint-cream-500 mb-2">
              Search Prompts
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mint-cream-700" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompt text..."
                className="w-full pl-10 pr-3 py-2 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-mint-cream-500 mb-2">
              Filter by Category
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mint-cream-700" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Prompts List */}
        <div className="space-y-3">
          {filteredPrompts.map((prompt: VectorSearchPrompt) => (
            <div
              key={prompt.id}
              className="p-4 border border-yale-blue-300 rounded-lg bg-mint-cream-900"
            >
              {editingPrompt === prompt.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
                    rows={2}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="Category"
                      className="px-3 py-1 border border-yale-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-powder-blue-600 text-mint-cream-DEFAULT"
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPrompt(null)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-yale-blue-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-mint-cream-DEFAULT font-medium mb-1">
                      {prompt.text}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-mint-cream-700">
                      <span className="bg-yale-blue-500 bg-yale-blue-500/30 text-blue-800 px-2 py-1 rounded">
                        {prompt.category}
                      </span>
                      <span>Used {prompt.usageCount} times</span>
                      <span>Effectiveness: {(prompt.effectiveness * 100).toFixed(0)}%</span>
                      {prompt.isDefault && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!prompt.isDefault && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditPrompt(prompt)}
                        className="p-1 text-mint-cream-700 hover:text-powder-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="p-1 text-mint-cream-700 hover:text-mint-cream-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-mint-cream-700 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-mint-cream-DEFAULT mb-2">
                No Prompts Found
              </h4>
              <p className="text-mint-cream-600">
                {searchTerm || filterCategory !== 'All' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add your first prompt to get started.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
