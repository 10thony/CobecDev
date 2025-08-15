import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Nomination interface
export interface Nomination {
  _id?: string;
  nominatedBy: string;
  nominatedEmployee: string;
  nominationType: 'Team' | 'Individual' | 'Growth';
  description: string;
  pointsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
}

// Create a new nomination
export const create = mutation({
  args: {
    nominatedBy: v.string(),
    nominatedEmployee: v.string(),
    nominationType: v.union(v.literal('Team'), v.literal('Individual'), v.literal('Growth')),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Calculate points based on nomination type
    const getPointsForNominationType = (type: 'Team' | 'Individual' | 'Growth'): number => {
      switch (type) {
        case 'Team':
          return 10;
        case 'Individual':
          return 20;
        case 'Growth':
          return 30;
        default:
          return 0;
      }
    };
    
    const pointsAwarded = getPointsForNominationType(args.nominationType);
    const now = Date.now();
    
    const nominationId = await ctx.db.insert("nominations", {
      nominatedBy: args.nominatedBy.trim(),
      nominatedEmployee: args.nominatedEmployee.trim(),
      nominationType: args.nominationType,
      description: args.description.trim(),
      pointsAwarded,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });
    
    console.log(`✅ Created nomination: ${nominationId}`);
    
    return {
      success: true,
      nominationId: nominationId,
    };
  },
});

// Get all nominations (real-time query)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const nominations = await ctx.db
      .query("nominations")
      .withIndex("by_creation")
      .order("desc")
      .collect();
    
    return nominations;
  },
});

// Get pending nominations only (real-time query)
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const nominations = await ctx.db
      .query("nominations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    
    return nominations;
  },
});

// Get nominations by employee (real-time query)
export const listByEmployee = query({
  args: { employeeName: v.string() },
  handler: async (ctx, args) => {
    const nominations = await ctx.db
      .query("nominations")
      .withIndex("by_employee", (q) => q.eq("nominatedEmployee", args.employeeName))
      .order("desc")
      .collect();
    
    return nominations;
  },
});

// Approve a nomination
export const approve = mutation({
  args: {
    nominationId: v.id("nominations"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const nomination = await ctx.db.get(args.nominationId);
    
    if (!nomination) {
      throw new Error('Nomination not found');
    }
    
    if (nomination.status !== 'pending') {
      throw new Error('Nomination is not pending approval');
    }
    
    const now = Date.now();
    
    // Update nomination status
    await ctx.db.patch(args.nominationId, {
      status: 'approved',
      approvedBy: args.approvedBy,
      approvedAt: now,
      updatedAt: now
    });
    
    // Update KFC points for the nominated employee
    const kfcEntry = await ctx.db
      .query("kfcpoints")
      .withIndex("by_name", (q) => q.eq("name", nomination.nominatedEmployee))
      .first();
    
    if (kfcEntry) {
      // Add new event to the employee's KFC entry
      const newEvent = {
        type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
        month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        quantity: 1
      };
      
      const updatedEvents = [...kfcEntry.events, newEvent];
      const newScore = kfcEntry.score + nomination.pointsAwarded;
      
      await ctx.db.patch(kfcEntry._id, {
        events: updatedEvents,
        score: newScore,
        updatedAt: now
      });
    } else {
      // Create new KFC entry if it doesn't exist
      await ctx.db.insert("kfcpoints", {
        name: nomination.nominatedEmployee,
        events: [{
          type: nomination.nominationType === 'Growth' ? 'Individ' : nomination.nominationType,
          month: new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          quantity: 1
        }],
        march_status: null,
        score: nomination.pointsAwarded,
        createdAt: now,
        updatedAt: now
      });
    }
    
    console.log(`✅ Approved nomination: ${args.nominationId}`);
    
    return { success: true };
  },
});

// Decline a nomination
export const decline = mutation({
  args: {
    nominationId: v.id("nominations"),
    declinedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const nomination = await ctx.db.get(args.nominationId);
    
    if (!nomination) {
      throw new Error('Nomination not found');
    }
    
    if (nomination.status !== 'pending') {
      throw new Error('Nomination is not pending approval');
    }
    
    const now = Date.now();
    
    // Update nomination status to declined
    await ctx.db.patch(args.nominationId, {
      status: 'declined',
      approvedBy: args.declinedBy, // Reusing the field for declinedBy
      approvedAt: now,
      updatedAt: now
    });
    
    console.log(`✅ Declined nomination: ${args.nominationId}`);
    
    return { success: true };
  },
});

// Delete a nomination
export const remove = mutation({
  args: {
    nominationId: v.id("nominations"),
  },
  handler: async (ctx, args) => {
    const nomination = await ctx.db.get(args.nominationId);
    
    if (!nomination) {
      throw new Error('Nomination not found');
    }
    
    await ctx.db.delete(args.nominationId);
    
    console.log(`✅ Deleted nomination: ${args.nominationId}`);
    
    return { success: true };
  },
});

// Employee management functions
export const createEmployee = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const employeeId = await ctx.db.insert("employees", {
      name: args.name.trim(),
      createdAt: now,
      updatedAt: now
    });
    
    return { success: true, employeeId };
  },
});

export const listEmployees = query({
  args: {},
  handler: async (ctx) => {
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_name")
      .order("asc")
      .collect();
    
    return employees;
  },
});

// KFC Points management functions
export const listKfcPoints = query({
  args: {},
  handler: async (ctx) => {
    const kfcPoints = await ctx.db
      .query("kfcpoints")
      .withIndex("by_score")
      .order("desc")
      .collect();
    
    return kfcPoints;
  },
});

export const getKfcPointsByEmployee = query({
  args: { employeeName: v.string() },
  handler: async (ctx, args) => {
    const kfcEntry = await ctx.db
      .query("kfcpoints")
      .withIndex("by_name", (q) => q.eq("name", args.employeeName))
      .first();
    
    return kfcEntry;
  },
}); 