import { useState, useTransition, useRef, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
  createCoordinates,
  createTranslateExtent,
} from "@vnedyalk0v/react19-simple-maps";
import type { PreparedFeature } from "@vnedyalk0v/react19-simple-maps";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StateTooltip } from "./StateTooltip";
import type { Doc } from "../../convex/_generated/dataModel";
import { MapPin, X, Plus, Edit2, Trash2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

// Use unpkg CDN which has proper CORS headers
const GEO_URL = "https://unpkg.com/us-atlas@3/states-10m.json";

// State centroid coordinates for pin placement [longitude, latitude]
const stateCentroids: Record<string, [number, number]> = {
  AL: [-86.9023, 32.8067],
  AK: [-153.4937, 64.2008],
  AZ: [-111.4312, 34.0489],
  AR: [-92.3731, 34.7465],
  CA: [-119.4179, 36.7783],
  CO: [-105.7821, 39.5501],
  CT: [-72.7554, 41.6032],
  DE: [-75.5277, 38.9108],
  FL: [-81.5158, 27.6648],
  GA: [-83.6431, 32.1656],
  HI: [-155.5828, 19.8968],
  ID: [-114.4788, 44.0682],
  IL: [-89.3985, 40.6331],
  IN: [-86.1349, 40.2672],
  IA: [-93.0977, 41.878],
  KS: [-98.4842, 39.0119],
  KY: [-85.0, 37.5],
  LA: [-92.1452, 30.9843],
  ME: [-69.4455, 45.2538],
  MD: [-76.6413, 39.0458],
  MA: [-71.3824, 42.4072],
  MI: [-85.6024, 44.3148],
  MN: [-94.6859, 46.7296],
  MS: [-89.3985, 32.3547],
  MO: [-91.8318, 37.9643],
  MT: [-110.3626, 46.8797],
  NE: [-99.9018, 41.4925],
  NV: [-116.4194, 38.8026],
  NH: [-71.5724, 43.1939],
  NJ: [-74.4057, 40.0583],
  NM: [-106.2485, 34.5199],
  NY: [-75.4, 43.0],
  NC: [-79.0193, 35.7596],
  ND: [-101.002, 47.5515],
  OH: [-82.9071, 40.4173],
  OK: [-97.5164, 35.4676],
  OR: [-120.5542, 43.8041],
  PA: [-77.1945, 41.2033],
  RI: [-71.4774, 41.5801],
  SC: [-81.1637, 33.8361],
  SD: [-99.9018, 43.9695],
  TN: [-86.5804, 35.5175],
  TX: [-99.9018, 31.9686],
  UT: [-111.0937, 39.321],
  VT: [-72.5778, 44.5588],
  VA: [-78.6569, 37.4316],
  WA: [-120.7401, 47.7511],
  WV: [-80.4549, 38.5976],
  WI: [-89.6165, 43.7844],
  WY: [-107.2903, 43.076],
  DC: [-77.0369, 38.9072],
};

// Map state names to ISO codes
const stateNameToCode: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

// Categories for links
const CATEGORIES = [
  "Health",
  "Education",
  "Transportation",
  "Legal",
  "Employment",
  "Environment",
  "Housing",
  "Taxes",
  "Solicitations",
];

// State code to name mapping (reverse of stateNameToCode)
const stateCodeToName: Record<string, string> = Object.fromEntries(
  Object.entries(stateNameToCode).map(([name, code]) => [code, name])
);

interface ContextMenuState {
  link: Doc<"govLinks">;
  position: { x: number; y: number };
}

interface MapState {
  selectedState: string | null;
  hoveredState: string | null;
  tooltipPosition: { x: number; y: number } | null;
  isCreateMode: boolean;
  createPinState: string | null; // State code where we're creating a pin
  contextMenu: ContextMenuState | null; // Right-click context menu
  editPin: Doc<"govLinks"> | null; // Pin being edited
  deleteConfirm: Doc<"govLinks"> | null; // Pin pending deletion confirmation
}

// Pin component props
interface PinProps {
  link: Doc<"govLinks">;
  isHighlighted: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, link: Doc<"govLinks">) => void;
}

