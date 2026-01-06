import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Eye,
  Square,
  X,
  Trash2
} from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import { TronStatCard } from './TronStatCard';
import { BrowserScraperPanel } from './BrowserScraperPanel';
import { Id } from '../../convex/_generated/dataModel';

interface ScrapedProcurementData {
  _id: Id<"scrapedProcurementData">;
  sourceUrl: string;
  state: string;
  capital: string;
  scrapedAt: number;
  scrapingStatus: "pending" | "in_progress" | "completed" | "failed";
  scrapedData: any;
  dataQuality?: "high" | "medium" | "low";
  dataCompleteness?: number;
  errorMessage?: string;
}

type SortField = keyof ScrapedProcurementData;
type SortDirection = "asc" | "desc" | null;

export function ScrapedProcurementDataGrid({ className = '' }: { className?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRecord, setSelectedRecord] = useState<ScrapedProcurementData | null>(null);
  const [showSanAntonioScraper, setShowSanAntonioScraper] = useState(false);
  const { userId } = useAuth();

  // Fetch data
  const scrapedData = useQuery(api.procurementScraperQueries.getAllScrapedData, {});
  const stats = useQuery(api.procurementScraperQueries.getScrapingStats, {});
  
  // Fetch active batch jobs for this user
  const activeJobs = useQuery(
    api.procurementScraperBatchJobs.getActiveJobs,
    userId ? { userId } : "skip"
  );
  
  // Actions
  const scrapeAll = useAction(api.procurementScraperActions.scrapeAllApprovedLinks);
  const cancelJob = useMutation(api.procurementScraperBatchJobs.cancelBatchJob);
  const deleteRecord = useMutation(api.procurementScraperMutations.deleteScrapingRecord);
  const deleteAllScrapedData = useMutation(api.procurementScraperMutations.deleteAllScrapedData);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    if (!scrapedData) return [];

    let filtered = scrapedData;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.state.toLowerCase().includes(term) ||
        item.capital.toLowerCase().includes(term) ||
        item.sourceUrl.toLowerCase().includes(term) ||
        JSON.stringify(item.scrapedData).toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [scrapedData, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-tron-gray opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-tron-blue" />
    ) : (
      <ArrowDown className="w-4 h-4 text-tron-blue" />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const colors = {
      high: "bg-green-500/20 text-green-400",
      medium: "bg-yellow-500/20 text-yellow-400",
      low: "bg-red-500/20 text-red-400",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[quality as keyof typeof colors]}`}>
        {quality.toUpperCase()}
      </span>
    );
  };

  const handleScrapeAll = async () => {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    try {
      const result = await scrapeAll({});
      if (result.success) {
        // Job started successfully - it will process in the background
        // The activeJobs query will automatically update to show progress
        console.log("Scraping job started:", result.jobId);
      } else {
        console.error("Failed to start scraping job:", result.error);
      }
    } catch (error) {
      console.error("Error starting scraping job:", error);
    }
  };

  // Get the most recent active job for progress display
  const currentJob = activeJobs && activeJobs.length > 0 ? activeJobs[0] : null;
  const progressPercentage = currentJob
    ? Math.round((currentJob.completedUrls / currentJob.totalUrls) * 100)
    : 0;

  // Debug logging (can be removed later)
  useEffect(() => {
    if (userId) {
      console.log("Active jobs:", activeJobs);
      console.log("Current job:", currentJob);
      console.log("Stats:", stats);
    }
  }, [activeJobs, currentJob, stats, userId]);

  const handleCancelJob = async () => {
    if (!currentJob) return;
    
    try {
      await cancelJob({ jobId: currentJob._id });
      console.log("Job cancelled successfully");
    } catch (error) {
      console.error("Error cancelling job:", error);
    }
  };

  const handleClearAll = async () => {
    const recordCount = scrapedData?.length || 0;
    if (recordCount === 0) {
      return;
    }
    
    if (!confirm(`Are you sure you want to delete all ${recordCount} scraped entries? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const result = await deleteAllScrapedData({});
      if (result.success) {
        console.log(`Successfully deleted ${result.deletedCount} scraped entries`);
      }
    } catch (error) {
      console.error("Error deleting all scraped entries:", error);
      alert("Failed to delete all scraped entries. Please try again.");
    }
  };

  const handleDeleteRecord = async (recordId: Id<"scrapedProcurementData">) => {
    if (!confirm("Are you sure you want to delete this scraped result? This action cannot be undone.")) {
      return;
    }
    
    try {
      await deleteRecord({ recordId });
      console.log("Record deleted successfully");
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  if (!scrapedData) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-tron-blue" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <TronStatCard
            title="Total Scraped"
            value={stats.total}
            icon={<RefreshCw className="w-5 h-5" />}
          />
          <TronStatCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <TronStatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<Clock className="w-5 h-5" />}
            color="orange"
          />
          <TronStatCard
            title="Failed"
            value={stats.failed}
            icon={<XCircle className="w-5 h-5" />}
            color="orange"
          />
        </div>
      )}

      {/* Controls */}
      <TronPanel>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="flex-1 w-full min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-tron-gray pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by state, city, URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 text-sm sm:text-base bg-tron-bg border border-tron-border rounded-lg text-tron-text placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-blue"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-tron-gray hover:text-tron-text transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-full h-full" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              {currentJob ? (
                <>
                  <TronButton 
                    onClick={handleCancelJob} 
                    className="flex items-center gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 text-sm"
                    variant="outline"
                  >
                    <XCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </TronButton>
                </>
              ) : (
                <>
                  <TronButton 
                    onClick={handleScrapeAll} 
                    className="flex items-center gap-2 text-sm"
                  >
                    <Play className="w-4 h-4" />
                    <span className="hidden sm:inline">Scrape All Approved Links</span>
                    <span className="sm:hidden">Scrape All</span>
                  </TronButton>
                  <TronButton 
                    onClick={() => setShowSanAntonioScraper(!showSanAntonioScraper)} 
                    className="flex items-center gap-2 border-tron-cyan/40 text-tron-cyan hover:bg-tron-cyan/10 hover:border-tron-cyan/60 text-sm"
                    variant="outline"
                  >
                    <Play className="w-4 h-4" />
                    <span className="hidden md:inline">Scrape San Antonio</span>
                    <span className="md:hidden">San Antonio</span>
                  </TronButton>
                  {scrapedData && scrapedData.length > 0 && (
                    <TronButton 
                      onClick={handleClearAll} 
                      className="flex items-center gap-2 border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 text-sm"
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Clear All Scraped Entries</span>
                      <span className="sm:hidden">Clear All</span>
                    </TronButton>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {currentJob && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-tron-gray">
                <span>
                  Scraping {currentJob.completedUrls + currentJob.failedUrls} of {currentJob.totalUrls} URLs
                </span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-tron-bg-card rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-tron-cyan transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-tron-gray">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  {currentJob.completedUrls} completed
                </span>
                {currentJob.failedUrls > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-400" />
                    {currentJob.failedUrls} failed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </TronPanel>

      {/* San Antonio Scraper Panel */}
      {showSanAntonioScraper && (
        <TronPanel>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-tron-text">San Antonio Procurement Scraper</h3>
              <button
                onClick={() => setShowSanAntonioScraper(false)}
                className="text-tron-gray hover:text-tron-text transition-colors"
                aria-label="Close scraper panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <BrowserScraperPanel
              url="https://webapp1.sanantonio.gov/BidContractOpps/Default.aspx"
              state="Texas"
              capital="San Antonio"
              onComplete={(result) => {
                console.log('San Antonio scraping completed:', result);
                // The data will automatically refresh via Convex queries
                // Close the panel after a short delay to show completion
                setTimeout(() => {
                  setShowSanAntonioScraper(false);
                }, 2000);
              }}
            />
          </div>
        </TronPanel>
      )}

      {/* Table */}
      <TronPanel className="overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="tron-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th onClick={() => handleSort("state")} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                    <div className="flex items-center gap-2">
                      <span>State</span>
                      {renderSortIcon("state")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("capital")} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                    <div className="flex items-center gap-2">
                      <span>City</span>
                      {renderSortIcon("capital")}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                    Source URL
                  </th>
                  <th onClick={() => handleSort("scrapingStatus")} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {renderSortIcon("scrapingStatus")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("dataQuality")} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                    <div className="flex items-center gap-2">
                      <span>Quality</span>
                      {renderSortIcon("dataQuality")}
                    </div>
                  </th>
                  <th onClick={() => handleSort("scrapedAt")} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider cursor-pointer hover:bg-tron-bg-card transition-colors">
                    <div className="flex items-center gap-2">
                      <span>Scraped At</span>
                      {renderSortIcon("scrapedAt")}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                    Scraped Data
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 sm:px-6 py-8 text-center text-tron-gray text-sm">
                      {searchTerm ? "No results found" : "No scraped data yet. Click 'Scrape All Approved Links' to start."}
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((item) => (
                    <tr key={item._id} className="border-t border-tron-border hover:bg-tron-bg-card transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-tron-text text-sm">{item.state}</td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-tron-text text-sm">{item.capital}</td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tron-blue hover:underline flex items-center gap-1 max-w-xs truncate text-sm"
                        >
                          {item.sourceUrl}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.scrapingStatus)}
                          <span className="text-tron-text capitalize text-sm">{item.scrapingStatus.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {getQualityBadge(item.dataQuality)}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-tron-gray text-xs sm:text-sm">
                        {new Date(item.scrapedAt).toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                        <div className="max-w-md">
                          {item.scrapedData ? (
                            <div className="text-tron-text text-xs sm:text-sm">
                              {typeof item.scrapedData === 'string' ? (
                                <p className="truncate">{item.scrapedData}</p>
                              ) : item.scrapedData.rawResponse ? (
                                <p className="truncate text-tron-gray">{item.scrapedData.rawResponse}</p>
                              ) : item.scrapedData.message ? (
                                <p className="text-tron-gray italic">{item.scrapedData.message}</p>
                              ) : (
                                <pre className="text-xs bg-tron-bg-card p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                                  {JSON.stringify(item.scrapedData, null, 2).substring(0, 200)}
                                  {JSON.stringify(item.scrapedData, null, 2).length > 200 && '...'}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <span className="text-tron-gray text-xs sm:text-sm italic">No data</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedRecord(item)}
                            className="text-tron-blue hover:text-tron-blue-light transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </TronPanel>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <TronPanel className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-tron-text">Scraped Data Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-tron-gray hover:text-tron-text"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-tron-gray mb-2">Source Information</h3>
                <div className="bg-tron-bg-card p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">State:</span> {selectedRecord.state}</p>
                  <p><span className="font-medium">City:</span> {selectedRecord.capital}</p>
                  <p><span className="font-medium">URL:</span> <a href={selectedRecord.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-tron-blue hover:underline">{selectedRecord.sourceUrl}</a></p>
                  <p><span className="font-medium">Scraped At:</span> {new Date(selectedRecord.scrapedAt).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span> {selectedRecord.scrapingStatus}</p>
                  {selectedRecord.dataQuality && <p><span className="font-medium">Quality:</span> {selectedRecord.dataQuality}</p>}
                  {selectedRecord.dataCompleteness && <p><span className="font-medium">Completeness:</span> {(selectedRecord.dataCompleteness * 100).toFixed(0)}%</p>}
                  {selectedRecord.errorMessage && (
                    <p className="text-red-400"><span className="font-medium">Error:</span> {selectedRecord.errorMessage}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-tron-gray mb-2">Scraped Data (JSON)</h3>
                <pre className="bg-tron-bg-card p-4 rounded-lg overflow-x-auto text-xs text-tron-text">
                  {JSON.stringify(selectedRecord.scrapedData, null, 2)}
                </pre>
              </div>
            </div>
          </TronPanel>
        </div>
      )}
    </div>
  );
}

