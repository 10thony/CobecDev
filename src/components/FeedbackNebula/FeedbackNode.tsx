import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedbackCluster, Sentiment } from './types';

interface FeedbackNodeProps {
  cluster: FeedbackCluster;
  position: { x: number; y: number };
  size: number;
  color: {
    background: string;
    border: string;
    glow: string;
    text: string;
  };
  sentiment?: Sentiment;
  isHovered: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDrag: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const getNodeSize = (count: number): number => {
  if (count === 1) return 48;
  if (count <= 3) return 64;
  if (count <= 7) return 80;
  if (count <= 15) return 100;
  return 128;
};

const getSizeLabel = (count: number): string => {
  if (count === 1) return 'Whisper';
  if (count <= 3) return 'Murmur';
  if (count <= 7) return 'Voice';
  if (count <= 15) return 'Shout';
  return 'Roar';
};

const sentimentColors: Record<Sentiment, string> = {
  positive: '#10b981', // emerald
  negative: '#ef4444', // red
  suggestion: '#f59e0b', // amber
  neutral: 'transparent',
};

export function FeedbackNode({
  cluster,
  position,
  size,
  color,
  sentiment,
  isHovered,
  isSelected,
  isDragging,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: FeedbackNodeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  const handleDragStart = () => {
    onDragStart();
  };

  const handleDrag = (_: any, info: any) => {
    onDrag({
      x: position.x + info.delta.x,
      y: position.y + info.delta.y,
    });
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const scale = isHovered || isSelected ? (isSelected ? 1.15 : 1.1) : 1;
  const zIndex = isHovered || isSelected ? 50 : 1;

  return (
    <motion.div
      ref={nodeRef}
      className="absolute cursor-pointer select-none"
      style={{
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        zIndex,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale,
        opacity: isDragging ? 0.8 : 1,
      }}
      whileHover={{ scale: 1.1 }}
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main node circle */}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: color.background,
          border: `2px solid ${color.border}`,
          boxShadow: color.glow,
        }}
      >
        {/* Sentiment accent ring */}
        {sentiment && sentiment !== 'neutral' && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `3px solid ${sentimentColors[sentiment]}`,
              opacity: 0.6,
            }}
          />
        )}

        {/* Pulsing ring when selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${color.border}`,
              }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.3, opacity: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        {/* Count badge */}
        <div className="relative z-10 text-center">
          <div
            className="font-bold text-sm"
            style={{ color: color.text }}
          >
            {cluster.count}
          </div>
          {size >= 80 && (
            <div
              className="text-xs opacity-70 mt-0.5"
              style={{ color: color.text }}
            >
              {getSizeLabel(cluster.count)}
            </div>
          )}
        </div>

        {/* Ripple effect on increment */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${color.border}`,
              }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && !isDragging && (
          <motion.div
            className="absolute bottom-full left-1/2 mb-2 px-3 py-2 bg-tron-bg-elevated border border-tron-cyan/30 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
            style={{ transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <div className="text-xs text-tron-white font-medium max-w-xs truncate">
              {cluster.canonicalText}
            </div>
            <div className="text-xs text-tron-gray mt-1">
              {cluster.count} {cluster.count === 1 ? 'submission' : 'submissions'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

