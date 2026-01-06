import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, List, Grid3x3, Calendar, X } from 'lucide-react';
import { FeedbackNode } from './FeedbackNode';
import { FeedbackInput } from './FeedbackInput';
import { FeedbackDetail } from './FeedbackDetail';
import { usePhysicsSimulation } from './usePhysicsSimulation';
import { calculateHeat, getNodeColor } from './useFeedbackClustering';
import { FeedbackCluster, FeedbackEntry, FeedbackNode as FeedbackNodeType, ViewMode, Sentiment } from './types';
import { TronPanel } from '../TronPanel';
import { MessageSquare } from 'lucide-react';

interface FeedbackNebulaProps {
  clusters: FeedbackCluster[];
  feedbackEntries: FeedbackEntry[];
  onSubmit: (text: string, tags: string[], sentiment: Sentiment) => Promise<void>;
  onMeToo?: (clusterId: string) => Promise<void>;
  maxHeight?: number;
  showInput?: boolean;
  viewMode?: ViewMode;
  filterSentiment?: string[];
  searchQuery?: string;
  isSubmitting?: boolean;
  isAdmin?: boolean;
}

const getNodeSize = (count: number): number => {
  if (count === 1) return 48;
  if (count <= 3) return 64;
  if (count <= 7) return 80;
  if (count <= 15) return 100;
  return 128;
};

