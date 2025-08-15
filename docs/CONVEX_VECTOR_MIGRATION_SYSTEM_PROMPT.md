# CONVEX VECTOR MIGRATION SYSTEM PROMPT

## 🎯 MIGRATION OBJECTIVE
You are tasked with migrating the entire application from MongoDB to Convex, leveraging Convex's built-in vector embeddings and search capabilities. This migration will eliminate the need for MongoDB entirely while providing superior vector search performance and real-time capabilities.

## 🔄 MIGRATION STRATEGY

### Phase 1: Schema Migration
- **Vector-Enabled Tables**: Convert all MongoDB collections to Convex tables with vector search capabilities
- **Embedding Storage**: Store vector embeddings directly in Convex using the `v.vector()` type
- **Indexes**: Create optimized indexes for vector similarity search and traditional queries

### Phase 2: Data Migration
- **Batch Processing**: Migrate existing data with embeddings from MongoDB to Convex
- **Vector Regeneration**: Regenerate embeddings using Convex's optimized vector operations
- **Data Validation**: Ensure data integrity during migration

### Phase 3: API Migration
- **Replace MongoDB Functions**: Convert all MongoDB operations to Convex mutations/queries
- **Vector Search**: Implement vector similarity search using Convex's native capabilities
- **Real-time Updates**: Leverage Convex's real-time subscriptions for live data updates

## 🏗️ CONVEX SCHEMA ARCHITECTURE

### Core Tables with Vector Support

```typescript
// Job Postings with Vector Embeddings
jobPostings: defineTable({
  title: v.string(),
  company: v.string(),
  location: v.string(),
  description: v.string(),
  requirements: v.array(v.string()),
  salary: v.optional(v.string()),
  jobType: v.union(v.literal("full-time"), v.literal("part-time"), v.literal("contract")),
  experienceLevel: v.union(v.literal("entry"), v.literal("mid"), v.literal("senior")),
  // Vector embedding for semantic search
  embedding: v.vector(768), // Gemini embedding dimension
  // Metadata for filtering
  skills: v.array(v.string()),
  industry: v.string(),
  remote: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_company", ["company"])
  .index("by_location", ["location"])
  .index("by_jobType", ["jobType"])
  .index("by_experience", ["experienceLevel"])
  .index("by_skills", ["skills"])
  .index("by_industry", ["industry"])
  .index("by_remote", ["remote"])
  .index("by_creation", ["createdAt"])
  // Vector similarity search index
  .index("by_embedding", ["embedding"]);

// Resumes with Vector Embeddings
resumes: defineTable({
  userId: v.string(), // Clerk user ID
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  summary: v.string(),
  experience: v.array(v.object({
    title: v.string(),
    company: v.string(),
    duration: v.string(),
    description: v.string(),
  })),
  education: v.array(v.object({
    degree: v.string(),
    institution: v.string(),
    year: v.number(),
  })),
  skills: v.array(v.string()),
  // Vector embedding for semantic search
  embedding: v.vector(768),
  // File metadata
  originalFileName: v.string(),
  fileSize: v.number(),
  fileType: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_skills", ["skills"])
  .index("by_creation", ["createdAt"])
  .index("by_embedding", ["embedding"]);

// KFC Points with Vector Support
kfcPoints: defineTable({
  employeeName: v.string(),
  employeeId: v.string(),
  department: v.string(),
  position: v.string(),
  totalPoints: v.number(),
  pointsHistory: v.array(v.object({
    amount: v.number(),
    reason: v.string(),
    date: v.number(),
    type: v.union(v.literal("earned"), v.literal("deducted")),
  })),
  // Vector embedding for employee search
  embedding: v.vector(768),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_employee", ["employeeName"])
  .index("by_department", ["department"])
  .index("by_position", ["position"])
  .index("by_points", ["totalPoints"])
  .index("by_embedding", ["embedding"]);

// Enhanced Nominations with Vector Support
nominations: defineTable({
  nominatedBy: v.string(),
  nominatedEmployee: v.string(),
  nominationType: v.union(v.literal("Team"), v.literal("Individual"), v.literal("Growth")),
  description: v.string(),
  pointsAwarded: v.number(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  // Vector embedding for nomination search
  embedding: v.vector(768),
  // Enhanced metadata
  category: v.optional(v.string()),
  impact: v.optional(v.string()),
  evidence: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_status", ["status"])
  .index("by_type", ["nominationType"])
  .index("by_employee", ["nominatedEmployee"])
  .index("by_approver", ["approvedBy"])
  .index("by_creation", ["createdAt"])
  .index("by_embedding", ["embedding"]);
```

## 🚀 CONVEX VECTOR FUNCTIONS

### Vector Search Implementation

