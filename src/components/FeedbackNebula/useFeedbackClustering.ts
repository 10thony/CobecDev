import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { FeedbackEntry, FeedbackCluster, Sentiment } from './types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
]);

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')      // Remove punctuation
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .split(' ')
    .filter(word => !STOP_WORDS.has(word) && word.length > 2)
    .sort()
    .join(' ');
};

export const detectSentiment = (text: string): Sentiment => {
  const lower = text.toLowerCase();
  if (/love|great|awesome|amazing|thanks|thank|good|helpful|excellent|fantastic|wonderful|perfect/.test(lower)) {
    return 'positive';
  }
  if (/bug|broken|doesn't work|error|crash|issue|problem|fix|broken|fails|fail|wrong|bad|terrible|horrible/.test(lower)) {
    return 'negative';
  }
  if (/add|could|should|would be nice|feature|suggestion|please|maybe|consider|wish|hope/.test(lower)) {
    return 'suggestion';
  }
  return 'neutral';
};

export const jaccardSimilarity = (a: string, b: string): number => {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
};

export const isSimilar = (a: string, b: string, threshold: number = 0.75): boolean => {
  const similarity = jaccardSimilarity(a, b);
  return similarity > threshold;
};

export const calculateHeat = (cluster: FeedbackCluster): number => {
  const now = Date.now();
  const daysSinceLastSubmission = (now - cluster.lastSubmittedAt) / (24 * 60 * 60 * 1000);
  const recencyFactor = Math.exp(-daysSinceLastSubmission / 7); // 7-day half-life
  return cluster.count * recencyFactor;
};

export const getNodeColor = (count: number, maxCount: number) => {
  const intensity = Math.min(count / maxCount, 1);
  return {
    background: `rgba(0, 255, 255, ${0.15 + intensity * 0.6})`,
    border: `rgba(0, 255, 255, ${0.3 + intensity * 0.7})`,
    glow: `0 0 ${10 + intensity * 30}px rgba(0, 255, 255, ${0.3 + intensity * 0.5})`,
    text: intensity > 0.7 ? '#ffffff' : '#00ffff',
  };
};

export const useFeedbackClustering = (
  feedbackEntries: FeedbackEntry[],
  clusters: FeedbackCluster[]
) => {
  return useMemo(() => {
    // Create a map of normalized text to clusters
    const clusterMap = new Map<string, FeedbackCluster>();
    clusters.forEach(cluster => {
      clusterMap.set(cluster.normalizedKey, cluster);
    });

    // Group feedback entries by cluster
    const feedbackByCluster = new Map<string, FeedbackEntry[]>();
    feedbackEntries.forEach(entry => {
      const clusterId = entry.clusterId || 'unclustered';
      if (!feedbackByCluster.has(clusterId)) {
        feedbackByCluster.set(clusterId, []);
      }
      feedbackByCluster.get(clusterId)!.push(entry);
    });

    return {
      clusterMap,
      feedbackByCluster,
    };
  }, [feedbackEntries, clusters]);
};

