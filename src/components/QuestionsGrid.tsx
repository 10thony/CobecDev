import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  HelpCircle,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Plus,
  BarChart3,
  Tag,
  RefreshCw
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';

interface SemanticQuestion {
  _id: Id<"semanticQuestions">;
  question: string;
  category: string;
  subCategory?: string;
  description: string;
  weight: number;
  isActive: boolean;
  usageCount: number;
  effectiveness?: number;
  exampleAnswer?: string;
  tags: string[];
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

type SortField = keyof SemanticQuestion;
type SortOrder = 'asc' | 'desc' | null;

interface QuestionsGridProps {
  className?: string;
}

export function QuestionsGrid({ className = '' }: QuestionsGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SemanticQuestion | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Query all semantic questions
  const questions = useQuery(api.semanticQuestions.list);
  const stats = useQuery(api.semanticQuestions.getStats);

  // Mutations
  const toggleActive = useMutation(api.semanticQuestions.toggleActive);
  const removeQuestion = useMutation(api.semanticQuestions.remove);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: null -> asc -> desc -> null
      if (sortOrder === null) {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    if (!questions) return [];
    const uniqueCategories = Array.from(new Set(questions.map(q => q.category)));
    return uniqueCategories.sort();
  }, [questions]);

  // Filter and sort questions
  const filteredAndSortedQuestions = useMemo(() => {
    if (!questions) return [];

    let filtered = questions.filter(question => {
      // Category filter
      if (categoryFilter !== 'all' && question.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        question.question.toLowerCase().includes(searchLower) ||
        question.description.toLowerCase().includes(searchLower) ||
        question.category.toLowerCase().includes(searchLower) ||
        (question.subCategory?.toLowerCase().includes(searchLower)) ||
        question.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    });

    // Apply sorting
    if (sortField && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle different types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return sortOrder === 'asc' 
            ? (aValue === bValue ? 0 : aValue ? 1 : -1)
            : (aValue === bValue ? 0 : bValue ? 1 : -1);
        }

        return 0;
      });
    }

