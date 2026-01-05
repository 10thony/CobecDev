import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function FeedbackComponent() {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const allFeedback = useQuery(api.feedback.getAllFeedback) || [];
  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      toast.error('Please enter some feedback');
      return;
    }

    if (feedbackText.length > 1000) {
      toast.error('Feedback must be 1000 characters or less');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({ text: feedbackText.trim() });
      setFeedbackText('');
      toast.success('Thank you for your feedback!');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(`Failed to submit feedback: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Form */}
      <TronPanel 
        title="Leave Feedback" 
        icon={<MessageSquare className="w-5 h-5" />}
        glowColor="cyan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-tron-gray mb-2">
              Share your thoughts, suggestions, or feedback
            </label>
            <textarea
              id="feedback"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="We'd love to hear from you! Share your feedback, suggestions, or congratulations..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
            <div className="mt-1 text-xs text-tron-gray text-right">
              {feedbackText.length}/1000 characters
            </div>
          </div>
          <div className="flex justify-end">
            <TronButton
              type="submit"
              variant="primary"
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              disabled={isSubmitting || !feedbackText.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </TronButton>
          </div>
        </form>
      </TronPanel>

      {/* Feedback Display */}
      <TronPanel 
        title="Recent Feedback" 
        icon={<MessageSquare className="w-5 h-5" />}
        glowColor="cyan"
      >
        {allFeedback.length === 0 ? (
          <div className="text-center py-8 text-tron-gray">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No feedback yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {allFeedback.map((feedback) => (
              <div
                key={feedback._id}
                className="bg-tron-bg-elevated border border-tron-cyan/10 rounded-lg p-4 hover:border-tron-cyan/20 transition-colors"
              >
                <p className="text-tron-white whitespace-pre-wrap break-words">
                  {feedback.text}
                </p>
                <div className="mt-2 text-xs text-tron-gray flex items-center justify-between">
                  <span>
                    {feedback.submittedBy ? 'Authenticated user' : 'Anonymous'}
                  </span>
                  <span>
                    {new Date(feedback.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TronPanel>
    </div>
  );
}

