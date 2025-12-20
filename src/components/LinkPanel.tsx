import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { X } from "lucide-react";
import { TronPanel } from "./TronPanel";

interface LinkPanelProps {
  selectedState: string | null;
  links: Doc<"govLinks">[];
  isLoading: boolean;
  onClose: () => void;
}

const categoryIcons: Record<string, string> = {
  Health: "🏥",
  Education: "🎓",
  Transportation: "🚗",
  Legal: "⚖️",
  Employment: "💼",
  Environment: "🌲",
  Housing: "🏠",
  Taxes: "💰",
  Solicitations: "📋",
};

export function LinkPanel({
  selectedState,
  links,
  isLoading,
  onClose,
}: LinkPanelProps) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filteredLinks = filterCategory
    ? links.filter((link) => link.category === filterCategory)
    : links;

  const categories = [...new Set(links.map((link) => link.category))];

  if (!selectedState) {
    return (
      <div className="w-full lg:w-96">
        <TronPanel className="h-full">
          <div className="text-center text-tron-gray py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-tron-white">
              Select a State
            </h2>
            <p className="text-sm mt-2 text-tron-gray">
              Click on any state to view government resources
            </p>
          </div>
        </TronPanel>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-96">
      <div className="relative overflow-hidden rounded-lg border border-tron-cyan/20 bg-tron-bg-elevated">
        {/* Top Neon Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
          style={{
            background: "linear-gradient(90deg, transparent, #00d4ff, transparent)"
          }}
        />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-tron-cyan/20 to-tron-blue/20 p-6 border-b border-tron-cyan/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-tron-white">{selectedState}</h2>
              <p className="text-tron-cyan text-sm mt-1">
                {links.length} resource{links.length !== 1 ? "s" : ""} available
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-tron-cyan/20 rounded-full transition text-tron-gray hover:text-tron-cyan"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={() => setFilterCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterCategory === null
                    ? "bg-tron-cyan text-tron-bg-deep border border-tron-cyan"
                    : "bg-tron-bg-card text-tron-gray border border-tron-cyan/20 hover:border-tron-cyan/40 hover:text-tron-white"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filterCategory === cat
                      ? "bg-tron-cyan text-tron-bg-deep border border-tron-cyan"
                      : "bg-tron-bg-card text-tron-gray border border-tron-cyan/20 hover:border-tron-cyan/40 hover:text-tron-white"
                  }`}
                >
                  {categoryIcons[cat]} {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Links List */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-tron-bg-card rounded w-3/4 mb-2" />
                  <div className="h-3 bg-tron-bg-card rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-tron-gray">
              <p>No resources found for this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <a
                  key={link._id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-tron-cyan/20 rounded-xl hover:border-tron-cyan hover:bg-tron-cyan/5 transition group tron-card"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {categoryIcons[link.category] ?? "🔗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-tron-white group-hover:text-tron-cyan transition truncate">
                        {link.title}
                      </h3>
                      <p className="text-xs text-tron-gray mt-1">
                        {link.category}
                      </p>
                      {link.description && (
                        <p className="text-sm text-tron-gray mt-2 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 text-tron-gray group-hover:text-tron-cyan transition flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