    return filtered;
  }, [questions, searchTerm, sortField, sortOrder, categoryFilter]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50 text-tron-gray" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="w-4 h-4 text-tron-cyan" />;
    }
    if (sortOrder === 'desc') {
      return <ArrowDown className="w-4 h-4 text-tron-cyan" />;
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50 text-tron-gray" />;
  };

  // Handle toggle active
  const handleToggleActive = async (id: Id<"semanticQuestions">) => {
    try {
      await toggleActive({ id });
    } catch (error) {
      console.error('Error toggling question active status:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id: Id<"semanticQuestions">) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await removeQuestion({ id });
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  if (!questions || !stats) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-tron-cyan" />
        <span className="ml-2 text-tron-gray">Loading semantic questions...</span>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Semantic Questions</h1>
          <p className="text-lg text-tron-gray">
            {filteredAndSortedQuestions.length} of {questions.length} questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-tron-cyan" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TronStatCard
          label="Total Questions"
          value={stats.total.toString()}
          icon={<HelpCircle className="w-8 h-8" />}
          color="cyan"
        />
        <TronStatCard
          label="Active"
          value={stats.active.toString()}
          icon={<CheckCircle className="w-8 h-8" />}
          color="cyan"
        />
        <TronStatCard
          label="Total Usage"
          value={stats.totalUsage.toString()}
          icon={<BarChart3 className="w-8 h-8" />}
          color="blue"
        />
        <TronStatCard
          label="Avg Effectiveness"
          value={`${(stats.averageEffectiveness * 100).toFixed(0)}%`}
          icon={<Tag className="w-8 h-8" />}
          color="orange"
        />
      </div>

      {/* Filters and Search */}
      <TronPanel title="Filters and Search" className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <TronButton
            onClick={() => setCategoryFilter('all')}
            variant={categoryFilter === 'all' ? 'primary' : 'outline'}
            color="cyan"
            size="sm"
          >
            All Categories
          </TronButton>
          {categories.map(category => (
            <TronButton
              key={category}
              onClick={() => setCategoryFilter(category)}
              variant={categoryFilter === category ? 'primary' : 'outline'}
              color="cyan"
              size="sm"
            >
              {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </TronButton>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tron-gray w-5 h-5" />
          <input
            type="text"
            placeholder="Search questions by text, description, category, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tron-input w-full pl-12 pr-4 py-3"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tron-gray hover:text-tron-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </TronPanel>

      {/* Table */}
      <TronPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tron-table w-full">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('question')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Question</span>
                    {renderSortIcon('question')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('category')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('subCategory')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Sub Category</span>
                    {renderSortIcon('subCategory')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('weight')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Weight</span>
                    {renderSortIcon('weight')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('usageCount')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Usage</span>
                    {renderSortIcon('usageCount')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('effectiveness')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Effectiveness</span>
                    {renderSortIcon('effectiveness')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('isActive')}
                  className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {renderSortIcon('isActive')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <HelpCircle className="w-12 h-12 mx-auto text-tron-gray mb-3" />
                    <p className="text-tron-gray text-lg">
                      {searchTerm || categoryFilter !== 'all' ? 'No questions found matching your filters' : 'No semantic questions available'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedQuestions.map((question) => (
                  <tr 
                    key={question._id}
                    className="hover:bg-tron-bg-card transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="font-medium text-tron-white line-clamp-2">
                          {question.question}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="tron-badge tron-badge-info">
                        {question.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-tron-gray text-sm">
                      {question.subCategory || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="tron-progress w-16">
                          <div 
                            className="tron-progress-bar bg-tron-cyan"
                            style={{ width: `${(question.weight / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-tron-white">
                          {question.weight}/10
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tron-white font-medium">
                      {question.usageCount}
                    </td>
                    <td className="px-6 py-4">
                      {question.effectiveness !== undefined ? (
                        <span className={`text-sm font-medium ${ question.effectiveness >= 0.7 ? 'text-neon-success' : question.effectiveness >= 0.4 ? 'text-neon-warning' : 'text-tron-gray' }`}>
                          {(question.effectiveness * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-sm text-tron-gray">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(question._id)}
                        className="flex items-center gap-1"
                      >
                        {question.isActive ? (
                          <CheckCircle className="w-5 h-5 text-neon-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-tron-gray" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {question.tags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index}
                            className="tron-badge tron-badge-info"
                          >
                            {tag}
                          </span>
                        ))}
                        {question.tags.length > 2 && (
                          <span className="tron-badge tron-badge-info">
                            +{question.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TronButton
                          onClick={() => setSelectedQuestion(question)}
                          variant="ghost"
                          color="cyan"
                          size="sm"
                          icon={<Eye className="w-4 h-4" />}
                          title="View details"
                        />
                        <TronButton
                          onClick={() => handleDelete(question._id)}
                          variant="ghost"
                          color="orange"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          title="Delete question"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TronPanel>

      {/* Question Details Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <TronPanel className="max-w-3xl w-full max-h-[90vh] overflow-hidden" title="Question Details" icon={<HelpCircle className="w-6 h-6" />}>
            <div className="flex items-center justify-end mb-4">
              <TronButton
                onClick={() => setSelectedQuestion(null)}
                variant="ghost"
                color="orange"
                size="sm"
                icon={<X className="w-6 h-6" />}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-6">
                {/* Question */}
                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Question</span>
                  <p className="text-lg font-medium text-tron-white leading-relaxed">
                    {selectedQuestion.question}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Description</span>
                  <p className="text-tron-gray leading-relaxed">
                    {selectedQuestion.description}
                  </p>
                </div>

                {/* Categories and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Category</span>
                    <span className="tron-badge tron-badge-info">
                      {selectedQuestion.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Sub Category</span>
                    <p className="text-tron-white">{selectedQuestion.subCategory || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Status</span>
                    <div className="flex items-center gap-2">
                      {selectedQuestion.isActive ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-neon-success" />
                          <span className="text-neon-success font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-tron-gray" />
                          <span className="text-tron-gray">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Weight</span>
                    <p className="text-tron-white font-medium">{selectedQuestion.weight}/10</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Usage Count</span>
                    <p className="text-2xl font-bold text-tron-cyan">{selectedQuestion.usageCount}</p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Effectiveness</span>
                    {selectedQuestion.effectiveness !== undefined ? (
                      <p className="text-2xl font-bold text-tron-white">
                        {(selectedQuestion.effectiveness * 100).toFixed(0)}%
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-tron-gray">N/A</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <span className="block text-sm font-medium text-tron-gray mb-2">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestion.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="tron-badge tron-badge-info"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Example Answer */}
                {selectedQuestion.exampleAnswer && (
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-2">Example Answer</span>
                    <p className="text-tron-gray leading-relaxed bg-tron-bg-card p-4 rounded-lg">
                      {selectedQuestion.exampleAnswer}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-tron-cyan/20">
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Created</span>
                    <p className="text-sm text-tron-gray">
                      {new Date(selectedQuestion.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-tron-gray mb-1">Last Updated</span>
                    <p className="text-sm text-tron-gray">
                      {new Date(selectedQuestion.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TronPanel>
        </div>
      )}
    </div>
  );
}