export function FeedbackNebula({
  clusters,
  feedbackEntries,
  onSubmit,
  onMeToo,
  maxHeight = 500,
  showInput = true,
  viewMode: initialViewMode,
  filterSentiment = [],
  searchQuery: initialSearchQuery,
  isSubmitting = false,
  isAdmin = false,
}: FeedbackNebulaProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'nebula');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCluster, setSelectedCluster] = useState<FeedbackCluster | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [sentimentFilters, setSentimentFilters] = useState<string[]>(filterSentiment);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: maxHeight });

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Filter and search clusters
  const filteredClusters = useMemo(() => {
    let filtered = clusters;

    // Filter by sentiment
    if (sentimentFilters.length > 0) {
      filtered = filtered.filter(cluster => {
        const clusterEntries = feedbackEntries.filter(e => e.clusterId === cluster._id);
        const sentiments = clusterEntries.map(e => e.sentiment).filter(Boolean);
        return sentiments.some(s => sentimentFilters.includes(s!));
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cluster =>
        cluster.canonicalText.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [clusters, feedbackEntries, sentimentFilters, searchQuery]);

  // Calculate node properties
  const nodes: FeedbackNodeType[] = useMemo(() => {
    const maxCount = Math.max(...filteredClusters.map(c => c.count), 1);
    
    return filteredClusters.map(cluster => {
      const size = getNodeSize(cluster.count);
      const heat = calculateHeat(cluster);
      const color = getNodeColor(cluster.count, maxCount);
      
      // Get sentiment from first entry in cluster
      const clusterEntries = feedbackEntries.filter(e => e.clusterId === cluster._id);
      const sentiment = clusterEntries[0]?.sentiment;

      return {
        cluster,
        position: cluster.position || { x: canvasSize.width / 2, y: canvasSize.height / 2 },
        velocity: { x: 0, y: 0 },
        size,
        color,
        sentiment,
      };
    });
  }, [filteredClusters, feedbackEntries, canvasSize]);

  // Physics simulation
  const { positions, updateNodePosition, releaseNode, applyExplosion } = usePhysicsSimulation(
    nodes,
    {},
    canvasSize.width,
    canvasSize.height,
    viewMode === 'nebula'
  );

  // Update node positions from physics
  const positionedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      position: positions.get(node.cluster._id) || node.position,
    }));
  }, [nodes, positions]);

  // Get feedback entries for selected cluster
  const selectedClusterEntries = useMemo(() => {
    if (!selectedCluster) return [];
    return feedbackEntries.filter(e => e.clusterId === selectedCluster._id);
  }, [selectedCluster, feedbackEntries]);

  // Handle node interactions
  const handleNodeDragStart = useCallback((nodeId: string) => {
    setDraggingNodeId(nodeId);
  }, []);

  const handleNodeDrag = useCallback((nodeId: string, position: { x: number; y: number }) => {
    updateNodePosition(nodeId, position);
  }, [updateNodePosition]);

  const handleNodeDragEnd = useCallback((nodeId: string) => {
    setDraggingNodeId(null);
    releaseNode(nodeId);
  }, [releaseNode]);

  const handleNodeClick = useCallback((cluster: FeedbackCluster) => {
    setSelectedCluster(cluster);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      applyExplosion(x, y, 200);
    }
  }, [applyExplosion]);

  const handleMeToo = useCallback(async (clusterId: string) => {
    if (onMeToo) {
      await onMeToo(clusterId);
    }
  }, [onMeToo]);

  // List view rendering
  const renderListView = () => {
    const sortedClusters = [...filteredClusters].sort((a, b) => b.heat - a.heat);
    
    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedClusters.map(cluster => {
          const clusterEntries = feedbackEntries.filter(e => e.clusterId === cluster._id);
          return (
            <motion.div
              key={cluster._id}
              className="bg-tron-bg-elevated border border-tron-cyan/10 rounded-lg p-4 hover:border-tron-cyan/20 transition-colors cursor-pointer"
              onClick={() => handleNodeClick(cluster)}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start justify-between">
                <p className="text-tron-white whitespace-pre-wrap break-words flex-1">
                  {cluster.canonicalText}
                </p>
                <div className="ml-4 text-right">
                  <div className="text-lg font-bold text-tron-cyan">{cluster.count}</div>
                  <div className="text-xs text-tron-gray">submissions</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-tron-gray">
                Heat: {cluster.heat.toFixed(1)} • Last: {new Date(cluster.lastSubmittedAt).toLocaleDateString()}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Timeline view rendering
  const renderTimelineView = () => {
    if (filteredClusters.length === 0) {
      return (
        <div className="text-center text-tron-gray py-8">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No feedback yet. Be the first to share your thoughts!</p>
        </div>
      );
    }

    // Group clusters by date (day)
    const clustersByDate = new Map<string, FeedbackCluster[]>();
    filteredClusters.forEach(cluster => {
      const dateKey = new Date(cluster.firstSubmittedAt).toDateString();
      if (!clustersByDate.has(dateKey)) {
        clustersByDate.set(dateKey, []);
      }
      clustersByDate.get(dateKey)!.push(cluster);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(clustersByDate.keys()).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Calculate timeline width (each day gets 200px minimum)
    const timelineWidth = Math.max(800, sortedDates.length * 200);

    return (
      <div className="overflow-x-auto pb-4">
        <div className="relative" style={{ width: timelineWidth, minHeight: 400 }}>
          {/* Timeline line */}
          <div className="absolute top-20 left-0 right-0 h-0.5 bg-tron-cyan/30" />

          {/* Date markers and clusters */}
          {sortedDates.map((dateKey, dateIndex) => {
            const date = new Date(dateKey);
            const clustersForDate = clustersByDate.get(dateKey)!;
            const xPosition = dateIndex * 200 + 100;

            return (
              <div
                key={dateKey}
                className="absolute"
                style={{ left: xPosition, transform: 'translateX(-50%)' }}
              >
                {/* Date marker */}
                <div className="text-center mb-4">
                  <div className="w-3 h-3 bg-tron-cyan rounded-full mx-auto mb-2 border-2 border-tron-bg-deep" />
                  <div className="text-xs text-tron-gray font-medium whitespace-nowrap">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-tron-gray/60">
                    {date.toLocaleDateString('en-US', { year: 'numeric' })}
                  </div>
                </div>

                {/* Clusters for this date (stacked vertically) */}
                <div className="space-y-2 mt-8" style={{ width: 180 }}>
                  {clustersForDate
                    .sort((a, b) => b.count - a.count)
                    .map((cluster, clusterIndex) => {
                      const clusterEntries = feedbackEntries.filter(e => e.clusterId === cluster._id);
                      const sentiment = clusterEntries[0]?.sentiment;
                      const size = getNodeSize(cluster.count);
                      const maxCount = Math.max(...filteredClusters.map(c => c.count), 1);
                      const color = getNodeColor(cluster.count, maxCount);

                      return (
                        <motion.div
                          key={cluster._id}
                          className="cursor-pointer"
                          onClick={() => handleNodeClick(cluster)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: clusterIndex * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <div
                            className="rounded-lg p-3 border transition-all"
                            style={{
                              background: color.background,
                              borderColor: color.border,
                              boxShadow: color.glow,
                              minHeight: size,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-tron-white flex-1 overflow-hidden" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {cluster.canonicalText}
                              </p>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold" style={{ color: color.text }}>
                                  {cluster.count}
                                </div>
                              </div>
                            </div>
                            {sentiment && sentiment !== 'neutral' && (
                              <div className="mt-1 text-xs opacity-70">
                                <span
                                  className={
                                    sentiment === 'positive' ? 'text-green-400' :
                                    sentiment === 'negative' ? 'text-red-400' :
                                    'text-amber-400'
                                  }
                                >
                                  {sentiment}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <TronPanel
        title="Feedback Nebula"
        icon={<MessageSquare className="w-5 h-5" />}
        glowColor="cyan"
      >
        <div className="space-y-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-tron-gray">View:</span>
            <div className="flex gap-1 bg-tron-bg-deep rounded-lg p-1">
              {(['nebula', 'list', 'timeline'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-3 py-1.5 rounded text-sm font-medium transition-all
                    ${viewMode === mode
                      ? 'bg-tron-cyan text-tron-bg-deep'
                      : 'text-tron-gray hover:text-tron-white'
                    }
                  `}
                >
                  {mode === 'nebula' && <Grid3x3 className="w-4 h-4 inline mr-1" />}
                  {mode === 'list' && <List className="w-4 h-4 inline mr-1" />}
                  {mode === 'timeline' && <Calendar className="w-4 h-4 inline mr-1" />}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tron-gray" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedback..."
                className="w-full pl-10 pr-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-tron-gray hover:text-tron-white" />
                </button>
              )}
            </div>
          </div>

          {/* Sentiment filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-tron-gray">Filter:</span>
            {(['positive', 'negative', 'suggestion', 'neutral'] as Sentiment[]).map(sentiment => (
              <button
                key={sentiment}
                onClick={() => {
                  setSentimentFilters(prev =>
                    prev.includes(sentiment)
                      ? prev.filter(s => s !== sentiment)
                      : [...prev, sentiment]
                  );
                }}
                className={`
                  px-3 py-1 rounded text-xs font-medium transition-all
                  ${sentimentFilters.includes(sentiment)
                    ? 'bg-tron-cyan/20 border-tron-cyan text-tron-cyan border'
                    : 'bg-tron-bg-elevated border border-tron-cyan/20 text-tron-gray hover:border-tron-cyan/40'
                  }
                `}
              >
                {sentiment}
              </button>
            ))}
          </div>
        </div>
      </TronPanel>

      {/* Nebula Canvas */}
      {viewMode === 'nebula' && (
        <TronPanel glowColor="cyan">
          <div
            ref={canvasRef}
            className="relative w-full rounded-lg overflow-hidden"
            style={{ height: maxHeight, minHeight: maxHeight }}
            onClick={handleCanvasClick}
          >
            {positionedNodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-tron-gray">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No feedback yet. Be the first to share your thoughts!</p>
                </div>
              </div>
            ) : (
              positionedNodes.map(node => (
                <FeedbackNode
                  key={node.cluster._id}
                  cluster={node.cluster}
                  position={node.position}
                  size={node.size}
                  color={node.color}
                  sentiment={node.sentiment}
                  isHovered={hoveredNodeId === node.cluster._id}
                  isSelected={selectedCluster?._id === node.cluster._id}
                  isDragging={draggingNodeId === node.cluster._id}
                  onDragStart={() => handleNodeDragStart(node.cluster._id)}
                  onDrag={(pos) => handleNodeDrag(node.cluster._id, pos)}
                  onDragEnd={() => handleNodeDragEnd(node.cluster._id)}
                  onClick={() => handleNodeClick(node.cluster)}
                  onMouseEnter={() => setHoveredNodeId(node.cluster._id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                />
              ))
            )}
          </div>
        </TronPanel>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <TronPanel title="Feedback List" glowColor="cyan">
          {renderListView()}
        </TronPanel>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <TronPanel title="Feedback Timeline" glowColor="cyan">
          {renderTimelineView()}
        </TronPanel>
      )}

      {/* Input Form */}
      {showInput && (
        <TronPanel title="Leave Feedback" glowColor="cyan">
          <FeedbackInput
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            existingClusters={filteredClusters.map(c => ({
              id: c._id,
              text: c.canonicalText,
              count: c.count,
            }))}
            onMeToo={handleMeToo}
          />
        </TronPanel>
      )}

      {/* Detail Drawer */}
      <FeedbackDetail
        cluster={selectedCluster}
        feedbackEntries={selectedClusterEntries}
        isOpen={!!selectedCluster}
        onClose={() => setSelectedCluster(null)}
        onMeToo={selectedCluster ? () => handleMeToo(selectedCluster._id) : undefined}
        isAdmin={isAdmin}
      />
    </div>
  );
}

