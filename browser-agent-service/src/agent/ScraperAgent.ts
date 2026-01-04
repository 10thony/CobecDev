import { BrowserManager } from '../browser/BrowserManager';
import { PageController } from '../browser/PageController';
import { ScreenshotCapture } from '../browser/ScreenshotCapture';
import { DOMExtractor } from '../browser/DOMExtractor';
import { VisionAnalyzer } from '../llm/VisionAnalyzer';
import { ActionExecutor } from './ActionExecutor';
import { StateManager } from './StateManager';
import { ErrorRecovery } from './ErrorRecovery';
import { ScrapeJob, ScrapeResult, AgentState, AgentError } from '../types/agent';
import { Opportunity, Interaction } from '../types/scraping';
import { config } from '../config';
import { PageAnalysis } from '../llm/schemas/PageAnalysis';
import { ExtractedData } from '../llm/schemas/ExtractedData';

/**
 * Main orchestrator that coordinates the scraping process
 */
export class ScraperAgent {
  private browserManager: BrowserManager;
  private visionAnalyzer: VisionAnalyzer;
  private state: AgentState = 'idle';
  private currentJob: ScrapeJob | null = null;
  private cancelled: boolean = false;
  private opportunities: Opportunity[] = [];
  private interactions: Interaction[] = [];
  private errors: AgentError[] = [];
  private pagesScraped: number = 0;
  private tokensUsed: number = 0;
  private startTime: number = 0;

  constructor(browserManager: BrowserManager, visionAnalyzer: VisionAnalyzer) {
    this.browserManager = browserManager;
    this.visionAnalyzer = visionAnalyzer;
  }

  /**
   * Main entry point for scraping
   */
  async scrape(job: ScrapeJob): Promise<ScrapeResult> {
    this.currentJob = job;
    this.state = 'navigating';
    this.cancelled = false;
    this.opportunities = [];
    this.interactions = [];
    this.errors = [];
    this.pagesScraped = 0;
    this.tokensUsed = 0;
    this.startTime = Date.now();

    let browser: any = null;
    let page: any = null;
    let pageController: PageController | null = null;
    let stateManager: StateManager | null = null;
    let errorRecovery: ErrorRecovery | null = null;

    try {
      // Initialize browser
      browser = await this.browserManager.acquire();
      page = await this.browserManager.createPage(browser);
      pageController = new PageController(page);
      const screenshotCapture = new ScreenshotCapture();
      const domExtractor = new DOMExtractor(page);
      const actionExecutor = new ActionExecutor(pageController);
      stateManager = new StateManager();
      errorRecovery = new ErrorRecovery(pageController, this.visionAnalyzer);

      // Navigate to initial URL
      const navResult = await pageController.navigate(job.url);
      if (!navResult.success) {
        throw new Error(`Failed to navigate to ${job.url}: ${navResult.error}`);
      }

      stateManager.markVisited(navResult.finalUrl);
      this.pagesScraped++;

      // Handle authentication if needed
      if (job.configuration.requiresAuth && job.configuration.authCredentials) {
        await this.handleAuthentication(pageController, job.configuration.authCredentials);
      }

      // Main scraping loop
      let actionsOnCurrentPage = 0;
      const maxPages = job.configuration.maxPages || config.scraping.maxPagesPerPortal;
      const maxActionsPerPage = config.scraping.maxActionsPerPage;

      while (this.pagesScraped < maxPages && !this.cancelled) {
        // Check action limit per page
        if (actionsOnCurrentPage >= maxActionsPerPage) {
          this.logInteraction('analyze', 'Maximum actions per page reached', 'partial');
          break;
        }

        this.state = 'analyzing';

        // Capture screenshot and HTML
        const screenshot = await screenshotCapture.captureViewport(page);
        const html = await domExtractor.getCleanedHTML(5000);

        // Analyze page
        const analysis = await this.visionAnalyzer.analyzePage(
          screenshot.base64,
          html,
          {
            currentUrl: pageController.getCurrentUrl(),
            pageNumber: this.pagesScraped,
            maxPages,
            opportunitiesFound: this.opportunities.length,
            goal: 'Extract all procurement opportunities',
          }
        );

        this.tokensUsed += 1000; // Approximate token usage

        // Handle special page types
        if (analysis.pageType === 'error' || analysis.pageType === 'captcha') {
          this.errors.push({
            type: analysis.pageType,
            message: analysis.notes || 'Error or CAPTCHA detected',
            recoverable: false,
            timestamp: Date.now(),
          });
          break;
        }

        if (analysis.pageType === 'login' && !job.configuration.requiresAuth) {
          this.errors.push({
            type: 'auth_required',
            message: 'Login required but no credentials provided',
            recoverable: false,
            timestamp: Date.now(),
          });
          break;
        }

        // Execute recommended action
        const action = analysis.recommendedAction;
        this.logInteraction(action.action, action.reason, 'success');

        if (action.action === 'extract') {
          this.state = 'extracting';
          const extracted = await this.extractOpportunities(
            screenshotCapture,
            domExtractor,
            pageController.getCurrentUrl()
          );
          this.opportunities.push(...extracted);
          actionsOnCurrentPage++;
        } else if (action.action === 'click') {
          this.state = 'clicking';
          const result = await actionExecutor.execute(action);
          if (result.success && result.stateChange?.urlChanged) {
            this.pagesScraped++;
            stateManager.markVisited(result.stateChange.newUrl || '');
            actionsOnCurrentPage = 0; // Reset for new page
          } else if (!result.success) {
            // Try error recovery
            const recoveryPlan = await errorRecovery.analyzeError(
              new Error(result.error || 'Action failed'),
              {
                url: pageController.getCurrentUrl(),
                action: action.action,
                step: stateManager.getCurrentStep(),
                previousActions: stateManager.getHistory().map(h => h.action),
              }
            );

            if (recoveryPlan.recoverable) {
              await errorRecovery.recover(recoveryPlan);
            } else {
              this.errors.push({
                type: 'action_failed',
                message: result.error || 'Action execution failed',
                recoverable: false,
                timestamp: Date.now(),
              });
              break;
            }
          }
          actionsOnCurrentPage++;
        } else if (action.action === 'scroll') {
          this.state = 'scrolling';
          await actionExecutor.execute(action);
          actionsOnCurrentPage++;
        } else if (action.action === 'done') {
          this.state = 'completed';
          break;
        } else if (action.action === 'error') {
          this.state = 'failed';
          this.errors.push({
            type: 'llm_error',
            message: action.reason,
            recoverable: false,
            timestamp: Date.now(),
          });
          break;
        }

        // Delay between actions
        await new Promise(resolve => setTimeout(resolve, config.scraping.delayBetweenActions));
      }

      // Release browser
      if (browser) {
        await this.browserManager.release(browser);
      }

      const duration = Date.now() - this.startTime;

      return {
        success: this.state === 'completed' || this.opportunities.length > 0,
        opportunities: this.opportunities,
        interactions: this.interactions,
        pagesScraped: this.pagesScraped,
        duration,
        tokensUsed: this.tokensUsed,
        errors: this.errors,
      };
    } catch (error) {
      // Cleanup on error
      if (browser) {
        try {
          await this.browserManager.release(browser);
        } catch {
          // Ignore cleanup errors
        }
      }

      this.state = 'failed';
      this.errors.push({
        type: 'scraping_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
        timestamp: Date.now(),
      });

      return {
        success: false,
        opportunities: this.opportunities,
        interactions: this.interactions,
        pagesScraped: this.pagesScraped,
        duration: Date.now() - this.startTime,
        tokensUsed: this.tokensUsed,
        errors: this.errors,
      };
    }
  }

