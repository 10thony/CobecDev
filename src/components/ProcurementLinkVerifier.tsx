import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Upload,
  CheckCircle,
  XCircle,
  ExternalLink,
  Globe,
  MapPin,
  Building2,
  FileJson,
  AlertTriangle,
  CheckCheck,
  Trash2,
  RotateCcw,
  Filter,
  Edit3,
  Save,
  Link2,
  Plus,
  UserCheck,
  UserX,
  Bot,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Search,
} from "lucide-react";
import { TronPanel } from "./TronPanel";
import { TronButton } from "./TronButton";
import { TronStatCard } from "./TronStatCard";

// US States data for dropdown
const US_STATES = [
  { name: "Alabama", capital: "Montgomery" },
  { name: "Alaska", capital: "Juneau" },
  { name: "Arizona", capital: "Phoenix" },
  { name: "Arkansas", capital: "Little Rock" },
  { name: "California", capital: "Sacramento" },
  { name: "Colorado", capital: "Denver" },
  { name: "Connecticut", capital: "Hartford" },
  { name: "Delaware", capital: "Dover" },
  { name: "Florida", capital: "Tallahassee" },
  { name: "Georgia", capital: "Atlanta" },
  { name: "Hawaii", capital: "Honolulu" },
  { name: "Idaho", capital: "Boise" },
  { name: "Illinois", capital: "Springfield" },
  { name: "Indiana", capital: "Indianapolis" },
  { name: "Iowa", capital: "Des Moines" },
  { name: "Kansas", capital: "Topeka" },
  { name: "Kentucky", capital: "Frankfort" },
  { name: "Louisiana", capital: "Baton Rouge" },
  { name: "Maine", capital: "Augusta" },
  { name: "Maryland", capital: "Annapolis" },
  { name: "Massachusetts", capital: "Boston" },
  { name: "Michigan", capital: "Lansing" },
  { name: "Minnesota", capital: "Saint Paul" },
  { name: "Mississippi", capital: "Jackson" },
  { name: "Missouri", capital: "Jefferson City" },
  { name: "Montana", capital: "Helena" },
  { name: "Nebraska", capital: "Lincoln" },
  { name: "Nevada", capital: "Carson City" },
  { name: "New Hampshire", capital: "Concord" },
  { name: "New Jersey", capital: "Trenton" },
  { name: "New Mexico", capital: "Santa Fe" },
  { name: "New York", capital: "Albany" },
  { name: "North Carolina", capital: "Raleigh" },
  { name: "North Dakota", capital: "Bismarck" },
  { name: "Ohio", capital: "Columbus" },
  { name: "Oklahoma", capital: "Oklahoma City" },
  { name: "Oregon", capital: "Salem" },
  { name: "Pennsylvania", capital: "Harrisburg" },
  { name: "Rhode Island", capital: "Providence" },
  { name: "South Carolina", capital: "Columbia" },
  { name: "South Dakota", capital: "Pierre" },
  { name: "Tennessee", capital: "Nashville" },
  { name: "Texas", capital: "Austin" },
  { name: "Utah", capital: "Salt Lake City" },
  { name: "Vermont", capital: "Montpelier" },
  { name: "Virginia", capital: "Richmond" },
  { name: "Washington", capital: "Olympia" },
  { name: "West Virginia", capital: "Charleston" },
  { name: "Wisconsin", capital: "Madison" },
  { name: "Wyoming", capital: "Cheyenne" },
  { name: "District of Columbia", capital: "Washington" },
];

// Region mapping for state grouping
const STATE_REGIONS: Record<string, string[]> = {
  "West Coast": ["California", "Oregon", "Washington", "Alaska", "Hawaii"],
  Northwest: ["Idaho", "Montana", "Wyoming", "Nevada", "Utah"],
  Midwest: [
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Michigan",
    "Minnesota",
    "Missouri",
    "Nebraska",
    "North Dakota",
    "Ohio",
    "South Dakota",
    "Wisconsin",
  ],
  Northeast: [
    "Connecticut",
    "Maine",
    "Massachusetts",
    "New Hampshire",
    "Rhode Island",
    "Vermont",
    "New Jersey",
    "New York",
    "Pennsylvania",
  ],
  Southeast: [
    "Alabama",
    "Florida",
    "Georgia",
    "Kentucky",
    "Mississippi",
    "North Carolina",
    "South Carolina",
    "Tennessee",
    "Virginia",
    "West Virginia",
  ],
  South: ["Arkansas", "Louisiana", "Oklahoma", "Texas"],
  "Mid Central": ["Colorado", "New Mexico"],
  East: ["Delaware", "Maryland", "District of Columbia"],
};

// Reverse mapping: state -> region
const STATE_TO_REGION: Record<string, string> = {};
Object.entries(STATE_REGIONS).forEach(([region, states]) => {
  states.forEach((state) => {
    STATE_TO_REGION[state] = region;
  });
});

interface ProcurementLink {
  state: string;
  capital: string;
  official_website: string;
  procurement_link: string;
  entity_type?: string;
  link_type?: string;
  confidence_score?: number;
}

interface ProcurementLinkVerifierProps {
  className?: string;
}

type StatusFilter = "all" | "pending" | "approved" | "denied";

