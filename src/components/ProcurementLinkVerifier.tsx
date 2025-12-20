import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
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
  UserX
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';

// US States data for dropdown
const US_STATES = [
  { name: 'Alabama', capital: 'Montgomery' },
  { name: 'Alaska', capital: 'Juneau' },
  { name: 'Arizona', capital: 'Phoenix' },
  { name: 'Arkansas', capital: 'Little Rock' },
  { name: 'California', capital: 'Sacramento' },
  { name: 'Colorado', capital: 'Denver' },
  { name: 'Connecticut', capital: 'Hartford' },
  { name: 'Delaware', capital: 'Dover' },
  { name: 'Florida', capital: 'Tallahassee' },
  { name: 'Georgia', capital: 'Atlanta' },
  { name: 'Hawaii', capital: 'Honolulu' },
  { name: 'Idaho', capital: 'Boise' },
  { name: 'Illinois', capital: 'Springfield' },
  { name: 'Indiana', capital: 'Indianapolis' },
  { name: 'Iowa', capital: 'Des Moines' },
  { name: 'Kansas', capital: 'Topeka' },
  { name: 'Kentucky', capital: 'Frankfort' },
  { name: 'Louisiana', capital: 'Baton Rouge' },
  { name: 'Maine', capital: 'Augusta' },
  { name: 'Maryland', capital: 'Annapolis' },
  { name: 'Massachusetts', capital: 'Boston' },
  { name: 'Michigan', capital: 'Lansing' },
  { name: 'Minnesota', capital: 'Saint Paul' },
  { name: 'Mississippi', capital: 'Jackson' },
  { name: 'Missouri', capital: 'Jefferson City' },
  { name: 'Montana', capital: 'Helena' },
  { name: 'Nebraska', capital: 'Lincoln' },
  { name: 'Nevada', capital: 'Carson City' },
  { name: 'New Hampshire', capital: 'Concord' },
  { name: 'New Jersey', capital: 'Trenton' },
  { name: 'New Mexico', capital: 'Santa Fe' },
  { name: 'New York', capital: 'Albany' },
  { name: 'North Carolina', capital: 'Raleigh' },
  { name: 'North Dakota', capital: 'Bismarck' },
  { name: 'Ohio', capital: 'Columbus' },
  { name: 'Oklahoma', capital: 'Oklahoma City' },
  { name: 'Oregon', capital: 'Salem' },
  { name: 'Pennsylvania', capital: 'Harrisburg' },
  { name: 'Rhode Island', capital: 'Providence' },
  { name: 'South Carolina', capital: 'Columbia' },
  { name: 'South Dakota', capital: 'Pierre' },
  { name: 'Tennessee', capital: 'Nashville' },
  { name: 'Texas', capital: 'Austin' },
  { name: 'Utah', capital: 'Salt Lake City' },
  { name: 'Vermont', capital: 'Montpelier' },
  { name: 'Virginia', capital: 'Richmond' },
  { name: 'Washington', capital: 'Olympia' },
  { name: 'West Virginia', capital: 'Charleston' },
  { name: 'Wisconsin', capital: 'Madison' },
  { name: 'Wyoming', capital: 'Cheyenne' },
  { name: 'District of Columbia', capital: 'Washington' },
];

interface ProcurementLink {
  state: string;
  capital: string;
  official_website: string;
  procurement_link: string;
}

