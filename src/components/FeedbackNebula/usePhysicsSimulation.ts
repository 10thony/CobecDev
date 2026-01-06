import { useEffect, useRef, useState, useCallback } from 'react';
import { forceSimulation, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum } from 'd3-force';
import { FeedbackNode, PhysicsConfig } from './types';

const defaultConfig: PhysicsConfig = {
  repulsionStrength: -150,
  centerGravity: 0.02,
  boundaryPadding: 20,
  velocityDecay: 0.85,
  collisionRadius: (node) => node.size / 2 + 10,
};

// Bounce coefficient (0 = no bounce, 1 = perfect bounce)
const BOUNCE_COEFFICIENT = 0.6;

interface SimulationNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  size: number;
}

export const usePhysicsSimulation = (
  nodes: FeedbackNode[],
  config: Partial<PhysicsConfig> = {},
  width: number,
  height: number,
  enabled: boolean = true
) => {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimulationNode>> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const configRef = useRef({ ...defaultConfig, ...config });

  useEffect(() => {
    configRef.current = { ...defaultConfig, ...config };
  }, [config]);

  const updateSimulation = useCallback(() => {
    if (!enabled || nodes.length === 0) {
      return;
    }

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create simulation nodes from feedback nodes
    const simulationNodes: SimulationNode[] = nodes.map((node, i) => {
      const existingPos = positions.get(node.cluster._id);
      const radius = configRef.current.collisionRadius(node);
      const padding = configRef.current.boundaryPadding;
      const minX = padding + radius;
      const maxX = width - padding - radius;
      const minY = padding + radius;
      const maxY = height - padding - radius;
      
      // Generate initial position within bounds
      let initialX = existingPos?.x ?? width / 2 + (Math.random() - 0.5) * Math.min(200, (maxX - minX) * 0.5);
      let initialY = existingPos?.y ?? height / 2 + (Math.random() - 0.5) * Math.min(200, (maxY - minY) * 0.5);
      
      // Clamp to boundaries
      initialX = Math.max(minX, Math.min(maxX, initialX));
      initialY = Math.max(minY, Math.min(maxY, initialY));
      
      return {
        id: node.cluster._id,
        x: initialX,
        y: initialY,
        size: node.size,
      };
    });

    // Create force simulation
    const simulation = forceSimulation<SimulationNode>(simulationNodes)
      .force('charge', forceManyBody().strength(configRef.current.repulsionStrength))
      .force('center', forceCenter(width / 2, height / 2).strength(configRef.current.centerGravity))
      .force('collision', forceCollide<SimulationNode>().radius((d) => configRef.current.collisionRadius({ size: d.size } as FeedbackNode) + configRef.current.boundaryPadding))
      .velocityDecay(configRef.current.velocityDecay)
      .alpha(1)
      .alphaDecay(0.02)
      .on('tick', () => {
        const newPositions = new Map<string, { x: number; y: number }>();
        const padding = configRef.current.boundaryPadding;
        
        simulationNodes.forEach(node => {
          const radius = configRef.current.collisionRadius({ size: node.size } as FeedbackNode);
          const minX = padding + radius;
          const maxX = width - padding - radius;
          const minY = padding + radius;
          const maxY = height - padding - radius;
          
          // Boundary collision detection with bounce
          // Left boundary
          if (node.x! < minX) {
            node.x = minX;
            if (node.vx !== undefined && node.vx < 0) {
              node.vx = -node.vx * BOUNCE_COEFFICIENT;
            }
          }
          // Right boundary
          if (node.x! > maxX) {
            node.x = maxX;
            if (node.vx !== undefined && node.vx > 0) {
              node.vx = -node.vx * BOUNCE_COEFFICIENT;
            }
          }
          // Top boundary
          if (node.y! < minY) {
            node.y = minY;
            if (node.vy !== undefined && node.vy < 0) {
              node.vy = -node.vy * BOUNCE_COEFFICIENT;
            }
          }
          // Bottom boundary
          if (node.y! > maxY) {
            node.y = maxY;
            if (node.vy !== undefined && node.vy > 0) {
              node.vy = -node.vy * BOUNCE_COEFFICIENT;
            }
          }
          
          // Ensure nodes stay within bounds (safety check)
          node.x = Math.max(minX, Math.min(maxX, node.x!));
          node.y = Math.max(minY, Math.min(maxY, node.y!));
          
          newPositions.set(node.id, { x: node.x!, y: node.y! });
        });
        setPositions(newPositions);
      });

    simulationRef.current = simulation;

    // Clean up on unmount
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes, width, height, enabled, positions]);

  useEffect(() => {
    updateSimulation();
  }, [updateSimulation]);

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    // Find the node to get its size for boundary calculation
    const feedbackNode = nodes.find(n => n.cluster._id === nodeId);
    if (!feedbackNode) return;
    
    const radius = configRef.current.collisionRadius(feedbackNode);
    const padding = configRef.current.boundaryPadding;
    const minX = padding + radius;
    const maxX = width - padding - radius;
    const minY = padding + radius;
    const maxY = height - padding - radius;
    
    // Clamp position to boundaries
    const clampedPosition = {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y)),
    };
    
    setPositions(prev => {
      const next = new Map(prev);
      next.set(nodeId, clampedPosition);
      return next;
    });

    // Update simulation node position
    if (simulationRef.current) {
      const node = simulationRef.current.nodes().find(n => n.id === nodeId);
      if (node) {
        node.x = clampedPosition.x;
        node.y = clampedPosition.y;
        node.fx = clampedPosition.x;
        node.fy = clampedPosition.y;
        simulationRef.current.alpha(0.3).restart();
      }
    }
  }, [nodes, width, height]);

  const releaseNode = useCallback((nodeId: string) => {
    if (simulationRef.current) {
      const node = simulationRef.current.nodes().find(n => n.id === nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
        simulationRef.current.alpha(0.3).restart();
      }
    }
  }, []);

  const applyExplosion = useCallback((centerX: number, centerY: number, strength: number = 200) => {
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach(node => {
        const dx = node.x! - centerX;
        const dy = node.y! - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          const force = strength / (distance * distance);
          node.vx = (node.vx || 0) + (dx / distance) * force;
          node.vy = (node.vy || 0) + (dy / distance) * force;
        }
      });
      simulationRef.current.alpha(0.5).restart();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    positions,
    updateNodePosition,
    releaseNode,
    applyExplosion,
  };
};

