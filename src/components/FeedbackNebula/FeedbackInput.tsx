import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles, Bug, Lightbulb, HelpCircle, Heart, MessageSquare } from 'lucide-react';
import { TronButton } from '../TronButton';
import { detectSentiment, normalizeText } from './useFeedbackClustering';
import { Sentiment } from './types';

interface QuickTag {
  id: string;
  label: string;
  icon: React.ReactNode;
  sentiment?: Sentiment;
}

const QUICK_TAGS: QuickTag[] = [
  { id: 'fun', label: 'Fun', icon: <Sparkles className="w-4 h-4" />, sentiment: 'positive' },
  { id: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" />, sentiment: 'negative' },
  { id: 'feature', label: 'Feature', icon: <Lightbulb className="w-4 h-4" />, sentiment: 'suggestion' },
  { id: 'question', label: 'Question', icon: <HelpCircle className="w-4 h-4" />, sentiment: 'neutral' },
  { id: 'praise', label: 'Praise', icon: <Heart className="w-4 h-4" />, sentiment: 'positive' },
  { id: 'other', label: 'Other', icon: <MessageSquare className="w-4 h-4" /> },
];

interface FeedbackInputProps {
  onSubmit: (text: string, tags: string[], sentiment: Sentiment) => Promise<void>;
  isSubmitting?: boolean;
  maxLength?: number;
  existingClusters?: Array<{ id: string; text: string; count: number }>;
  onMeToo?: (clusterId: string) => Promise<void>;
}

export function FeedbackInput({
  onSubmit,
  isSubmitting = false,
  maxLength = 500,
  existingClusters = [],
  onMeToo,
}: FeedbackInputProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detectedSentiment, setDetectedSentiment] = useState<Sentiment>('neutral');

  const handleTextChange = (text: string) => {
    setFeedbackText(text);
    if (text.trim()) {
      const sentiment = detectSentiment(text);
      setDetectedSentiment(sentiment);
    } else {
      setDetectedSentiment('neutral');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      return;
    }

    if (feedbackText.length > maxLength) {
      return;
    }

    await onSubmit(feedbackText.trim(), selectedTags, detectedSentiment);
    setFeedbackText('');
    setSelectedTags([]);
    setDetectedSentiment('neutral');
  };

  const handleMeToo = async (clusterId: string) => {
    if (onMeToo) {
      await onMeToo(clusterId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick tags */}
      <div className="flex flex-wrap gap-2">
        {QUICK_TAGS.map(tag => (
          <motion.button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all duration-200
              flex items-center gap-1.5
              ${selectedTags.includes(tag.id)
                ? 'bg-tron-cyan/20 border-tron-cyan text-tron-cyan'
                : 'bg-tron-bg-elevated border-tron-cyan/20 text-tron-gray hover:border-tron-cyan/40'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tag.icon}
            {tag.label}
          </motion.button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={feedbackText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Share your feedback..."
            rows={3}
            maxLength={maxLength}
            className="w-full px-4 py-3 bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-tron-gray">
            <span>
              {detectedSentiment !== 'neutral' && (
                <span className={`capitalize ${
                  detectedSentiment === 'positive' ? 'text-green-400' :
                  detectedSentiment === 'negative' ? 'text-red-400' :
                  'text-amber-400'
                }`}>
                  {detectedSentiment}
                </span>
              )}
            </span>
            <span>
              {feedbackText.length}/{maxLength}
            </span>
          </div>
        </div>

        {/* Quick "Me too" buttons for existing clusters */}
        {existingClusters.length > 0 && feedbackText.length === 0 && (
          <div className="space-y-2">
            <div className="text-xs text-tron-gray">Or agree with existing feedback:</div>
            <div className="flex flex-wrap gap-2">
              {existingClusters.slice(0, 3).map((cluster) => (
                <motion.button
                  key={cluster.id}
                  type="button"
                  onClick={() => handleMeToo(cluster.id)}
                  className="px-3 py-1.5 bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg text-xs text-tron-white hover:border-tron-cyan/40 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✋ Me too: {cluster.text.slice(0, 30)}{cluster.text.length > 30 ? '...' : ''} ({cluster.count})
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <TronButton
            type="submit"
            variant="primary"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            disabled={isSubmitting || !feedbackText.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </TronButton>
        </div>
      </form>
    </div>
  );
}

