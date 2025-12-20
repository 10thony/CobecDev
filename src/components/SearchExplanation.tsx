import React from 'react';
import { TronPanel } from './TronPanel';
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
    if (relevance >= 0.8) return 'text-neon-success';
    if (relevance >= 0.6) return 'text-neon-warning';
    if (relevance >= 0.4) return 'text-neon-error';
    return 'text-tron-gray';
  };

  const getRelevanceIcon = (relevance: number) => {
    if (relevance >= 0.8) return <CheckCircle className="h-4 w-4 text-neon-success" />;
    if (relevance >= 0.6) return <TrendingUp className="h-4 w-4 text-neon-warning" />;
    if (relevance >= 0.4) return <AlertTriangle className="h-4 w-4 text-neon-error" />;
    return <Clock className="h-4 w-4 text-neon-error" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'tron-badge-success';
    if (confidence >= 0.6) return 'tron-badge-warning';
    if (confidence >= 0.4) return 'tron-badge-error';
    return 'tron-badge-error';
  };

  return (
    <TronPanel className={className} title="Why This Result Matched" icon={<Info className="h-5 w-5" />}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(explanation.confidenceScore)}`}>
          {explanation.confidenceScore >= 0.8 ? 'High' : 
           explanation.confidenceScore >= 0.6 ? 'Medium' : 
           explanation.confidenceScore >= 0.4 ? 'Low' : 'Poor'} Confidence
        </div>
      </div>

      {/* Query Display */}
      <div className="mb-4 p-3 bg-tron-bg-card rounded-lg border border-tron-cyan/30">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="h-4 w-4 text-tron-cyan" />
          <span className="text-sm font-medium text-tron-white">Search Query</span>
        </div>
        <p className="text-tron-gray font-medium">"{explanation.query}"</p>
      </div>

      {/* Overall Similarity */}
      <div className="mb-4 p-3 bg-tron-bg-card rounded-lg border border-tron-cyan/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-neon-warning" />
            <span className="text-sm font-medium text-tron-gray">Overall Similarity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="tron-progress w-20">
              <div 
                className="tron-progress-bar bg-gradient-to-r from-tron-cyan to-tron-blue"
                style={{ width: `${explanation.overallSimilarity * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-tron-white">
              {(explanation.overallSimilarity * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Field Matches */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-tron-gray mb-3">Field-Level Matches</h5>
        <div className="space-y-2">
          {explanation.fieldMatches.map((field, index) => (
            <div key={index} className="p-3 bg-tron-bg-card rounded-lg border-l-4 border-tron-cyan">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getRelevanceIcon(field.similarity)}
                  <span className="text-sm font-medium text-tron-white capitalize">
                    {field.field}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="tron-progress w-16">
                    <div 
                      className="tron-progress-bar bg-tron-cyan"
                      style={{ width: `${field.similarity * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${getRelevanceColor(field.similarity)}`}>
                    {(field.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              {field.matchedContent && (
                <div className="text-sm text-tron-gray bg-tron-bg-panel p-2 rounded border border-tron-cyan/20">
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
          <h5 className="text-sm font-medium text-tron-gray mb-3">Skill Matches</h5>
          <div className="flex flex-wrap gap-2">
            {explanation.skillMatches.map((skill, index) => (
              <span 
                key={index}
                className="tron-badge tron-badge-success"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience Alignment */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-tron-white mb-3">Experience Alignment</h5>
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-purple-500" />
          <div className="flex-1 bg-tron-bg-card rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${explanation.experienceAlignment * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-tron-white">
            {(explanation.experienceAlignment * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Matched Text Snippets */}
      {explanation.matchedText.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-tron-gray mb-3">Key Text Matches</h5>
          <div className="space-y-2">
            {explanation.matchedText.slice(0, 3).map((text, index) => (
              <div key={index} className="p-2 bg-tron-bg-card rounded border border-neon-warning/30">
                <p className="text-sm text-neon-warning">
                  "{text.length > 100 ? text.substring(0, 100) + '...' : text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </TronPanel>
  );
}
