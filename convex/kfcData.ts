import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// KFC data interface
export interface KfcEvent {
  type: 'Team' | 'Individ';
  month: string;
  quantity?: number;
}

export interface KfcEntry {
  _id?: string;
  name: string;
  events: KfcEvent[];
  march_status: string | null;
  score: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Employee {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Get all KFC entries (real-time query)
export const getAllKfcEntries = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('📊 Fetching KFC entries from Convex...');
      
      const kfcEntries = await ctx.db
        .query("kfcpoints")
        .withIndex("by_score")
        .order("desc")
        .collect();
      
      console.log(`✅ Returning ${kfcEntries.length} KFC entries`);
      return kfcEntries;
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      throw error;
    }
  },
});

// Get KFC entry by name
export const getKfcEntryByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    try {
      const kfcEntry = await ctx.db
        .query("kfcpoints")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      return kfcEntry;
    } catch (error) {
      console.error('❌ Error fetching KFC entry:', error);
      throw error;
    }
  },
});

// Alias for getKfcEntryByName to match the expected API
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    try {
      const kfcEntry = await ctx.db
        .query("kfcpoints")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      return kfcEntry;
    } catch (error) {
      console.error('❌ Error fetching KFC entry by name:', error);
      throw error;
    }
  },
});

// Create or update KFC entry
export const upsertKfcEntry = mutation({
  args: {
    name: v.string(),
    events: v.array(v.any()),
    march_status: v.optional(v.string()),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const existingEntry = await ctx.db
        .query("kfcpoints")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      const now = Date.now();
      
      if (existingEntry) {
        // Update existing entry
        await ctx.db.patch(existingEntry._id, {
          events: args.events,
          march_status: args.march_status,
          score: args.score,
          updatedAt: now
        });
        console.log(`✅ Updated KFC entry: ${args.name}`);
        return { success: true, action: 'updated', id: existingEntry._id };
      } else {
        // Create new entry
        const newId = await ctx.db.insert("kfcpoints", {
          name: args.name,
          events: args.events,
          march_status: args.march_status || null,
          score: args.score,
          createdAt: now,
          updatedAt: now
        });
        console.log(`✅ Created KFC entry: ${args.name}`);
        return { success: true, action: 'created', id: newId };
      }
    } catch (error) {
      console.error('❌ Error upserting KFC entry:', error);
      throw error;
    }
  },
});

// Update KFC entry
export const updateKfcEntry = mutation({
  args: {
    name: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const kfcEntry = await ctx.db
        .query("kfcpoints")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      if (kfcEntry) {
        await ctx.db.patch(kfcEntry._id, {
          ...args.updates,
          updatedAt: Date.now(),
        });
        console.log(`✅ Updated KFC entry: ${args.name}`);
        return { success: true };
      } else {
        throw new Error(`KFC entry not found: ${args.name}`);
      }
    } catch (error) {
      console.error('❌ Error updating KFC entry:', error);
      throw error;
    }
  },
});

// Delete KFC entry
export const deleteKfcEntry = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const kfcEntry = await ctx.db
        .query("kfcpoints")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      if (kfcEntry) {
        await ctx.db.delete(kfcEntry._id);
        console.log(`✅ Deleted KFC entry: ${args.name}`);
        return { success: true };
      } else {
        throw new Error(`KFC entry not found: ${args.name}`);
      }
    } catch (error) {
      console.error('❌ Error deleting KFC entry:', error);
      throw error;
    }
  },
});

// Get all employees (real-time query)
export const getAllEmployees = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('👥 Fetching employees from Convex...');
      
      const employees = await ctx.db
        .query("employees")
        .withIndex("by_name")
        .order("asc")
        .collect();
      
      console.log(`✅ Returning ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  },
});

// Create employee
export const createEmployee = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const existingEmployee = await ctx.db
        .query("employees")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      if (existingEmployee) {
        throw new Error(`Employee already exists: ${args.name}`);
      }
      
      const now = Date.now();
      const employeeId = await ctx.db.insert("employees", {
        name: args.name.trim(),
        createdAt: now,
        updatedAt: now
      });
      
      console.log(`✅ Created employee: ${args.name}`);
      return { success: true, employeeId };
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      throw error;
    }
  },
});

// Delete employee
export const deleteEmployee = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const employee = await ctx.db
        .query("employees")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      if (employee) {
        await ctx.db.delete(employee._id);
        console.log(`✅ Deleted employee: ${args.name}`);
        return { success: true };
      } else {
        throw new Error(`Employee not found: ${args.name}`);
      }
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  },
});

// Get database status
export const getDatabaseStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('📊 Getting database status from Convex...');
      
      const kfcCount = await ctx.db.query("kfcpoints").collect().then(entries => entries.length);
      const employeeCount = await ctx.db.query("employees").collect().then(entries => entries.length);
      
      const status = {
        kfcCount,
        employeeCount
      };
      
      console.log(`✅ Database status: ${kfcCount} KFC entries, ${employeeCount} employees`);
      return status;
    } catch (error) {
      console.error('❌ Error getting database status:', error);
      throw error;
    }
  },
});

// List all KFC entries (alias for getAllKfcEntries)
export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      const kfcEntries = await ctx.db
        .query("kfcpoints")
        .withIndex("by_score")
        .order("desc")
        .collect();
      
      return kfcEntries;
    } catch (error) {
      console.error('❌ Error fetching KFC entries:', error);
      throw error;
    }
  },
});

// Update KFC entry
export const update = mutation({
  args: {
    _id: v.id("kfcpoints"),
    name: v.string(),
    events: v.array(v.any()),
    march_status: v.optional(v.string()),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      await ctx.db.patch(args._id, {
        name: args.name,
        events: args.events,
        march_status: args.march_status,
        score: args.score,
        updatedAt: now,
      });
      
      console.log(`✅ Updated KFC entry: ${args.name}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating KFC entry:', error);
      throw error;
    }
  },
});

// Update KFC entry embeddings and searchable text
export const updateEmbeddings = mutation({
  args: {
    _id: v.id("kfcpoints"),
    completeSearchableText: v.optional(v.string()),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      const updateData: any = {
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        embeddingGeneratedAt: args.embeddingGeneratedAt,
        updatedAt: now,
      };
      
      // Only update completeSearchableText if provided
      if (args.completeSearchableText !== undefined) {
        updateData.completeSearchableText = args.completeSearchableText;
      }
      
      await ctx.db.patch(args._id, updateData);
      
      console.log(`✅ Updated KFC entry embeddings: ${args._id}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating KFC entry embeddings:', error);
      throw error;
    }
  },
});

// Insert new KFC entry
export const insert = mutation({
  args: {
    name: v.string(),
    events: v.array(v.any()),
    march_status: v.union(v.string(), v.null()),
    score: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      const kfcEntryId = await ctx.db.insert("kfcpoints", {
        name: args.name,
        events: args.events,
        march_status: args.march_status || null,
        score: args.score,
        createdAt: args.createdAt || now,
        updatedAt: args.updatedAt || now,
      });
      
      console.log(`✅ Created KFC entry: ${args.name}`);
      return kfcEntryId;
    } catch (error) {
      console.error('❌ Error creating KFC entry:', error);
      throw error;
    }
  },
});