// Create Pin Modal Component
interface CreatePinModalProps {
  stateCode: string;
  stateName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePinModal({ stateCode, stateName, onClose, onSuccess }: CreatePinModalProps) {
  const addLink = useMutation(api.links.addLink);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState<'select' | 'manual'>('select');
  const [manualUrl, setManualUrl] = useState('');
  const [selectedApprovedUrl, setSelectedApprovedUrl] = useState('');
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState('');

  // Get approved procurement URLs for this state
  const approvedUrls = useQuery(api.procurementUrls.getApprovedByState, { state: stateName });
  // Also get all approved URLs in case user wants to select from other states
  const allApprovedUrls = useQuery(api.procurementUrls.getApproved);

  // Filter URLs based on search
  const filteredUrls = allApprovedUrls?.filter((url) => {
    if (!comboSearch) return true;
    const searchLower = comboSearch.toLowerCase();
    return (
      url.state.toLowerCase().includes(searchLower) ||
      url.capital.toLowerCase().includes(searchLower) ||
      url.procurementLink.toLowerCase().includes(searchLower)
    );
  }) ?? [];

  // Sort to show matching state first
  const sortedUrls = [...filteredUrls].sort((a, b) => {
    if (a.state === stateName && b.state !== stateName) return -1;
    if (b.state === stateName && a.state !== stateName) return 1;
    return a.state.localeCompare(b.state);
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    // Determine URL based on mode
    const url = urlMode === 'manual' ? manualUrl : selectedApprovedUrl;
    
    if (!url) {
      setError("Please enter or select a URL");
      setIsPending(false);
      return;
    }

    try {
      await addLink({
        title: formData.get("title") as string,
        url,
        stateCode,
        stateName,
        category: formData.get("category") as string,
        description: (formData.get("description") as string) || undefined,
      });
      onSuccess();
    } catch {
      setError("Failed to add link. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleSelectUrl = (url: string) => {
    setSelectedApprovedUrl(url);
    setComboSearch('');
    setIsComboOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-tron-bg-elevated border border-tron-cyan/30 rounded-xl shadow-tron-glow max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-tron-cyan/20 to-tron-blue/20 p-4 border-b border-tron-cyan/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(253, 61, 181, 0.2)" }}
            >
              <MapPin className="w-5 h-5" style={{ color: "rgb(253, 61, 181)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-tron-white">Drop Pin in {stateCode}</h2>
              <p className="text-xs text-tron-gray">{stateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tron-cyan/20 rounded-full transition text-tron-gray hover:text-tron-cyan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Title *
            </label>
            <input
              name="title"
              type="text"
              required
              disabled={isPending}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
              placeholder="e.g., California DMV"
            />
          </div>

          {/* URL Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-2">
              URL *
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUrlMode('select')}
                disabled={isPending}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  urlMode === 'select'
                    ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/50'
                    : 'bg-tron-bg-card text-tron-gray border border-tron-cyan/20 hover:border-tron-cyan/40'
                } disabled:opacity-50`}
              >
                Select Verified URL
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('manual')}
                disabled={isPending}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  urlMode === 'manual'
                    ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/50'
                    : 'bg-tron-bg-card text-tron-gray border border-tron-cyan/20 hover:border-tron-cyan/40'
                } disabled:opacity-50`}
              >
                Enter Manually
              </button>
            </div>

            {urlMode === 'manual' ? (
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                required={urlMode === 'manual'}
                disabled={isPending}
                className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                placeholder="https://..."
              />
            ) : (
              <div className="relative">
                {/* Combobox Input */}
                <div 
                  className={`w-full px-3 py-2 bg-tron-bg-card border rounded-lg cursor-pointer flex items-center justify-between ${
                    isComboOpen ? 'border-tron-cyan ring-2 ring-tron-cyan' : 'border-tron-cyan/20'
                  } ${isPending ? 'opacity-50' : ''}`}
                  onClick={() => !isPending && setIsComboOpen(!isComboOpen)}
                >
                  {selectedApprovedUrl ? (
                    <span className="text-tron-white truncate">{selectedApprovedUrl}</span>
                  ) : (
                    <span className="text-tron-gray">Select a verified URL...</span>
                  )}
                  <svg 
                    className={`w-4 h-4 text-tron-gray transition-transform ${isComboOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Dropdown */}
                {isComboOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-tron-bg-elevated border border-tron-cyan/30 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-tron-cyan/20">
                      <input
                        type="text"
                        value={comboSearch}
                        onChange={(e) => setComboSearch(e.target.value)}
                        placeholder="Search states or URLs..."
                        className="w-full px-2 py-1.5 text-sm bg-tron-bg-card border border-tron-cyan/20 rounded text-tron-white placeholder-tron-gray focus:outline-none focus:ring-1 focus:ring-tron-cyan"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Options List */}
                    <div className="max-h-44 overflow-y-auto">
                      {sortedUrls.length > 0 ? (
                        sortedUrls.map((url) => (
                          <button
                            key={url._id}
                            type="button"
                            onClick={() => handleSelectUrl(url.procurementLink)}
                            className={`w-full px-3 py-2 text-left hover:bg-tron-cyan/10 transition ${
                              url.state === stateName ? 'bg-tron-cyan/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-tron-white">
                                  {url.state}
                                  {url.state === stateName && (
                                    <span className="ml-2 text-xs text-tron-cyan">(This state)</span>
                                  )}
                                </p>
                                <p className="text-xs text-tron-gray">{url.capital}</p>
                              </div>
                            </div>
                            <p className="text-xs text-tron-gray truncate mt-1">{url.procurementLink}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-sm text-tron-gray">
                          {allApprovedUrls?.length === 0 
                            ? 'No verified URLs available. Import and approve some first.'
                            : 'No matching URLs found.'
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hint about verified URLs */}
            {urlMode === 'select' && approvedUrls && approvedUrls.length > 0 && (
              <p className="text-xs text-tron-gray mt-1">
                {approvedUrls.length} verified URL{approvedUrls.length > 1 ? 's' : ''} available for {stateName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Category *
            </label>
            <select
              name="category"
              required
              disabled={isPending}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
            >
              <option value="" className="bg-tron-bg-card">Select category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-tron-bg-card">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Description
            </label>
            <textarea
              name="description"
              disabled={isPending}
              rows={2}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50 resize-none"
              placeholder="Brief description..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-tron-cyan/30 rounded-lg text-tron-gray hover:text-tron-white hover:border-tron-cyan/50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: "rgb(253, 61, 181)",
                color: "white",
              }}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Drop Pin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Context Menu Component
interface ContextMenuProps {
  link: Doc<"govLinks">;
  position: { x: number; y: number };
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function PinContextMenu({ link, position, onEdit, onDelete, onClose }: ContextMenuProps) {
  // Close menu when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50" 
      onClick={handleBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute bg-tron-bg-elevated border border-tron-cyan/30 rounded-lg shadow-tron-glow overflow-hidden min-w-[160px]"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, 8px)",
        }}
      >
        {/* Header with link title */}
        <div className="px-3 py-2 bg-tron-bg-card border-b border-tron-cyan/20">
          <p className="text-xs text-tron-gray truncate max-w-[200px]">{link.title}</p>
        </div>
        
        {/* Menu Items */}
        <div className="py-1">
          <button
            onClick={onEdit}
            className="w-full px-3 py-2 flex items-center gap-2 text-sm text-tron-white hover:bg-tron-cyan/20 transition"
          >
            <Edit2 className="w-4 h-4 text-tron-cyan" />
            Edit Link
          </button>
          <button
            onClick={onDelete}
            className="w-full px-3 py-2 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="w-4 h-4" />
            Remove Pin
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Pin Modal Component
interface EditPinModalProps {
  link: Doc<"govLinks">;
  onClose: () => void;
  onSuccess: () => void;
}

function EditPinModal({ link, onClose, onSuccess }: EditPinModalProps) {
  const updateLink = useMutation(api.links.updateLink);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await updateLink({
        id: link._id as Id<"govLinks">,
        title: formData.get("title") as string,
        url: formData.get("url") as string,
        category: formData.get("category") as string,
        description: (formData.get("description") as string) || undefined,
      });
      onSuccess();
    } catch {
      setError("Failed to update link. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-tron-bg-elevated border border-tron-cyan/30 rounded-xl shadow-tron-glow max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-tron-cyan/20 to-tron-blue/20 p-4 border-b border-tron-cyan/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-tron-cyan/20">
              <Edit2 className="w-5 h-5 text-tron-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-tron-white">Edit Pin</h2>
              <p className="text-xs text-tron-gray">{link.stateCode} - {link.stateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tron-cyan/20 rounded-full transition text-tron-gray hover:text-tron-cyan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Title *
            </label>
            <input
              name="title"
              type="text"
              required
              disabled={isPending}
              defaultValue={link.title}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              URL *
            </label>
            <input
              name="url"
              type="url"
              required
              disabled={isPending}
              defaultValue={link.url}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Category *
            </label>
            <select
              name="category"
              required
              disabled={isPending}
              defaultValue={link.category}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-tron-bg-card">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-tron-cyan mb-1">
              Description
            </label>
            <textarea
              name="description"
              disabled={isPending}
              rows={2}
              defaultValue={link.description ?? ""}
              className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-tron-cyan/30 rounded-lg text-tron-gray hover:text-tron-white hover:border-tron-cyan/50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 bg-tron-cyan text-tron-bg-deep hover:bg-tron-cyan/90"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-tron-bg-deep/30 border-t-tron-bg-deep rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  link: Doc<"govLinks">;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteConfirmModal({ link, onClose, onSuccess }: DeleteConfirmModalProps) {
  const deleteLink = useMutation(api.links.deleteLink);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsPending(true);
    setError(null);

    try {
      await deleteLink({ id: link._id as Id<"govLinks"> });
      onSuccess();
    } catch {
      setError("Failed to delete link. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-tron-bg-elevated border border-red-500/30 rounded-xl shadow-lg max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-tron-white">Remove Pin</h2>
            <p className="text-xs text-tron-gray">This action cannot be undone</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-tron-gray mb-4">
            Are you sure you want to remove the pin for{" "}
            <span className="text-tron-white font-medium">"{link.title}"</span>?
          </p>

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-tron-cyan/30 rounded-lg text-tron-gray hover:text-tron-white hover:border-tron-cyan/50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 bg-red-500 text-white hover:bg-red-600"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Remove
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple hash function to get consistent offset from ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Pin marker component
function Pin({ link, isHighlighted, onClick, onContextMenu }: PinProps) {
  const centroid = stateCentroids[link.stateCode];
  if (!centroid) return null;

  // Use consistent offset based on link ID (so it doesn't change on re-render)
  // Reduced offset to ±0.3 degrees (~20 miles) to keep pins within state boundaries
  const hash = hashCode(link._id);
  const offsetX = ((hash % 100) / 100 - 0.5) * 0.6;
  const offsetY = (((hash >> 8) % 100) / 100 - 0.5) * 0.6;

  const pinColor = isHighlighted 
    ? "rgb(253, 61, 181)" // Neon/Hot Magenta
    : "#00d4ff"; // Tron cyan

  const glowColor = isHighlighted
    ? "rgba(253, 61, 181, 0.8)"
    : "rgba(0, 212, 255, 0.6)";

  return (
    <Marker coordinates={createCoordinates(centroid[0] + offsetX, centroid[1] + offsetY)}>
      <g
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, link);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Pin shadow/glow */}
        <ellipse
          cx={0}
          cy={2}
          rx={4}
          ry={2}
          fill={glowColor}
          opacity={0.5}
        />
        {/* Pin body */}
        <path
          d="M0,-12 C-6,-12 -6,-4 0,4 C6,-4 6,-12 0,-12"
          fill={pinColor}
          stroke={isHighlighted ? "#fff" : "#0a1929"}
          strokeWidth={0.5}
          style={{
            filter: `drop-shadow(0 0 4px ${glowColor})`,
            transition: "fill 0.2s ease, filter 0.2s ease",
          }}
        />
        {/* Pin dot with state code */}
        <circle
          cx={0}
          cy={-8}
          r={2}
          fill={isHighlighted ? "#fff" : "#0a1929"}
        />
        {/* State code label - shows which state the pin belongs to */}
        <text
          x={0}
          y={-18}
          textAnchor="middle"
          fontSize={4}
          fontWeight="bold"
          fill={isHighlighted ? "#fff" : pinColor}
          style={{
            textShadow: `0 0 2px ${glowColor}`,
            pointerEvents: "none",
          }}
        >
          {link.stateCode}
        </text>
      </g>
    </Marker>
  );
}

interface USAMapProps {
  isAdmin?: boolean;
}

export function USAMap({ isAdmin = false }: USAMapProps) {
  const [mapState, setMapState] = useState<MapState>({
    selectedState: null,
    hoveredState: null,
    tooltipPosition: null,
    isCreateMode: false,
    createPinState: null,
    contextMenu: null,
    editPin: null,
    deleteConfirm: null,
  });
  const [isPending, startTransition] = useTransition();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const stateStats = useQuery(api.links.getStateStats);

  // Get all active links for displaying pins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLinks = useQuery((api.links as any).getAllActiveLinks) as Doc<"govLinks">[] | undefined;

  // Handle pin click - open link in new tab
  const handlePinClick = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // Handle pin right-click - show context menu
  const handlePinContextMenu = useCallback((e: React.MouseEvent, link: Doc<"govLinks">) => {
    setMapState((prev) => ({
      ...prev,
      contextMenu: {
        link,
        position: { x: e.clientX, y: e.clientY },
      },
    }));
  }, []);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      contextMenu: null,
    }));
  }, []);

  // Open edit modal from context menu
  const handleEditFromContextMenu = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      editPin: prev.contextMenu?.link ?? null,
      contextMenu: null,
    }));
  }, []);

  // Open delete confirm from context menu
  const handleDeleteFromContextMenu = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      deleteConfirm: prev.contextMenu?.link ?? null,
      contextMenu: null,
    }));
  }, []);

  // Close edit modal
  const handleCloseEditModal = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      editPin: null,
    }));
  }, []);

  // Close delete confirmation modal
  const handleCloseDeleteModal = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      deleteConfirm: null,
    }));
  }, []);

  // Toggle create mode
  const toggleCreateMode = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      isCreateMode: !prev.isCreateMode,
      selectedState: null, // Clear selection when toggling mode
    }));
  }, []);

  const handleStateClick = (stateName: string) => {
    const stateCode = stateNameToCode[stateName];
    if (stateCode) {
      if (isAdmin && mapState.isCreateMode) {
        // In create mode (admin only), open the create pin modal
        setMapState((prev) => ({
          ...prev,
          createPinState: stateCode,
        }));
      } else {
        // Normal mode - check if state has any pins
        const stateHasPins = allLinks?.some((link) => link.stateCode === stateCode) ?? false;
        
        if (stateHasPins) {
          // State has pins - select the state to highlight them
          startTransition(() => {
            setMapState((prev) => ({
              ...prev,
              selectedState: stateCode,
            }));
          });
        } else if (isAdmin) {
          // State has no pins and user is admin - auto-open create pin modal
          setMapState((prev) => ({
            ...prev,
            createPinState: stateCode,
          }));
        }
        // If not admin and no pins, just do nothing (or could show a message)
      }
    }
  };

  const handleCloseCreateModal = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      createPinState: null,
    }));
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      createPinState: null,
      isCreateMode: false, // Exit create mode after success
    }));
  }, []);

  const handleStateHover = useCallback(
    (stateName: string | null, event?: React.MouseEvent) => {
      if (stateName && event) {
        const stateCode = stateNameToCode[stateName];
        // Calculate position relative to the map container for proper positioning
        const container = mapContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          setMapState((prev) => ({
            ...prev,
            hoveredState: stateCode || null,
            tooltipPosition: {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            },
          }));
        }
      } else {
        setMapState((prev) => ({
          ...prev,
          hoveredState: null,
          tooltipPosition: null,
        }));
      }
    },
    []
  );

  const getLinkCount = (stateCode: string): number => {
    return stateStats?.find((s) => s.stateCode === stateCode)?.count ?? 0;
  };

  const getFillColor = (stateCode: string): string => {
    const count = getLinkCount(stateCode);
    if (count === 0) return "#161b22"; // tron-bg-card
    if (count < 5) return "#0066ff"; // tron-blue
    if (count < 10) return "#00d4ff"; // tron-cyan
    return "#00ff88"; // neon-success
  };

  return (
    <div className="p-4 lg:p-6 h-[calc(100vh-2rem)] bg-tron-bg-deep">
      {/* Map Container - fills available height */}
      <div 
        className="tron-panel p-4 lg:p-6 relative h-full flex flex-col" 
        ref={mapContainerRef}
      >
        <h1 className="text-xl lg:text-2xl font-bold text-tron-white mb-3 lg:mb-4 tron-text-glow shrink-0">
          Government Link Hub
        </h1>

        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full flex-1 min-h-0"
          projectionConfig={{
            scale: 1000,
          }}
        >
          <ZoomableGroup
            center={createCoordinates(-97, 38)}
            minZoom={1}
            maxZoom={5}
            translateExtent={createTranslateExtent(
              createCoordinates(-200, -100),
              createCoordinates(1200, 700)
            )}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                (geographies as PreparedFeature[]).map((geo) => {
                  const stateName = geo.properties?.name as string | undefined;
                  const stateCode = stateName ? stateNameToCode[stateName] : undefined;
                  const isSelected = mapState.selectedState === stateCode;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => stateName && handleStateClick(stateName)}
                      onMouseEnter={(e) => handleStateHover(stateName ?? null, e)}
                      onMouseLeave={() => handleStateHover(null)}
                      style={{
                        default: {
                          fill: isSelected
                            ? "#00d4ff"
                            : getFillColor(stateCode ?? ""),
                          stroke: isSelected ? "#00d4ff" : "rgba(0, 212, 255, 0.3)",
                          strokeWidth: isSelected ? 1.5 : 0.75,
                          outline: "none",
                          filter: isSelected ? "drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))" : "none",
                        },
                        hover: {
                          fill: mapState.isCreateMode ? "rgb(253, 61, 181)" : "#00d4ff",
                          stroke: mapState.isCreateMode ? "rgb(253, 61, 181)" : "#00d4ff",
                          strokeWidth: 1.5,
                          outline: "none",
                          cursor: mapState.isCreateMode ? "crosshair" : "pointer",
                          filter: mapState.isCreateMode 
                            ? "drop-shadow(0 0 10px rgba(253, 61, 181, 0.8))" 
                            : "drop-shadow(0 0 10px rgba(0, 212, 255, 0.8))",
                        },
                        pressed: {
                          fill: mapState.isCreateMode ? "rgb(200, 50, 140)" : "#00a8cc",
                          outline: "none",
                        },
                      }}
                      className="transition-colors duration-150"
                    />
                  );
                })
              }
            </Geographies>
            
            {/* Render pins for all active links */}
            {allLinks?.map((link) => (
              <Pin
                key={link._id}
                link={link}
                isHighlighted={mapState.selectedState === link.stateCode}
                onClick={() => handlePinClick(link.url)}
                onContextMenu={isAdmin ? handlePinContextMenu : () => {}}
              />
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-tron-bg-panel/95 backdrop-blur-sm border border-tron-cyan/20 p-3 rounded-lg shadow-tron-glow">
          <p className="text-xs font-medium text-tron-cyan mb-2">
            Links per State
          </p>
          <div className="flex gap-2">
            {[
              { color: "#161b22", label: "0" },
              { color: "#0066ff", label: "1-4" },
              { color: "#00d4ff", label: "5-9" },
              { color: "#00ff88", label: "10+" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ 
                    backgroundColor: color,
                    boxShadow: color !== "#161b22" ? `0 0 6px ${color}80` : "none"
                  }}
                />
                <span className="text-xs text-tron-gray">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {isPending && (
          <div className="absolute inset-0 bg-tron-bg-deep/50 backdrop-blur-sm flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-tron-cyan border-t-transparent rounded-full shadow-tron-glow" />
          </div>
        )}

        {/* Tooltip - positioned inside container for proper zoom/pan handling */}
        {mapState.hoveredState && mapState.tooltipPosition && (
          <StateTooltip
            stateCode={mapState.hoveredState}
            linkCount={getLinkCount(mapState.hoveredState)}
            position={mapState.tooltipPosition}
          />
        )}

        {/* Create Pin Toggle Button - Admin only */}
        {isAdmin && (
          <button
            onClick={toggleCreateMode}
            className={`absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${
              mapState.isCreateMode
                ? "text-white"
                : "bg-tron-bg-panel/95 backdrop-blur-sm border border-tron-cyan/30 text-tron-cyan hover:bg-tron-cyan/10"
            }`}
            style={mapState.isCreateMode ? { 
              backgroundColor: "rgb(253, 61, 181)",
              boxShadow: "0 0 20px rgba(253, 61, 181, 0.5)"
            } : {}}
          >
            {mapState.isCreateMode ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Pin
              </>
            )}
          </button>
        )}

        {/* Create Mode Instruction Banner - Admin only */}
        {isAdmin && mapState.isCreateMode && (
          <div 
            className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium text-white animate-pulse"
            style={{ backgroundColor: "rgba(253, 61, 181, 0.9)" }}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Click on any state to drop a pin
          </div>
        )}

        {/* Selected state indicator (only in normal mode) */}
        {!mapState.isCreateMode && mapState.selectedState && (
          <div className="absolute top-20 right-6 bg-tron-bg-panel/95 backdrop-blur-sm border border-tron-cyan/20 p-3 rounded-lg shadow-tron-glow flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: "rgb(253, 61, 181)" }}
            />
            <span className="text-sm font-medium text-tron-white">
              {mapState.selectedState} selected
            </span>
            <button
              onClick={() => setMapState((prev) => ({ ...prev, selectedState: null }))}
              className="ml-2 text-tron-gray hover:text-tron-cyan transition-colors"
              aria-label="Clear selection"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Create Pin Modal - Admin only */}
      {isAdmin && mapState.createPinState && (
        <CreatePinModal
          stateCode={mapState.createPinState}
          stateName={stateCodeToName[mapState.createPinState] ?? mapState.createPinState}
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Right-click Context Menu - Admin only */}
      {isAdmin && mapState.contextMenu && (
        <PinContextMenu
          link={mapState.contextMenu.link}
          position={mapState.contextMenu.position}
          onEdit={handleEditFromContextMenu}
          onDelete={handleDeleteFromContextMenu}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Edit Pin Modal - Admin only */}
      {isAdmin && mapState.editPin && (
        <EditPinModal
          link={mapState.editPin}
          onClose={handleCloseEditModal}
          onSuccess={handleCloseEditModal}
        />
      )}

      {/* Delete Confirmation Modal - Admin only */}
      {isAdmin && mapState.deleteConfirm && (
        <DeleteConfirmModal
          link={mapState.deleteConfirm}
          onClose={handleCloseDeleteModal}
          onSuccess={handleCloseDeleteModal}
        />
      )}
    </div>
  );
}