```typescript
// convex/vectorSearch.ts
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Generate embeddings using external AI service
export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    // Use Google Gemini or OpenAI for embeddings
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  },
});

// Vector similarity search for job postings
export const searchJobsByVector = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
    filters: v.optional(v.object({
      location: v.optional(v.string()),
      jobType: v.optional(v.string()),
      experienceLevel: v.optional(v.string()),
      remote: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, { query, limit = 10, filters = {} }) => {
    // Generate query embedding
    const queryEmbedding = await ctx.runAction(api.vectorSearch.generateEmbedding, { text: query });
    
    // Perform vector similarity search
    const results = await ctx.db
      .query("jobPostings")
      .withIndex("by_embedding", (q) => q.eq("embedding", queryEmbedding))
      .filter((q) => {
        let filter = q.eq(q.field("embedding"), queryEmbedding);
        
        if (filters.location) {
          filter = q.and(filter, q.eq(q.field("location"), filters.location));
        }
        if (filters.jobType) {
          filter = q.and(filter, q.eq(q.field("jobType"), filters.jobType));
        }
        if (filters.experienceLevel) {
          filter = q.and(filter, q.eq(q.field("experienceLevel"), filters.experienceLevel));
        }
        if (filters.remote !== undefined) {
          filter = q.and(filter, q.eq(q.field("remote"), filters.remote));
        }
        
        return filter;
      })
      .order("desc")
      .take(limit);
    
    return results;
  },
});

// Hybrid search combining vector similarity and traditional filters
export const hybridJobSearch = query({
  args: { 
    query: v.string(),
    filters: v.object({
      location: v.optional(v.string()),
      jobType: v.optional(v.string()),
      experienceLevel: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
      remote: v.optional(v.boolean()),
    }),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, filters, limit = 20 }) => {
    // Get vector search results
    const vectorResults = await ctx.runQuery(api.vectorSearch.searchJobsByVector, { 
      query, 
      limit: Math.floor(limit * 0.7), // 70% from vector search
      filters 
    });
    
    // Get traditional filtered results
    let traditionalQuery = ctx.db.query("jobPostings");
    
    if (filters.location) {
      traditionalQuery = traditionalQuery.withIndex("by_location", (q) => q.eq("location", filters.location));
    }
    if (filters.jobType) {
      traditionalQuery = traditionalQuery.withIndex("by_jobType", (q) => q.eq("jobType", filters.jobType));
    }
    if (filters.experienceLevel) {
      traditionalQuery = traditionalQuery.withIndex("by_experience", (q) => q.eq("experienceLevel", filters.experienceLevel));
    }
    if (filters.remote !== undefined) {
      traditionalQuery = traditionalQuery.withIndex("by_remote", (q) => q.eq("remote", filters.remote));
    }
    
    const traditionalResults = await traditionalQuery
      .order("desc")
      .take(Math.floor(limit * 0.3)); // 30% from traditional search
    
    // Combine and deduplicate results
    const allResults = [...vectorResults, ...traditionalResults];
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r._id === result._id)
    );
    
    return uniqueResults.slice(0, limit);
  },
});
```

## 📊 DATA MIGRATION FUNCTIONS

### MongoDB to Convex Migration

```typescript
// convex/migrations.ts
import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { MongoClient } from "mongodb";

// Migrate job postings with vector embeddings
export const migrateJobPostings = action({
  args: { 
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.string()),
  },
  handler: async (ctx, { batchSize = 100, startFrom = null }) => {
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DATABASE);
    const collection = db.collection("jobpostings");
    
    // Build query
    let query = {};
    if (startFrom) {
      query = { _id: { $gt: new ObjectId(startFrom) } };
    }
    
    const documents = await collection
      .find(query)
      .limit(batchSize)
      .toArray();
    
    let lastId = null;
    
    for (const doc of documents) {
      // Generate embedding for the job description
      const textToEmbed = `${doc.title} ${doc.description} ${doc.requirements?.join(" ")}`;
      const embedding = await ctx.runAction(api.vectorSearch.generateEmbedding, { 
        text: textToEmbed 
      });
      
      // Insert into Convex
      await ctx.runMutation(api.jobPostings.insert, {
        title: doc.title,
        company: doc.company,
        location: doc.location,
        description: doc.description,
        requirements: doc.requirements || [],
        salary: doc.salary,
        jobType: doc.jobType || "full-time",
        experienceLevel: doc.experienceLevel || "mid",
        skills: doc.skills || [],
        industry: doc.industry || "Technology",
        remote: doc.remote || false,
        embedding,
        createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
        updatedAt: Date.now(),
      });
      
      lastId = doc._id.toString();
    }
    
    await client.close();
    
    return {
      migrated: documents.length,
      lastId,
      hasMore: documents.length === batchSize,
    };
  },
});

// Migrate resumes with vector embeddings
export const migrateResumes = action({
  args: { 
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.string()),
  },
  handler: async (ctx, { batchSize = 100, startFrom = null }) => {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DATABASE);
    const collection = db.collection("resumes");
    
    let query = {};
    if (startFrom) {
      query = { _id: { $gt: new ObjectId(startFrom) } };
    }
    
    const documents = await collection
      .find(query)
      .limit(batchSize)
      .toArray();
    
    let lastId = null;
    
    for (const doc of documents) {
      // Generate embedding for resume content
      const textToEmbed = `${doc.summary} ${doc.experience?.map(exp => exp.description).join(" ")} ${doc.skills?.join(" ")}`;
      const embedding = await ctx.runAction(api.vectorSearch.generateEmbedding, { 
        text: textToEmbed 
      });
      
      // Insert into Convex
      await ctx.runMutation(api.resumes.insert, {
        userId: doc.userId || "unknown",
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        summary: doc.summary,
        experience: doc.experience || [],
        education: doc.education || [],
        skills: doc.skills || [],
        embedding,
        originalFileName: doc.originalFileName || "unknown",
        fileSize: doc.fileSize || 0,
        fileType: doc.fileType || "unknown",
        createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
        updatedAt: Date.now(),
      });
      
      lastId = doc._id.toString();
    }
    
    await client.close();
    
    return {
      migrated: documents.length,
      lastId,
      hasMore: documents.length === batchSize,
    };
  },
});
```

