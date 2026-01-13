import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  MoreVertical
} from 'lucide-react';

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
  const [selectedLeadId, setSelectedLeadId] = useState<Id<"leads"> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    opportunityType: '',
    status: '',
    region: '',
    level: '',
    verificationStatus: '',
    isActive: null as boolean | null,
    dateRange: '', // '30days', '90days', '6months', '1year', 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<Id<"leads"> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

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

  // Mutations
  const deleteLead = useMutation(api.leads.deleteLead);
  const toggleLeadActive = useMutation(api.leads.toggleLeadActive);
  const markLeadAsChecked = useMutation(api.leads.markLeadAsChecked);
  const deleteDuplicateLeads = useMutation(api.leads.deleteDuplicateLeads);

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

    return filtered;
  }, [allLeads, searchTerm, filters]);

  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    if (!allLeads) return { opportunityTypes: [], statuses: [], regions: [], levels: [], verificationStatuses: [] };

    const opportunityTypes = [...new Set(allLeads.map(lead => lead.opportunityType))];
    const statuses = [...new Set(allLeads.map(lead => lead.status))];
    const regions = [...new Set(allLeads.map(lead => lead.location.region))];
    const levels = [...new Set(allLeads.map(lead => lead.issuingBody.level))];
    const verificationStatuses = [...new Set(allLeads.map(lead => lead.verificationStatus).filter(Boolean))];

    return { opportunityTypes, statuses, regions, levels, verificationStatuses };
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
      level: '',
      verificationStatus: '',
      isActive: null,
      dateRange: '',
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

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-tron-white">Leads Management</h1>
          <p className="text-lg text-tron-gray">Manage procurement opportunity leads</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <TronButton
            onClick={handleImportTexasLeads}
            disabled={isImporting}
            variant="primary"
            color="cyan"
            icon={isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            loading={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Texas Leads'}
          </TronButton>
          <TronButton
            onClick={() => setShowJsonUpload(true)}
            variant="outline"
            color="cyan"
            icon={<Upload className="w-4 h-4" />}
          >
            Import JSON
          </TronButton>
          <TronButton
            onClick={async () => {
              if (window.confirm('This will find and delete duplicate leads. Continue?')) {
                try {
                  const result = await deleteDuplicateLeads({});
                  alert(`Deleted ${result.deleted} duplicate leads out of ${result.totalChecked} checked.`);
                  // Refresh by clearing selected lead
                  setSelectedLeadId(null);
                } catch (error) {
                  console.error('Error deleting duplicates:', error);
                  alert(`Failed to delete duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
            }}
            variant="outline"
            color="orange"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete Duplicates
          </TronButton>
          <TronButton
            onClick={() => setIsCreating(true)}
            variant="primary"
            color="cyan"
            icon={<Plus className="w-4 h-4" />}
          >
            Add Lead
          </TronButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leads List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search and Filters */}
          <TronPanel>
            <div className="flex flex-col sm:flex-row gap-4">
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

            {/* State/Region Quick Filters with Horizontal Scroll */}
            <div className="mt-4 pt-4 border-t border-tron-cyan/20">
              <div className="mb-2">
                <label className="block text-xs font-medium text-tron-gray mb-2">Quick Filters by Region</label>
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
                        setFilters(prev => ({ ...prev, region: '' }));
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                      filters.region === ''
                        ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                        : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                    }`}
                  >
                    All Regions
                  </button>
                  {uniqueValues.regions.map(region => (
                    <button
                      key={region}
                      onClick={(e) => handleFilterClick(region, e)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${
                        filters.region === region
                          ? 'bg-tron-cyan/20 text-tron-cyan border-tron-cyan/40 shadow-sm shadow-tron-cyan/20'
                          : 'bg-tron-bg-deep text-tron-gray border-tron-cyan/20 hover:border-tron-cyan/30 hover:text-tron-white'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-tron-cyan/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <TronPanel>
            <div className="flex items-center justify-between text-sm text-tron-gray px-6 py-4 border-b border-tron-cyan/20">
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
                height: selectedLead ? '60vh' : '80vh',
                transition: 'height 0.3s ease-in-out'
              }}
            >
              <div className="p-4 space-y-3">
              {allLeads === undefined && (
                <>
                  {/* Skeleton loaders */}
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="relative p-5 border rounded-xl border-tron-cyan/20 bg-tron-bg-card animate-pulse"
                    >
                      <div className="flex items-start justify-between pr-8">
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="h-6 bg-tron-cyan/20 rounded w-3/4"></div>
                          <div className="flex items-center gap-6">
                            <div className="h-4 bg-tron-cyan/10 rounded w-32"></div>
                            <div className="h-4 bg-tron-cyan/10 rounded w-24"></div>
                            <div className="h-4 bg-tron-cyan/10 rounded w-28"></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-5 bg-tron-cyan/10 rounded-full w-20"></div>
                            <div className="h-5 bg-tron-cyan/10 rounded w-24"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
              {allLeads !== undefined && filteredLeads.map((lead) => (
                <div
                  key={lead._id}
                  className={`relative p-5 border rounded-xl cursor-pointer transition-all duration-200 ${ selectedLeadId === lead._id ? 'border-tron-cyan bg-tron-bg-card shadow-md' : 'border-tron-cyan/20 hover:border-tron-cyan/40 hover:bg-tron-bg-card hover:shadow-sm' }`}
                  onClick={() => setSelectedLeadId(lead._id)}
                >
                  {/* Tooltip Menu Button - Top Right */}
                  <div className="absolute top-4 right-4 z-10">
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

                  <div className="flex items-start justify-between pr-8">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-tron-white truncate text-lg">
                          {lead.opportunityTitle}
                        </h3>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-tron-gray">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-tron-gray" />
                          <span className="font-medium">{lead.issuingBody.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-tron-gray" />
                          <span>{lead.location.region}</span>
                        </div>
                        {lead.estimatedValueUSD && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-tron-gray" />
                            <span className="font-semibold text-tron-white">{formatCurrency(lead.estimatedValueUSD)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                        <span className="text-xs text-tron-gray bg-tron-bg-elevated px-2 py-1 rounded">
                          {lead.opportunityType}
                        </span>
                      </div>
                      {/* Start and End Dates */}
                      {(lead.keyDates?.projectedStartDate || lead.keyDates?.bidDeadline) && (
                        <div className="flex items-center gap-4 text-xs text-tron-gray">
                          {lead.keyDates?.projectedStartDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-tron-cyan" />
                              <span className="font-medium">Start:</span>
                              <span className="text-tron-white">{formatDate(lead.keyDates.projectedStartDate)}</span>
                            </div>
                          )}
                          {lead.keyDates?.bidDeadline && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-tron-orange" />
                              <span className="font-medium">Deadline:</span>
                              <span className="text-tron-white">{formatDate(lead.keyDates.bidDeadline)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>
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
              <TronPanel title="Lead Details" className="max-h-[calc(100vh-3rem)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    <TronButton
                      onClick={() => setIsEditing(true)}
                      variant="ghost"
                      color="cyan"
                      size="sm"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </TronButton>
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
                </div>

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
    </div>
  );
}
