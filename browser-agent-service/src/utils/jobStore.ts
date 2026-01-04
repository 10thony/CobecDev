import { ScraperAgent } from '../agent/ScraperAgent';
import { ScrapeResult } from '../types/agent';

interface Job {
  jobId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  agent: ScraperAgent;
  createdAt: number;
  result?: ScrapeResult;
  error?: string;
}

/**
 * Simple in-memory job store
 * In production, use Redis or a database
 */
class JobStore {
  private jobs: Map<string, Job> = new Map();

  set(jobId: string, job: Job): void {
    this.jobs.set(jobId, job);
  }

  get(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateStatus(jobId: string, status: Job['status']): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
    }
  }

  setResult(jobId: string, result: ScrapeResult): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.result = result;
    }
  }

  setError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.error = error;
    }
  }

  getAll(): Job[] {
    return Array.from(this.jobs.values());
  }

  delete(jobId: string): void {
    this.jobs.delete(jobId);
  }
}

export const jobStore = new JobStore();

