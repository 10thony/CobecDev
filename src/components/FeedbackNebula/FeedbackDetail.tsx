import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, Clock, Users, TrendingUp } from 'lucide-react';
import { FeedbackCluster, FeedbackEntry, Sentiment } from './types';
import { TronButton } from '../TronButton';

interface FeedbackDetailProps {
  cluster: FeedbackCluster | null;
  feedbackEntries: FeedbackEntry[];
  isOpen: boolean;
  onClose: () => void;
  onMeToo?: () => Promise<void>;
  isAdmin?: boolean;
}

const sentimentLabels: Record<Sentiment, string> = {
  positive: 'Positive',
  negative: 'Negative',
  suggestion: 'Suggestion',
  neutral: 'Neutral',
};

const sentimentColors: Record<Sentiment, string> = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  suggestion: 'text-amber-400',
  neutral: 'text-tron-gray',
};

export function FeedbackDetail({
  cluster,
  feedbackEntries,
  isOpen,
  onClose,
  onMeToo,
  isAdmin = false,
}: FeedbackDetailProps) {
  if (!cluster) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUniqueUsers = () => {
    const users = new Set(feedbackEntries.map(e => e.submittedBy).filter(Boolean));
    return users.size;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-tron-bg-deep border-l border-tron-cyan/20 shadow-2xl z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-tron-white mb-2">
                    Feedback Details
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-tron-gray">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Heat: {cluster.heat.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {getUniqueUsers()} {getUniqueUsers() === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-tron-bg-elevated rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-tron-gray hover:text-tron-white" />
                </button>
              </div>

              {/* Main feedback text */}
              <div className="bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg p-4">
                <p className="text-tron-white whitespace-pre-wrap break-words">
                  {cluster.canonicalText}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-tron-cyan">{cluster.count}</div>
                  <div className="text-xs text-tron-gray mt-1">Submissions</div>
                </div>
                <div className="bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-tron-cyan">{getUniqueUsers()}</div>
                  <div className="text-xs text-tron-gray mt-1">Unique Users</div>
                </div>
                <div className="bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg p-4 text-center">
                  <div className="text-sm font-bold text-tron-cyan">
                    {formatDate(cluster.firstSubmittedAt).split(',')[0]}
                  </div>
                  <div className="text-xs text-tron-gray mt-1">First Submitted</div>
                </div>
              </div>

              {/* Me too button */}
              {onMeToo && (
                <TronButton
                  variant="primary"
                  icon={<ThumbsUp className="w-4 h-4" />}
                  onClick={onMeToo}
                  className="w-full"
                >
                  Me too ✋
                </TronButton>
              )}

              {/* Submission history */}
              <div>
                <h3 className="text-lg font-semibold text-tron-white mb-3">
                  Submission History ({feedbackEntries.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {feedbackEntries
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((entry) => (
                      <motion.div
                        key={entry._id}
                        className="bg-tron-bg-elevated border border-tron-cyan/10 rounded-lg p-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="text-tron-white text-sm whitespace-pre-wrap break-words">
                          {entry.text}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-tron-gray">
                          <div className="flex items-center gap-2">
                            <span>
                              {entry.submittedBy ? 'Authenticated user' : 'Anonymous'}
                            </span>
                            {entry.sentiment && (
                              <span className={sentimentColors[entry.sentiment]}>
                                {sentimentLabels[entry.sentiment]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {entry.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-tron-cyan/10 border border-tron-cyan/20 rounded text-xs text-tron-cyan"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* Admin actions */}
              {isAdmin && (
                <div className="pt-4 border-t border-tron-cyan/10">
                  <h3 className="text-sm font-semibold text-tron-white mb-2">Admin Actions</h3>
                  <div className="flex gap-2">
                    <TronButton variant="outline" size="sm">
                      Mark Resolved
                    </TronButton>
                    <TronButton variant="outline" size="sm" color="orange">
                      Delete Cluster
                    </TronButton>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

