import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { workflow } from "./workflowManager";
import { action, internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Lead Link Verifier Workflow
 * 
 * A Convex workflow that processes leads in batches to verify and improve their source URLs.
 * 
 * Key Design Decisions:
 * 1. No pre-filtering - all leads are processed, agent decides what needs verification
 * 2. Batch processing - handles leads in configurable batches to avoid timeouts
 * 3. Progress tracking - stores state for resumption and monitoring
 * 4. Rate limiting - includes delays to respect API limits
 */

// Type for the lead batch result
type LeadBatchItem = {
  _id: Id<"leads">;
  opportunityTitle: string;
  opportunityType: string;
  contractID?: string;
  issuingBody: {
    name: string;
    level: string;
  };
  location: {
    city?: string;
    county?: string;
    region: string;
  };
  status: string;
  source: {
    documentName: string;
    url: string;
  };
  summary: string;
  keyDates: {
    publishedDate?: string;
    bidDeadline?: string;
    projectedStartDate?: string;
  };
  createdAt: number;
};

// Define the main verification workflow
export const verifyLeadLinks = workflow.define({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    batchSize: v.number(),
    order: v.union(v.literal("newest_first"), v.literal("oldest_first")),
    maxBatches: v.optional(v.number()), // Optional limit on batches per run
  },
  returns: v.object({
    success: v.boolean(),
    processed: v.number(),
    updated: v.number(),
    skipped: v.number(),
    failed: v.number(),
    message: v.string(),
  }),
  handler: async (step, args): Promise<{
    success: boolean;
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    message: string;
  }> => {
    const maxBatches = args.maxBatches || 100; // Default to 100 batches max per run
    
    // Step 1: Update job status to running
    await step.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
      jobId: args.jobId,
      status: "running",
      currentTask: "Starting verification workflow",
      currentBatch: 0,
    });

    // Step 2: Get total count for progress tracking
    const totalLeads: number = await step.runQuery(internal.leadLinkVerifierQueries.getTotalLeadsCountInternal, {});

    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let lastCreatedAt: number | undefined = undefined;
    let lastId: Id<"leads"> | undefined = undefined;
    let batchNumber = 0;

    // Step 3: Process leads in batches
    while (batchNumber < maxBatches) {
      // Check if job was cancelled
      const job = await step.runQuery(internal.leadLinkVerifierQueries.getVerificationJobInternal, {
        jobId: args.jobId,
      });

      if (!job) {
        return {
          success: false,
          processed: processedCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: failedCount,
          message: "Job not found",
        };
      }

      if (job.status === "cancelled") {
        return {
          success: false,
          processed: processedCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: failedCount,
          message: "Job was cancelled",
        };
      }

      // Fetch next batch of leads
      const leads: LeadBatchItem[] = await step.runQuery(internal.leadLinkVerifierQueries.getLeadsBatchInternal, {
        batchSize: args.batchSize,
        lastCreatedAt,
        lastId,
        order: args.order,
      });

      if (leads.length === 0) {
        // No more leads to process
        break;
      }

      batchNumber++;

      // Update job status
      await step.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
        jobId: args.jobId,
        currentTask: `Processing batch ${batchNumber} (${processedCount + leads.length}/${totalLeads} leads)`,
        currentBatch: batchNumber,
      });

      // Process this batch
      const leadIds: Id<"leads">[] = leads.map((l: LeadBatchItem) => l._id);
      const batchResult: {
        processed: number;
        updated: number;
        skipped: number;
        failed: number;
        errors: string[];
      } = await step.runAction(internal.leadLinkVerifierActions.processBatch, {
        jobId: args.jobId,
        leadIds,
      });

      processedCount += batchResult.processed;
      updatedCount += batchResult.updated;
      skippedCount += batchResult.skipped;
      failedCount += batchResult.failed;

      // Update cursor for next batch
      const lastLead: LeadBatchItem | undefined = leads[leads.length - 1];
      if (lastLead) {
        lastCreatedAt = lastLead.createdAt;
        lastId = lastLead._id;
      }

      // Update progress
      await step.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
        jobId: args.jobId,
        lastProcessedLeadId: lastId,
        lastProcessedCreatedAt: lastCreatedAt,
      });

      // Add delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 4: Mark job as completed
    await step.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
      jobId: args.jobId,
      status: "completed",
      currentTask: `Completed: ${processedCount} processed, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed`,
      completedAt: Date.now(),
    });

    return {
      success: true,
      processed: processedCount,
      updated: updatedCount,
      skipped: skippedCount,
      failed: failedCount,
      message: `Successfully processed ${processedCount} leads. Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
    };
  },
});

/**
 * Action to start a new verification workflow
 */
export const startVerification = action({
  args: {
    batchSize: v.optional(v.number()),
    order: v.optional(v.union(v.literal("newest_first"), v.literal("oldest_first"))),
    maxBatches: v.optional(v.number()),
    startedBy: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    jobId: Id<"leadLinkVerificationJobs">;
    message: string;
  }> => {
    const batchSize = args.batchSize || 10;
    const order = args.order || "newest_first";

    // Create the job
    const jobId = await ctx.runMutation(api.leadLinkVerifierMutations.createVerificationJob, {
      batchSize,
      processingOrder: order,
      startedBy: args.startedBy || "api",
    });

    // Start the workflow using the workflow manager
    const workflowId: string = await workflow.start(ctx, internal.leadLinkVerifierWorkflow.verifyLeadLinks, {
      jobId,
      batchSize,
      order,
      maxBatches: args.maxBatches,
    });

    // Update job with workflow ID
    await ctx.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
      jobId,
      workflowId,
    });

    return {
      success: true,
      jobId,
      message: `Started verification workflow with batch size ${batchSize}`,
    };
  },
});

/**
 * Action to resume a paused or failed verification job
 */
export const resumeVerification = action({
  args: {
    jobId: v.id("leadLinkVerificationJobs"),
    maxBatches: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
  }> => {
    // Get the job
    const job = await ctx.runQuery(api.leadLinkVerifierQueries.getVerificationJob, {
      jobId: args.jobId,
    });

    if (!job) {
      return {
        success: false,
        message: "Job not found",
      };
    }

    if (job.status === "running") {
      return {
        success: false,
        message: "Job is already running",
      };
    }

    if (job.status === "completed") {
      return {
        success: false,
        message: "Job is already completed",
      };
    }

    // Update status to running
    await ctx.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
      jobId: args.jobId,
      status: "running",
      currentTask: "Resuming verification",
    });

    // Start a new workflow that continues from where we left off
    const workflowId: string = await workflow.start(ctx, internal.leadLinkVerifierWorkflow.verifyLeadLinks, {
      jobId: args.jobId,
      batchSize: job.batchSize,
      order: job.processingOrder,
      maxBatches: args.maxBatches,
    });

    // Update job with new workflow ID
    await ctx.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
      jobId: args.jobId,
      workflowId,
    });

    return {
      success: true,
      message: "Resumed verification workflow",
    };
  },
});

/**
 * Quick test action - verify a small batch without creating a full job
 */
export const testVerification = action({
  args: {
    batchSize: v.optional(v.number()),
    order: v.optional(v.union(v.literal("newest_first"), v.literal("oldest_first"))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    results: Array<{
      leadId: string;
      title: string;
      result: string;
      originalUrl: string;
      newUrl?: string;
      reasoning: string;
    }>;
  }> => {
    const batchSize = args.batchSize || 5;
    const order = args.order || "newest_first";

    // Create a temporary job
    const jobId = await ctx.runMutation(api.leadLinkVerifierMutations.createVerificationJob, {
      batchSize,
      processingOrder: order,
      startedBy: "test",
    });

    try {
      // Get a batch of leads
      const leads: LeadBatchItem[] = await ctx.runQuery(api.leadLinkVerifierQueries.getLeadsBatch, {
        batchSize,
        order,
      });

      const results: Array<{
        leadId: string;
        title: string;
        result: string;
        originalUrl: string;
        newUrl?: string;
        reasoning: string;
      }> = [];

      for (const lead of leads) {
        const result: {
          result: "skipped" | "updated" | "no_change" | "failed";
          originalUrl: string;
          newUrl?: string;
          reasoning: string;
          durationMs: number;
        } = await ctx.runAction(internal.leadLinkVerifierActions.verifyAndUpdateLeadUrl, {
          jobId,
          leadId: lead._id,
        });

        results.push({
          leadId: lead._id,
          title: lead.opportunityTitle,
          result: result.result,
          originalUrl: result.originalUrl,
          newUrl: result.newUrl,
          reasoning: result.reasoning,
        });
      }

      return {
        success: true,
        results,
      };
    } finally {
      // Mark job as completed
      await ctx.runMutation(internal.leadLinkVerifierMutations.updateVerificationJobStatus, {
        jobId,
        status: "completed",
        completedAt: Date.now(),
      });
    }
  },
});
