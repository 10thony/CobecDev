import { motion } from "framer-motion";
import type React from "react";

export interface Feature {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  access: "Public" | "Signed-in" | "Admin";
  span?: "1x1" | "1x2" | "2x1" | "2x2" | "2x3" | "3x2";
}

interface RevolvingBookAnimationProps {
  features?: Feature[];
  rotationSpeed?: number; // seconds per full rotation
  className?: string;
}

export function RevolvingBookAnimation({
  features = [],
  rotationSpeed = 30,
  className = "",
}: RevolvingBookAnimationProps) {
  // Book dimensions
  const bookWidth = 200;
  const bookHeight = 260;
  const spineWidth = 10;

  // Use features if provided, otherwise show placeholder
  const cardCount = features.length > 0 ? features.length : 20;

  // Generate pages from features
  const pages = features.length > 0
    ? features.map((feature, i) => ({
        id: i,
        feature,
        content: (
          <div className="flex flex-col items-center justify-center h-full text-tron-cyan p-3">
            <div className="text-tron-cyan mb-2 flex-shrink-0 scale-125">
              {feature.icon}
            </div>
            <h3 className="text-xs font-display font-semibold text-tron-white mb-1.5 text-center leading-tight px-1">
              {feature.title}
            </h3>
            <p className="text-[10px] text-tron-gray leading-relaxed text-center line-clamp-3 px-1">
              {feature.description}
            </p>
          </div>
        ),
      }))
    : Array.from({ length: cardCount }, (_, i) => ({
        id: i,
        feature: null,
        content: (
          <div className="flex flex-col items-center justify-center h-full text-tron-cyan p-4">
            <div className="text-2xl font-bold mb-2 opacity-70">
              {i + 1}
            </div>
            <div className="w-12 h-12 rounded-lg border border-tron-cyan/20 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="opacity-50"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9h6v6H9z" />
              </svg>
            </div>
          </div>
        ),
      }));

  return (
    <div
      className={`relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80 ${className}`}
      style={{
        perspective: "1000px",
      }}
    >
      <motion.div
        className="relative"
        style={{
          width: `${bookWidth}px`,
          height: `${bookHeight}px`,
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: -10,
          rotateY: 360,
        }}
        transition={{
          rotateY: {
            duration: rotationSpeed,
            repeat: Infinity,
            ease: "linear",
          },
          rotateX: {
            duration: 0,
          },
        }}
      >
        {/* Central Spine/Binding */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: 0,
            width: `${spineWidth}px`,
            height: "100%",
            background: "#222",
            transform: "translateX(-50%) translateZ(1px)",
            borderRadius: "2px",
            zIndex: 10,
          }}
        />

        {/* Pages rotating around the spine */}
        {pages.map((page, index) => {
          // Calculate equal rotation around the spine
          const angle = (360 / cardCount) * index;

          return (
            <motion.div
              key={page.id}
              className="absolute glass-card flex items-center justify-center"
              style={{
                width: `${bookWidth}px`,
                height: `${bookHeight}px`,
                background: "linear-gradient(to right, rgba(224, 224, 224, 0.1) 0%, rgba(255, 255, 255, 0.15) 10%, rgba(245, 245, 245, 0.1) 100%)",
                border: "1px solid rgba(0, 212, 255, 0.1)",
                transformOrigin: "0% 50%",
                left: "50%",
                boxShadow: "-2px 0 5px rgba(0, 0, 0, 0.2)",
                backfaceVisibility: "visible",
                transform: `rotateY(${angle}deg)`,
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {page.content}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
