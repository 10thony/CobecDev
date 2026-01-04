import { PageController } from '../browser/PageController';
import { VisionAnalyzer } from '../llm/VisionAnalyzer';
import { ActionPlan } from '../llm/schemas/ActionPlan';

export interface ErrorContext {
  url: string;
  action: string;
  step: number;
  previousActions: string[];
}

export interface RecoveryPlan {
  recoverable: boolean;
  strategy: "retry" | "navigate_back" | "refresh" | "skip" | "abort";
  actions: ActionPlan[];
  reason: string;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  error?: string;
}

type ErrorType =
  | "navigation_timeout"
  | "element_not_found"
  | "page_crash"
  | "captcha_detected"
  | "auth_required"
  | "rate_limited"
  | "content_not_loaded"
  | "unexpected_state";

/**
 * Handles errors and attempts recovery
 */
export class ErrorRecovery {
  private pageController: PageController;
  private visionAnalyzer: VisionAnalyzer;
  private retryCount: Map<string, number> = new Map();

  constructor(pageController: PageController, visionAnalyzer: VisionAnalyzer) {
    this.pageController = pageController;
    this.visionAnalyzer = visionAnalyzer;
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('navigation')) {
      return 'navigation_timeout';
    }
    if (message.includes('not found') || message.includes('selector')) {
      return 'element_not_found';
    }
    if (message.includes('crash') || message.includes('disconnected')) {
      return 'page_crash';
    }
    if (message.includes('captcha')) {
      return 'captcha_detected';
    }
    if (message.includes('auth') || message.includes('login')) {
      return 'auth_required';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limited';
    }
    if (message.includes('content') || message.includes('load')) {
      return 'content_not_loaded';
    }

    return 'unexpected_state';
  }

  /**
   * Analyze error and get recovery plan
   */
  async analyzeError(
    error: Error,
    context: ErrorContext
  ): Promise<RecoveryPlan> {
    const errorType = this.classifyError(error);
    const errorKey = `${errorType}-${context.url}`;
    const retryCount = this.retryCount.get(errorKey) || 0;

    // Maximum 3 recovery attempts
    if (retryCount >= 3) {
      return {
        recoverable: false,
        strategy: 'abort',
        actions: [],
        reason: `Maximum retry attempts (3) reached for ${errorType}`,
      };
    }

    this.retryCount.set(errorKey, retryCount + 1);

    switch (errorType) {
      case 'navigation_timeout':
        return {
          recoverable: true,
          strategy: 'retry',
          actions: [
            {
              action: 'wait',
              target: null,
              value: '5000',
              reason: 'Wait longer for page to load',
              expectedOutcome: 'Page loads successfully',
            },
          ],
          reason: 'Navigation timeout - will retry with longer wait',
        };

      case 'element_not_found':
        return {
          recoverable: true,
          strategy: 'refresh',
          actions: [
            {
              action: 'navigate',
              target: null,
              value: context.url,
              reason: 'Refresh page to reload elements',
              expectedOutcome: 'Page reloads with elements visible',
            },
          ],
          reason: 'Element not found - will refresh page',
        };

      case 'page_crash':
        return {
          recoverable: true,
          strategy: 'navigate_back',
          actions: [
            {
              action: 'navigate',
              target: null,
              value: context.previousActions[context.previousActions.length - 1] || context.url,
              reason: 'Navigate back after page crash',
              expectedOutcome: 'Return to previous page',
            },
          ],
          reason: 'Page crashed - will navigate back',
        };

      case 'captcha_detected':
        return {
          recoverable: false,
          strategy: 'abort',
          actions: [],
          reason: 'CAPTCHA detected - cannot proceed automatically',
        };

      case 'auth_required':
        return {
          recoverable: false,
          strategy: 'abort',
          actions: [],
          reason: 'Authentication required - credentials may be needed',
        };

      case 'rate_limited':
        return {
          recoverable: true,
          strategy: 'retry',
          actions: [
            {
              action: 'wait',
              target: null,
              value: '10000',
              reason: 'Wait before retrying due to rate limit',
              expectedOutcome: 'Rate limit expires',
            },
          ],
          reason: 'Rate limited - will wait and retry',
        };

      case 'content_not_loaded':
        return {
          recoverable: true,
          strategy: 'retry',
          actions: [
            {
              action: 'wait',
              target: null,
              value: '3000',
              reason: 'Wait for content to load',
              expectedOutcome: 'Content appears on page',
            },
          ],
          reason: 'Content not loaded - will wait and retry',
        };

      default:
        return {
          recoverable: true,
          strategy: 'skip',
          actions: [],
          reason: `Unexpected error: ${error.message} - will skip this step`,
        };
    }
  }

  /**
   * Execute recovery
   */
  async recover(plan: RecoveryPlan): Promise<RecoveryResult> {
    if (!plan.recoverable) {
      return {
        success: false,
        strategy: plan.strategy,
        error: plan.reason,
      };
    }

    try {
      switch (plan.strategy) {
        case 'retry':
          // Wait actions are handled by ActionExecutor
          return {
            success: true,
            strategy: plan.strategy,
          };

        case 'refresh':
          await this.pageController.reload();
          return {
            success: true,
            strategy: plan.strategy,
          };

        case 'navigate_back':
          await this.pageController.goBack();
          return {
            success: true,
            strategy: plan.strategy,
          };

        case 'skip':
          return {
            success: true,
            strategy: plan.strategy,
          };

        default:
          return {
            success: false,
            strategy: plan.strategy,
            error: `Unknown recovery strategy: ${plan.strategy}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        strategy: plan.strategy,
        error: error instanceof Error ? error.message : 'Unknown recovery error',
      };
    }
  }

  /**
   * Reset retry counts
   */
  reset(): void {
    this.retryCount.clear();
  }
}

