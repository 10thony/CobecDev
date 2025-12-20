"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Action to upload file to Convex storage (for bulk import)
// Accepts base64-encoded file data and stores it, returning the storage ID
export const uploadFileToStorage = action({
  args: {
    fileData: v.string(), // base64-encoded file data
    filename: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    // Decode base64 data to Buffer, then convert to Blob
    const buffer = Buffer.from(args.fileData, 'base64');
    const blob = new Blob([buffer], { type: args.contentType });
    
    // Store file in Convex storage
    // storage.store() accepts a Blob and returns a storage ID
    const storageId = await ctx.storage.store(blob);
    
    return { storageId };
  },
});
