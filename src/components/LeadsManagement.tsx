import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { LeadForm } from './LeadForm';
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
  Upload
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
  createdAt: number;
  updatedAt: number;
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
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Queries
  const allLeads = useQuery(api.leads.getAllLeads);
  const leadsStats = useQuery(api.leads.getLeadsStats);
  const selectedLead = useQuery(
    api.leads.getLeadById, 
    selectedLeadId ? { id: selectedLeadId } : "skip"
  );

  // Mutations
  const deleteLead = useMutation(api.leads.deleteLead);
  const toggleLeadActive = useMutation(api.leads.toggleLeadActive);
  const markLeadAsChecked = useMutation(api.leads.markLeadAsChecked);

  // Actions
  const importTexasLeads = useAction(api.leadsActions.importTexasLeadsFromJson);

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];

    return allLeads.filter(lead => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          lead.opportunityTitle.toLowerCase().includes(searchLower) ||
          lead.summary.toLowerCase().includes(searchLower) ||
          lead.issuingBody.name.toLowerCase().includes(searchLower) ||
          (lead.contractID && lead.contractID.toLowerCase().includes(searchLower)) ||
          (lead.searchableText && lead.searchableText.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Apply filters
      if (filters.opportunityType && lead.opportunityType !== filters.opportunityType) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.region && lead.location.region !== filters.region) return false;
      if (filters.level && lead.issuingBody.level !== filters.level) return false;
      if (filters.verificationStatus && lead.verificationStatus !== filters.verificationStatus) return false;
      if (filters.isActive !== null && lead.isActive !== filters.isActive) return false;

      return true;
    });
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

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('open')) return 'text-green-600 bg-green-100';
    if (statusLower.includes('planning') || statusLower.includes('budgeted')) return 'text-blue-600 bg-blue-100';
    if (statusLower.includes('closed') || statusLower.includes('completed')) return 'text-gray-600 bg-gray-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getVerificationStatusIcon = (status?: string) => {
    if (!status) return <AlertCircle className="w-4 h-4 text-gray-400" />;
    if (status.toLowerCase().includes('verified')) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status.toLowerCase().includes('pending')) return <Clock className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  if (!allLeads) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 h-full flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads Management</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Manage procurement opportunity leads</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportTexasLeads}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {isImporting ? 'Importing...' : 'Import Texas Leads'}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {leadsStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{leadsStats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Leads</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{leadsStats.active}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Public Sector</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {leadsStats.byOpportunityType['Public Sector'] || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Private Subcontract</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {leadsStats.byOpportunityType['Private Subcontract'] || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <ExternalLink className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 flex-1">
        {/* Leads List */}
        <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <Filter className="w-4 h-4" />
                Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Clear
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opportunity Type</label>
                    <select
                      value={filters.opportunityType}
                      onChange={(e) => setFilters(prev => ({ ...prev, opportunityType: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All Types</option>
                      {uniqueValues.opportunityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All Statuses</option>
                      {uniqueValues.statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
                    <select
                      value={filters.region}
                      onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All Regions</option>
                      {uniqueValues.regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                    <select
                      value={filters.level}
                      onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All Levels</option>
                      {uniqueValues.levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verification Status</label>
                    <select
                      value={filters.verificationStatus}
                      onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All Statuses</option>
                      {uniqueValues.verificationStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</label>
                    <select
                      value={filters.isActive === null ? '' : filters.isActive.toString()}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        isActive: e.target.value === '' ? null : e.target.value === 'true' 
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors text-sm"
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Leads List */}
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 px-1 flex-shrink-0">
              <span className="font-medium">Showing {filteredLeads.length} of {allLeads.length} leads</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0">
              {filteredLeads.map((lead) => (
                <div
                  key={lead._id}
                  className={`p-5 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedLeadId === lead._id
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedLeadId(lead._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
                          {lead.opportunityTitle}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getVerificationStatusIcon(lead.verificationStatus)}
                          {lead.isActive ? (
                            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                          ) : (
                            <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="font-medium">{lead.issuingBody.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span>{lead.location.region}</span>
                        </div>
                        {lead.estimatedValueUSD && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(lead.estimatedValueUSD)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {lead.opportunityType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(lead._id);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all duration-200"
                        title={lead.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {lead.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsChecked(lead._id);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all duration-200"
                        title="Mark as checked"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLead(lead._id);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          {selectedLead ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lead Details</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all duration-200"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{selectedLead.opportunityTitle}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedLead.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm space-y-4">
                  <div className="space-y-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                    <p className="text-gray-600 dark:text-gray-400">{selectedLead.opportunityType}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <p className="text-gray-600 dark:text-gray-400">{selectedLead.status}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Contract ID:</span>
                    <p className="text-gray-600 dark:text-gray-400">{selectedLead.contractID || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Value:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedLead.estimatedValueUSD ? formatCurrency(selectedLead.estimatedValueUSD) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Issuing Body:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedLead.issuingBody.name} ({selectedLead.issuingBody.level})</p>
                </div>

                <div className="space-y-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {[selectedLead.location.city, selectedLead.location.county, selectedLead.location.region]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Key Dates:</span>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
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
                  <span className="font-medium text-gray-700 dark:text-gray-300">Source:</span>
                  <a
                    href={selectedLead.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center gap-2 hover:underline transition-colors"
                  >
                    {selectedLead.source.documentName}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {selectedLead.contacts.length > 0 && (
                  <div className="space-y-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Contacts:</span>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                      {selectedLead.contacts.map((contact, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                          <p className="font-medium text-gray-900 dark:text-white">{contact.name || 'N/A'} - {contact.title}</p>
                          {contact.email && <p className="flex items-center gap-2"><span className="text-gray-500 dark:text-gray-400">Email:</span> {contact.email}</p>}
                          {contact.phone && <p className="flex items-center gap-2"><span className="text-gray-500 dark:text-gray-400">Phone:</span> {contact.phone}</p>}
                          {contact.url && (
                            <a
                              href={contact.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 hover:underline transition-colors"
                            >
                              <span className="text-gray-500 dark:text-gray-400">URL:</span>
                              <span className="truncate">{contact.url}</span>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="space-y-1">
                      <span className="block">Created: {new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                      <span className="block">Updated: {new Date(selectedLead.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-6">
                <Briefcase className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">No Lead Selected</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Select a lead from the list to view its details</p>
            </div>
          )}
        </div>
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
    </div>
  );
}
