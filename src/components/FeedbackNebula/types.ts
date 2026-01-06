export type Sentiment = "positive" | "neutral" | "negative" | "suggestion";

export type ViewMode = "nebula" | "list" | "timeline";

export interface FeedbackCluster {
  _id: string;
  canonicalText: string;
  normalizedKey: string;
  count: number;
  uniqueUsers: number;
  firstSubmittedAt: number;
  lastSubmittedAt: number;
  heat: number;
  position?: { x: number; y: number };
}

export interface FeedbackEntry {
  _id: string;
  text: string;
  normalizedText: string;
  submittedBy?: string;
  createdAt: number;
  clusterId?: string;
  sentiment?: Sentiment;
  tags?: string[];
}

export interface FeedbackNode {
  cluster: FeedbackCluster;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  size: number;
  color: {
    background: string;
    border: string;
    glow: string;
    text: string;
  };
  sentiment?: Sentiment;
}

export interface PhysicsConfig {
  repulsionStrength: number;
  centerGravity: number;
  boundaryPadding: number;
  velocityDecay: number;
  collisionRadius: (node: FeedbackNode) => number;
}

