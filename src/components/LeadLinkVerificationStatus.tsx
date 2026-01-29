import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';
import {
  RefreshCw,
  StopCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Link,
  X,
  Activity,
  Trash2,
} from 'lucide-react';

interface VerificationJob {
  _id: Id<"leadLinkVerificationJobs">;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  batchSize: number;
  processingOrder: "newest_first" | "oldest_first";
  totalLeads: number;
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  currentBatch?: number;
  currentTask?: string;
  startedAt: number;
  completedAt?: number;
  lastActivityAt: number;
  lastError?: string;
  startedBy?: string;
}

export function LeadLinkVerificationStatus() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);

  // Fetch all verification jobs
  const allJobs = useQuery(api.leadLinkVerifierQueries.getAllVerificationJobs, {
    limit: 10,
  }) as VerificationJob[] | undefined;

  // Cancel mutation
  const cancelJob = useMutation(api.leadLinkVerifierMutations.cancelVerificationJob);
  const deleteJob = useMutation(api.leadLinkVerifierMutations.deleteVerificationJob);

  // Separate active and completed jobs
  const activeJobs = allJobs?.filter(job => 
    job.status === 'running' || job.status === 'pending' || job.status === 'paused'
  ) || [];

  const completedJobs = allJobs?.filter(job => 
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  ) || [];

  // If no jobs exist at all, don't show anything
  if (!allJobs || allJobs.length === 0) {
    return null;
  }

  const handleCancelJob = async (jobId: Id<"leadLinkVerificationJobs">) => {
    if (window.confirm('Are you sure you want to cancel this verification job?')) {
      try {
        await cancelJob({ jobId });
      } catch (error) {
        console.error('Error canceling job:', error);
        alert('Failed to cancel job. Please try again.');
      }
    }
  };

  const handleDeleteJob = async (jobId: Id<"leadLinkVerificationJobs">) => {
    if (window.confirm('Are you sure you want to delete this verification job and its results?')) {
      try {
        await deleteJob({ jobId });
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job. Please try again.');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 text-tron-cyan animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-neon-warning" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-tron-orange" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-neon-success" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-neon-error" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-tron-gray" />;
      default:
        return <Activity className="w-4 h-4 text-tron-gray" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-tron-cyan';
      case 'pending':
        return 'text-neon-warning';
      case 'paused':
        return 'text-tron-orange';
      case 'completed':
        return 'text-neon-success';
      case 'failed':
        return 'text-neon-error';
      case 'cancelled':
        return 'text-tron-gray';
      default:
        return 'text-tron-gray';
    }
  };

  const formatDuration = (startMs: number, endMs?: number) => {
    const end = endMs || Date.now();
    const durationMs = end - startMs;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const renderJobCard = (job: VerificationJob, showActions: boolean = true) => {
    const progress = job.totalLeads > 0 
      ? Math.round((job.processedCount / job.totalLeads) * 100) 
      : 0;

    return (
      <div
        key={job._id}
        className="p-4 bg-tron-bg-card rounded-lg border border-tron-cyan/20 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-tron-gray">
              {formatDuration(job.startedAt, job.completedAt)}
            </span>
            {showActions && (job.status === 'running' || job.status === 'pending' || job.status === 'paused') && (
              <button
                onClick={() => handleCancelJob(job._id)}
                className="p-1 hover:bg-tron-orange/10 rounded transition-colors text-tron-orange hover:text-neon-error"
                title="Cancel Job"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            )}
            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <button
                onClick={() => handleDeleteJob(job._id)}
                className="p-1 hover:bg-tron-orange/10 rounded transition-colors text-tron-gray hover:text-neon-error"
                title="Delete Job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-tron-gray">
            <span>{job.processedCount} / {job.totalLeads} leads</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-tron-bg-deep rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                job.status === 'running' ? 'bg-tron-cyan' :
                job.status === 'completed' ? 'bg-neon-success' :
                job.status === 'failed' ? 'bg-neon-error' :
                'bg-tron-gray'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-neon-success">
            <CheckCircle className="w-3 h-3" />
            <span>{job.updatedCount} updated</span>
          </div>
          <div className="flex items-center gap-1 text-tron-cyan">
            <Link className="w-3 h-3" />
            <span>{job.skippedCount} good</span>
          </div>
          <div className="flex items-center gap-1 text-neon-error">
            <AlertCircle className="w-3 h-3" />
            <span>{job.failedCount} failed</span>
          </div>
        </div>

        {/* Current Task */}
        {job.currentTask && job.status === 'running' && (
          <div className="text-xs text-tron-gray truncate">
            {job.currentTask}
          </div>
        )}

        {/* Error Message */}
        {job.lastError && job.status === 'failed' && (
          <div className="text-xs text-neon-error bg-neon-error/10 p-2 rounded">
            {job.lastError}
          </div>
        )}

        {/* Started By */}
        <div className="text-xs text-tron-gray/60">
          Started {job.startedBy === 'cli_script' ? 'via CLI' : job.startedBy === 'test' ? 'as test' : 'via API'}
          {' • '}
          {new Date(job.startedAt).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <TronPanel className="!p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-tron-cyan/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link className="w-5 h-5 text-tron-cyan" />
          <span className="font-medium text-tron-white">Link Verification</span>
          {activeJobs.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-tron-cyan/20 text-tron-cyan rounded-full">
              {activeJobs.length} active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-tron-gray" />
        ) : (
          <ChevronDown className="w-5 h-5 text-tron-gray" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* CLI Info */}
          <div className="text-xs text-tron-gray bg-tron-bg-deep p-3 rounded-lg border border-tron-cyan/10">
            <p className="mb-2">
              <span className="text-tron-cyan font-medium">Note:</span> To start a new verification job, run from CLI:
            </p>
            <code className="text-tron-cyan/80 bg-tron-bg-card px-2 py-1 rounded text-[10px] block overflow-x-auto">
              bun run verify-lead-links --batch-size 10
            </code>
          </div>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-tron-gray">Active Jobs</h4>
              {activeJobs.map(job => renderJobCard(job, true))}
            </div>
          )}

          {/* No Active Jobs Message */}
          {activeJobs.length === 0 && (
            <div className="text-center py-4 text-sm text-tron-gray">
              No active verification jobs
            </div>
          )}

          {/* Completed Jobs Toggle */}
          {completedJobs.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompletedJobs(!showCompletedJobs)}
                className="w-full flex items-center justify-between py-2 text-sm text-tron-gray hover:text-tron-white transition-colors"
              >
                <span>Completed Jobs ({completedJobs.length})</span>
                {showCompletedJobs ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showCompletedJobs && (
                <div className="space-y-3 mt-2">
                  {completedJobs.map(job => renderJobCard(job, false))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </TronPanel>
  );
}