interface ProcurementLinkVerifierProps {
  className?: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'denied';

export function ProcurementLinkVerifier({ className = '' }: ProcurementLinkVerifierProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; duplicates: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for editing corrected links
  const [editingId, setEditingId] = useState<Id<"procurementUrls"> | null>(null);
  const [correctedLink, setCorrectedLink] = useState('');
  const [requiresRegistration, setRequiresRegistration] = useState<Record<string, boolean>>({});

  // State for manual link entry form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    state: '',
    capital: '',
    officialWebsite: '',
    procurementLink: '',
    requiresRegistration: false,
  });
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualFormSuccess, setManualFormSuccess] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Queries
  const allUrls = useQuery(api.procurementUrls.list, {});
  const stats = useQuery(api.procurementUrls.getStats);

  // Mutations
  const importFromJson = useMutation(api.procurementUrls.importFromJson);
  const approve = useMutation(api.procurementUrls.approve);
  const deny = useMutation(api.procurementUrls.deny);
  const resetToPending = useMutation(api.procurementUrls.resetToPending);
  const remove = useMutation(api.procurementUrls.remove);
  const approveAll = useMutation(api.procurementUrls.approveAll);
  const clearAll = useMutation(api.procurementUrls.clearAll);
  const updateLink = useMutation(api.procurementUrls.update);
  const addManual = useMutation(api.procurementUrls.addManual);

  // Filter URLs based on status
  const filteredUrls = allUrls?.filter((url) => {
    if (statusFilter === 'all') return true;
    return url.status === statusFilter;
  }) ?? [];

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('No files selected');
      return;
    }

    const file = files[0];

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    // Validate file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      setError('File size must be less than 4MB');
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
        throw new Error('Invalid JSON format. Please check your file syntax.');
      }

      // Handle different JSON structures
      let linksArray: ProcurementLink[] = [];
      
      if (Array.isArray(jsonData)) {
        linksArray = jsonData;
      } else if (jsonData.us_state_capitals_procurement && Array.isArray(jsonData.us_state_capitals_procurement)) {
        linksArray = jsonData.us_state_capitals_procurement;
      } else if (jsonData.links && Array.isArray(jsonData.links)) {
        linksArray = jsonData.links;
      } else {
        throw new Error('Invalid JSON format. Expected an array or an object with "us_state_capitals_procurement" or "links" array.');
      }

      if (linksArray.length === 0) {
        throw new Error('No procurement links found in the uploaded file');
      }

      // Validate each link has required fields
      for (const link of linksArray) {
        if (!link.state || !link.capital || !link.official_website || !link.procurement_link) {
          throw new Error(`Invalid link format. Each link must have: state, capital, official_website, procurement_link`);
        }
      }

      // Import the links
      const result = await importFromJson({
        links: linksArray,
        sourceFile: file.name,
      });

      setImportResult(result);
      setStatusFilter('pending'); // Show pending after import

    } catch (err) {
      console.error('Error processing uploaded file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
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
        const originalUrl = allUrls?.find(url => url._id === id);
        if (originalUrl && correctedLink.trim() !== originalUrl.procurementLink) {
          // Save the corrected link before approving
          await updateLink({ id, procurementLink: correctedLink.trim() });
        }
      }
      
      // Then approve with registration requirement
      await approve({ 
        id, 
        requiresRegistration: requiresRegistration[id] ?? undefined 
      });
      
      // Clear editing state
      if (editingId === id) {
        setEditingId(null);
        setCorrectedLink('');
      }
      // Clear registration requirement state for this link
      setRequiresRegistration(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error('Error approving URL:', err);
    }
  };

  const handleDeny = async (id: Id<"procurementUrls">) => {
    try {
      await deny({ id });
      // Clear editing state if this was being edited
      if (editingId === id) {
        setEditingId(null);
        setCorrectedLink('');
      }
      // Clear registration requirement state for this link
      setRequiresRegistration(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error('Error denying URL:', err);
    }
  };

  const handleStartEdit = (id: Id<"procurementUrls">, currentLink: string) => {
    setEditingId(id);
    setCorrectedLink(currentLink);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCorrectedLink('');
  };

  const handleSaveCorrectedLink = async (id: Id<"procurementUrls">) => {
    if (!correctedLink.trim()) {
      return;
    }
    try {
      await updateLink({ id, procurementLink: correctedLink.trim() });
      setEditingId(null);
      setCorrectedLink('');
    } catch (err) {
      console.error('Error updating URL:', err);
    }
  };

  const handleReset = async (id: Id<"procurementUrls">) => {
    try {
      await resetToPending({ id });
    } catch (err) {
      console.error('Error resetting URL:', err);
    }
  };

  const handleRemove = async (id: Id<"procurementUrls">) => {
    try {
      await remove({ id });
    } catch (err) {
      console.error('Error removing URL:', err);
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm('Are you sure you want to approve all pending URLs?')) {
      return;
    }
    try {
      await approveAll({});
    } catch (err) {
      console.error('Error approving all URLs:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL procurement URLs? This cannot be undone.')) {
      return;
    }
    try {
      await clearAll({ confirm: true });
    } catch (err) {
      console.error('Error clearing all URLs:', err);
    }
  };

  // Handle state selection in manual form - auto-fill capital
  const handleStateChange = (stateName: string) => {
    const stateData = US_STATES.find(s => s.name === stateName);
    setManualFormData(prev => ({
      ...prev,
      state: stateName,
      capital: stateData?.capital || '',
    }));
  };

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);
    setManualFormSuccess(false);
    
    // Validate required fields
    if (!manualFormData.state || !manualFormData.capital || !manualFormData.officialWebsite || !manualFormData.procurementLink) {
      setManualFormError('All fields are required');
      return;
    }

    // Validate URLs
    try {
      new URL(manualFormData.officialWebsite);
      new URL(manualFormData.procurementLink);
    } catch {
      setManualFormError('Please enter valid URLs (including https://)');
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
        state: '',
        capital: '',
        officialWebsite: '',
        procurementLink: '',
        requiresRegistration: false,
      });
      setStatusFilter('approved'); // Show approved links after adding
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setManualFormSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding manual link:', err);
      setManualFormError(err instanceof Error ? err.message : 'Failed to add link');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'denied') => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-success/20 text-neon-success border border-neon-success/30">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'denied':
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TronStatCard
            title="Total Links"
            value={stats.total}
            icon={<Globe className="w-6 h-6" />}
            color="cyan"
          />
          <TronStatCard
            title="Pending"
            value={stats.pending}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="orange"
          />
          <TronStatCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle className="w-6 h-6" />}
            color="cyan"
          />
          <TronStatCard
            title="Denied"
            value={stats.denied}
            icon={<XCircle className="w-6 h-6" />}
            color="orange"
          />
        </div>
      )}

      {/* Import Section */}
      <TronPanel title="Import Procurement Links" icon={<Upload className="w-5 h-5" />} glowColor="cyan">
        {error && (
          <div className="mb-4 bg-neon-error/20 p-4 rounded-lg border border-neon-error">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-neon-error mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-neon-error mb-1">Import Error</h3>
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
                <h3 className="font-medium text-neon-success mb-1">Import Complete!</h3>
                <p className="text-sm text-neon-success">
                  Imported {importResult.imported} links
                  {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicates`}
                </p>
              </div>
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tron-cyan mx-auto mb-4" />
            <p className="text-tron-gray">Processing uploaded file...</p>
          </div>
        ) : (
          <div
            className={`w-full border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
              dragOver
                ? 'border-tron-cyan bg-tron-bg-card'
                : 'border-tron-cyan/20 hover:border-tron-cyan'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
                Expected format: Array with state, capital, official_website, procurement_link fields
              </p>
            </div>
          </div>
)}
        </TronPanel>

      {/* Manual Entry Section */}
      <TronPanel 
        title="Add Link Manually" 
        icon={<Plus className="w-5 h-5" />} 
        glowColor="cyan"
        headerAction={
          <TronButton
            onClick={() => setShowManualForm(!showManualForm)}
            variant="outline"
            color="cyan"
            size="sm"
          >
            {showManualForm ? 'Hide Form' : 'Show Form'}
          </TronButton>
        }
      >
        <p className="text-sm text-tron-gray mb-4">
          Manually add procurement links that you've verified yourself. These links are automatically approved.
        </p>

        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {manualFormError && (
              <div className="bg-neon-error/20 p-3 rounded-lg border border-neon-error flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-neon-error mt-0.5 flex-shrink-0" />
                <p className="text-sm text-neon-error">{manualFormError}</p>
              </div>
            )}

            {manualFormSuccess && (
              <div className="bg-neon-success/20 p-3 rounded-lg border border-neon-success flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-neon-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-neon-success">Link added and approved successfully!</p>
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
                  <option value="" className="bg-tron-bg-card">Select a state...</option>
                  {US_STATES.map((state) => (
                    <option key={state.name} value={state.name} className="bg-tron-bg-card">
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capital (auto-filled) */}
              <div>
                <label className="block text-sm font-medium text-tron-cyan mb-1">
                  Capital *
                </label>
                <input
                  type="text"
                  value={manualFormData.capital}
                  onChange={(e) => setManualFormData(prev => ({ ...prev, capital: e.target.value }))}
                  disabled={isSubmittingManual}
                  className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                  placeholder="Capital city"
                  required
                />
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
                onChange={(e) => setManualFormData(prev => ({ ...prev, officialWebsite: e.target.value }))}
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
                onChange={(e) => setManualFormData(prev => ({ ...prev, procurementLink: e.target.value }))}
                disabled={isSubmittingManual}
                className="w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
                placeholder="https://www.example.gov/procurement"
                required
              />
              <p className="text-xs text-tron-gray mt-1">
                This is the direct link to the procurement/bidding page
              </p>
            </div>

            {/* Registration Requirement */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresRegistration"
                checked={manualFormData.requiresRegistration}
                onChange={(e) => setManualFormData(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
                disabled={isSubmittingManual}
                className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0 disabled:opacity-50"
              />
              <label htmlFor="requiresRegistration" className="text-sm text-tron-gray cursor-pointer">
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
                    state: '',
                    capital: '',
                    officialWebsite: '',
                    procurementLink: '',
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
                icon={isSubmittingManual ? undefined : <CheckCircle className="w-4 h-4" />}
              >
                {isSubmittingManual ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add & Approve Link'
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
      </TronPanel>

      {/* Filter and Actions */}
      <TronPanel glowColor="cyan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-tron-gray" />
            <span className="text-sm text-tron-gray">Filter:</span>
            <div className="flex gap-1">
              {(['all', 'pending', 'approved', 'denied'] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    statusFilter === filter
                      ? 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30'
                      : 'text-tron-gray hover:text-tron-white hover:bg-tron-bg-elevated'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter === 'all' && stats && ` (${stats.total})`}
                  {filter === 'pending' && stats && ` (${stats.pending})`}
                  {filter === 'approved' && stats && ` (${stats.approved})`}
                  {filter === 'denied' && stats && ` (${stats.denied})`}
                </button>
              ))}
            </div>
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
      </TronPanel>

      {/* Links Grid */}
      {filteredUrls.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUrls.map((url) => (
            <div
              key={url._id}
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
                  {url.status === 'approved' && url.requiresRegistration && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-neon-warning/20 text-neon-warning border border-neon-warning/30">
                      <UserCheck className="w-3 h-3" />
                      Registration Required
                    </span>
                  )}
                </div>
              </div>

              {/* Links */}
              <div className="space-y-2 mb-4">
                <a
                  href={url.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-tron-gray hover:text-tron-cyan transition-colors group"
                >
                  <Globe className="w-4 h-4" />
                  <span className="truncate group-hover:underline">Official Website</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                
                {/* Original Procurement Link */}
                <div className="flex items-center gap-2">
                  <a
                    href={url.procurementLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-tron-cyan hover:text-tron-cyan-bright transition-colors group flex-1 min-w-0"
                  >
                    <FileJson className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate group-hover:underline">Procurement Link</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  {editingId !== url._id && (
                    <button
                      onClick={() => handleStartEdit(url._id, url.procurementLink)}
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
                      {url.status === 'approved' ? 'Edit Procurement Link' : 'Verified Procurement Link'}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="url"
                        value={correctedLink}
                        onChange={(e) => setCorrectedLink(e.target.value)}
                        placeholder="Enter correct URL..."
                        className="flex-1 px-2 py-1.5 text-sm bg-tron-bg-deep border border-tron-cyan/30 rounded text-tron-white placeholder-tron-gray focus:outline-none focus:ring-1 focus:ring-tron-cyan focus:border-tron-cyan"
                      />
                      <button
                        onClick={() => handleSaveCorrectedLink(url._id)}
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
                      This link will be used in the Government Link Hub
                    </p>
                  </div>
                )}
              </div>

              {/* Registration Requirement Status */}
              {url.status === 'approved' && (
                <div className="mb-3 pt-2 border-t border-tron-cyan/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-tron-gray">Registration Required:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={url.requiresRegistration ?? false}
                        onChange={async (e) => {
                          try {
                            await updateLink({ 
                              id: url._id, 
                              requiresRegistration: e.target.checked 
                            });
                          } catch (err) {
                            console.error('Error updating registration requirement:', err);
                          }
                        }}
                        className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0"
                      />
                      <span className={`text-xs ${url.requiresRegistration ? 'text-neon-warning' : 'text-neon-success'}`}>
                        {url.requiresRegistration ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Registration Requirement Checkbox for Pending Links */}
              {url.status === 'pending' && (
                <div className="mb-3 pt-2 border-t border-tron-cyan/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresRegistration[url._id] ?? false}
                      onChange={(e) => setRequiresRegistration(prev => ({
                        ...prev,
                        [url._id]: e.target.checked
                      }))}
                      className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-card text-tron-cyan focus:ring-2 focus:ring-tron-cyan focus:ring-offset-0"
                    />
                    <span className="text-xs text-tron-gray">
                      Requires registration to view bids
                    </span>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-tron-cyan/10">
                {url.status === 'pending' && (
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
                {url.status !== 'pending' && (
                  <>
                    <TronButton
                      onClick={() => handleReset(url._id)}
                      variant="outline"
                      color="cyan"
                      size="sm"
                      className="flex-1"
                      icon={<RotateCcw className="w-4 h-4" />}
                    >
                      Reset
                    </TronButton>
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
            </div>
          ))}
        </div>
      ) : (
        <TronPanel glowColor="cyan">
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-tron-gray mx-auto mb-4" />
            <h3 className="text-lg font-medium text-tron-white mb-2">
              {statusFilter === 'all' ? 'No Procurement Links' : `No ${statusFilter} Links`}
            </h3>
            <p className="text-tron-gray max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'Import a JSON file with procurement links to get started.'
                : `No links with status "${statusFilter}" found. Try a different filter or import more links.`}
            </p>
          </div>
        </TronPanel>
      )}
    </div>
  );
}

