import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration: Copy data from procurementChatSystemPrompts to chatSystemPrompts
 * This migration:
 * 1. Initializes default prompt types (basic, leads, procurementHubs)
 * 2. Copies all prompts from old table to new table with type assignment
 * 3. Assigns "basic" type to all migrated prompts
 */
export const migrateToChatSystemPrompts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Step 1: Initialize default types if they don't exist
    const existingTypes = await ctx.db
      .query("chatSystemPromptTypes")
      .collect();
    
    const existingNames = new Set(existingTypes.map(t => t.name));
    const typeMap: Record<string, string> = {};
    
    const defaultTypes = [
      { name: "basic", displayName: "Basic", description: "Default basic chat system prompt", isDefault: true, order: 0 },
      { name: "leads", displayName: "Leads", description: "System prompt for lead generation", isDefault: false, order: 1 },
      { name: "procurementHubs", displayName: "Procurement Hubs", description: "System prompt for procurement hub discovery", isDefault: false, order: 2 },
    ];
    
    for (const defaultType of defaultTypes) {
      if (!existingNames.has(defaultType.name)) {
        const id = await ctx.db.insert("chatSystemPromptTypes", {
          name: defaultType.name,
          displayName: defaultType.displayName,
          description: defaultType.description,
          isDefault: defaultType.isDefault,
          order: defaultType.order,
          createdAt: now,
          updatedAt: now,
        });
        typeMap[defaultType.name] = id;
      } else {
        const existing = existingTypes.find(t => t.name === defaultType.name);
        if (existing) {
          typeMap[defaultType.name] = existing._id;
        }
      }
    }
    
    // Ensure we have at least the basic type
    if (!typeMap["basic"]) {
      const basicType = existingTypes.find(t => t.name === "basic");
      if (basicType) {
        typeMap["basic"] = basicType._id;
      } else {
        throw new Error("Failed to create basic type");
      }
    }
    
    // Step 2: Get all prompts from old table
    const oldPrompts = await ctx.db
      .query("procurementChatSystemPrompts")
      .collect();
    
    // Step 3: Copy to new table
    const migrated: string[] = [];
    for (const oldPrompt of oldPrompts) {
      // Check if already migrated (by checking if a prompt with same title exists)
      const existing = await ctx.db
        .query("chatSystemPrompts")
        .filter((q) => q.eq(q.field("title"), oldPrompt.title))
        .first();
      
      if (!existing) {
        const newId = await ctx.db.insert("chatSystemPrompts", {
          systemPromptText: oldPrompt.systemPromptText,
          isPrimarySystemPrompt: oldPrompt.isPrimarySystemPrompt,
          title: oldPrompt.title,
          description: oldPrompt.description,
          type: typeMap["basic"] as any, // Assign to basic type
          createdAt: oldPrompt.createdAt,
          updatedAt: oldPrompt.updatedAt,
        });
        migrated.push(newId);
      }
    }
    
    return {
      typesCreated: Object.keys(typeMap).length,
      promptsMigrated: migrated.length,
      migratedIds: migrated,
    };
  },
});