## 🔧 MIGRATION STEPS

### Step 1: Update Dependencies
```bash
# Remove MongoDB dependencies
npm uninstall mongodb

# Ensure Convex is up to date
npm install convex@latest
```

### Step 2: Environment Variables
```env
# Remove MongoDB variables
# MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE, MONGODB_USERNAME, MONGODB_PASSWORD

# Keep AI service keys for embeddings
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_gemini_key
```

### Step 3: Schema Migration
1. Update `convex/schema.ts` with new vector-enabled tables
2. Run `npx convex dev` to apply schema changes
3. Create new indexes for vector search

### Step 4: Data Migration
1. Run migration functions in batches
2. Monitor progress and handle errors
3. Validate data integrity
4. Remove old MongoDB data

### Step 5: API Updates
1. Replace all MongoDB operations with Convex functions
2. Update frontend components to use Convex queries
3. Implement real-time subscriptions
4. Test vector search functionality

## 🎯 BENEFITS OF MIGRATION

### Performance Improvements
- **Faster Vector Search**: Native Convex vector operations
- **Real-time Updates**: Live data synchronization
- **Optimized Indexes**: Automatic query optimization
- **Reduced Latency**: Edge deployment and caching

### Developer Experience
- **Type Safety**: Full TypeScript support
- **Real-time Subscriptions**: Automatic live updates
- **Built-in Auth**: Clerk integration
- **Automatic Scaling**: No infrastructure management

### Cost Benefits
- **No MongoDB Hosting**: Eliminate database hosting costs
- **Pay-per-use**: Convex pricing model
- **Reduced Complexity**: Single platform for all data needs

## 🚨 MIGRATION RISKS & MITIGATION

### Data Loss Risk
- **Mitigation**: Comprehensive backup before migration
- **Rollback Plan**: Keep MongoDB running until validation complete
- **Incremental Migration**: Migrate in small batches

### Performance Risk
- **Mitigation**: Test vector search performance with sample data
- **Optimization**: Fine-tune embedding dimensions and indexes
- **Monitoring**: Track query performance during migration

### Downtime Risk
- **Mitigation**: Run migration during low-traffic periods
- **Parallel Systems**: Run both systems during transition
- **Gradual Cutover**: Switch traffic incrementally

## ✅ SUCCESS CRITERIA

1. **Data Integrity**: 100% data migration success
2. **Performance**: Vector search response time < 100ms
3. **Functionality**: All existing features working with Convex
4. **Real-time**: Live updates working across all components
5. **Cost Reduction**: Eliminated MongoDB hosting costs
6. **User Experience**: Improved search accuracy and speed

## 🔍 POST-MIGRATION VALIDATION

### Data Validation
- Compare record counts between systems
- Verify vector embeddings are correctly generated
- Test search result accuracy
- Validate real-time updates

### Performance Testing
- Measure vector search response times
- Test concurrent user scenarios
- Validate real-time subscription performance
- Monitor resource usage

### User Acceptance Testing
- Test all user workflows
- Validate search functionality
- Verify real-time features
- Check mobile responsiveness

---

**Remember**: This migration represents a significant architectural improvement. Take time to plan each phase carefully and validate thoroughly before proceeding to the next step.
