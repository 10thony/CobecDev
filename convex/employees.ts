import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all employees
export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      const employees = await ctx.db
        .query("employees")
        .order("asc")
        .collect();
      
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  },
});

// Get employee by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    try {
      const employee = await ctx.db
        .query("employees")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      return employee;
    } catch (error) {
      console.error('❌ Error fetching employee by name:', error);
      throw error;
    }
  },
});

// Insert new employee
export const insert = mutation({
  args: {
    name: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      const employeeId = await ctx.db.insert("employees", {
        name: args.name,
        createdAt: args.createdAt || now,
        updatedAt: args.updatedAt || now,
      });
      
      console.log(`✅ Created employee: ${args.name}`);
      return employeeId;
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      throw error;
    }
  },
});

// Update existing employee
export const update = mutation({
  args: {
    _id: v.id("employees"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      await ctx.db.patch(args._id, {
        name: args.name,
        updatedAt: now,
      });
      
      console.log(`✅ Updated employee: ${args.name}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  },
});
