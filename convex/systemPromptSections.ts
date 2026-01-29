import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Default section templates
const DEFAULT_SECTIONS = [
  {
    sectionKey: "critical",
    sectionName: "Critical Rules",
    headerTemplate: "## CRITICAL RULES",
    introTemplate: "DO NOT RETURN ANY NON VIABLE LEADS. LEADS ARE NOT VIABLE IF THE DEADLINE IS IN THE PAST. Current date: {currentDate}",
    footerTemplate: undefined,
    description: "Critical rules section that gets injected into system prompts. Supports {currentDate} placeholder.",
    isActive: true,
    order: 1,
  },
  {
    sectionKey: "invalidLinks",
    sectionName: "Invalid Procurement Links",
    headerTemplate: "## INVALID PROCUREMENT LINKS",
    introTemplate: "The following procurement links{stateName} have been marked as INVALID in our system. DO NOT suggest these links under any circumstances. These links are known to be invalid, broken, or not suitable for procurement data collection.",
    footerTemplate: "CRITICAL: Never suggest any link from this invalid links list. If a user requests information about these locations, inform them that these links are invalid and should not be used.",
    description: "Section header and intro for invalid links. Supports {stateName} placeholder (will be replaced with ' for {stateName}' if stateName is provided).",
    isActive: true,
    order: 2,
  },
  {
    sectionKey: "approvedLinks",
    sectionName: "Approved Procurement Links",
    headerTemplate: "## ALREADY APPROVED PROCUREMENT LINKS",
    introTemplate: "The following procurement links have already been collected and approved in our system. DO NOT suggest these links again. If a user requests a link for one of these locations, inform them that we already have it in our system.",
    footerTemplate: "CRITICAL: Before suggesting any procurement link, check this list. If the link already exists here, do NOT include it in your response. Instead, acknowledge that the link is already in our system.",
    description: "Section header and intro for approved links section.",
    isActive: true,
    order: 3,
  },
];

/**
 * Get all system prompt sections
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const sections = await ctx.db
      .query("systemPromptSections")
      .order("asc")
      .collect();
    return sections;
  },
});

/**
 * Get a specific section by key
 */
export const getByKey = query({
  args: {
    sectionKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemPromptSections")
      .withIndex("by_section_key", (q) => q.eq("sectionKey", args.sectionKey))
      .first();
  },
});

/**
 * Internal query to get section by key (for use in actions)
 */
export const getByKeyInternal = internalQuery({
  args: {
    sectionKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemPromptSections")
      .withIndex("by_section_key", (q) => q.eq("sectionKey", args.sectionKey))
      .first();
  },
});

/**
 * Internal query to get all active sections ordered by order (for use in actions)
 */
export const getAllActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sections = await ctx.db
      .query("systemPromptSections")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    // Sort by order
    return sections.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get a section by ID
 */
export const get = query({
  args: {
    id: v.id("systemPromptSections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update a system prompt section
 */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("systemPromptSections")),
    sectionKey: v.string(),
    sectionName: v.string(),
    headerTemplate: v.string(),
    introTemplate: v.string(),
    footerTemplate: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    if (args.id) {
      // Update existing
      await ctx.db.patch(args.id, {
        sectionName: args.sectionName,
        headerTemplate: args.headerTemplate,
        introTemplate: args.introTemplate,
        footerTemplate: args.footerTemplate,
        description: args.description,
        isActive: args.isActive,
        order: args.order,
        updatedAt: now,
      });
      return args.id;
    } else {
      // Check if section with this key already exists
      const existing = await ctx.db
        .query("systemPromptSections")
        .withIndex("by_section_key", (q) => q.eq("sectionKey", args.sectionKey))
        .first();
      
      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          sectionName: args.sectionName,
          headerTemplate: args.headerTemplate,
          introTemplate: args.introTemplate,
          footerTemplate: args.footerTemplate,
          description: args.description,
          isActive: args.isActive,
          order: args.order,
          updatedAt: now,
        });
        return existing._id;
      } else {
        // Create new
        return await ctx.db.insert("systemPromptSections", {
          sectionKey: args.sectionKey,
          sectionName: args.sectionName,
          headerTemplate: args.headerTemplate,
          introTemplate: args.introTemplate,
          footerTemplate: args.footerTemplate,
          description: args.description,
          isActive: args.isActive,
          order: args.order,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Delete a system prompt section
 */
export const remove = mutation({
  args: {
    id: v.id("systemPromptSections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Initialize default sections
 */
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results = [];
    
    for (const defaultSection of DEFAULT_SECTIONS) {
      // Check if section already exists
      const existing = await ctx.db
        .query("systemPromptSections")
        .withIndex("by_section_key", (q) => q.eq("sectionKey", defaultSection.sectionKey))
        .first();
      
      if (!existing) {
        const id = await ctx.db.insert("systemPromptSections", {
          ...defaultSection,
          createdAt: now,
          updatedAt: now,
        });
        results.push(id);
      } else {
        // Update existing with defaults (preserving isActive if it was changed)
        await ctx.db.patch(existing._id, {
          sectionName: defaultSection.sectionName,
          headerTemplate: defaultSection.headerTemplate,
          introTemplate: defaultSection.introTemplate,
          footerTemplate: defaultSection.footerTemplate,
          description: defaultSection.description,
          order: defaultSection.order,
          updatedAt: now,
        });
        results.push(existing._id);
      }
    }
    
    return { initialized: results.length, sectionIds: results };
  },
});
