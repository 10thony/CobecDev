import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";

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
  rotationSpeed?: number;
  className?: string;
}

export function RevolvingBookAnimation({
  features = [],
  rotationSpeed = 60, // Slightly faster default for a better carousel feel
  className = "",
}: RevolvingBookAnimationProps) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  const bookWidth = 260;
  const bookHeight = 340;
  const spineWidth = 20;

  const cardCount = features.length > 0 ? features.length : 20;

  const pages =
    features.length > 0
      ? features.map((feature, i) => ({
          id: i,
          feature,
          content: (
            <div className="relative flex h-full flex-col items-center justify-center p-3">
              <div className="bg-tron-bg-deep/80 absolute inset-0 rounded-lg" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center">
                <div className="text-tron-cyan mb-2 flex-shrink-0 scale-125 drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]">
                  {feature.icon}
                </div>
                <h3 className="font-display text-tron-white mb-2 px-2 text-center text-sm font-semibold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {feature.title}
                </h3>
                <p className="text-tron-cyan/90 line-clamp-3 px-2 text-center text-xs leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {feature.description}
                </p>
              </div>
            </div>
          ),
        }))
      : Array.from({ length: cardCount }, (_, i) => ({
          id: i,
          feature: null,
          content: (
            <div className="text-tron-cyan flex h-full flex-col items-center justify-center p-4">
              <div className="mb-2 text-2xl font-bold opacity-70">{i + 1}</div>
              <div className="border-tron-cyan/20 flex h-12 w-12 items-center justify-center rounded-lg border">
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

  const selectedFeature =
    selectedPage !== null ? pages[selectedPage]?.feature : null;

  const handlePageClick = (index: number) => {
    setSelectedPage(index);
  };

  const handleClosePanel = () => {
    setSelectedPage(null);
  };

  return (
    <div
      className={`mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-12 overflow-visible px-4 lg:flex-row ${className}`}
    >
      {/* Book Animation Container */}
      <div
        className="relative flex h-96 w-96 items-center justify-center md:h-[500px] md:w-[500px]"
        style={{ perspective: "1200px" }}
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
            rotateY: 360, // Constant rotation
          }}
          transition={{
            rotateY: {
              duration: rotationSpeed,
              repeat: Infinity,
              ease: "linear",
            },
            rotateX: { duration: 0 },
          }}
        >
          {/* Central Spine */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: 0,
              width: `${spineWidth}px`,
              height: "100%",
              background:
                "linear-gradient(to right, rgba(0, 212, 255, 0.3) 0%, rgba(0, 212, 255, 0.5) 50%, rgba(0, 212, 255, 0.3) 100%)",
              transform: "translateX(-50%) translateZ(1px)",
              borderRadius: "4px",
              zIndex: 10,
              boxShadow:
                "0 0 20px rgba(0, 212, 255, 0.6), inset 0 0 10px rgba(0, 212, 255, 0.2)",
              border: "1px solid rgba(0, 212, 255, 0.4)",
            }}
          />

          {/* Pages */}
          {pages.map((page, index) => {
            const angle = (360 / cardCount) * index;
            const isSelected = selectedPage === index;

            return (
              <motion.div
                key={page.id}
                className="glass-card absolute flex cursor-pointer items-center justify-center"
                style={{
                  width: `${bookWidth}px`,
                  height: `${bookHeight}px`,
                  background:
                    "linear-gradient(to right, rgba(224, 224, 224, 0.15) 0%, rgba(255, 255, 255, 0.25) 10%, rgba(245, 245, 245, 0.15) 100%)",
                  transformOrigin: "left center",
                  left: "50%",
                  backfaceVisibility: "visible",
                  transformStyle: "preserve-3d",
                }}
                initial={{ rotateY: angle }}
                animate={{
                  rotateY: angle,
                  border: isSelected
                    ? "2px solid rgba(0, 212, 255, 0.8)"
                    : "1px solid rgba(0, 212, 255, 0.1)",
                  boxShadow: isSelected
                    ? "0 0 20px rgba(0, 212, 255, 0.4), -2px 0 5px rgba(0, 0, 0, 0.2)"
                    : "-2px 0 5px rgba(0, 0, 0, 0.2)",
                }}
                whileHover={{
                  scale: 1.05,
                  zIndex: 100,
                  boxShadow:
                    "0 0 15px rgba(0, 212, 255, 0.5), -2px 0 5px rgba(0, 0, 0, 0.3)",
                }}
                onClick={() => handlePageClick(index)}
              >
                {page.content}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Side Panel - Positioned relative to the flex container to avoid overlap */}
      <div className="flex min-h-[400px] w-full items-center justify-center lg:w-auto">
        <AnimatePresence mode="wait">
          {selectedPage !== null && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass-card relative h-[400px] w-full overflow-hidden rounded-xl border-tron-cyan/30 md:w-96"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 40, 60, 0.9) 100%)",
                boxShadow:
                  "0 0 30px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleClosePanel}
                className="bg-tron-bg-deep/50 border-tron-cyan/30 text-tron-cyan hover:bg-tron-cyan/20 hover:border-tron-cyan/50 absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border transition-all"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Panel Content */}
              <div className="flex h-full flex-col items-center justify-center p-8">
                {selectedFeature ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-tron-cyan mb-6 scale-[2.5] drop-shadow-[0_0_20px_rgba(0,212,255,0.8)]"
                    >
                      {selectedFeature.icon}
                    </motion.div>

                    <motion.h2 className="font-display text-tron-white mb-4 text-center text-xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] md:text-2xl">
                      {selectedFeature.title}
                    </motion.h2>

                    <motion.p className="text-tron-cyan/90 max-w-xs text-center text-sm leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] md:text-base">
                      {selectedFeature.description}
                    </motion.p>

                    <motion.div
                      className="mt-6 rounded-full border px-4 py-1.5 text-xs font-medium"
                      style={{
                        borderColor:
                          selectedFeature.access === "Admin"
                            ? "rgba(255, 100, 100, 0.5)"
                            : selectedFeature.access === "Signed-in"
                              ? "rgba(255, 200, 100, 0.5)"
                              : "rgba(0, 212, 255, 0.5)",
                        color:
                          selectedFeature.access === "Admin"
                            ? "#ff6464"
                            : selectedFeature.access === "Signed-in"
                              ? "#ffc864"
                              : "#00d4ff",
                        background:
                          selectedFeature.access === "Admin"
                            ? "rgba(255, 100, 100, 0.1)"
                            : selectedFeature.access === "Signed-in"
                              ? "rgba(255, 200, 100, 0.1)"
                              : "rgba(0, 212, 255, 0.1)",
                      }}
                    >
                      {selectedFeature.access} Access
                    </motion.div>

                    <motion.a
                      href={selectedFeature.to}
                      className="bg-tron-cyan/20 border-tron-cyan/50 text-tron-cyan mt-6 rounded-lg border px-6 py-2.5 font-medium transition-all hover:border-tron-cyan hover:bg-tron-cyan/30"
                    >
                      Open Feature →
                    </motion.a>
                  </>
                ) : (
                  <div className="text-tron-cyan/70 text-center">
                    <div className="mb-4 text-4xl font-bold">
                      Page {(selectedPage ?? 0) + 1}
                    </div>
                    <p className="text-sm">Placeholder page content</p>
                  </div>
                )}
              </div>

              {/* Decorative corner accents */}
              <div className="border-tron-cyan/50 absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-2 border-t-2" />
              <div className="border-tron-cyan/50 absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-2 border-t-2" />
              <div className="border-tron-cyan/50 absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-2 border-l-2" />
              <div className="border-tron-cyan/50 absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-2 border-r-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}