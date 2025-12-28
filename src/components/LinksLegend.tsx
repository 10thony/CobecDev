import { useState, useMemo } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { X, Info, ChevronDown, ChevronUp } from "lucide-react";

interface LinksLegendProps {
  links: Doc<"govLinks">[] | undefined;
}

// Map state codes to regions
const stateToRegion: Record<string, string> = {
  // Northeast
  ME: "Northeast",
  NH: "Northeast",
  VT: "Northeast",
  MA: "Northeast",
  RI: "Northeast",
  CT: "Northeast",
  NY: "Northeast",
  NJ: "Northeast",
  PA: "Northeast",
  // Southeast
  DE: "Southeast",
  MD: "Southeast",
  VA: "Southeast",
  WV: "Southeast",
  KY: "Southeast",
  TN: "Southeast",
  NC: "Southeast",
  SC: "Southeast",
  GA: "Southeast",
  FL: "Southeast",
  AL: "Southeast",
  MS: "Southeast",
  AR: "Southeast",
  LA: "Southeast",
  // Midwest
  OH: "Midwest",
  IN: "Midwest",
  IL: "Midwest",
  MI: "Midwest",
  WI: "Midwest",
  MN: "Midwest",
  IA: "Midwest",
  MO: "Midwest",
  ND: "Midwest",
  SD: "Midwest",
  NE: "Midwest",
  KS: "Midwest",
  // Southwest
  TX: "Southwest",
  OK: "Southwest",
  NM: "Southwest",
  AZ: "Southwest",
  // West
  CO: "West",
  WY: "West",
  MT: "West",
  ID: "West",
  UT: "West",
  NV: "West",
  CA: "West",
  OR: "West",
  WA: "West",
  AK: "West",
  HI: "West",
  // District of Columbia
  DC: "Northeast",
};

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

export function LinksLegend({ links }: LinksLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Get unique states and regions from links
  const states = useMemo(() => {
    if (!links) return [];
    const uniqueStates = [...new Set(links.map((link) => link.stateCode))].sort();
    return uniqueStates;
  }, [links]);

  const regions = useMemo(() => {
    if (!links) return [];
    const uniqueRegions = [...new Set(links.map((link) => stateToRegion[link.stateCode] || "Other"))].sort();
    return uniqueRegions;
  }, [links]);

  // Filter links based on selected state and region
  const filteredLinks = useMemo(() => {
    if (!links) return [];
    return links.filter((link) => {
      const linkRegion = stateToRegion[link.stateCode] || "Other";
      const matchesState = !selectedState || link.stateCode === selectedState;
      const matchesRegion = !selectedRegion || linkRegion === selectedRegion;
      return matchesState && matchesRegion;
    });
  }, [links, selectedState, selectedRegion]);

  // Group links by state
  const linksByState = useMemo(() => {
    const grouped: Record<string, Doc<"govLinks">[]> = {};
    filteredLinks.forEach((link) => {
      if (!grouped[link.stateCode]) {
        grouped[link.stateCode] = [];
      }
      grouped[link.stateCode].push(link);
    });
    return grouped;
  }, [filteredLinks]);

  const sortedStates = Object.keys(linksByState).sort();

  return (
    <>
      {/* Legend Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-sm flex items-center gap-2"
        aria-label="Toggle legend"
      >
        <Info className="w-4 h-4" />
        <span>Legend</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Legend Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[80vh] bg-tron-bg-panel border border-tron-cyan/20 rounded-lg shadow-tron-glow overflow-hidden flex flex-col">
            {/* Top Neon Line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{
                background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
              }}
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-tron-cyan/20 to-tron-blue/20 p-6 border-b border-tron-cyan/20 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-tron-white">Links Legend</h2>
                <p className="text-tron-cyan text-sm mt-1">
                  {filteredLinks.length} link{filteredLinks.length !== 1 ? "s" : ""} available
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-tron-cyan/20 rounded-full transition text-tron-gray hover:text-tron-cyan"
                aria-label="Close legend"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-tron-cyan/20 bg-tron-bg-elevated/50">
              <div className="flex flex-wrap gap-4">
                {/* Region Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-tron-cyan mb-2">
                    Filter by Region
                  </label>
                  <select
                    value={selectedRegion || ""}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value || null);
                      setSelectedState(null); // Reset state when region changes
                    }}
                    className="w-full px-3 py-2 bg-tron-bg-deep border border-tron-cyan/30 rounded-lg text-tron-white text-sm focus:outline-none focus:ring-2 focus:ring-tron-cyan/50"
                  >
                    <option value="">All Regions</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-tron-cyan mb-2">
                    Filter by State
                  </label>
                  <select
                    value={selectedState || ""}
                    onChange={(e) => setSelectedState(e.target.value || null)}
                    className="w-full px-3 py-2 bg-tron-bg-deep border border-tron-cyan/30 rounded-lg text-tron-white text-sm focus:outline-none focus:ring-2 focus:ring-tron-cyan/50"
                  >
                    <option value="">All States</option>
                    {states.map((stateCode) => {
                      const stateName = links?.find((l) => l.stateCode === stateCode)?.stateName || stateCode;
                      return (
                        <option key={stateCode} value={stateCode}>
                          {stateName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Clear Filters */}
                {(selectedState || selectedRegion) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedState(null);
                        setSelectedRegion(null);
                      }}
                      className="px-4 py-2 bg-tron-bg-deep border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/10 transition-colors text-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredLinks.length === 0 ? (
                <div className="text-center text-tron-gray py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-lg">No links found</p>
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedStates.map((stateCode) => {
                    const stateLinks = linksByState[stateCode];
                    const stateName = stateLinks[0]?.stateName || stateCode;
                    const region = stateToRegion[stateCode] || "Other";

                    return (
                      <div
                        key={stateCode}
                        className="bg-tron-bg-elevated/50 border border-tron-cyan/10 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-tron-white">
                            {stateName} ({stateCode})
                          </h3>
                          <span className="text-xs text-tron-cyan bg-tron-cyan/10 px-2 py-1 rounded">
                            {region}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {stateLinks.map((link) => (
                            <div
                              key={link._id}
                              className="flex items-start gap-3 p-3 bg-tron-bg-deep/50 rounded-lg hover:bg-tron-bg-deep transition-colors"
                            >
                              <span className="text-2xl flex-shrink-0">
                                {categoryIcons[link.category] || "🔗"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-tron-cyan hover:text-tron-cyan/80 font-medium text-sm truncate"
                                  >
                                    {link.title}
                                  </a>
                                  <span className="text-xs text-tron-gray bg-tron-gray/20 px-2 py-0.5 rounded">
                                    {link.category}
                                  </span>
                                </div>
                                {link.description && (
                                  <p className="text-xs text-tron-gray line-clamp-2">
                                    {link.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

