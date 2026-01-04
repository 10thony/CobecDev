/**
 * Hook for scraping San Antonio bidding and contract opportunities table
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { scrapeSanAntonioTable, SanAntonioScrapeResult } from '../services/sanAntonioScraper';
import { MCPBrowserAdapter } from '../services/mcpBrowserAdapter';

export interface SanAntonioScrapingProgress {
  status: 'idle' | 'navigating' | 'scraping' | 'completed' | 'error' | 'cancelled';
  currentStep: string;
  opportunitiesFound: number;
  pagesScraped: number;
  errors: string[];
  warnings: string[];
  startTime?: number;
  endTime?: number;
}

interface UseSanAntonioScraperOptions {
  maxPages?: number;
  pageLoadWait?: number;
}

export function useSanAntonioScraper(options: UseSanAntonioScraperOptions = {}) {
  const {
    maxPages = 10,
    pageLoadWait = 3,
  } = options;
  
  const [progress, setProgress] = useState<SanAntonioScrapingProgress>({
    status: 'idle',
    currentStep: '',
    opportunitiesFound: 0,
    pagesScraped: 0,
    errors: [],
    warnings: [],
  });
  
  const cancelledRef = useRef(false);
  
  // Convex mutations
  const createSession = useMutation(api.procurementScraperV2Mutations.createBrowserScrapingSession);
  const updateSession = useMutation(api.procurementScraperV2Mutations.updateBrowserScrapingSession);
  const saveOpportunity = useMutation(api.procurementScraperV2Mutations.saveOpportunity);
  
  const updateProgress = useCallback((updates: Partial<SanAntonioScrapingProgress>) => {
    setProgress((prev) => ({ ...prev, ...updates }));
  }, []);
  
  const scrape = useCallback(async (
    browser: MCPBrowserAdapter,
    url: string,
    state: string,
    capital: string,
    procurementLinkId?: Id<"procurementUrls">
  ): Promise<SanAntonioScrapeResult> => {
    const startTime = Date.now();
    cancelledRef.current = false;
    
    updateProgress({
      status: 'navigating',
      currentStep: 'Navigating to San Antonio procurement page...',
      opportunitiesFound: 0,
      pagesScraped: 0,
      errors: [],
      warnings: [],
      startTime,
    });
    
    // Create session in database
    const scrapedDataId = await createSession({
      url,
      state,
      capital,
      procurementLinkId,
    });
    
    try {
      // Run the San Antonio scraper
      updateProgress({
        status: 'scraping',
        currentStep: 'Extracting table data...',
      });
      
      const result = await scrapeSanAntonioTable(
        browser,
        url,
        maxPages,
        state,
        capital,
        scrapedDataId
      );
      
      // Save opportunities to database
      if (result.success && result.opportunities.length > 0) {
        updateProgress({
          currentStep: `Saving ${result.opportunities.length} opportunities...`,
        });
        
        for (const opp of result.opportunities) {
          if (cancelledRef.current) break;
          
          try {
            await saveOpportunity({
              scrapedDataId,
              sourceUrl: url,
              state,
              capital,
              title: opp.description,
              referenceNumber: opp.bidNumber,
              opportunityType: opp.type,
              department: opp.department,
              postedDate: opp.releaseDate,
              closingDate: opp.solicitationDeadline,
              shortDescription: opp.description,
              confidence: 0.9, // High confidence since we're extracting from structured table
            });
          } catch (error) {
            console.error('Failed to save opportunity:', error);
          }
        }
      }
      
      const endTime = Date.now();
      
      updateProgress({
        status: result.success ? 'completed' : 'error',
        currentStep: result.success 
          ? `Successfully scraped ${result.opportunities.length} opportunities`
          : `Error: ${result.errors.join(', ')}`,
        opportunitiesFound: result.opportunities.length,
        pagesScraped: result.pagesScraped,
        errors: result.errors,
        endTime,
      });
      
      await updateSession({
        recordId: scrapedDataId,
        status: result.success ? 'completed' : 'failed',
        opportunityCount: result.opportunities.length,
        scrapedData: {
          totalOpportunities: result.opportunities.length,
          pagesProcessed: result.pagesScraped,
          errors: result.errors,
          duration: result.duration,
        },
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = String(error);
      const endTime = Date.now();
      
      updateProgress({
        status: 'error',
        currentStep: `Error: ${errorMessage}`,
        errors: [errorMessage],
        endTime,
      });
      
      return {
        success: false,
        opportunities: [],
        pagesScraped: 0,
        errors: [errorMessage],
        duration: endTime - startTime,
      };
    }
  }, [createSession, updateSession, saveOpportunity, updateProgress, maxPages]);
  
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    updateProgress({
      status: 'cancelled',
      currentStep: 'Cancelling...',
    });
  }, [updateProgress]);
  
  const reset = useCallback(() => {
    cancelledRef.current = false;
    setProgress({
      status: 'idle',
      currentStep: '',
      opportunitiesFound: 0,
      pagesScraped: 0,
      errors: [],
      warnings: [],
    });
  }, []);
  
  return {
    progress,
    scrape,
    cancel,
    reset,
    isActive: ['navigating', 'scraping'].includes(progress.status),
  };
}


