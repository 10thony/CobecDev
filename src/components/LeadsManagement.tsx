import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { LeadForm } from './LeadForm';
import { JsonUploadComponent } from './JsonUploadComponent';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  MapPin, 
  Building, 
  Calendar, 
  DollarSign,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Save,
  RefreshCw,
  Briefcase,
  Download,
  Upload,
  MoreVertical,
  Target
} from 'lucide-react';
import { LeadHuntChat } from './LeadHuntChat';
import { LeadReviewPanel } from './LeadReviewPanel';
import { LeadLinkVerificationStatus } from './LeadLinkVerificationStatus';

interface Lead {
  _id: Id<"leads">;
  opportunityType: string;
  opportunityTitle: string;
  contractID?: string;
  issuingBody: {
    name: string;
    level: string;
  };
  location: {
    city?: string;
    county?: string;
    region: string;
  };
  status: string;
  estimatedValueUSD?: number;
  keyDates: {
    publishedDate?: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  source: {
    documentName: string;
    url: string;
  };
  contacts: Array<{
    name?: string;
    title: string;
    email?: string;
    phone?: string;
    url?: string;
  }>;
  summary: string;
  verificationStatus?: string;
  category?: string;
  subcategory?: string;
  isActive?: boolean;
  lastChecked?: number;
  adHoc?: any; // For additional data from imports
  createdAt: number;
  updatedAt: number;
  [key: string]: any; // Allow for dynamic fields
}

interface LeadsManagementProps {
  className?: string;
}

export function LeadsManagement({ className = '' }: LeadsManagementProps) {
  const { isSignedIn } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<Id<"leads"> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    opportunityType: '',
    status: '',
    region: '',
    generalRegion: '', // For quick filter by general region
    level: '',
    verificationStatus: '',
    isActive: null as boolean | null,
    dateRange: '', // '30days', '90days', '6months', '1year', 'all'
    orderBy: '', // 'startDateAsc', 'startDateDesc', 'deadlineAsc', 'deadlineDesc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<Id<"leads"> | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [actionsMenuClickedOpen, setActionsMenuClickedOpen] = useState(false);
  const [showLeadHuntChat, setShowLeadHuntChat] = useState(false);
  const [leadHuntState, setLeadHuntState] = useState<string>('');
  const [activeWorkflowId, setActiveWorkflowId] = useState<Id<"leadHuntWorkflows"> | null>(null);
  const [showRegionFilters, setShowRegionFilters] = useState(false);
  const [showLeadTypeFilters, setShowLeadTypeFilters] = useState(false);
  const [showOrderBy, setShowOrderBy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const quickFiltersRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // Swipe gesture state for horizontal scroll
  const [swipeState, setSwipeState] = useState({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  });
  
  // Load all leads at once
  // @ts-expect-error - TypeScript has issues with large array inference from Convex
  const allLeads = useQuery(api.leads.getAllLeads) as Lead[] | undefined;

  const selectedLead = useQuery(
    api.leads.getLeadById, 
    selectedLeadId ? { id: selectedLeadId } : "skip"
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
        setActionsMenuClickedOpen(false);
      }
    };

    if (openMenuId !== null || showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId, showActionsMenu]);

  // Swipe gesture handlers for horizontal scroll
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!quickFiltersRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = quickFiltersRef.current.getBoundingClientRect();
    isDraggingRef.current = false;
    setSwipeState({
      isDown: true,
      startX: clientX - rect.left,
      scrollLeft: quickFiltersRef.current.scrollLeft,
    });
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.isDown || !quickFiltersRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = quickFiltersRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const walk = (x - swipeState.startX) * 2; // Scroll speed multiplier
    
    // Mark as dragging if the scroll distance is significant
    if (Math.abs(walk) > 5) {
      isDraggingRef.current = true;
    }
    