  /**
   * Extract opportunities from current page
   */
  private async extractOpportunities(
    screenshotCapture: ScreenshotCapture,
    domExtractor: DOMExtractor,
    currentUrl: string
  ): Promise<Opportunity[]> {
    const screenshot = await screenshotCapture.captureViewport(this.browserManager as any);
    const html = await domExtractor.getCleanedHTML(5000);

    const extracted: ExtractedData = await this.visionAnalyzer.extractData(
      screenshot.base64,
      html,
      currentUrl
    );

    this.tokensUsed += 2000; // Approximate token usage

    // Convert to Opportunity format
    return extracted.opportunities.map(opp => ({
      title: opp.title,
      referenceNumber: opp.referenceNumber || undefined,
      opportunityType: opp.opportunityType || undefined,
      status: opp.status || undefined,
      postedDate: opp.postedDate || undefined,
      closingDate: opp.closingDate || undefined,
      description: opp.description || undefined,
      category: opp.category || undefined,
      department: opp.department || undefined,
      estimatedValue: opp.estimatedValue || undefined,
      contactName: opp.contactName || undefined,
      contactEmail: opp.contactEmail || undefined,
      contactPhone: opp.contactPhone || undefined,
      detailUrl: opp.detailUrl || undefined,
      documents: opp.documents || undefined,
      rawText: opp.rawText,
      confidence: opp.confidence,
      extractedAt: new Date().toISOString(),
    }));
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(
    pageController: PageController,
    credentials: { username?: string; password?: string }
  ): Promise<void> {
    // Simple authentication - in production, this would be more sophisticated
    if (credentials.username && credentials.password) {
      // Try to find and fill login form
      // This is a simplified version - production would use LLM to find form fields
      await pageController.waitForSelector('input[type="email"], input[name="username"], input[id*="user"]');
      // Fill username
      try {
        await pageController.fill('input[type="email"], input[name="username"], input[id*="user"]', credentials.username);
      } catch {
        // Try alternative selectors
      }
      // Fill password
      try {
        await pageController.fill('input[type="password"]', credentials.password);
      } catch {
        // Password field not found
      }
      // Submit
      try {
        await pageController.click({ selector: 'button[type="submit"], input[type="submit"]' });
        await pageController.waitForNavigation();
      } catch {
        // Submit button not found
      }
    }
  }

  /**
   * Log interaction
   */
  private logInteraction(
    action: string,
    description: string,
    result: 'success' | 'failure' | 'partial'
  ): void {
    this.interactions.push({
      step: this.interactions.length + 1,
      timestamp: new Date().toISOString(),
      action: action as any,
      description,
      result,
      duration: 0, // Would be calculated in production
    });
  }

  /**
   * Cancel a running job
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Get current status
   */
  getStatus(): {
    state: AgentState;
    jobId: string | null;
    pagesScraped: number;
    opportunitiesFound: number;
    errors: number;
  } {
    return {
      state: this.state,
      jobId: this.currentJob?.jobId || null,
      pagesScraped: this.pagesScraped,
      opportunitiesFound: this.opportunities.length,
      errors: this.errors.length,
    };
  }
}

