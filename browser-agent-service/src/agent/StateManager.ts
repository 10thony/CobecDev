/**
 * Tracks agent state (visited pages, etc.)
 */
export class StateManager {
  private visitedUrls: Set<string> = new Set();
  private actionHistory: Array<{
    step: number;
    action: string;
    url: string;
    timestamp: number;
  }> = [];
  private stepCounter: number = 0;

  /**
   * Check if URL has been visited
   */
  hasVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  /**
   * Mark URL as visited
   */
  markVisited(url: string): void {
    this.visitedUrls.add(url);
  }

  /**
   * Add action to history
   */
  addAction(action: string, url: string): void {
    this.stepCounter++;
    this.actionHistory.push({
      step: this.stepCounter,
      action,
      url,
      timestamp: Date.now(),
    });
  }

  /**
   * Get action history
   */
  getHistory(): Array<{
    step: number;
    action: string;
    url: string;
    timestamp: number;
  }> {
    return [...this.actionHistory];
  }

  /**
   * Get current step number
   */
  getCurrentStep(): number {
    return this.stepCounter;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.visitedUrls.clear();
    this.actionHistory = [];
    this.stepCounter = 0;
  }

  /**
   * Get visited URLs count
   */
  getVisitedCount(): number {
    return this.visitedUrls.size;
  }
}

