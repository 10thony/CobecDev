import React from 'react';
import { 
  Info, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Star,
  Zap
} from 'lucide-react';

export interface SearchExplanation {
  query: string;
  matchedText: string[];
  fieldMatches: {
    field: string;
    relevance: number;
    matchedContent: string;
    similarity: number;
  }[];
  overallSimilarity: number;
  confidenceScore: number;
  skillMatches: string[];
  experienceAlignment: number;
}

interface SearchExplanationProps {
  explanation: SearchExplanation;
  className?: string;
}

export function SearchExplanation({ explanation, className = '' }: SearchExplanationProps) {
  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return 'text-green-600 dark:text-green-400';
    if (relevance >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    if (relevance >= 0.4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRelevanceIcon = (relevance: number) => {
    if (relevance >= 0.8) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (relevance >= 0.6) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    if (relevance >= 0.4) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <Clock className="h-4 w-4 text-red-500" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
    if (confidence >= 0.4) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Why This Result Matched
          </h4>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(explanation.confidenceScore)}`}>
          {explanation.confidenceScore >= 0.8 ? 'High' : 
           explanation.confidenceScore >= 0.6 ? 'Medium' : 
           explanation.confidenceScore >= 0.4 ? 'Low' : 'Poor'} Confidence
        </div>
      </div>

      {/* Query Display */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Search Query</span>
        </div>
        <p className="text-blue-800 dark:text-blue-200 font-medium">"{explanation.query}"</p>
      </div>

      {/* Overall Similarity */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Similarity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${explanation.overallSimilarity * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {(explanation.overallSimilarity * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Field Matches */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Field-Level Matches</h5>
        <div className="space-y-2">
          {explanation.fieldMatches.map((field, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getRelevanceIcon(field.similarity)}
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {field.field}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${field.similarity * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${getRelevanceColor(field.similarity)}`}>
                    {(field.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              {field.matchedContent && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border">
                  <span className="font-medium">Matched Content:</span> {field.matchedContent}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Skill Matches */}
      {explanation.skillMatches.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Skill Matches</h5>
          <div className="flex flex-wrap gap-2">
            {explanation.skillMatches.map((skill, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-medium rounded-full border border-green-200 dark:border-green-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience Alignment */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Experience Alignment</h5>
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-purple-500" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${explanation.experienceAlignment * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {(explanation.experienceAlignment * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Matched Text Snippets */}
      {explanation.matchedText.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Key Text Matches</h5>
          <div className="space-y-2">
            {explanation.matchedText.slice(0, 3).map((text, index) => (
              <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  "{text.length > 100 ? text.substring(0, 100) + '...' : text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
