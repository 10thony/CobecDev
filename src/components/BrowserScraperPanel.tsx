import React, { useState } from 'react';
import { useBrowserScraper, ScrapingProgress } from '../hooks/useBrowserScraper';
import { useSanAntonioScraper, SanAntonioScrapingProgress } from '../hooks/useSanAntonioScraper';
import { createMCPBrowserAdapter } from '../services/mcpBrowserAdapter';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface BrowserScraperPanelProps {
  url: string;
  state: string;
  capital: string;
  procurementLinkId?: Id<"procurementUrls">;
  onComplete?: (result: any) => void;
}

export function BrowserScraperPanel({
  url,
  state,
  capital,
  procurementLinkId,
  onComplete,
}: BrowserScraperPanelProps) {
  // Detect if this is a San Antonio URL - use table scraper
  const isSanAntonio = url.includes('sanantonio.gov') && url.includes('BidContractOpps');
  
  const browserScraper = useBrowserScraper({
    maxOpportunities: 50,
    maxPages: 10,
  });
  
  const sanAntonioScraper = useSanAntonioScraper({
    maxPages: 10,
  });
  
  // Use appropriate scraper based on URL
  const sanAntonioProgress: SanAntonioScrapingProgress = sanAntonioScraper.progress;
  const browserProgress: ScrapingProgress = browserScraper.progress;
  const progress: ScrapingProgress | SanAntonioScrapingProgress = isSanAntonio ? sanAntonioProgress : browserProgress;
  const isActive = isSanAntonio ? sanAntonioScraper.isActive : browserScraper.isActive;
  const cancel = isSanAntonio ? sanAntonioScraper.cancel : browserScraper.cancel;
  const reset = isSanAntonio ? sanAntonioScraper.reset : browserScraper.reset;
  
  const [showDetails, setShowDetails] = useState(false);

  const handleStart = async () => {
    const browser = createMCPBrowserAdapter();
    
    if (isSanAntonio) {
      // Use San Antonio table scraper
      const result = await sanAntonioScraper.scrape(browser, url, state, capital, procurementLinkId);
      if (onComplete) {
        onComplete(result);
      }
    } else {
      // Use general browser scraper
      const result = await browserScraper.scrapeUrl(browser, url, state, capital, procurementLinkId);
      if (onComplete) {
        onComplete(result);
      }
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'idle':
        return <FileText className="w-5 h-5 text-gray-400" />;
      default:
        return <RefreshCw className="w-5 h-5 text-tron-cyan animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-400';
      case 'error':
      case 'cancelled':
        return 'text-red-400';
      case 'idle':
        return 'text-gray-400';
      default:
        return 'text-tron-cyan';
    }
  };

  const getDuration = () => {
    if (!progress.startTime) return null;
    const end = progress.endTime || Date.now();
    const seconds = Math.floor((end - progress.startTime) / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-tron-cyan/30 rounded-lg bg-tron-bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-tron-cyan/20">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-tron-text">
              {isSanAntonio ? 'San Antonio Table Scraper' : 'Browser Scraper'}
            </h3>
            <p className="text-sm text-gray-400 truncate max-w-md">{url}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {progress.status === 'idle' && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-4 py-2 bg-tron-cyan text-black rounded-lg hover:bg-tron-cyan/80 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Scraping
            </button>
          )}
          
          {isActive && (
            <button
              onClick={cancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
          
          {(progress.status === 'completed' || progress.status === 'error' || progress.status === 'cancelled') && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {progress.status !== 'idle' && (
        <div className="p-4 space-y-4">
          {/* Current Step */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${getStatusColor()}`}>
              {progress.currentStep || 'Initializing...'}
            </span>
            {getDuration() && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {getDuration()}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.opportunitiesFound > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>
                  {isSanAntonio
                    ? sanAntonioProgress.opportunitiesFound 
                    : browserProgress.opportunitiesScraped
                  } / {progress.opportunitiesFound}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-tron-cyan h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(
                      isSanAntonio
                        ? sanAntonioProgress.opportunitiesFound 
                        : browserProgress.opportunitiesScraped
                    ) / progress.opportunitiesFound * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-tron-cyan">
                {progress.opportunitiesFound}
              </div>
              <div className="text-xs text-gray-400">Found</div>
            </div>
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">
                {isSanAntonio
                  ? sanAntonioProgress.opportunitiesFound 
                  : browserProgress.opportunitiesScraped
                }
              </div>
              <div className="text-xs text-gray-400">Scraped</div>
            </div>
            <div className="bg-tron-bg/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">
                {isSanAntonio
                  ? sanAntonioProgress.pagesScraped
                  : browserProgress.pagesProcessed
                }
              </div>
              <div className="text-xs text-gray-400">Pages</div>
            </div>
          </div>

          {/* Errors/Warnings */}
          {(progress.errors.length > 0 || progress.warnings.length > 0) && (
            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {progress.errors.length} errors, {progress.warnings.length} warnings
              </button>
              
              {showDetails && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {progress.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {progress.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