    quickFiltersRef.current.scrollLeft = swipeState.scrollLeft - walk;
  };

  const handleSwipeEnd = () => {
    // Reset dragging flag after a short delay to allow click events to check it
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
    setSwipeState({
      isDown: false,
      startX: 0,
      scrollLeft: 0,
    });
  };

  // Prevent button click if user was dragging
  const handleFilterClick = (region: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setFilters(prev => ({ ...prev, region: prev.region === region ? '' : region }));
  };

  // Handle general region filter click
  const handleGeneralRegionClick = (generalRegion: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setFilters(prev => ({ ...prev, generalRegion: prev.generalRegion === generalRegion ? '' : generalRegion }));
  };

  // Handle opportunity type filter click
  const handleOpportunityTypeClick = (type: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setFilters(prev => ({ ...prev, opportunityType: prev.opportunityType === type ? '' : type }));
  };

  // Map specific regions to general regions
  const mapToGeneralRegion = (specificRegion: string): string => {
    if (!specificRegion) return '';
    const regionLower = specificRegion.toLowerCase();
    
    // North
    if (regionLower.includes('north') || regionLower.includes('northern') || 
        regionLower.includes('new england') || regionLower.includes('new hampshire') ||
        regionLower.includes('maine') || regionLower.includes('vermont') ||
        regionLower.includes('massachusetts') || regionLower.includes('connecticut') ||
        regionLower.includes('rhode island') || regionLower.includes('alaska')) {
      return 'North';
    }
    
    // East
    if (regionLower.includes('east') || regionLower.includes('eastern') ||
        regionLower.includes('new york') || regionLower.includes('new jersey') ||
        regionLower.includes('pennsylvania') || regionLower.includes('delaware') ||
        regionLower.includes('maryland') || regionLower.includes('virginia') ||
        regionLower.includes('west virginia') || regionLower.includes('dc') ||
        regionLower.includes('district of columbia') || regionLower.includes('dmv')) {
      return 'East';
    }
    
    // South
    if (regionLower.includes('south') || regionLower.includes('southern') ||
        regionLower.includes('florida') || regionLower.includes('georgia') ||
        regionLower.includes('south carolina') || regionLower.includes('north carolina') ||
        regionLower.includes('alabama') || regionLower.includes('mississippi') ||
        regionLower.includes('louisiana') || regionLower.includes('arkansas') ||
        regionLower.includes('tennessee') || regionLower.includes('kentucky')) {
      return 'South';
    }
    
    // West
    if (regionLower.includes('west') || regionLower.includes('western') ||
        regionLower.includes('california') || regionLower.includes('oregon') ||
        regionLower.includes('washington') || regionLower.includes('nevada') ||
        regionLower.includes('idaho') || regionLower.includes('montana') ||
        regionLower.includes('wyoming') || regionLower.includes('utah') ||
        regionLower.includes('colorado') || regionLower.includes('hawaii')) {
      return 'West';
    }
    
    // Midwest
    if (regionLower.includes('midwest') || regionLower.includes('mid west') ||
        regionLower.includes('mid-west') || regionLower.includes('illinois') ||
        regionLower.includes('indiana') || regionLower.includes('ohio') ||
        regionLower.includes('michigan') || regionLower.includes('wisconsin') ||
        regionLower.includes('minnesota') || regionLower.includes('iowa') ||
        regionLower.includes('missouri') || regionLower.includes('north dakota') ||
        regionLower.includes('south dakota') || regionLower.includes('nebraska') ||
        regionLower.includes('kansas')) {
      return 'Midwest';
    }
    
    // Southwest
    if (regionLower.includes('southwest') || regionLower.includes('south west') ||
        regionLower.includes('south-west') || regionLower.includes('arizona') ||
        regionLower.includes('new mexico') || regionLower.includes('texas') ||
        regionLower.includes('oklahoma')) {
      return 'Southwest';
    }
    
    // Mid Central / Central
    if (regionLower.includes('central') || regionLower.includes('mid central') ||
        regionLower.includes('mid-central')) {
      return 'Mid Central';
    }
    
    // Nationwide / Worldwide / OCONUS
    if (regionLower.includes('nationwide') || regionLower.includes('worldwide') ||
        regionLower.includes('oconus') || regionLower.includes('all') ||
        regionLower.includes('national')) {
      return 'Nationwide';
    }
    
    // Default: return original if no match
    return specificRegion;
  };

  // Mutations
  const deleteLead = useMutation(api.leads.deleteLead);
  const toggleLeadActive = useMutation(api.leads.toggleLeadActive);
  const markLeadAsChecked = useMutation(api.leads.markLeadAsChecked);
  const cleanUpLeads = useMutation(api.leads.cleanUpLeads);

  // Actions
  const importTexasLeads = useAction(api.leadsActions.importTexasLeadsFromJson);

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    if (!allLeads || allLeads.length === 0) return [];

    const filterStats = {
      total: allLeads.length,
      filteredBySearch: 0,
      filteredByOpportunityType: 0,
      filteredByStatus: 0,
      filteredByRegion: 0,
      filteredByLevel: 0,
      filteredByVerificationStatus: 0,
      filteredByIsActive: 0,
      filteredByDateRange: 0,
      filteredByInvalidDate: 0,
      passed: 0
    };

    const filtered = allLeads.filter(lead => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          lead.opportunityTitle?.toLowerCase().includes(searchLower) ||
          lead.summary?.toLowerCase().includes(searchLower) ||
          lead.issuingBody?.name?.toLowerCase().includes(searchLower) ||
          (lead.contractID && lead.contractID.toLowerCase().includes(searchLower)) ||
          (lead.searchableText && lead.searchableText.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) {
          filterStats.filteredBySearch++;
          return false;
        }
      }

      // Apply filters
      if (filters.opportunityType && lead.opportunityType !== filters.opportunityType) {
        filterStats.filteredByOpportunityType++;
        return false;
      }
      if (filters.status && lead.status !== filters.status) {
        filterStats.filteredByStatus++;
        return false;
      }
      if (filters.region && lead.location?.region !== filters.region) {
        filterStats.filteredByRegion++;
        return false;
      }
      if (filters.generalRegion && mapToGeneralRegion(lead.location?.region || '') !== filters.generalRegion) {
        filterStats.filteredByRegion++;
        return false;
      }
      if (filters.level && lead.issuingBody?.level !== filters.level) {
        filterStats.filteredByLevel++;
        return false;
      }
      if (filters.verificationStatus && lead.verificationStatus !== filters.verificationStatus) {
        filterStats.filteredByVerificationStatus++;
        return false;
      }
      if (filters.isActive !== null && lead.isActive !== filters.isActive) {
        filterStats.filteredByIsActive++;
        return false;
      }

      // Date range filter - filter by bidDeadline or projectedStartDate
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0); // Set to start of day
        
        // Calculate the future date based on the selected range
        let futureDate = new Date(today);
        switch (filters.dateRange) {
          case '30days':
            futureDate.setDate(futureDate.getDate() + 30);
            break;
          case '90days':
            futureDate.setDate(futureDate.getDate() + 90);
            break;
          case '6months':
            futureDate.setMonth(futureDate.getMonth() + 6);
            break;
          case '1year':
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            break;
        }
        // Set futureDate to start of day for consistent comparison
        futureDate.setHours(0, 0, 0, 0);

        // Check if lead has a date in the future within the range
        // Use bidDeadline first, then projectedStartDate as fallback
        const leadDate = lead.keyDates?.bidDeadline || lead.keyDates?.projectedStartDate;
        if (!leadDate) {
          filterStats.filteredByDateRange++;
          return false; // Exclude leads without dates
        }
        
        try {
          const leadDateObj = new Date(leadDate);
          // Validate the date is valid
          if (isNaN(leadDateObj.getTime())) {
            filterStats.filteredByInvalidDate++;
            return false;
          }
          
          // Only include leads with dates in the future and within the selected range
          // Set to start of day for comparison
          const leadDateStart = new Date(leadDateObj.getFullYear(), leadDateObj.getMonth(), leadDateObj.getDate());
          if (leadDateStart < today || leadDateStart > futureDate) {
            filterStats.filteredByDateRange++;
            return false;
          }
        } catch {
          // Invalid date format, exclude this lead
          filterStats.filteredByInvalidDate++;
          return false;
        }
      }

      filterStats.passed++;
      return true;
    });

    // Log filtering statistics
    if (filterStats.total > 0) {
      const activeFilters = Object.entries(filters).filter(([_, v]) => v !== '' && v !== null).length;
      const hasSearch = searchTerm.length > 0;
      
      if (activeFilters > 0 || hasSearch) {
        console.log('[LeadsManagement] Filter statistics:', {
          ...filterStats,
          activeFilters,
          hasSearch,
          finalCount: filtered.length,
          filterRate: ((filterStats.total - filtered.length) / filterStats.total * 100).toFixed(2) + '%'
        });
      }
    }

    // Apply sorting
    let sorted = [...filtered];
    if (filters.orderBy) {
      sorted.sort((a, b) => {
        let dateA: Date | null = null;
        let dateB: Date | null = null;

        if (filters.orderBy === 'startDateAsc' || filters.orderBy === 'startDateDesc') {
          dateA = a.keyDates?.projectedStartDate ? new Date(a.keyDates.projectedStartDate) : null;
          dateB = b.keyDates?.projectedStartDate ? new Date(b.keyDates.projectedStartDate) : null;
        } else if (filters.orderBy === 'deadlineAsc' || filters.orderBy === 'deadlineDesc') {
          dateA = a.keyDates?.bidDeadline ? new Date(a.keyDates.bidDeadline) : null;
          dateB = b.keyDates?.bidDeadline ? new Date(b.keyDates.bidDeadline) : null;
        }

        // Handle null dates - put them at the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        // Check for invalid dates
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        // Compare dates
        const comparison = dateA.getTime() - dateB.getTime();
        
        // Reverse for descending order
        if (filters.orderBy === 'startDateDesc' || filters.orderBy === 'deadlineDesc') {
          return -comparison;
        }
        return comparison;
      });
    }

    return sorted;
  }, [allLeads, searchTerm, filters]);

  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    if (!allLeads) return { opportunityTypes: [], statuses: [], regions: [], generalRegions: [], levels: [], verificationStatuses: [] };

    const opportunityTypes = [...new Set(allLeads.map(lead => lead.opportunityType))];
    const statuses = [...new Set(allLeads.map(lead => lead.status))];
    const regions = [...new Set(allLeads.map(lead => lead.location.region))];
    const generalRegions = [...new Set(allLeads.map(lead => mapToGeneralRegion(lead.location.region)).filter(Boolean))]
      .filter(region => !region.toLowerCase().includes('faa'))
      .sort();
    const levels = [...new Set(allLeads.map(lead => lead.issuingBody.level))];
    const verificationStatuses = [...new Set(allLeads.map(lead => lead.verificationStatus).filter(Boolean))];

    return { opportunityTypes, statuses, regions, generalRegions, levels, verificationStatuses };
  }, [allLeads]);

  const handleDeleteLead = async (leadId: Id<"leads">) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead({ id: leadId });
        if (selectedLeadId === leadId) {
          setSelectedLeadId(null);
        }
      } catch (error) {
        console.error('Error deleting lead:', error);
        alert('Failed to delete lead. Please try again.');
      }
    }
  };

  const handleToggleActive = async (leadId: Id<"leads">) => {
    try {
      await toggleLeadActive({ id: leadId });
    } catch (error) {
      console.error('Error toggling lead status:', error);
      alert('Failed to update lead status. Please try again.');
    }
  };

  const handleMarkAsChecked = async (leadId: Id<"leads">) => {
    try {
      await markLeadAsChecked({ id: leadId });
    } catch (error) {
      console.error('Error marking lead as checked:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  const handleImportTexasLeads = async () => {
    if (window.confirm('This will import all Texas leads from the JSON file. Continue?')) {
      setIsImporting(true);
      try {
        // Import the Texas leads data
        const response = await fetch('/json/texasLeadsTierOne.json');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch JSON file: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.opportunities || !Array.isArray(data.opportunities)) {
          throw new Error('Invalid JSON format: expected "opportunities" array');
        }
        
        const result = await importTexasLeads({
          leadsData: data.opportunities,
          sourceFile: 'texasLeadsTierOne.json'
        });
        
        alert(`Successfully imported ${result.importedCount} leads from Texas leads data!`);
        
        // Clear selected lead to refresh the view
        setSelectedLeadId(null);
      } catch (error) {
        console.error('Error importing Texas leads:', error);
        alert(`Failed to import Texas leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      opportunityType: '',
      status: '',
      region: '',
      generalRegion: '',
      level: '',
      verificationStatus: '',
      isActive: null,
      dateRange: '',
      orderBy: '',
    });
    setSearchTerm('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Helper function to get original name from sanitized key
  const getOriginalName = (sanitizedKey: string, originalNames?: Record<string, string>) => {
    return originalNames?.[sanitizedKey] || sanitizedKey.replace(/_/g, ' ');
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('open')) return 'tron-badge-success';
    if (statusLower.includes('planning') || statusLower.includes('budgeted')) return 'tron-badge-info';
    if (statusLower.includes('closed') || statusLower.includes('completed')) return 'tron-badge';
    return 'tron-badge-warning';
  };

  const getVerificationStatusIcon = (status?: string) => {
    if (!status) return <AlertCircle className="w-4 h-4 text-tron-gray" />;
    if (status.toLowerCase().includes('verified')) return <CheckCircle className="w-4 h-4 text-neon-success" />;
    if (status.toLowerCase().includes('pending')) return <Clock className="w-4 h-4 text-neon-warning" />;
    return <AlertCircle className="w-4 h-4 text-neon-error" />;
  };

  // Show page structure immediately, even if no leads loaded yet
  // The page will populate as leads come in

  // If showing Lead Hunt Chat, render it instead of the main content
  if (showLeadHuntChat) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-tron-white flex items-center gap-2">
            <Search className="w-6 h-6 text-tron-cyan" />
            Lead Hunt
          </h1>
          <button
            onClick={() => {
              setShowLeadHuntChat(false);
              setLeadHuntState('');
            }}
            className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <LeadHuntChat 
            onLeadsFound={(workflowId) => {
              setActiveWorkflowId(workflowId);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Leads Management</h1>
          <p className="text-lg text-tron-gray">Manage procurement opportunity leads</p>
        </div>
        {isSignedIn && (
        <div 
          className="relative group"
          onMouseEnter={() => {
            // Show on hover (unless it was clicked closed)
            if (!actionsMenuClickedOpen) {
              setShowActionsMenu(true);
            }
          }}
          onMouseLeave={() => {
            // Close on mouse leave only if not explicitly opened via click
            if (!actionsMenuClickedOpen) {
              setTimeout(() => {
                if (actionsMenuRef.current && !actionsMenuRef.current.matches(':hover')) {
                  setShowActionsMenu(false);
                }
              }, 150);
            }
          }}
        >
          <button
            onClick={() => {
              const newState = !showActionsMenu;
              setShowActionsMenu(newState);
              setActionsMenuClickedOpen(newState);
            }}
            className="p-2 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan border border-tron-cyan/20 hover:border-tron-cyan/40 flex items-center gap-2"
            title="Actions"
          >
            <MoreVertical className="w-5 h-5" />
            <span className="text-sm font-medium">Actions</span>
          </button>
          
          {/* Actions Tooltip Menu */}
          <div 
            ref={actionsMenuRef}
            className={`absolute top-full right-0 mt-2 w-56 bg-tron-bg-card border border-tron-cyan/30 rounded-lg shadow-xl z-[60] overflow-hidden transition-all duration-200 pointer-events-auto ${
              showActionsMenu 
                ? 'opacity-100 visible' 
                : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
            }`}
            onMouseEnter={() => {
              setShowActionsMenu(true);
            }}
            onMouseLeave={() => {
              // Close on mouse leave only if not explicitly opened via click
              if (!actionsMenuClickedOpen) {
                setTimeout(() => {
                  setShowActionsMenu(false);
                  setActionsMenuClickedOpen(false);
                }, 150);
              }
            }}
          >
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportTexasLeads();
                    setShowActionsMenu(false);
                    setActionsMenuClickedOpen(false);
                  }}
                  disabled={isImporting}
                  className="w-full px-4 py-2.5 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <RefreshCw className="w-4 h-4 text-tron-cyan animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-tron-cyan" />
                  )}
                  <span>{isImporting ? 'Importing...' : 'Import Texas Leads'}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowJsonUpload(true);
                    setShowActionsMenu(false);
                    setActionsMenuClickedOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-tron-cyan" />
                  <span>Import JSON</span>
                </button>
                <div className="border-t border-tron-cyan/20 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeadHuntState('');
                    setShowLeadHuntChat(true);
                    setShowActionsMenu(false);
                    setActionsMenuClickedOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4 text-tron-cyan" />
                  <span>Hunt for Leads</span>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowActionsMenu(false);
                    setActionsMenuClickedOpen(false);
                    if (window.confirm('This will remove duplicate leads and leads with expired start times or deadlines. Continue?')) {
                      try {
                        const result = await cleanUpLeads({});
                        const parts = [];
                        if (result.duplicatesFound > 0) {
                          parts.push(`${result.duplicatesFound} duplicate${result.duplicatesFound > 1 ? 's' : ''}`);
                        }
                        if (result.expiredFound > 0) {
                          parts.push(`${result.expiredFound} expired lead${result.expiredFound > 1 ? 's' : ''}`);
                        }
                        const summary = parts.length > 0 
                          ? `Removed ${parts.join(' and ')}`
                          : 'No leads needed cleanup';
                        alert(`${summary} out of ${result.totalChecked} checked. Total deleted: ${result.deleted}`);
                        // Refresh by clearing selected lead
                        setSelectedLeadId(null);
                      } catch (error) {
                        console.error('Error cleaning up leads:', error);
                        alert(`Failed to clean up leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-tron-white hover:bg-tron-orange/20 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-tron-orange" />
                  <span className="text-tron-orange">Clean Up Leads</span>
                </button>
                <div className="border-t border-tron-cyan/20 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(true);
                    setShowActionsMenu(false);
                    setActionsMenuClickedOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4 text-tron-cyan" />
                  <span>Add Lead</span>
                </button>
              </div>
            </div>
        </div>
        )}
      </div>

      {/* Lead Link Verification Status - authenticated users only */}
      {isSignedIn && <LeadLinkVerificationStatus />}

      <div className={`grid grid-cols-1 gap-8 ${selectedLead ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* Leads List */}
        <div className={`space-y-4 ${selectedLead ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
          {/* Search and Filters */}
          <TronPanel className="!p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tron-gray w-5 h-5 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="tron-input w-full pr-4 py-3"
                    style={{ paddingLeft: '3.5rem' }}
                  />
                </div>
              </div>
              <TronButton
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                color="cyan"
                icon={showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              >
                <Filter className="w-4 h-4" />
                Filters
              </TronButton>
              <TronButton
                onClick={clearFilters}
                variant="ghost"
                color="cyan"
              >
                Clear
              </TronButton>
            </div>

            {/* Quick Filters by General Region */}
            <div className="mt-3 pt-3 border-t border-tron-cyan/20">
              <button
                onClick={() => setShowRegionFilters(!showRegionFilters)}
                className="flex items-center justify-between w-full mb-1.5 text-left"
              >
                <label className="block text-xs font-medium text-tron-gray cursor-pointer">Quick Filters by Region</label>
                {showRegionFilters ? (
                  <ChevronUp className="w-4 h-4 text-tron-gray" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-tron-gray" />
                )}
              </button>
              {showRegionFilters && (
                <div
                  ref={quickFiltersRef}
                  onMouseDown={handleSwipeStart}
                  onMouseMove={handleSwipeMove}
                  onMouseUp={handleSwipeEnd}
                  onMouseLeave={handleSwipeEnd}
                  onTouchStart={handleSwipeStart}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={handleSwipeEnd}
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 cursor-grab active:cursor-grabbing select-none"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  <style>{`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <button
                    onClick={(e) => {
                      if (!isDraggingRef.current) {
                        setFilters(prev => ({ ...prev, generalRegion: '' }));
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                      filters.generalRegion === ''
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    All Regions
                  </button>
                  {uniqueValues.generalRegions.map(region => (
                    <button
                      key={region}
                      onClick={(e) => handleGeneralRegionClick(region, e)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                        filters.generalRegion === region
                          ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                          : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Filters by Lead Type */}
            <div className="mt-3 pt-3 border-t border-tron-cyan/20">
              <button
                onClick={() => setShowLeadTypeFilters(!showLeadTypeFilters)}
                className="flex items-center justify-between w-full mb-1.5 text-left"
              >
                <label className="block text-xs font-medium text-tron-gray cursor-pointer">Quick Filters by Lead Type</label>
                {showLeadTypeFilters ? (
                  <ChevronUp className="w-4 h-4 text-tron-gray" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-tron-gray" />
                )}
              </button>
              {showLeadTypeFilters && (
                <div
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 select-none"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  <button
                    onClick={(e) => {
                      setFilters(prev => ({ ...prev, opportunityType: '' }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                      filters.opportunityType === ''
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    All Types
                  </button>
                  {uniqueValues.opportunityTypes
                    .filter(type => !type.toLowerCase().includes('faa'))
                    .map(type => (
                    <button
                      key={type}
                      onClick={(e) => handleOpportunityTypeClick(type, e)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                        filters.opportunityType === type
                          ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                          : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order By Section */}
            <div className="mt-3 pt-3 border-t border-tron-cyan/20">
              <button
                onClick={() => setShowOrderBy(!showOrderBy)}
                className="flex items-center justify-between w-full mb-1.5 text-left"
              >
                <label className="block text-xs font-medium text-tron-gray cursor-pointer">Order By</label>
                {showOrderBy ? (
                  <ChevronUp className="w-4 h-4 text-tron-gray" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-tron-gray" />
                )}
              </button>
              {showOrderBy && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, orderBy: prev.orderBy === 'startDateAsc' ? '' : 'startDateAsc' }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                      filters.orderBy === 'startDateAsc'
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    Start Date ↑
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, orderBy: prev.orderBy === 'startDateDesc' ? '' : 'startDateDesc' }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                      filters.orderBy === 'startDateDesc'
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    Start Date ↓
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, orderBy: prev.orderBy === 'deadlineAsc' ? '' : 'deadlineAsc' }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                      filters.orderBy === 'deadlineAsc'
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    Deadline ↑
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, orderBy: prev.orderBy === 'deadlineDesc' ? '' : 'deadlineDesc' }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                      filters.orderBy === 'deadlineDesc'
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    Deadline ↓
                  </button>
                </div>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-tron-cyan/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Opportunity Type</label>
                    <select
                      value={filters.opportunityType}
                      onChange={(e) => setFilters(prev => ({ ...prev, opportunityType: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="">All Types</option>
                      {uniqueValues.opportunityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="">All Statuses</option>
                      {uniqueValues.statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Region</label>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="">All Regions</option>
                      {uniqueValues.regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Level</label>
                    <select
                      value={filters.level}
                      onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="">All Levels</option>
                      {uniqueValues.levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Verification Status</label>
                    <select
                      value={filters.verificationStatus}
                      onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="">All Statuses</option>
                      {uniqueValues.verificationStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Active Status</label>
                    <select
                      value={filters.isActive === null ? '' : filters.isActive.toString()}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        isActive: e.target.value === '' ? null : e.target.value === 'true' 
                      }))}
                      className="tron-select w-full"
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-tron-gray">Date Range (Future)</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      className="tron-select w-full"
                    >
                      <option value="all">All Dates</option>
                      <option value="30days">Next 30 Days</option>
                      <option value="90days">Next 90 Days</option>
                      <option value="6months">Next 6 Months</option>
                      <option value="1year">Next 1 Year</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </TronPanel>

          {/* Leads List */}
          <TronPanel className="!p-0">
            <div className="flex items-center justify-between text-sm text-tron-gray px-4 py-3 border-b border-tron-cyan/20">
              <span className="font-medium">
                {allLeads === undefined ? (
                  <span>Loading leads...</span>
                ) : (
                  <span>Showing {filteredLeads.length} of {allLeads.length} leads</span>
                )}
              </span>
            </div>
            <div 
              className="overflow-y-auto"
              style={{ 
                height: selectedLead ? 'calc(100vh - 420px)' : 'calc(100vh - 320px)',
                minHeight: selectedLead ? '400px' : '500px',
                transition: 'height 0.3s ease-in-out'
              }}
            >
              {allLeads === undefined && (
                <>
                  {/* Skeleton loaders */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="tron-card p-4 rounded-lg border border-tron-cyan/20 bg-tron-bg-card animate-pulse"
                      >
                        <div className="space-y-3">
                          <div className="h-5 bg-tron-cyan/20 rounded w-3/4"></div>
                          <div className="h-4 bg-tron-cyan/10 rounded w-full"></div>
                          <div className="h-4 bg-tron-cyan/10 rounded w-2/3"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-tron-cyan/10 rounded-full w-20"></div>
                            <div className="h-5 bg-tron-cyan/10 rounded w-24"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-tron-cyan mr-2" />
                    <span className="text-tron-gray">Loading all leads...</span>
                  </div>
                </>
              )}
              {allLeads !== undefined && allLeads.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <span className="text-tron-gray">No leads found</span>
                </div>
              )}
              {allLeads !== undefined && filteredLeads.length === 0 && allLeads.length > 0 && (
                <div className="flex items-center justify-center py-12">
                  <span className="text-tron-gray">No leads match your filters</span>
                </div>
              )}
              {allLeads !== undefined && filteredLeads.length > 0 && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead._id}
                      className={`relative tron-card p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedLeadId === lead._id 
                          ? 'border-tron-cyan bg-tron-bg-card shadow-md' 
                          : 'border-tron-cyan/20 hover:border-tron-cyan/40'
                      }`}
                      onClick={() => setSelectedLeadId(lead._id)}
                    >
                      {/* Tooltip Menu Button - Top Right (authenticated users only) */}
                      {isSignedIn && (
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === lead._id ? null : lead._id);
                          }}
                          className="p-1.5 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Tooltip Menu */}
                        {openMenuId === lead._id && (
                          <div 
                            ref={menuRef}
                            className="absolute top-full right-0 mt-2 w-48 bg-tron-bg-card border border-tron-cyan/30 rounded-lg shadow-xl z-[60] overflow-hidden"
                          >
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleActive(lead._id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                              >
                                {lead.isActive ? <EyeOff className="w-4 h-4 text-tron-cyan" /> : <Eye className="w-4 h-4 text-tron-cyan" />}
                                <span>{lead.isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsChecked(lead._id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-cyan/20 flex items-center gap-2 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 text-tron-cyan" />
                                <span>Mark as checked</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLead(lead._id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-tron-white hover:bg-tron-orange/20 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-tron-orange" />
                                <span className="text-tron-orange">Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      )}

                      {/* Header */}
                      <div className="mb-3 pr-8">
                        <h3 className="text-base font-semibold text-tron-white line-clamp-2 mb-2">
                          {lead.opportunityTitle}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-tron-gray mb-2">
                          <Building className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{lead.issuingBody.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-tron-gray">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-tron-cyan" />
                          <span>{lead.location.region}</span>
                        </div>
                      </div>

                      {/* Status and Type */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                        <span className="text-xs text-tron-gray bg-tron-bg-elevated px-2 py-1 rounded">
                          {lead.opportunityType}
                        </span>
                      </div>

                      {/* Value */}
                      {lead.estimatedValueUSD && (
                        <div className="flex items-center gap-1.5 text-sm mb-3">
                          <DollarSign className="w-4 h-4 text-tron-cyan flex-shrink-0" />
                          <span className="font-semibold text-tron-white">{formatCurrency(lead.estimatedValueUSD)}</span>
                        </div>
                      )}

                      {/* Dates */}
                      {(lead.keyDates?.projectedStartDate || lead.keyDates?.bidDeadline) && (
                        <div className="space-y-1.5 pt-2 border-t border-tron-cyan/10">
                          {lead.keyDates?.projectedStartDate && (
                            <div className="flex items-center gap-1.5 text-xs text-tron-gray">
                              <Calendar className="w-3 h-3 text-tron-cyan flex-shrink-0" />
                              <span className="font-medium">Start:</span>
                              <span className="text-tron-white">{formatDate(lead.keyDates.projectedStartDate)}</span>
                            </div>
                          )}
                          {lead.keyDates?.bidDeadline && (
                            <div className="flex items-center gap-1.5 text-xs text-tron-gray">
                              <Calendar className="w-3 h-3 text-tron-orange flex-shrink-0" />
                              <span className="font-medium">Deadline:</span>
                              <span className="text-tron-white">{formatDate(lead.keyDates.bidDeadline)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TronPanel>
        </div>

        {/* Lead Details */}
        {selectedLead && (
          <div className="lg:col-span-1">
            <div 
              className="sticky top-6"
              style={{ 
                maxHeight: 'calc(100vh - 3rem)',
                transition: 'opacity 0.3s ease-in-out',
                opacity: selectedLead ? 1 : 0
              }}
            >
              <TronPanel 
                title="Lead Details" 
                className="max-h-[calc(100vh-3rem)]"
                headerAction={
                  <div className="flex gap-2">
                    {isSignedIn && (
                    <TronButton
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      color="cyan"
                      size="sm"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </TronButton>
                    )}
                    <TronButton
                      onClick={() => setSelectedLeadId(null)}
                      variant="ghost"
                      color="orange"
                      size="sm"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </TronButton>
                  </div>
                }
              >
                <div className="space-y-6 overflow-y-auto overflow-x-hidden" style={{ 
                  maxHeight: 'calc(100vh - 280px)',
                  height: 'calc(100vh - 280px)',
                  WebkitOverflowScrolling: 'touch'
                }}>
                <div className="space-y-3">
                  <h3 className="font-semibold text-tron-white text-lg">{selectedLead.opportunityTitle}</h3>
                  <p className="text-sm text-tron-gray leading-relaxed">{selectedLead.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm space-y-4">
                  <div className="space-y-1">
                    <span className="font-medium text-tron-gray">Type:</span>
                    <p className="text-tron-white">{selectedLead.opportunityType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-tron-gray">Status:</span>
                    <p className="text-tron-white">{selectedLead.status}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-tron-gray">Contract ID:</span>
                    <p className="text-tron-white">{selectedLead.contractID || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-tron-gray">Value:</span>
                    <p className="text-tron-white">
                      {selectedLead.estimatedValueUSD ? formatCurrency(selectedLead.estimatedValueUSD) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium text-tron-gray">Issuing Body:</span>
                  <p className="text-tron-white">{selectedLead.issuingBody.name} ({selectedLead.issuingBody.level})</p>
                </div>

                <div className="space-y-2">
                  <span className="font-medium text-tron-gray">Location:</span>
                  <p className="text-tron-white">
                    {[selectedLead.location.city, selectedLead.location.county, selectedLead.location.region]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="font-medium text-tron-gray">Key Dates:</span>
                  <div className="text-sm text-tron-white space-y-2">
                    <div className="flex justify-between">
                      <span>Published:</span>
                      <span className="font-medium">{formatDate(selectedLead.keyDates.publishedDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bid Deadline:</span>
                      <span className="font-medium">{formatDate(selectedLead.keyDates.bidDeadline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium">{formatDate(selectedLead.keyDates.projectedStartDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium text-tron-gray">Source:</span>
                  <a
                    href={selectedLead.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tron-cyan hover:text-tron-blue text-sm flex items-center gap-2 hover:underline transition-colors"
                  >
                    {selectedLead.source.documentName}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {selectedLead.contacts.length > 0 && (
                  <div className="space-y-3">
                    <span className="font-medium text-tron-gray">Contacts:</span>
                    <div className="text-sm text-tron-white space-y-3">
                      {selectedLead.contacts.map((contact, index) => (
                        <div key={index} className="p-3 bg-tron-bg-card rounded-lg space-y-2 border border-tron-cyan/20">
                          <p className="font-medium text-tron-white">{contact.name || 'N/A'} - {contact.title}</p>
                          {contact.email && <p className="flex items-center gap-2"><span className="text-tron-gray">Email:</span> {contact.email}</p>}
                          {contact.phone && <p className="flex items-center gap-2"><span className="text-tron-gray">Phone:</span> {contact.phone}</p>}
                          {contact.url && (
                            <a
                              href={contact.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-tron-cyan hover:text-tron-blue flex items-center gap-2 hover:underline transition-colors"
                            >
                              <span className="text-tron-gray">URL:</span>
                              <span className="truncate">{contact.url}</span>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-tron-cyan/20">
                  <div className="flex items-center justify-between text-sm text-tron-gray">
                    <div className="space-y-1">
                      <span className="block">Created: {new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                      <span className="block">Updated: {new Date(selectedLead.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              </TronPanel>
            </div>
          </div>
        )}
      </div>

      {/* Lead Form for creating/editing leads */}
      <LeadForm
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSave={() => {
          setIsCreating(false);
          // Refresh data by clearing selected lead
          setSelectedLeadId(null);
        }}
      />

      <LeadForm
        lead={selectedLead || undefined}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={() => {
          setIsEditing(false);
          // Keep selected lead to show updated data
        }}
      />

      {showJsonUpload && (
        <JsonUploadComponent
          onClose={() => setShowJsonUpload(false)}
          onSuccess={(result) => {
            console.log('Import successful:', result);
            // Clear selected lead to refresh the view
            setSelectedLeadId(null);
            // Optionally show a success message
            alert(`Successfully imported ${result.importedCount} leads!${result.schemaChanges?.length ? ` Schema changes: ${result.schemaChanges.join(', ')}` : ''}`);
          }}
        />
      )}

      {/* Lead Review Panel - Show if there's an active workflow with pending leads */}
      {activeWorkflowId && (
        <div className="fixed bottom-0 right-0 w-96 max-h-[80vh] bg-tron-bg-panel border-t border-l border-tron-cyan/30 rounded-tl-lg shadow-tron-glow overflow-y-auto z-40">
          <div className="p-4 border-b border-tron-cyan/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-tron-white">Review Leads</h3>
            <button
              onClick={() => setActiveWorkflowId(null)}
              className="p-1 hover:bg-tron-cyan/10 rounded-lg transition-colors text-tron-gray hover:text-tron-cyan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <LeadReviewPanel workflowId={activeWorkflowId} />
          </div>
        </div>
      )}
    </div>
  );
}
