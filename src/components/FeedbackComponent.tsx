import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FeedbackNebula } from './FeedbackNebula/FeedbackNebula';
import { FeedbackCluster, FeedbackEntry, Sentiment } from './FeedbackNebula/types';
import { toast } from 'sonner';

export function FeedbackComponent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch clusters and feedback entries
  const clusters = useQuery(api.feedback.getAllClusters) || [];
  const feedbackEntries = useQuery(api.feedback.getAllFeedback) || [];
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const meToo = useMutation(api.feedback.meToo);

  // Transform clusters to match FeedbackCluster type
  const transformedClusters: FeedbackCluster[] = clusters.map(cluster => ({
    _id: cluster._id as string,
    canonicalText: cluster.canonicalText,
    normalizedKey: cluster.normalizedKey,
    count: cluster.count,
    uniqueUsers: cluster.uniqueUsers,
    firstSubmittedAt: cluster.firstSubmittedAt,
    lastSubmittedAt: cluster.lastSubmittedAt,
    heat: cluster.heat,
    position: cluster.position,
  }));

  // Transform feedback entries to match FeedbackEntry type
  const transformedEntries: FeedbackEntry[] = feedbackEntries.map(entry => ({
    _id: entry._id,
    text: entry.text,
    normalizedText: entry.normalizedText || '', // Fallback for old records
    submittedBy: entry.submittedBy,
    createdAt: entry.createdAt,
    clusterId: entry.clusterId,
    sentiment: entry.sentiment as Sentiment | undefined,
    tags: entry.tags,
  }));

  const handleSubmit = async (text: string, tags: string[], sentiment: Sentiment) => {
    setIsSubmitting(true);
    try {
      await submitFeedback({
        text,
        tags: tags.length > 0 ? tags : undefined,
        sentiment,
      });
      toast.success('Thank you for your feedback!');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(`Failed to submit feedback: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeToo = async (clusterId: string) => {
    try {
      await meToo({ clusterId: clusterId as any });
      toast.success('Thanks for your support!');
    } catch (error: any) {
      console.error('Error with "me too":', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  return (
    <FeedbackNebula
      clusters={transformedClusters}
      feedbackEntries={transformedEntries}
      onSubmit={handleSubmit}
      onMeToo={handleMeToo}
      isSubmitting={isSubmitting}
      showInput={true}
    />
  );
}
