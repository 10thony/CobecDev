import { PageController, ClickTarget } from '../browser/PageController';
import { ActionPlan } from '../llm/schemas/ActionPlan';
import { config } from '../config';

export interface ActionResult {
  success: boolean;
  action: ActionPlan;
  duration: number;
  error?: string;
  stateChange?: {
    urlChanged: boolean;
    newUrl?: string;
    contentChanged: boolean;
  };
}

export interface VerificationCriteria {
  urlChanged?: boolean;
  contentAppeared?: string;
  selectorAppeared?: string;
}

/**
 * Executes action plans from the LLM
 */
export class ActionExecutor {
  private pageController: PageController;

  constructor(pageController: PageController) {
    this.pageController = pageController;
  }

  /**
   * Execute a single action
   */
  async execute(action: ActionPlan): Promise<ActionResult> {
    const startTime = Date.now();
    const initialUrl = this.pageController.getCurrentUrl();

    try {
      switch (action.action) {
        case 'click':
          if (!action.target) {
            throw new Error('Click action requires a target');
          }
          const clickResult = await this.pageController.click({
            selector: action.target.selector,
            coordinates: action.target.coordinates,
            description: action.target.description,
          });
          return {
            success: clickResult.success,
            action,
            duration: Date.now() - startTime,
            error: clickResult.error,
            stateChange: {
              urlChanged: clickResult.urlChanged,
              newUrl: clickResult.newUrl,
              contentChanged: clickResult.urlChanged, // Assume content changed if URL changed
            },
          };

        case 'scroll':
          if (!action.target?.description) {
            throw new Error('Scroll action requires direction');
          }
          const direction = action.target.description.toLowerCase().includes('up') ? 'up' : 'down';
          const amount = action.target.coordinates?.y || 500;
          await this.pageController.scroll(direction, amount);
          return {
            success: true,
            action,
            duration: Date.now() - startTime,
            stateChange: {
              urlChanged: false,
              contentChanged: true, // Scrolling may reveal new content
            },
          };

        case 'navigate':
          if (!action.value) {
            throw new Error('Navigate action requires a URL');
          }
          const navResult = await this.pageController.navigate(action.value);
          return {
            success: navResult.success,
            action,
            duration: Date.now() - startTime,
            error: navResult.error,
            stateChange: {
              urlChanged: navResult.finalUrl !== initialUrl,
              newUrl: navResult.finalUrl,
              contentChanged: navResult.success,
            },
          };

        case 'fill':
          if (!action.target?.selector || !action.value) {
            throw new Error('Fill action requires selector and value');
          }
          await this.pageController.fill(action.target.selector, action.value);
          return {
            success: true,
            action,
            duration: Date.now() - startTime,
            stateChange: {
              urlChanged: false,
              contentChanged: false,
            },
          };

        case 'wait':
          const waitTime = parseInt(action.value || '1000', 10);
          await this.pageController.waitForNetworkIdle(waitTime);
          return {
            success: true,
            action,
            duration: Date.now() - startTime,
            stateChange: {
              urlChanged: false,
              contentChanged: false,
            },
          };

        case 'extract':
        case 'done':
        case 'error':
          // These are state indicators, not executable actions
          return {
            success: true,
            action,
            duration: Date.now() - startTime,
            stateChange: {
              urlChanged: false,
              contentChanged: false,
            },
          };

        default:
          throw new Error(`Unknown action type: ${(action as any).action}`);
      }
    } catch (error) {
      return {
        success: false,
        action,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stateChange: {
          urlChanged: false,
          contentChanged: false,
        },
      };
    }
  }

  /**
   * Execute with verification
   */
  async executeAndVerify(
    action: ActionPlan,
    verification: VerificationCriteria
  ): Promise<ActionResult> {
    const result = await this.execute(action);

    if (!result.success) {
      return result;
    }

    // Verify the action succeeded
    if (verification.urlChanged !== undefined) {
      const urlChanged = result.stateChange?.urlChanged || false;
      if (verification.urlChanged !== urlChanged) {
        return {
          ...result,
          success: false,
          error: `Expected URL change: ${verification.urlChanged}, got: ${urlChanged}`,
        };
      }
    }

    if (verification.contentAppeared) {
      const appeared = await this.pageController.waitForContent(verification.contentAppeared);
      if (!appeared) {
        return {
          ...result,
          success: false,
          error: `Expected content "${verification.contentAppeared}" did not appear`,
        };
      }
    }

    if (verification.selectorAppeared) {
      const appeared = await this.pageController.waitForSelector(verification.selectorAppeared);
      if (!appeared) {
        return {
          ...result,
          success: false,
          error: `Expected selector "${verification.selectorAppeared}" did not appear`,
        };
      }
    }

    return result;
  }
}

