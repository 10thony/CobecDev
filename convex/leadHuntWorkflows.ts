import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Create a new workflow record
export const createWorkflow = mutation({
  args: {
    state: v.string(),
    userInput: v.string(),
    systemPromptId: v.optional(v.id("chatSystemPrompts")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const workflowId = await ctx.db.insert("leadHuntWorkflows", {
      userId: identity.subject,
      state: args.state,
      userInput: args.userInput,
      status: "pending",
      leadsFound: 0,
      leadsPendingReview: [],
      systemPromptId: args.systemPromptId,
      createdAt: now,
      updatedAt: now,
    });

    return workflowId;
  },
});

// Update workflow status and progress
export const updateStatus = internalMutation({
  args: {
    workflowRecordId: v.id("leadHuntWorkflows"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("canceled"),
        v.literal("failed")
      )
    ),
    currentTask: v.optional(v.string()),
    currentStep: v.optional(v.number()),
    totalSteps: v.optional(v.number()),
    leadsFound: v.optional(v.number()),
    leadsPendingReview: v.optional(v.array(v.id("leads"))),
    workflowId: v.optional(v.string()),
    systemPromptText: v.optional(v.string()),
    userPromptText: v.optional(v.string()),
    rawAiResponse: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workflowRecordId, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(workflowRecordId, {
      ...updates,
      updatedAt: now,
    });
  },
});

// Get workflow record by ID
export const getWorkflowRecord = internalQuery({
  args: {
    workflowRecordId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workflowRecordId);
  },
});

// Get workflow by ID (public query)
export const getWorkflow = query({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workflowId);
  },
});

// Get all workflows for a user
export const getWorkflowsByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("leadHuntWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// List workflows for history panel (similar to sessions list)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("leadHuntWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Delete a workflow
export const deleteWorkflow = mutation({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Only allow deletion of completed, failed, or canceled workflows
    if (workflow.status === "running" || workflow.status === "paused") {
      throw new Error("Cannot delete active workflow. Cancel it first.");
    }

    await ctx.db.delete(args.workflowId);
    return { success: true };
  },
});

// Get active workflows (running or paused)
export const getActiveWorkflows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const allWorkflows = await ctx.db
      .query("leadHuntWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return allWorkflows.filter(
      (w) => w.status === "running" || w.status === "paused"
    );
  },
});

// Cancel a workflow
export const cancelWorkflow = action({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.runQuery(api.leadHuntWorkflows.getWorkflow, {
      workflowId: args.workflowId,
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Always mark as canceled in database first to ensure UI updates
    const now = Date.now();
    await ctx.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowId,
      status: "canceled",
      canceledAt: now,
    });

    // Then try to cancel the workflow run if it exists
    if (workflow.workflowId) {
      try {
        const { workflow: workflowManager } = await import("./workflowManager");
        await workflowManager.cancel(ctx, workflow.workflowId as any);
      } catch (error) {
        // Status is already updated, so this is just a best-effort cleanup
        console.error("Error canceling workflow run (status already updated):", error);
      }
    }

    return { success: true };
  },
});

// Resume a paused workflow (triggers resume event via action)
export const resumeWorkflow = mutation({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    if (workflow.status !== "paused") {
      throw new Error("Workflow is not paused");
    }

    // Update status to running - the action will trigger the resume event
    const now = Date.now();
    await ctx.db.patch(args.workflowId, {
      status: "running",
      updatedAt: now,
    });

    return { success: true };
  },
});

// Mark a lead as viable
export const markLeadViable = mutation({
  args: {
    leadId: v.id("leads"),
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    // Update the lead
    await ctx.db.patch(args.leadId, {
      viabilityStatus: "viable",
      reviewedAt: now,
      reviewedBy: identity.subject,
    });

    // Remove from pending review list
    const updatedPending = workflow.leadsPendingReview.filter(
      (id) => id !== args.leadId
    );
    await ctx.db.patch(args.workflowId, {
      leadsPendingReview: updatedPending,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Mark a lead as not viable and delete it
export const markLeadNotViable = mutation({
  args: {
    leadId: v.id("leads"),
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Delete the lead
    await ctx.db.delete(args.leadId);

    // Remove from pending review list
    const now = Date.now();
    const updatedPending = workflow.leadsPendingReview.filter(
      (id) => id !== args.leadId
    );
    await ctx.db.patch(args.workflowId, {
      leadsPendingReview: updatedPending,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Start a workflow - returns the workflow run ID
export const startWorkflow = action({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; workflowRunId: string }> => {
    const workflow: {
      state: string;
      userInput: string;
      systemPromptId?: Id<"chatSystemPrompts">;
    } | null = await ctx.runQuery(api.leadHuntWorkflows.getWorkflow, {
      workflowId: args.workflowId,
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Import workflow manager
    const { workflow: workflowManager } = await import("./workflowManager");
    
    // Start the workflow using the workflow manager with the internal API reference
    const workflowRun: string = await workflowManager.start(ctx, internal.leadHuntWorkflow.huntLeads, {
      workflowRecordId: args.workflowId,
      state: workflow.state,
      userInput: workflow.userInput,
      systemPromptId: workflow.systemPromptId,
    });

    // Update workflow with the workflow run ID
    await ctx.runMutation(internal.leadHuntWorkflows.updateStatus, {
      workflowRecordId: args.workflowId,
      workflowId: workflowRun,
    });

    return { success: true, workflowRunId: workflowRun };
  },
});

// Trigger resume event for paused workflows
// Note: This uses the workflow's event system to resume paused workflows
export const triggerResumeEvent = action({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const workflowRecord = await ctx.runQuery(api.leadHuntWorkflows.getWorkflow, {
      workflowId: args.workflowId,
    });

    if (!workflowRecord || !workflowRecord.workflowId) {
      throw new Error("Workflow or workflow run ID not found");
    }

    // Import workflow manager and event definition
    const { workflow: workflowManager } = await import("./workflowManager");
    const { resumeEvent } = await import("./leadHuntEvents");
    
    // Send resume event to the workflow
    // Cast workflowId string to WorkflowId type for the workflow manager
    await workflowManager.sendEvent(ctx, {
      ...resumeEvent,
      workflowId: workflowRecord.workflowId as any, // WorkflowId type is a branded string
      value: {
        workflowRecordId: args.workflowId,
      },
    });

    return { success: true };
  },
});

// Get leads pending review for a workflow
export const getPendingLeads = query({
  args: {
    workflowId: v.id("leadHuntWorkflows"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      return [];
    }

    if (workflow.userId !== identity.subject) {
      return [];
    }

    // First try to get leads from the leadsPendingReview array
    const leadsFromArray = [];
    for (const leadId of workflow.leadsPendingReview) {
      const lead = await ctx.db.get(leadId);
      if (lead) {
        leadsFromArray.push(lead);
      }
    }

    // Also query leads directly by workflowId in case the array is empty but leads exist
    const leadsFromQuery = await ctx.db
      .query("leads")
      .withIndex("by_lead_hunt_workflow", (q) => q.eq("leadHuntWorkflowId", args.workflowId))
      .filter((q) => q.eq(q.field("viabilityStatus"), "pending"))
      .collect();

    // Combine and deduplicate by _id
    const allLeads = [...leadsFromArray];
    const existingIds = new Set(leadsFromArray.map(l => l._id));
    for (const lead of leadsFromQuery) {
      if (!existingIds.has(lead._id)) {
        allLeads.push(lead);
      }
    }

    return allLeads;
  },
});