// Component to display scraped data for a procurement URL
function ScrapedDataSection({ urlId }: { urlId: Id<"procurementUrls"> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary = (useQuery as any)(
    // @ts-ignore Convex types are too deep here
    (api as any).procurementData.getSummaryByProcurementUrlId,
    { procurementUrlId: urlId },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allData = (useQuery as any)(
    // @ts-ignore Convex types are too deep here
    (api as any).procurementData.getByProcurementUrlId,
    { procurementUrlId: urlId },
  );

  if (!summary || summary.count === 0) {
    return null;
  }

  return (
    <div className="mb-3 pt-2 border-t border-tron-cyan/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs text-tron-cyan hover:text-tron-cyan-bright transition-colors p-1.5 rounded hover:bg-tron-bg-elevated"
      >
        <span className="flex items-center gap-1.5">
          <FileJson className="w-3.5 h-3.5" />
          Scraped Data
          <span className="px-1.5 py-0.5 bg-tron-cyan/20 text-tron-cyan rounded-full text-xs">
            {summary.count}
          </span>
          {summary.totalRows > 0 && (
            <span className="text-tron-gray">• {summary.totalRows} rows</span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {isExpanded && allData && (
        <div className="mt-2 space-y-2">
          {allData.map((dataItem: any, idx: number) => (
            <div
              key={dataItem._id}
              className="p-2.5 bg-tron-bg-deep border border-tron-cyan/20 rounded text-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-tron-cyan font-medium">
                    Scrape #{allData.length - idx}
                  </span>
                  <span className="text-tron-gray">
                    {new Date(dataItem.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    dataItem.status === "pending_review"
                      ? "bg-neon-warning/20 text-neon-warning"
                      : "bg-neon-success/20 text-neon-success"
                  }`}
                >
                  {dataItem.status}
                </span>
              </div>
              <div className="text-tron-gray space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-tron-white">Rows:</span>
                  <span>{dataItem.rowCount}</span>
                </div>
                {dataItem.sourceUrl && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-tron-white">Source:</span>
                    <a
                      href={dataItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tron-cyan hover:underline truncate max-w-xs"
                    >
                      {dataItem.sourceUrl}
                    </a>
                  </div>
                )}
                {dataItem.data && dataItem.data.length > 0 && (
                  <div className="mt-2">
                    <details className="cursor-pointer">
                      <summary className="text-tron-cyan hover:text-tron-cyan-bright">
                        View Data ({dataItem.data.length} records)
                      </summary>
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        <pre className="text-xs bg-tron-bg-card p-2 rounded border border-tron-cyan/10">
                          {JSON.stringify(dataItem.data.slice(0, 5), null, 2)}
                          {dataItem.data.length > 5 && (
                            <span className="text-tron-gray">
                              ... and {dataItem.data.length - 5} more records
                            </span>
                          )}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProcurementLinkVerifier({
  className = "",
}: ProcurementLinkVerifierProps) {
  const { isSignedIn } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    duplicates: string[];
  } | null>(null);
  const [dedupeResult, setDedupeResult] = useState<{
    groupsScanned: number;
    groupsDeduped: number;
    removed: number;
    kept: number;
    message: string;
  } | null>(null);
  const [isDeduping, setIsDeduping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dedupeResult) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDedupeResult(null);
    }, 10_000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [dedupeResult]);
  const [dragOver, setDragOver] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [stateFilterSticky, setStateFilterSticky] = useState(false);
  const [stateFilterHover, setStateFilterHover] = useState(false);
  const stateFilterHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // State for editing corrected links
  const [editingId, setEditingId] = useState<Id<"procurementUrls"> | null>(
    null,
  );
  const [correctedLink, setCorrectedLink] = useState("");
  // State for editing official website
  const [editingOfficialWebsiteId, setEditingOfficialWebsiteId] =
    useState<Id<"procurementUrls"> | null>(null);
  const [correctedOfficialWebsite, setCorrectedOfficialWebsite] = useState("");
  const [requiresRegistration, setRequiresRegistration] = useState<
    Record<string, boolean>
  >({});
  // Track which links have been modified (edited)
  const [modifiedLinks, setModifiedLinks] = useState<
    Set<Id<"procurementUrls">>
  >(new Set());

  // Track expanded scraped data for each URL
  const [expandedScrapedData, setExpandedScrapedData] = useState<
    Record<string, boolean>
  >({});

  // Track which sections are collapsed
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    stats: false,
    import: false,
    manualEntry: false,
    aiAgent: false,
    links: false,
  });

  // Default section order (filter section is now merged into stats)
  // Order: 1. Statistics, 2. Procurement Links Grid, 3. AI Agent, 4. Import, 5. Manual Entry
  const defaultSectionOrder = [
    "stats",
    "links",
    "aiAgent",
    "import",
    "manualEntry",
  ];

  // Load section order from localStorage
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("procurementLinkVerifier_sectionOrder");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out 'filter' section if it exists (merged into stats)
        const filtered = parsed.filter((s: string) => s !== "filter");
        // Ensure all sections are present
        const allSections = [...new Set([...filtered, ...defaultSectionOrder])];
        return allSections.filter((s) => defaultSectionOrder.includes(s));
      } catch {
        return defaultSectionOrder;
      }
    }
    return defaultSectionOrder;
  });

  // Save section order to localStorage
  useEffect(() => {
    localStorage.setItem(
      "procurementLinkVerifier_sectionOrder",
      JSON.stringify(sectionOrder),
    );
  }, [sectionOrder]);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Drag and drop handlers
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", sectionId);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSection(null);
    setDragOverSection(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedSection && draggedSection !== sectionId) {
      setDragOverSection(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSection(null);

    if (!draggedSection || draggedSection === targetSectionId) {
      return;
    }

    const newOrder = [...sectionOrder];
    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged section from its current position
      newOrder.splice(draggedIndex, 1);
      // Insert at target position
      newOrder.splice(targetIndex, 0, draggedSection);
      setSectionOrder(newOrder);
    }

    setDraggedSection(null);
  };

  // State for manual link entry form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    state: "",
    capital: "",
    officialWebsite: "",
    procurementLink: "",
    requiresRegistration: false,
  });
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualFormSuccess, setManualFormSuccess] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const [cardContextMenu, setCardContextMenu] = useState<null | {
    url: any;
    position: { x: number; y: number };
  }>(null);
  const [overrideUrl, setOverrideUrl] = useState<any | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    state: "",
    capital: "",
    officialWebsite: "",
    procurementLink: "",
    status: "pending" as "pending" | "approved" | "denied",
    verifiedBy: "",
    verifiedAt: "",
    denialReason: "",
    importedAt: "",
    sourceFile: "",
    requiresRegistration: "" as "" | "true" | "false",
    aiReviewStatus: "" as "" | "idle" | "processing" | "completed" | "failed",
    aiDecision: "" as "" | "approve" | "deny",
    aiReasoning: "",
    lastAgentAttempt: "",
  });
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Queries
  const allUrls = useQuery(api.procurementUrls.list, {});
  const stats = useQuery(api.procurementUrls.getStats);
  const isAdmin = useQuery((api as any).cobecAdmins.checkIsAdmin, {});

  // Mutations
  const importFromJson = useMutation(api.procurementUrls.importFromJson);
  const approve = useMutation(api.procurementUrls.approve);
  const deny = useMutation(api.procurementUrls.deny);
  const resetToPending = useMutation(api.procurementUrls.resetToPending);
  const remove = useMutation(api.procurementUrls.remove);
  const approveAll = useMutation(api.procurementUrls.approveAll);
  const clearAll = useMutation(api.procurementUrls.clearAll);
  const dedupeByProcurementLink = useMutation(
    api.procurementUrls.dedupeByProcurementLink,
  );
  const updateLink = useMutation(api.procurementUrls.update);
  const addManual = useMutation(api.procurementUrls.addManual);
  const adminOverride = useMutation((api as any).procurementUrls.adminOverride);

  // AI Agent Actions
  const triggerAiVerification = useAction(
    api.agent.procurementVerifier.triggerVerification,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    processed: number;
    approved: number;
    denied: number;
    errors: number;
  } | null>(null);

  const buildOverrideFormFromUrl = (url: any) => {
    setOverrideForm({
      state: url.state ?? "",
      capital: url.capital ?? "",
      officialWebsite: url.officialWebsite ?? "",
      procurementLink: url.procurementLink ?? "",
      status: (url.status ?? "pending") as "pending" | "approved" | "denied",
      verifiedBy: url.verifiedBy ?? "",
      verifiedAt: url.verifiedAt ? String(url.verifiedAt) : "",
      denialReason: url.denialReason ?? "",
      importedAt: url.importedAt ? String(url.importedAt) : "",
      sourceFile: url.sourceFile ?? "",
      requiresRegistration:
        url.requiresRegistration === undefined
          ? ""
          : url.requiresRegistration
            ? "true"
            : "false",
      aiReviewStatus: (url.aiReviewStatus ?? "") as
        | ""
        | "idle"
        | "processing"
        | "completed"
        | "failed",
      aiDecision: (url.aiDecision ?? "") as "" | "approve" | "deny",
      aiReasoning: url.aiReasoning ?? "",
      lastAgentAttempt: url.lastAgentAttempt
        ? String(url.lastAgentAttempt)
        : "",
    });
  };

  const openCardContextMenu = (e: ReactMouseEvent, url: any) => {
    if (isAdmin !== true) return;
    e.preventDefault();
    setCardContextMenu({
      url,
      position: { x: (e as any).clientX, y: (e as any).clientY },
    });
  };

  const closeCardContextMenu = () => setCardContextMenu(null);

  const openOverrideModal = (url: any) => {
    setOverrideError(null);
    setIsSavingOverride(false);
    setOverrideUrl(url);
    buildOverrideFormFromUrl(url);
  };

  const closeOverrideModal = () => {
    setOverrideUrl(null);
    setOverrideError(null);
    setIsSavingOverride(false);
  };

  const handleEditFromContextMenu = () => {
    if (!cardContextMenu) return;
    openOverrideModal(cardContextMenu.url);
    setCardContextMenu(null);
  };

  const handleSaveOverride = async () => {
    if (isAdmin !== true) return;
    if (!overrideUrl) return;

    setOverrideError(null);

    const importedAt = Number(overrideForm.importedAt);
    const verifiedAt = overrideForm.verifiedAt.trim()
      ? Number(overrideForm.verifiedAt)
      : null;
    const lastAgentAttempt = overrideForm.lastAgentAttempt.trim()
      ? Number(overrideForm.lastAgentAttempt)
      : null;

    if (!overrideForm.state.trim() || !overrideForm.capital.trim()) {
      setOverrideError("State and capital are required.");
      return;
    }

    if (
      !overrideForm.officialWebsite.trim() ||
      !overrideForm.procurementLink.trim()
    ) {
      setOverrideError("Official website and procurement link are required.");
      return;
    }

    if (!Number.isFinite(importedAt)) {
      setOverrideError("ImportedAt must be a number (ms timestamp).");
      return;
    }

    if (verifiedAt !== null && !Number.isFinite(verifiedAt)) {
      setOverrideError("VerifiedAt must be a number (ms timestamp) or blank.");
      return;
    }

    if (lastAgentAttempt !== null && !Number.isFinite(lastAgentAttempt)) {
      setOverrideError(
        "LastAgentAttempt must be a number (ms timestamp) or blank.",
      );
      return;
    }

    const requiresRegistration =
      overrideForm.requiresRegistration === ""
        ? null
        : overrideForm.requiresRegistration === "true";

    setIsSavingOverride(true);
    try {
      await adminOverride({
        id: overrideUrl._id,
        state: overrideForm.state.trim(),
        capital: overrideForm.capital.trim(),
        officialWebsite: overrideForm.officialWebsite.trim(),
        procurementLink: overrideForm.procurementLink.trim(),
        status: overrideForm.status,
        verifiedBy: overrideForm.verifiedBy.trim()
          ? overrideForm.verifiedBy.trim()
          : null,
        verifiedAt,
        denialReason: overrideForm.denialReason.trim()
          ? overrideForm.denialReason.trim()
          : null,
        importedAt,
        sourceFile: overrideForm.sourceFile.trim()
          ? overrideForm.sourceFile.trim()
          : null,
        requiresRegistration,
        aiReviewStatus: overrideForm.aiReviewStatus
          ? overrideForm.aiReviewStatus
          : null,
        aiDecision: overrideForm.aiDecision ? overrideForm.aiDecision : null,
        aiReasoning: overrideForm.aiReasoning.trim()
          ? overrideForm.aiReasoning.trim()
          : null,
        lastAgentAttempt,
      });

      closeOverrideModal();
    } catch (err) {
      console.error("Error saving override:", err);
      setOverrideError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Filter URLs based on status, state, and search query
  const filteredUrls =
    allUrls?.filter((url) => {
      // Status filter
      if (statusFilter !== "all" && url.status !== statusFilter) return false;
      // State filter - if any states are selected, filter by them
      if (stateFilter.length > 0 && !stateFilter.includes(url.state))
        return false;
      // Search filter - search in state, capital, officialWebsite, and procurementLink
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesState = url.state.toLowerCase().includes(query);
        const matchesCapital = url.capital.toLowerCase().includes(query);
        const matchesOfficialWebsite = url.officialWebsite
          .toLowerCase()
          .includes(query);
        const matchesProcurementLink = url.procurementLink
          .toLowerCase()
          .includes(query);
        if (
          !matchesState &&
          !matchesCapital &&
          !matchesOfficialWebsite &&
          !matchesProcurementLink
        ) {
          return false;
        }
      }
      return true;
    }) ?? [];

  // Get unique states from all URLs (regardless of status)
  const uniqueStates = useMemo(() => {
    if (!allUrls) return [];
    const states = [...new Set(allUrls.map((url) => url.state))];
    return states.sort();
  }, [allUrls]);

  // Handle state filter hover with 3-second delay
  const handleStateFilterMouseEnter = () => {
    if (stateFilterHoverTimeoutRef.current) {
      clearTimeout(stateFilterHoverTimeoutRef.current);
      stateFilterHoverTimeoutRef.current = null;
    }
    setStateFilterHover(true);
  };

  const handleStateFilterMouseLeave = () => {
    if (stateFilterHoverTimeoutRef.current) {
      clearTimeout(stateFilterHoverTimeoutRef.current);
    }
    // Only set timeout if not sticky
    if (!stateFilterSticky) {
      stateFilterHoverTimeoutRef.current = setTimeout(() => {
        setStateFilterHover(false);
        stateFilterHoverTimeoutRef.current = null;
      }, 3000);
    }
  };

  const handleStateFilterClick = () => {
    const newStickyState = !stateFilterSticky;
    setStateFilterSticky(newStickyState);

    // Clear any pending timeout
    if (stateFilterHoverTimeoutRef.current) {
      clearTimeout(stateFilterHoverTimeoutRef.current);
      stateFilterHoverTimeoutRef.current = null;
    }

    if (newStickyState) {
      // When making sticky, ensure it's visible
      setStateFilterHover(true);
    } else {
      // When unsticking, hide immediately
      setStateFilterHover(false);
    }
  };

  // Handle region filter selection
  const handleRegionFilter = (region: string) => {
    const regionStates = STATE_REGIONS[region] || [];
    const availableRegionStates = regionStates.filter((state) =>
      uniqueStates.includes(state),
    );

    if (availableRegionStates.length === 0) return;

    // Check if all states in region are already selected
    const allSelected = availableRegionStates.every((state) =>
      stateFilter.includes(state),
    );

    if (allSelected) {
      // Deselect all states in this region
      setStateFilter(
        stateFilter.filter((state) => !availableRegionStates.includes(state)),
      );
    } else {
      // Select all states in this region (add to existing selection)
      const newFilter = [
        ...new Set([...stateFilter, ...availableRegionStates]),
      ];
      setStateFilter(newFilter);
    }
  };

  // Check if a region is fully selected
  const isRegionFullySelected = (region: string): boolean => {
    const regionStates = STATE_REGIONS[region] || [];
    const availableRegionStates = regionStates.filter((state) =>
      uniqueStates.includes(state),
    );
    return (
      availableRegionStates.length > 0 &&
      availableRegionStates.every((state) => stateFilter.includes(state))
    );
  };

  // Check if a region is partially selected
  const isRegionPartiallySelected = (region: string): boolean => {
    const regionStates = STATE_REGIONS[region] || [];
    const availableRegionStates = regionStates.filter((state) =>
      uniqueStates.includes(state),
    );
    const selectedInRegion = availableRegionStates.filter((state) =>
      stateFilter.includes(state),
    );
    return (
      selectedInRegion.length > 0 &&
      selectedInRegion.length < availableRegionStates.length
    );
  };

  // Group states by region
  const statesByRegion = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    uniqueStates.forEach((state) => {
      const region = STATE_TO_REGION[state] || "Other";
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(state);
    });
    return grouped;
  }, [uniqueStates]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (stateFilterHoverTimeoutRef.current) {
        clearTimeout(stateFilterHoverTimeoutRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError("No files selected");
      return;
    }

    const file = files[0];

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    // Validate file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      setError("File size must be less than 4MB");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setImportResult(null);

    try {
      const fileText = await file.text();
      let jsonData;

      try {
        jsonData = JSON.parse(fileText);
      } catch {
        throw new Error("Invalid JSON format. Please check your file syntax.");
      }

      // Handle different JSON structures
      let linksArray: ProcurementLink[] = [];

      if (Array.isArray(jsonData)) {
        linksArray = jsonData;
      } else if (
        jsonData.us_state_capitals_procurement &&
        Array.isArray(jsonData.us_state_capitals_procurement)
      ) {
        linksArray = jsonData.us_state_capitals_procurement;
      } else if (jsonData.links && Array.isArray(jsonData.links)) {
        linksArray = jsonData.links;
      } else {
        throw new Error(
          'Invalid JSON format. Expected an array or an object with "us_state_capitals_procurement" or "links" array.',
        );
      }

      if (linksArray.length === 0) {
        throw new Error("No procurement links found in the uploaded file");
      }

      // Validate each link has required fields
      for (const link of linksArray) {
        if (
          !link.state ||
          !link.capital ||
          !link.official_website ||
          !link.procurement_link
        ) {
          throw new Error(
            `Invalid link format. Each link must have: state, capital, official_website, procurement_link`,
          );
        }
      }

      // Import the links
      const result = await importFromJson({
        links: linksArray,
        sourceFile: file.name,
      });

      setImportResult(result);
      setStatusFilter("pending"); // Show pending after import
    } catch (err) {
      console.error("Error processing uploaded file:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleApprove = async (id: Id<"procurementUrls">) => {
    try {
      // If this card is being edited and has a corrected link, save it first
      if (editingId === id && correctedLink.trim()) {
        // Find the original URL to compare
        const originalUrl = allUrls?.find((url) => url._id === id);
        if (
          originalUrl &&
          correctedLink.trim() !== originalUrl.procurementLink
        ) {
          // Save the corrected link before approving
          await updateLink({ id, procurementLink: correctedLink.trim() });
          // Mark as modified if link changed
          setModifiedLinks((prev) => new Set(prev).add(id));
        }
      }

      // If this card is being edited and has a corrected official website, save it first
      if (editingOfficialWebsiteId === id && correctedOfficialWebsite.trim()) {
        // Find the original URL to compare
        const originalUrl = allUrls?.find((url) => url._id === id);
        if (
          originalUrl &&
          correctedOfficialWebsite.trim() !== originalUrl.officialWebsite
        ) {
          // Save the corrected official website before approving
          await updateLink({
            id,
            officialWebsite: correctedOfficialWebsite.trim(),
          });
          // Mark as modified if website changed
          setModifiedLinks((prev) => new Set(prev).add(id));
        }
      }

      // Then approve with registration requirement
      await approve({
        id,
        requiresRegistration: requiresRegistration[id] ?? undefined,
      });

      // Clear editing state
      if (editingId === id) {
        setEditingId(null);
        setCorrectedLink("");
      }
      if (editingOfficialWebsiteId === id) {
        setEditingOfficialWebsiteId(null);
        setCorrectedOfficialWebsite("");
      }
      // Clear modified status after approval
      setModifiedLinks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Clear registration requirement state for this link
      setRequiresRegistration((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Error approving URL:", err);
    }
  };

  const handleDeny = async (id: Id<"procurementUrls">) => {
    try {
      await deny({ id });
      // Clear editing state if this was being edited
      if (editingId === id) {
        setEditingId(null);
        setCorrectedLink("");
      }
      if (editingOfficialWebsiteId === id) {
        setEditingOfficialWebsiteId(null);
        setCorrectedOfficialWebsite("");
      }
      // Clear registration requirement state for this link
      setRequiresRegistration((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Error denying URL:", err);
    }
  };

  const handleStartEdit = (id: Id<"procurementUrls">, currentLink: string) => {
    setEditingId(id);
    setCorrectedLink(currentLink);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCorrectedLink("");
  };

  const handleStartEditOfficialWebsite = (
    id: Id<"procurementUrls">,
    currentWebsite: string,
  ) => {
    setEditingOfficialWebsiteId(id);
    setCorrectedOfficialWebsite(currentWebsite);
  };

  const handleCancelEditOfficialWebsite = () => {
    setEditingOfficialWebsiteId(null);
    setCorrectedOfficialWebsite("");
  };

  const handleSaveOfficialWebsite = async (id: Id<"procurementUrls">) => {
    if (!correctedOfficialWebsite.trim()) {
      return;
    }
    try {
      // Check if the website actually changed
      const originalUrl = allUrls?.find((url) => url._id === id);
      if (
        originalUrl &&
        correctedOfficialWebsite.trim() !== originalUrl.officialWebsite
      ) {
        await updateLink({
          id,
          officialWebsite: correctedOfficialWebsite.trim(),
        });
        // Mark this link as modified
        setModifiedLinks((prev) => new Set(prev).add(id));
      }
      setEditingOfficialWebsiteId(null);
      setCorrectedOfficialWebsite("");
    } catch (err) {
      console.error("Error updating official website:", err);
    }
  };

  const handleSaveCorrectedLink = async (id: Id<"procurementUrls">) => {
    if (!correctedLink.trim()) {
      return;
    }
    try {
      // Check if the link actually changed
      const originalUrl = allUrls?.find((url) => url._id === id);
      if (originalUrl && correctedLink.trim() !== originalUrl.procurementLink) {
        await updateLink({ id, procurementLink: correctedLink.trim() });
        // Mark this link as modified
        setModifiedLinks((prev) => new Set(prev).add(id));
      }
      setEditingId(null);
      setCorrectedLink("");
    } catch (err) {
      console.error("Error updating URL:", err);
    }
  };

  const handleReset = async (id: Id<"procurementUrls">) => {
    try {
      await resetToPending({ id });
      // Clear modified status when resetting
      setModifiedLinks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error resetting URL:", err);
    }
  };

  const handleManualApprove = async (id: Id<"procurementUrls">) => {
    try {
      // Manually approve the link (this will clear AI decision)
      await approve({ id });
      // Clear modified status after approval
      setModifiedLinks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Clear editing state if this was being edited
      if (editingId === id) {
        setEditingId(null);
        setCorrectedLink("");
      }
      if (editingOfficialWebsiteId === id) {
        setEditingOfficialWebsiteId(null);
        setCorrectedOfficialWebsite("");
      }
    } catch (err) {
      console.error("Error manually approving URL:", err);
    }
  };

  const handleRemove = async (id: Id<"procurementUrls">) => {
    try {
      await remove({ id });
      // Clear modified status when removed
      setModifiedLinks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error removing URL:", err);
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure you want to approve all pending URLs?")) {
      return;
    }
    try {
      await approveAll({});
    } catch (err) {
      console.error("Error approving all URLs:", err);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete ALL procurement URLs? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await clearAll({ confirm: true });
    } catch (err) {
      console.error("Error clearing all URLs:", err);
    }
  };

  const handleDedupeByProcurementLink = async () => {
    if (
      !window.confirm(
        "Remove duplicate procurement links across ALL statuses?\n\n" +
          "Duplicates are detected by normalized URL (trim, lowercase, remove trailing slash).\n" +
          "Approved wins; otherwise the most recently created is kept.",
      )
    ) {
      return;
    }

    setIsDeduping(true);
    setDedupeResult(null);
    try {
      const result = await dedupeByProcurementLink({ confirm: true });
      setDedupeResult(result);
    } catch (err) {
      console.error("Error deduping procurement URLs:", err);
    } finally {
      setIsDeduping(false);
    }
  };

  // Handle state selection in manual form - auto-fill capital
  const handleStateChange = (stateName: string) => {
    const stateData = US_STATES.find((s) => s.name === stateName);
    setManualFormData((prev) => ({
      ...prev,
      state: stateName,
      capital: stateData?.capital || "",
    }));
  };

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);
    setManualFormSuccess(false);

    // Validate required fields
    if (
      !manualFormData.state ||
      !manualFormData.capital ||
      !manualFormData.officialWebsite ||
      !manualFormData.procurementLink
    ) {
      setManualFormError("All fields are required");
      return;
    }

    // Validate URLs
    try {
      new URL(manualFormData.officialWebsite);
      new URL(manualFormData.procurementLink);
    } catch {
      setManualFormError("Please enter valid URLs (including https://)");
      return;
    }

    setIsSubmittingManual(true);
    try {
      await addManual({
        state: manualFormData.state,
        capital: manualFormData.capital,
        officialWebsite: manualFormData.officialWebsite,
        procurementLink: manualFormData.procurementLink,
        requiresRegistration: manualFormData.requiresRegistration || undefined,
      });

      setManualFormSuccess(true);
      setManualFormData({
        state: "",
        capital: "",
        officialWebsite: "",
        procurementLink: "",
        requiresRegistration: false,
      });
      setStatusFilter("approved"); // Show approved links after adding

      // Auto-hide success message after 3 seconds
      setTimeout(() => setManualFormSuccess(false), 3000);
    } catch (err) {
      console.error("Error adding manual link:", err);
      setManualFormError(
        err instanceof Error ? err.message : "Failed to add link",
      );
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const [expandedAiReasoning, setExpandedAiReasoning] = useState<
    Record<string, boolean>
  >({});

  const toggleAiReasoning = (id: string) => {
    setExpandedAiReasoning((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: "pending" | "approved" | "denied") => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-success/20 text-neon-success border border-neon-success/30">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-error/20 text-neon-error border border-neon-error/30">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-warning/20 text-neon-warning border border-neon-warning/30">
            <AlertTriangle className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const getAiReviewStatusBadge = (
    status?: "idle" | "processing" | "completed" | "failed",
  ) => {
    if (!status) return null;

    switch (status) {
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI Processing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-success/20 text-neon-success border border-neon-success/30">
            <Bot className="w-3 h-3" />
            AI Reviewed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-error/20 text-neon-error border border-neon-error/30">
            <AlertTriangle className="w-3 h-3" />
            AI Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-tron-gray/20 text-tron-gray border border-tron-gray/30">
            <Clock className="w-3 h-3" />
            AI Pending
          </span>
        );
    }
  };

  const getAiDecisionBadge = (decision?: "approve" | "deny") => {
    if (!decision) return null;

    if (decision === "approve") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-success/20 text-neon-success border border-neon-success/30">
          <CheckCircle className="w-3 h-3" />
          AI Approved
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-error/20 text-neon-error border border-neon-error/30">
          <XCircle className="w-3 h-3" />
          AI Denied
        </span>
      );
    }
  };

  // Helper function to wrap section with drag and drop
  const wrapDraggableSection = (
    sectionId: string,
    content: React.ReactNode,
  ) => {
    return (
      <div
        key={sectionId}
        draggable
        onDragStart={(e) => handleDragStart(e, sectionId)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, sectionId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, sectionId)}
        className={`relative transition-all duration-200 ${
          draggedSection === sectionId
            ? "opacity-50 scale-95"
            : dragOverSection === sectionId
              ? "ring-2 ring-tron-cyan ring-offset-2 scale-[1.02]"
              : ""
        }`}
        style={{
          cursor: draggedSection === sectionId ? "grabbing" : "grab",
        }}
      >
        {content}
      </div>
    );
  };

  // Helper to add drag handle to header action
  const addDragHandle = (
    sectionId: string,
    existingAction: React.ReactNode,
  ) => {
    return (
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 text-tron-gray hover:text-tron-cyan transition-colors cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder sections"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        {existingAction}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {sectionOrder.map((sectionId) => {
        if (sectionId === "stats" && stats && allUrls) {
          return wrapDraggableSection(
            "stats",
            <TronPanel
              title="Statistics"
              icon={<Globe className="w-5 h-5" />}
              glowColor="cyan"
              headerAction={addDragHandle(
                "stats",
                <button
                  onClick={() => toggleSection("stats")}
                  className="p-1 text-tron-cyan hover:text-tron-cyan-bright transition-colors"
                >
                  {collapsedSections.stats ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>,
              )}
            >
              {!collapsedSections.stats && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
                    <TronStatCard
                      title="Total Links"
                      value={stats.total}
                      icon={<Globe className="w-6 h-6" />}
                      color="cyan"
                      onClick={() => setStatusFilter("all")}
                      isActive={statusFilter === "all"}
                    />
                    <TronStatCard
                      title="Pending"
                      value={stats.pending}
                      icon={<AlertTriangle className="w-6 h-6" />}
                      color="orange"
                      onClick={() => setStatusFilter("pending")}
                      isActive={statusFilter === "pending"}
                    />
                    <TronStatCard
                      title="Approved"
                      value={stats.approved}
                      icon={<CheckCircle className="w-6 h-6" />}
                      color="cyan"
                      onClick={() => setStatusFilter("approved")}
                      isActive={statusFilter === "approved"}
                    />
                    <TronStatCard
                      title="Denied"
                      value={stats.denied}
                      icon={<XCircle className="w-6 h-6" />}
                      color="orange"
                      onClick={() => setStatusFilter("denied")}
                      isActive={statusFilter === "denied"}
                    />
                  </div>

                  {/* Filter Actions and AI Review Status */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-tron-cyan/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-4 h-4 text-tron-gray" />
                      <span className="text-sm text-tron-gray">
                        Quick Filter:
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {(
                          [
                            "all",
                            "pending",
                            "approved",
                            "denied",
                          ] as StatusFilter[]
                        ).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                              statusFilter === filter
                                ? "bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30"
                                : "text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated"
                            }`}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            {filter === "all" && stats && ` (${stats.total})`}
                            {filter === "pending" &&
                              stats &&
                              ` (${stats.pending})`}
                            {filter === "approved" &&
                              stats &&
                              ` (${stats.approved})`}
                            {filter === "denied" &&
                              stats &&
                              ` (${stats.denied})`}
                          </button>
                        ))}
                      </div>
                      {/* AI Review Status Info */}
                      {allUrls && (
                        <div className="flex items-center gap-2 text-xs text-tron-gray ml-2">
                          <Bot className="w-3.5 h-3.5" />
                          <span>
                            AI Reviewed:{" "}
                            {
                              allUrls.filter(
                                (u) => u.aiReviewStatus === "completed",
                              ).length
                            }{" "}
                            /{" "}
                            {
                              allUrls.filter((u) => {
                                // Only count pending links that need AI review
                                if (u.status !== "pending") return false;
                                return (
                                  !u.aiReviewStatus ||
                                  u.aiReviewStatus === "idle" ||
                                  u.aiReviewStatus === "failed" ||
                                  u.aiReviewStatus === "processing"
                                );
                              }).length
                            }{" "}
                            pending
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {stats && stats.pending > 0 && (
                        <TronButton
                          onClick={handleApproveAll}
                          variant="outline"
                          color="cyan"
                          size="sm"
                          icon={<CheckCheck className="w-4 h-4" />}
                        >
                          Approve All Pending
                        </TronButton>
                      )}
                      {stats && stats.total > 0 && (
                        <TronButton
                          onClick={handleDedupeByProcurementLink}
                          variant="outline"
                          color="cyan"
                          size="sm"
                          icon={<Link2 className="w-4 h-4" />}
                          loading={isDeduping}
                        >
                          Remove Duplicates
                        </TronButton>
                      )}
                      {stats && stats.total > 0 && (
                        <TronButton
                          onClick={handleClearAll}
                          variant="outline"
                          color="orange"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                        >
                          Clear All
                        </TronButton>
                      )}
                    </div>
                  </div>

                  {dedupeResult && (
                    <div className="mt-4 bg-neon-success/20 p-4 rounded-lg border border-neon-success">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-neon-success mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-neon-success mb-1">
                            Deduplication Complete!
                          </h3>
                          <p className="text-sm text-neon-success">
                            {dedupeResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TronPanel>,
          );
        }

        if (sectionId === "import") {
          return wrapDraggableSection(
            "import",
            <TronPanel
              title="Import Procurement Links"
              icon={<Upload className="w-5 h-5" />}
              glowColor="cyan"
              headerAction={addDragHandle(
                "import",
                <button
                  onClick={() => toggleSection("import")}
                  className="p-1 text-tron-cyan hover:text-tron-cyan-bright transition-colors"
                >
                  {collapsedSections.import ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>,
              )}
            >
              {!collapsedSections.import && (
                <>
                  {error && (
                    <div className="mb-4 bg-neon-error/20 p-4 rounded-lg border border-neon-error">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-neon-error mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-neon-error mb-1">
                            Import Error
                          </h3>
                          <p className="text-sm text-neon-error">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {importResult && (
                    <div className="mb-4 bg-neon-success/20 p-4 rounded-lg border border-neon-success">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-neon-success mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-neon-success mb-1">
                            Import Complete!
                          </h3>
                          <p className="text-sm text-neon-success">
                            Imported {importResult.imported} links
                            {importResult.skipped > 0 &&
                              `, skipped ${importResult.skipped} duplicates`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isProcessing ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tron-cyan mx-auto mb-4" />
                      <p className="text-tron-gray">
                        Processing uploaded file...
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`w-full border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
                        dragOver
                          ? "border-tron-cyan bg-tron-bg-card"
                          : "border-tron-cyan/20 hover:border-tron-cyan"
                      }`}
                      onDrop={handleFileDrop}
                      onDragOver={handleFileDragOver}
                      onDragLeave={handleFileDragLeave}
                      onClick={openFileDialog}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <div className="text-center">
                        <FileJson className="w-12 h-12 text-tron-gray mx-auto mb-4" />
                        <p className="text-lg font-medium text-tron-white mb-2">
                          Drop your JSON file here or click to browse
                        </p>
                        <p className="text-sm text-tron-gray">
                          Expected format: Array with state, capital,
                          official_website, procurement_link fields
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TronPanel>,
          );
        }

        if (sectionId === "manualEntry") {
          return wrapDraggableSection(
            "manualEntry",
            <TronPanel
              title="Add Link Manually"
              icon={<Plus className="w-5 h-5" />}
              glowColor="cyan"
              headerAction={addDragHandle(
                "manualEntry",
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSection("manualEntry")}
                    className="p-1 text-tron-cyan hover:text-tron-cyan-bright transition-colors"
                  >
                    {collapsedSections.manualEntry ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                  <TronButton
                    onClick={() => setShowManualForm(!showManualForm)}
                    variant="outline"
                    color="cyan"
                    size="sm"
                  >
                    {showManualForm ? "Hide Form" : "Show Form"}
                  </TronButton>
                </div>,
              )}
            >
              {!collapsedSections.manualEntry && (
                <>
                  <p className="text-sm text-tron-gray mb-4">
                    Manually add procurement links that you've verified
                    yourself. These links are automatically approved.
                  </p>

                  {showManualForm && (
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      {manualFormError && (
                        <div className="bg-neon-error/20 p-3 rounded-lg border border-neon-error flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-neon-error mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-neon-error">
                            {manualFormError}
                          </p>
                        </div>
                      )}

                      {manualFormSuccess && (
                        <div className="bg-neon-success/20 p-3 rounded-lg border border-neon-success flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-neon-success mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-neon-success">
                            Link added and approved successfully!
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* State Selection */}
                        <div>
                          <label className="block text-sm font-medium text-tron-cyan mb-1">
                            State *
                          </label>
                          <select
                            value={manualFormData.state}
                            onChange={(e) => handleStateChange(e.target.value)}
                            disabled={isSubmittingManual}
                            className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                            required
                          >
                            <option value="" className="bg-tron-bg-card">
                              Select a state...
                            </option>
                            {US_STATES.map((state) => (
                              <option
                                key={state.name}
                                value={state.name}
                                className="bg-tron-bg-card"
                              >
                                {state.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* City (auto-filled with capital, but can be edited for any city) */}
                        <div>
                          <label className="block text-sm font-medium text-tron-cyan mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            value={manualFormData.capital}
                            onChange={(e) =>
                              setManualFormData((prev) => ({
                                ...prev,
                                capital: e.target.value,
                              }))
                            }
                            disabled={isSubmittingManual}
                            className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                            placeholder="City name (auto-filled with capital)"
                            required
                          />
                          <p className="text-xs text-tron-gray mt-1">
                            Auto-filled with state capital, but you can edit for
                            any city
                          </p>
                        </div>
                      </div>

                      {/* Official Website */}
                      <div>
                        <label className="block text-sm font-medium text-tron-cyan mb-1">
                          <Globe className="w-4 h-4 inline mr-1" />
                          Official Website URL *
                        </label>
                        <input
                          type="url"
                          value={manualFormData.officialWebsite}
                          onChange={(e) =>
                            setManualFormData((prev) => ({
                              ...prev,
                              officialWebsite: e.target.value,
                            }))
                          }
                          disabled={isSubmittingManual}
                          className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                          placeholder="https://www.example.gov"
                          required
                        />
                      </div>

                      {/* Procurement Link */}
                      <div>
                        <label className="block text-sm font-medium text-tron-cyan mb-1">
                          <Link2 className="w-4 h-4 inline mr-1" />
                          Procurement/Bidding URL *
                        </label>
                        <input
                          type="url"
                          value={manualFormData.procurementLink}
                          onChange={(e) =>
                            setManualFormData((prev) => ({
                              ...prev,
                              procurementLink: e.target.value,
                            }))
                          }
                          disabled={isSubmittingManual}
                          className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                          placeholder="https://www.example.gov/procurement"
                          required
                        />
                        <p className="text-xs text-tron-gray mt-1">
                          This is the direct link to the procurement/bidding
                          page
                        </p>
                      </div>

                      {/* Registration Requirement */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="requiresRegistration"
                          checked={manualFormData.requiresRegistration}
                          onChange={(e) =>
                            setManualFormData((prev) => ({
                              ...prev,
                              requiresRegistration: e.target.checked,
                            }))
                          }
                          disabled={isSubmittingManual}
                          className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0 disabled:opacity-50"
                        />
                        <label
                          htmlFor="requiresRegistration"
                          className="text-sm text-tron-gray cursor-pointer"
                        >
                          Requires registration to view bids
                        </label>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end gap-3 pt-2">
                        <TronButton
                          type="button"
                          onClick={() => {
                            setShowManualForm(false);
                            setManualFormError(null);
                            setManualFormData({
                              state: "",
                              capital: "",
                              officialWebsite: "",
                              procurementLink: "",
                              requiresRegistration: false,
                            });
                          }}
                          variant="outline"
                          color="cyan"
                          disabled={isSubmittingManual}
                        >
                          Cancel
                        </TronButton>
                        <TronButton
                          type="submit"
                          variant="primary"
                          color="cyan"
                          disabled={isSubmittingManual}
                          icon={
                            isSubmittingManual ? undefined : (
                              <CheckCircle className="w-4 h-4" />
                            )
                          }
                        >
                          {isSubmittingManual ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            "Add & Approve Link"
                          )}
                        </TronButton>
                      </div>
                    </form>
                  )}

                  {!showManualForm && (
                    <div className="text-center py-4">
                      <TronButton
                        onClick={() => setShowManualForm(true)}
                        variant="primary"
                        color="cyan"
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Add New Procurement Link
                      </TronButton>
                    </div>
                  )}
                </>
              )}
            </TronPanel>,
          );
        }

        if (sectionId === "aiAgent") {
          return wrapDraggableSection(
            "aiAgent",
            <TronPanel
              title="AI Procurement Verifier Agent"
              icon={<Bot className="w-5 h-5" />}
              glowColor="cyan"
              headerAction={addDragHandle(
                "aiAgent",
                <button
                  onClick={() => toggleSection("aiAgent")}
                  className="p-1 text-tron-cyan hover:text-tron-cyan-bright transition-colors"
                >
                  {collapsedSections.aiAgent ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>,
              )}
            >
              {!collapsedSections.aiAgent && (
                <div className="space-y-4">
                  <p className="text-sm text-tron-gray">
                    The AI agent automatically verifies procurement links using
                    GPT-5-Mini and headless browser automation. It runs every 15
                    minutes via cron, but you can trigger it manually here.
                  </p>

                  {verificationResult && (
                    <div className="bg-tron-bg-elevated p-4 rounded-lg border border-tron-cyan/20">
                      <h4 className="text-sm font-medium text-tron-cyan mb-2">
                        Last Verification Results
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-tron-gray">Processed:</span>
                          <span className="ml-2 text-tron-white font-medium">
                            {verificationResult.processed}
                          </span>
                        </div>
                        <div>
                          <span className="text-tron-gray">Approved:</span>
                          <span className="ml-2 text-neon-success font-medium">
                            {verificationResult.approved}
                          </span>
                        </div>
                        <div>
                          <span className="text-tron-gray">Denied:</span>
                          <span className="ml-2 text-neon-error font-medium">
                            {verificationResult.denied}
                          </span>
                        </div>
                        <div>
                          <span className="text-tron-gray">Errors:</span>
                          <span className="ml-2 text-neon-warning font-medium">
                            {verificationResult.errors}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <TronButton
                      onClick={async () => {
                        setIsVerifying(true);
                        setVerificationResult(null);
                        try {
                          const result = await triggerAiVerification({
                            batchSize: 10,
                          });
                          setVerificationResult(result);
                        } catch (error) {
                          console.error(
                            "Error triggering AI verification:",
                            error,
                          );
                          setError(
                            error instanceof Error
                              ? error.message
                              : "Failed to trigger AI verification",
                          );
                        } finally {
                          setIsVerifying(false);
                        }
                      }}
                      variant="primary"
                      color="cyan"
                      disabled={isVerifying}
                      icon={
                        isVerifying ? undefined : <Bot className="w-4 h-4" />
                      }
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Verifying Links...
                        </>
                      ) : (
                        "Start AI Verification"
                      )}
                    </TronButton>

                    {allUrls && (
                      <div className="text-xs text-tron-gray">
                        {
                          allUrls.filter((u) => {
                            // Only count pending links that need AI review
                            if (u.status !== "pending") return false;
                            // Count if: never processed, idle, failed, or currently processing
                            return (
                              !u.aiReviewStatus ||
                              u.aiReviewStatus === "idle" ||
                              u.aiReviewStatus === "failed" ||
                              u.aiReviewStatus === "processing"
                            );
                          }).length
                        }{" "}
                        links pending AI review
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TronPanel>,
          );
        }

        if (sectionId === "links") {
          return wrapDraggableSection(
            "links",
            <TronPanel
              title="Procurement Links"
              icon={<Link2 className="w-5 h-5" />}
              glowColor="cyan"
              headerAction={addDragHandle(
                "links",
                <div className="flex items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tron-gray" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search links..."
                      className="pl-9 pr-3 py-1.5 text-sm bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan/50 focus:border-tron-cyan/40 transition-all w-48"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-tron-gray hover:text-tron-white transition-colors"
                        title="Clear search"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* State Filter Button */}
                  {uniqueStates.length > 0 && (
                    <div
                      className="relative"
                      onMouseEnter={handleStateFilterMouseEnter}
                      onMouseLeave={handleStateFilterMouseLeave}
                    >
                      <button
                        onClick={handleStateFilterClick}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                          stateFilterSticky || stateFilterHover
                            ? "bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40"
                            : "bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white"
                        }`}
                      >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">State</span>
                        {stateFilter.length > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-tron-cyan/30 text-tron-cyan rounded-full">
                            {stateFilter.length === 1
                              ? stateFilter[0]
                              : `${stateFilter.length} selected`}
                          </span>
                        )}
                        {stateFilterSticky && (
                          <span className="text-xs text-tron-cyan">●</span>
                        )}
                      </button>

                      {/* Filter Dropdown */}
                      {(stateFilterHover || stateFilterSticky) && (
                        <div
                          className="absolute right-0 top-full mt-2 z-[100] bg-tron-bg-panel border border-tron-cyan/30 rounded-lg shadow-lg p-4 min-w-[300px] max-w-[600px] max-h-[400px] overflow-y-auto"
                          onMouseEnter={handleStateFilterMouseEnter}
                          onMouseLeave={handleStateFilterMouseLeave}
                        >
                          <div className="flex items-center justify-between mb-3 sticky top-0 bg-tron-bg-panel pb-2 border-b border-tron-cyan/10">
                            <div className="flex items-center gap-2">
                              <Filter className="w-4 h-4 text-tron-cyan" />
                              <span className="text-sm font-medium text-tron-white">
                                Filter by State
                              </span>
                            </div>
                            {stateFilterSticky && (
                              <button
                                onClick={handleStateFilterClick}
                                className="text-xs text-tron-gray hover:text-tron-cyan transition-colors"
                                title="Unpin filter"
                              >
                                Unpin
                              </button>
                            )}
                          </div>

                          {/* Region Quick Filters */}
                          <div className="mb-4">
                            <div className="text-xs font-medium text-tron-gray mb-2">
                              Quick Filters by Region
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setStateFilter([])}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                  stateFilter.length === 0
                                    ? "bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20"
                                    : "bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white"
                                }`}
                              >
                                All States
                              </button>
                              {Object.keys(STATE_REGIONS).map((region) => {
                                const fullySelected =
                                  isRegionFullySelected(region);
                                const partiallySelected =
                                  isRegionPartiallySelected(region);
                                const regionStates =
                                  STATE_REGIONS[region] || [];
                                const availableInRegion = regionStates.filter(
                                  (state) => uniqueStates.includes(state),
                                );

                                if (availableInRegion.length === 0) return null;

                                return (
                                  <button
                                    key={region}
                                    onClick={() => handleRegionFilter(region)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                      fullySelected
                                        ? "bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20"
                                        : partiallySelected
                                          ? "bg-tron-cyan/10 text-tron-cyan/80 border-tron-cyan/30"
                                          : "bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white"
                                    }`}
                                    title={`${availableInRegion.length} state${availableInRegion.length !== 1 ? "s" : ""} available`}
                                  >
                                    {region}
                                    {partiallySelected && " *"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* States Grouped by Region */}
                          <div className="space-y-4">
                            {Object.entries(statesByRegion)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([region, states]) => (
                                <div key={region} className="space-y-2">
                                  <div className="text-xs font-semibold text-tron-cyan/80 uppercase tracking-wide">
                                    {region}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {states.map((state) => {
                                      const isSelected =
                                        stateFilter.includes(state);
                                      return (
                                        <button
                                          key={state}
                                          onClick={() => {
                                            if (isSelected) {
                                              setStateFilter(
                                                stateFilter.filter(
                                                  (s) => s !== state,
                                                ),
                                              );
                                            } else {
                                              setStateFilter([
                                                ...stateFilter,
                                                state,
                                              ]);
                                            }
                                          }}
                                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                            isSelected
                                              ? "bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20"
                                              : "bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white"
                                          }`}
                                        >
                                          {state}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                          {stateFilter.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-tron-cyan/10">
                              <button
                                onClick={() => setStateFilter([])}
                                className="text-xs text-tron-gray hover:text-tron-cyan transition-colors"
                              >
                                Clear all ({stateFilter.length} selected)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => toggleSection("links")}
                    className="p-1 text-tron-cyan hover:text-tron-cyan-bright transition-colors"
                  >
                    {collapsedSections.links ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                </div>,
              )}
            >
              {!collapsedSections.links && (
                <>
                  {filteredUrls.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredUrls.map((url) => (
                        <div
                          key={url._id}
                          onContextMenu={(e) => openCardContextMenu(e, url)}
                          className="tron-card p-4 rounded-lg border border-tron-cyan/20 hover:border-tron-cyan/40 transition-colors"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-tron-white flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-tron-cyan" />
                                {url.state}
                              </h3>
                              <p className="text-sm text-tron-gray flex items-center gap-1 mt-1">
                                <Building2 className="w-3 h-3" />
                                {url.capital}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(url.status)}
                              {url.status === "approved" &&
                                url.requiresRegistration && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-warning/20 text-neon-warning border border-neon-warning/30">
                                    <UserCheck className="w-3 h-3" />
                                    Registration Required
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* AI Verification Section */}
                          {(url.verifiedBy === "GPT-5-Mini-Agent" ||
                            url.aiReviewStatus ||
                            url.aiDecision) && (
                            <div className="mb-3 pt-2 border-t border-tron-cyan/10">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {url.verifiedBy === "GPT-5-Mini-Agent" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30">
                                      <Bot className="w-3 h-3" />
                                      Verified by AI
                                    </span>
                                  )}
                                  {getAiReviewStatusBadge(url.aiReviewStatus)}
                                  {getAiDecisionBadge(url.aiDecision)}
                                </div>
                                {url.lastAgentAttempt && (
                                  <span className="text-xs text-tron-gray flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTimestamp(url.lastAgentAttempt)}
                                  </span>
                                )}
                              </div>

                              {/* AI Reasoning */}
                              {url.aiReasoning && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => toggleAiReasoning(url._id)}
                                    className="w-full flex items-center justify-between text-xs text-tron-cyan hover:text-tron-cyan-bright transition-colors p-1.5 rounded hover:bg-tron-bg-elevated"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5" />
                                      AI Reasoning
                                    </span>
                                    {expandedAiReasoning[url._id] ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  {expandedAiReasoning[url._id] && (
                                    <div className="mt-2 p-2.5 bg-tron-bg-deep border border-tron-cyan/20 rounded text-xs text-tron-gray leading-relaxed">
                                      {url.aiReasoning}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Links */}
                          <div className="space-y-2 mb-4">
                            {/* Official Website Link */}
                            <div className="flex items-center gap-2">
                              <a
                                href={url.officialWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-tron-gray hover:text-tron-cyan transition-colors group flex-1 min-w-0"
                              >
                                <Globe className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate group-hover:underline">
                                  Official Website
                                </span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              {isSignedIn &&
                                editingOfficialWebsiteId !== url._id && (
                                  <button
                                    onClick={() =>
                                      handleStartEditOfficialWebsite(
                                        url._id,
                                        url.officialWebsite,
                                      )
                                    }
                                    className="p-1 text-tron-gray hover:text-tron-cyan transition-colors"
                                    title="Edit Official Website"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>

                            {/* Official Website Input */}
                            {editingOfficialWebsiteId === url._id && (
                              <div className="mt-2 space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-tron-cyan">
                                  <Globe className="w-3 h-3" />
                                  Edit Official Website
                                </label>
                                <div className="flex gap-1">
                                  <input
                                    type="url"
                                    value={correctedOfficialWebsite}
                                    onChange={(e) =>
                                      setCorrectedOfficialWebsite(
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter official website URL..."
                                    className="flex-1 px-2 py-1.5 text-sm bg-tron-bg-deep border border-tron-cyan/30 rounded text-tron-white placeholder-tron-gray focus:outline-none focus:ring-1 focus:ring-tron-cyan focus:border-tron-cyan"
                                  />
                                  <button
                                    onClick={() =>
                                      handleSaveOfficialWebsite(url._id)
                                    }
                                    disabled={!correctedOfficialWebsite.trim()}
                                    className="p-1.5 bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditOfficialWebsite}
                                    className="p-1.5 bg-tron-bg-elevated text-tron-gray hover:text-tron-white rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Original Procurement Link */}
                            <div className="flex items-center gap-2">
                              <a
                                href={url.procurementLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-tron-cyan hover:text-tron-cyan-bright transition-colors group flex-1 min-w-0"
                              >
                                <FileJson className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate group-hover:underline">
                                  Procurement Link
                                </span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              {isSignedIn && editingId !== url._id && (
                                <button
                                  onClick={() =>
                                    handleStartEdit(
                                      url._id,
                                      url.procurementLink,
                                    )
                                  }
                                  className="p-1 text-tron-gray hover:text-tron-cyan transition-colors"
                                  title="Edit/Correct Link"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Verified/Corrected Link Input */}
                            {editingId === url._id && (
                              <div className="mt-2 space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-tron-cyan">
                                  <Link2 className="w-3 h-3" />
                                  {url.status === "approved"
                                    ? "Edit Procurement Link"
                                    : "Verified Procurement Link"}
                                </label>
                                <div className="flex gap-1">
                                  <input
                                    type="url"
                                    value={correctedLink}
                                    onChange={(e) =>
                                      setCorrectedLink(e.target.value)
                                    }
                                    placeholder="Enter correct URL..."
                                    className="flex-1 px-2 py-1.5 text-sm bg-tron-bg-deep border border-tron-cyan/30 rounded text-tron-white placeholder-tron-gray focus:outline-none focus:ring-1 focus:ring-tron-cyan focus:border-tron-cyan"
                                  />
                                  <button
                                    onClick={() =>
                                      handleSaveCorrectedLink(url._id)
                                    }
                                    disabled={!correctedLink.trim()}
                                    className="p-1.5 bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1.5 bg-tron-bg-elevated text-tron-gray hover:text-tron-white rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-xs text-tron-gray">
                                  This link will be used in the Government Link
                                  Hub
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Registration Requirement Status */}
                          {url.status === "approved" && (
                            <div className="mb-3 pt-2 border-t border-tron-cyan/10">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-tron-gray">
                                  Registration Required:
                                </span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={url.requiresRegistration ?? false}
                                    onChange={async (e) => {
                                      try {
                                        await updateLink({
                                          id: url._id,
                                          requiresRegistration:
                                            e.target.checked,
                                        });
                                      } catch (err) {
                                        console.error(
                                          "Error updating registration requirement:",
                                          err,
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0"
                                  />
                                  <span
                                    className={`text-xs ${url.requiresRegistration ? "text-neon-warning" : "text-neon-success"}`}
                                  >
                                    {url.requiresRegistration ? "Yes" : "No"}
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Registration Requirement Checkbox for Pending Links */}
                          {url.status === "pending" && (
                            <div className="mb-3 pt-2 border-t border-tron-cyan/10">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    requiresRegistration[url._id] ?? false
                                  }
                                  onChange={(e) =>
                                    setRequiresRegistration((prev) => ({
                                      ...prev,
                                      [url._id]: e.target.checked,
                                    }))
                                  }
                                  className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0"
                                />
                                <span className="text-xs text-tron-gray">
                                  Requires registration to view bids
                                </span>
                              </label>
                            </div>
                          )}

                          {/* Scraped Data Section */}
                          <ScrapedDataSection urlId={url._id} />

                          {/* Actions */}
                          {isSignedIn && (
                            <div className="flex gap-2 pt-3 border-t border-tron-cyan/10">
                              {url.status === "pending" && (
                                <>
                                  <TronButton
                                    onClick={() => handleDeny(url._id)}
                                    variant="outline"
                                    color="orange"
                                    size="sm"
                                    className="flex-1"
                                    icon={<XCircle className="w-4 h-4" />}
                                  >
                                    Deny
                                  </TronButton>
                                  <TronButton
                                    onClick={() => handleApprove(url._id)}
                                    variant="primary"
                                    color="cyan"
                                    size="sm"
                                    className="flex-1"
                                    icon={<CheckCircle className="w-4 h-4" />}
                                  >
                                    Approve
                                  </TronButton>
                                </>
                              )}
                              {url.status !== "pending" && (
                                <>
                                  {modifiedLinks.has(url._id) && (
                                    <TronButton
                                      onClick={() =>
                                        handleManualApprove(url._id)
                                      }
                                      variant="primary"
                                      color="cyan"
                                      size="sm"
                                      className="flex-1"
                                      icon={<CheckCircle className="w-4 h-4" />}
                                    >
                                      Manually Approve
                                    </TronButton>
                                  )}
                                  <TronButton
                                    onClick={() => handleRemove(url._id)}
                                    variant="outline"
                                    color="orange"
                                    size="sm"
                                    icon={<Trash2 className="w-4 h-4" />}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Globe className="w-16 h-16 text-tron-gray mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-tron-white mb-2">
                        {statusFilter === "all"
                          ? "No Procurement Links"
                          : `No ${statusFilter} Links`}
                      </h3>
                      <p className="text-tron-gray max-w-md mx-auto">
                        {statusFilter === "all"
                          ? "Import a JSON file with procurement links to get started."
                          : `No links with status "${statusFilter}" found. Try a different filter or import more links.`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TronPanel>,
          );
        }

        return null;
      })}

      {/* Admin-only context menu */}
      {isAdmin === true && cardContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCardContextMenu();
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="absolute bg-tron-bg-elevated border border-tron-cyan/30 rounded-lg shadow-tron-glow overflow-hidden min-w-[180px]"
            style={{
              left: cardContextMenu.position.x,
              top: cardContextMenu.position.y,
              transform: "translate(-50%, 8px)",
            }}
          >
            <div className="px-3 py-2 bg-tron-bg-card border-b border-tron-cyan/20">
              <p className="text-xs text-tron-gray truncate max-w-[240px]">
                {cardContextMenu.url.state} • {cardContextMenu.url.capital}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={handleEditFromContextMenu}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-tron-white hover:bg-tron-cyan/20 transition"
              >
                <Edit3 className="w-4 h-4 text-tron-cyan" />
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin-only override modal */}
      {isAdmin === true && overrideUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeOverrideModal();
            }
          }}
        >
          <div className="bg-tron-bg-elevated border border-tron-cyan/30 rounded-xl shadow-tron-glow max-w-3xl w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-tron-cyan/20 to-tron-blue/20 p-4 border-b border-tron-cyan/20 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-tron-white">
                  Admin Override
                </h2>
                <p className="text-xs text-tron-gray truncate">
                  {overrideUrl.state} • {overrideUrl.capital}
                </p>
              </div>
              <button
                onClick={closeOverrideModal}
                className="p-2 hover:bg-tron-cyan/20 rounded-full transition text-tron-gray hover:text-tron-cyan"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {overrideError && (
                <div className="p-3 bg-neon-error/10 border border-neon-error/30 rounded text-sm text-neon-error">
                  {overrideError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    State
                  </label>
                  <input
                    value={overrideForm.state}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Capital
                  </label>
                  <input
                    value={overrideForm.capital}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        capital: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Status
                  </label>
                  <select
                    value={overrideForm.status}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="denied">denied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Requires Registration
                  </label>
                  <select
                    value={overrideForm.requiresRegistration}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        requiresRegistration: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  >
                    <option value="">unset</option>
                    <option value="false">no</option>
                    <option value="true">yes</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Official Website
                  </label>
                  <input
                    value={overrideForm.officialWebsite}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        officialWebsite: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Procurement Link
                  </label>
                  <input
                    value={overrideForm.procurementLink}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        procurementLink: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Imported At (ms)
                  </label>
                  <input
                    value={overrideForm.importedAt}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        importedAt: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Source File
                  </label>
                  <input
                    value={overrideForm.sourceFile}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        sourceFile: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Verified By
                  </label>
                  <input
                    value={overrideForm.verifiedBy}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        verifiedBy: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          verifiedBy: "GPT-5-Mini-Agent",
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30 transition"
                    >
                      Set AI
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          verifiedBy: "",
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-bg-card text-tron-gray hover:text-tron-white border border-tron-cyan/20 hover:border-tron-cyan/40 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Verified At (ms)
                  </label>
                  <input
                    value={overrideForm.verifiedAt}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        verifiedAt: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          verifiedAt: String(Date.now()),
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30 transition"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          verifiedAt: "",
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-bg-card text-tron-gray hover:text-tron-white border border-tron-cyan/20 hover:border-tron-cyan/40 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    AI Review Status
                  </label>
                  <select
                    value={overrideForm.aiReviewStatus}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        aiReviewStatus: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  >
                    <option value="">unset</option>
                    <option value="idle">idle</option>
                    <option value="processing">processing</option>
                    <option value="completed">completed</option>
                    <option value="failed">failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    AI Decision
                  </label>
                  <select
                    value={overrideForm.aiDecision}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        aiDecision: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  >
                    <option value="">unset</option>
                    <option value="approve">approve</option>
                    <option value="deny">deny</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Last Agent Attempt (ms)
                  </label>
                  <input
                    value={overrideForm.lastAgentAttempt}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        lastAgentAttempt: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          lastAgentAttempt: String(Date.now()),
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30 transition"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          lastAgentAttempt: "",
                        }))
                      }
                      className="px-2 py-1 text-xs rounded bg-tron-bg-card text-tron-gray hover:text-tron-white border border-tron-cyan/20 hover:border-tron-cyan/40 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    AI Reasoning
                  </label>
                  <textarea
                    value={overrideForm.aiReasoning}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        aiReasoning: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-tron-cyan mb-1">
                    Denial Reason
                  </label>
                  <textarea
                    value={overrideForm.denialReason}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        denialReason: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={closeOverrideModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-tron-cyan/30 text-tron-cyan hover:bg-tron-cyan/10 transition-colors"
                  disabled={isSavingOverride}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverride}
                  disabled={isSavingOverride}
                  className="flex-1 px-4 py-2 rounded-lg bg-tron-cyan text-tron-bg-deep hover:bg-tron-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingOverride ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
