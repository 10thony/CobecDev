import { useState, useCallback, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { 
  analyzeListPage, 
  extractOpportunityDetails,
  PageAnalysisResult,
  IdentifiedOpportunity,
} from '../services/pageAnalyzer';
import { MCPBrowserAdapter } from '../services/mcpBrowserAdapter';

// ============================================================================
// TYPES
// ============================================================================

export interface ScrapingProgress {
  status: 'idle' | 'initializing' | 'navigating' | 'analyzing' | 'scraping' | 'paginating' | 'completed' | 'error' | 'cancelled';
  currentStep: string;
  opportunitiesFound: number;
  opportunitiesScraped: number;
  pagesProcessed: number;
  errors: string[];
  warnings: string[];
  startTime?: number;
  endTime?: number;
}

export interface ScrapingResult {
  success: boolean;
  scrapedDataId: Id<"scrapedProcurementData">;
  opportunityCount: number;
  errors: string[];
  duration: number;
}

interface UseScraperOptions {
  maxOpportunities?: number; // Limit opportunities per session (default: 50)
  maxPages?: number; // Limit pages to scrape (default: 10)
  pageLoadWait?: number; // Seconds to wait for page load (default: 3)
  detailPageWait?: number; // Seconds to wait for detail page (default: 2)
  retryOnError?: boolean; // Retry failed opportunity scrapes (default: true)
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBrowserScraper(options: UseScraperOptions = {}) {
  const {
    maxOpportunities = 50,
    maxPages = 10,
    pageLoadWait = 3,
    detailPageWait = 2,
    retryOnError = true,
  } = options;
  
  // State
  const [progress, setProgress] = useState<ScrapingProgress>({
    status: 'idle',
    currentStep: '',
    opportunitiesFound: 0,
    opportunitiesScraped: 0,
    pagesProcessed: 0,
    errors: [],
    warnings: [],
  });
  
  // Cancellation flag
  const cancelledRef = useRef(false);
  
  // Convex mutations
  const createSession = useMutation(api.procurementScraperV2Mutations.createBrowserScrapingSession);
  const updateSession = useMutation(api.procurementScraperV2Mutations.updateBrowserScrapingSession);
  const saveOpportunity = useMutation(api.procurementScraperV2Mutations.saveOpportunity);
  const logInteraction = useMutation(api.procurementScraperV2Mutations.logInteraction);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Log an interaction
  // ──────────────────────────────────────────────────────────────────────────
  const log = useCallback(async (
    scrapedDataId: Id<"scrapedProcurementData">,
    action: string,
    description: string,
    success: boolean,
    extra?: { selector?: string; errorMessage?: string; pageUrl?: string; aiAnalysis?: string }
  ) => {
    try {
      await logInteraction({
        scrapedDataId,
        action,
        description,
        success,
        ...extra,
      });
    } catch (e) {
      console.error('Failed to log interaction:', e);
    }
  }, [logInteraction]);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Update progress
  // ──────────────────────────────────────────────────────────────────────────
  const updateProgress = useCallback((updates: Partial<ScrapingProgress>) => {
    setProgress((prev) => ({ ...prev, ...updates }));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Handle blockers (cookie banners, modals)
  // ──────────────────────────────────────────────────────────────────────────
  const handleBlockers = useCallback(async (
    browser: MCPBrowserAdapter,
    analysis: PageAnalysisResult,
    scrapedDataId: Id<"scrapedProcurementData">
  ): Promise<boolean> => {
    for (const blocker of analysis.blockers) {
      if (blocker.type === 'login-required') {
        updateProgress({
          status: 'error',
          errors: ['This site requires login. Cannot proceed.'],
        });
        return false;
      }
      
      if (blocker.type === 'captcha') {
        updateProgress((prev) => ({
          warnings: [...prev.warnings, 'CAPTCHA detected. May need manual intervention.'],
        }));
        continue;
      }
      
      if (blocker.ref) {
        try {
          await browser.click(blocker.ref, blocker.description);
          await log(scrapedDataId, 'click', `Dismissed blocker: ${blocker.description}`, true, {
            selector: blocker.ref,
          });
          await browser.waitFor({ time: 1 });
        } catch (e) {
          await log(scrapedDataId, 'click', `Failed to dismiss blocker: ${blocker.description}`, false, {
            selector: blocker.ref,
            errorMessage: String(e),
          });
        }
      }
    }
    return true;
  }, [log, updateProgress]);

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER: Scrape a single opportunity
  // ──────────────────────────────────────────────────────────────────────────
  const scrapeOpportunity = useCallback(async (
    browser: MCPBrowserAdapter,
    opportunity: IdentifiedOpportunity,
    context: { url: string; state: string; capital: string; scrapedDataId: Id<"scrapedProcurementData"> }
  ): Promise<boolean> => {
    const { url, state, capital, scrapedDataId } = context;
    
    try {
      updateProgress({ currentStep: `Scraping: ${opportunity.title}` });
      
      // Click on the opportunity
      await browser.click(opportunity.ref, `Open opportunity: ${opportunity.title}`);
      await log(scrapedDataId, 'click', `Clicked opportunity: ${opportunity.title}`, true, {
        selector: opportunity.ref,
        pageUrl: url,
      });
      
      // Wait for detail page to load
      await browser.waitFor({ time: detailPageWait });
      
      // Get detail page snapshot
      const detailSnapshot = await browser.snapshot();
      await log(scrapedDataId, 'snapshot', 'Captured detail page snapshot', true, {
        snapshotPreview: detailSnapshot.substring(0, 500),
      });
      
      // Extract opportunity data
      const opportunityData = await extractOpportunityDetails(detailSnapshot, {
        url,
        expectedTitle: opportunity.title,
      });
      await log(scrapedDataId, 'extract', `Extracted data for: ${opportunity.title}`, true, {
        aiAnalysis: `Confidence: ${opportunityData.confidence}`,
      });
      
      // Save to database
      await saveOpportunity({
        scrapedDataId,
        sourceUrl: url,
        state,
        capital,
        ...opportunityData,
      });
      
      // Navigate back to list
      await browser.navigateBack();
      await browser.waitFor({ time: 1 });
      
      return true;
      
    } catch (error) {
      await log(scrapedDataId, 'error', `Failed to scrape: ${opportunity.title}`, false, {
        errorMessage: String(error),
      });
      
      // Try to recover by navigating back
      try {
        await browser.navigateBack();
        await browser.waitFor({ time: 1 });
      } catch {
        // If back doesn't work, we'll need to re-navigate in the main loop
      }
      
      return false;
    }
  }, [detailPageWait, log, saveOpportunity, updateProgress]);

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN: Scrape URL
  // ──────────────────────────────────────────────────────────────────────────
  const scrapeUrl = useCallback(async (
    browser: MCPBrowserAdapter,
    url: string,
    state: string,
    capital: string,
    procurementLinkId?: Id<"procurementUrls">
  ): Promise<ScrapingResult> => {
    const startTime = Date.now();
    cancelledRef.current = false;
    
    // Initialize
    updateProgress({
      status: 'initializing',
      currentStep: 'Creating scraping session...',
      opportunitiesFound: 0,
      opportunitiesScraped: 0,
      pagesProcessed: 0,
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
    
    let totalScraped = 0;
    const errors: string[] = [];
    
    try {
      // ────────────────────────────────────────────────────────────────────
      // STEP 1: Navigate to procurement URL
      // ────────────────────────────────────────────────────────────────────
      updateProgress({ status: 'navigating', currentStep: 'Navigating to procurement page...' });
      
      await browser.navigate(url);
      await log(scrapedDataId, 'navigate', `Navigated to: ${url}`, true, { pageUrl: url });
      
      await browser.waitFor({ time: pageLoadWait });
      
      if (cancelledRef.current) throw new Error('Cancelled by user');
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 2: Analyze page and handle blockers
      // ────────────────────────────────────────────────────────────────────
      updateProgress({ status: 'analyzing', currentStep: 'Analyzing page structure...' });
      
      let snapshot = await browser.snapshot();
      await log(scrapedDataId, 'snapshot', 'Captured initial page snapshot', true, {
        pageUrl: url,
        snapshotPreview: snapshot.substring(0, 500),
      });
      
      let analysis = await analyzeListPage(snapshot, { url, state, capital });
      await log(scrapedDataId, 'analyze', `Page type: ${analysis.pageType}, Found ${analysis.opportunities.length} opportunities`, true, {
        aiAnalysis: analysis.reasoning,
      });
      
      // Handle any blockers
      if (analysis.blockers.length > 0) {
        const canContinue = await handleBlockers(browser, analysis, scrapedDataId);
        if (!canContinue) {
          throw new Error('Cannot proceed due to blockers');
        }
        
        // Re-analyze after handling blockers
        snapshot = await browser.snapshot();
        analysis = await analyzeListPage(snapshot, { url, state, capital });
      }
      
      // Check page type
      if (analysis.pageType === 'login') {
        throw new Error('Page requires login');
      }
      if (analysis.pageType === 'error') {
        throw new Error('Page shows an error');
      }
      if (analysis.pageType === 'empty' || analysis.opportunities.length === 0) {
        updateProgress({
          status: 'completed',
          currentStep: 'No opportunities found on this page',
          endTime: Date.now(),
        });
        await updateSession({
          recordId: scrapedDataId,
          status: 'completed',
          opportunityCount: 0,
        });
        return {
          success: true,
          scrapedDataId,
          opportunityCount: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 3: Scrape opportunities (with pagination)
      // ────────────────────────────────────────────────────────────────────
      let pagesProcessed = 0;
      
      updateProgress({
        status: 'scraping',
        opportunitiesFound: analysis.opportunities.length,
        currentStep: `Found ${analysis.opportunities.length} opportunities on page 1`,
      });
      
      // Process current page
      while (pagesProcessed < maxPages && totalScraped < maxOpportunities) {
        if (cancelledRef.current) throw new Error('Cancelled by user');
        
        pagesProcessed++;
        updateProgress({ pagesProcessed });
        
        // Scrape each opportunity on current page
        for (let i = 0; i < analysis.opportunities.length && totalScraped < maxOpportunities; i++) {
          if (cancelledRef.current) throw new Error('Cancelled by user');
          
          const opportunity = analysis.opportunities[i];
          const success = await scrapeOpportunity(browser, opportunity, {
            url,
            state,
            capital,
            scrapedDataId,
          });
          
          if (success) {
            totalScraped++;
            updateProgress({ opportunitiesScraped: totalScraped });
          } else if (retryOnError) {
            // Retry once
            const retrySuccess = await scrapeOpportunity(browser, opportunity, {
              url,
              state,
              capital,
              scrapedDataId,
            });
            if (retrySuccess) {
              totalScraped++;
              updateProgress({ opportunitiesScraped: totalScraped });
            } else {
              errors.push(`Failed to scrape: ${opportunity.title}`);
              updateProgress((prev) => ({ errors: [...prev.errors, `Failed to scrape: ${opportunity.title}`] }));
            }
          } else {
            errors.push(`Failed to scrape: ${opportunity.title}`);
            updateProgress((prev) => ({ errors: [...prev.errors, `Failed to scrape: ${opportunity.title}`] }));
          }
          
          // Re-snapshot after returning to list (page may have changed)
          snapshot = await browser.snapshot();
          analysis = await analyzeListPage(snapshot, { url, state, capital });
        }
        
        // Check for next page
        if (analysis.pagination?.hasNextPage && analysis.pagination.nextPageRef) {
          updateProgress({
            status: 'paginating',
            currentStep: `Loading page ${pagesProcessed + 1}...`,
          });
          
          await browser.click(analysis.pagination.nextPageRef, 'Go to next page');
          await log(scrapedDataId, 'click', `Navigated to page ${pagesProcessed + 1}`, true, {
            selector: analysis.pagination.nextPageRef,
          });
          
          await browser.waitFor({ time: pageLoadWait });
          
          // Analyze new page
          snapshot = await browser.snapshot();
          analysis = await analyzeListPage(snapshot, { url, state, capital });
          
          updateProgress((prev) => ({
            status: 'scraping',
            opportunitiesFound: prev.opportunitiesFound + analysis.opportunities.length,
            currentStep: `Found ${analysis.opportunities.length} more opportunities on page ${pagesProcessed + 1}`,
          }));
        } else {
          // No more pages
          break;
        }
      }
      
      // ────────────────────────────────────────────────────────────────────
      // STEP 4: Complete
      // ────────────────────────────────────────────────────────────────────
      const endTime = Date.now();
      
      updateProgress({
        status: 'completed',
        currentStep: `Successfully scraped ${totalScraped} opportunities`,
        endTime,
      });
      
      await updateSession({
        recordId: scrapedDataId,
        status: 'completed',
        opportunityCount: totalScraped,
        scrapedData: {
          totalOpportunities: totalScraped,
          pagesProcessed,
          errors,
          duration: endTime - startTime,
        },
      });
      
      return {
        success: true,
        scrapedDataId,
        opportunityCount: totalScraped,
        errors,
        duration: endTime - startTime,
      };
      
    } catch (error) {
      const errorMessage = String(error);
      const endTime = Date.now();
      
      errors.push(errorMessage);
      
      updateProgress({
        status: 'error',
        currentStep: `Error: ${errorMessage}`,
        errors,
        endTime,
      });
      
      await updateSession({
        recordId: scrapedDataId,
        status: 'failed',
        errorMessage,
        opportunityCount: totalScraped,
      });
      
      return {
        success: false,
        scrapedDataId,
        opportunityCount: totalScraped,
        errors,
        duration: endTime - startTime,
      };
    }
  }, [
    createSession,
    updateSession,
    saveOpportunity,
    log,
    handleBlockers,
    scrapeOpportunity,
    updateProgress,
    maxOpportunities,
    maxPages,
    pageLoadWait,
    retryOnError,
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ──────────────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    updateProgress({
      status: 'cancelled',
      currentStep: 'Cancelling...',
    });
  }, [updateProgress]);

  // ──────────────────────────────────────────────────────────────────────────
  // RESET
  // ──────────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cancelledRef.current = false;
    setProgress({
      status: 'idle',
      currentStep: '',
      opportunitiesFound: 0,
      opportunitiesScraped: 0,
      pagesProcessed: 0,
      errors: [],
      warnings: [],
    });
  }, []);

  return {
    progress,
    scrapeUrl,
    cancel,
    reset,
    isActive: ['initializing', 'navigating', 'analyzing', 'scraping', 'paginating'].includes(progress.status),
  };
}

