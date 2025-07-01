# Vector Search Implementation Guide

## Overview

This guide provides practical instructions for implementing vector search using the 235 prompts generated from your MongoDB collections. Your system already has the foundation with Convex functions for vector search, and this guide will help you optimize it for your specific data.

## Current System Analysis

### Existing Vector Search Functions
Based on your codebase, you have:

1. **`enhancedVectorSearch`** in `convex/vectorSearch.ts`
2. **`searchSimilarJobs`** and **`searchSimilarResumes`** functions
3. **`aiAgentSearch`** for intelligent matching
4. **OpenAI embeddings** using `text-embedding-ada-002`

### Data Structure
- **Job Postings**: 181 documents with fields like `jobTitle`, `jobSummary`, `duties`, `requirements`, `qualifications`
- **Resumes**: 100 documents with fields like `professionalSummary`, `experience`, `skills`, `education`

## Implementation Strategy

### Phase 1: Data Preparation

#### 1. Generate Embeddings for Existing Data

```javascript
// Add this to your existing scripts
async function generateEmbeddingsForExistingData() {
  const client = await getMongoClient();
  const db = client.db('workdemos');
  
  // Generate embeddings for job postings
  const jobs = await db.collection('jobpostings').find({}).toArray();
  for (const job of jobs) {
    const searchableText = `${job.jobTitle} ${job.jobSummary} ${job.duties} ${job.requirements} ${job.qualifications}`;
    const embedding = await generateEmbedding(searchableText);
    
    await db.collection('jobpostings').updateOne(
      { _id: job._id },
      { $set: { embedding: embedding, searchableText: searchableText } }
    );
  }
  
  // Generate embeddings for resumes
  const resumes = await db.collection('resumes').find({}).toArray();
  for (const resume of resumes) {
    const searchableText = `${resume.professionalSummary} ${resume.skills?.join(' ')} ${resume.education?.join(' ')}`;
    const embedding = await generateEmbedding(searchableText);
    
    await db.collection('resumes').updateOne(
      { _id: resume._id },
      { $set: { embedding: embedding, searchableText: searchableText } }
    );
  }
}
```

#### 2. Create Search Indexes

```javascript
// Add to your MongoDB setup
db.jobpostings.createIndex({ embedding: "vectorSearch" });
db.resumes.createIndex({ embedding: "vectorSearch" });
```

### Phase 2: Enhanced Search Functions

#### 1. Update Vector Search Functions

```typescript
// Enhanced vector search with multiple search types
export const enhancedVectorSearch = action({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    filters: v.optional(v.object({
      location: v.optional(v.string()),
      experienceLevel: v.optional(v.number()),
      securityClearance: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
    })),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(v.any()),
    queryEmbedding: v.array(v.number()),
    searchType: v.string(),
    filters: v.any(),
  }),
  handler: async (ctx, args) => {
    const queryEmbedding = await generateQueryEmbedding(args.query);
    const limit = args.limit || 10;
    
    let results = [];
    
    if (args.searchType === "jobs" || args.searchType === "both") {
      const jobResults = await searchJobsWithFilters(queryEmbedding, args.filters, limit);
      results.push(...jobResults);
    }
    
    if (args.searchType === "resumes" || args.searchType === "both") {
      const resumeResults = await searchResumesWithFilters(queryEmbedding, args.filters, limit);
      results.push(...resumeResults);
    }
    
    return {
      results,
      queryEmbedding,
      searchType: args.searchType,
      filters: args.filters,
    };
  },
});
```

#### 2. Add Filtering Functions

```typescript
async function searchJobsWithFilters(queryEmbedding: number[], filters: any, limit: number) {
  // Build MongoDB query with filters
  const query: any = { embedding: { $exists: true } };
  
  if (filters?.location) {
    query.location = { $regex: filters.location, $options: 'i' };
  }
  
  if (filters?.securityClearance) {
    query.securityClearance = { $regex: filters.securityClearance, $options: 'i' };
  }
  
  // Get filtered jobs
  const jobs = await db.collection('jobpostings').find(query).toArray();
  
  // Calculate similarities and return top results
  return calculateSimilarities(jobs, queryEmbedding, limit);
}

async function searchResumesWithFilters(queryEmbedding: number[], filters: any, limit: number) {
  const query: any = { embedding: { $exists: true } };
  
  if (filters?.experienceLevel) {
    query['personalInfo.yearsOfExperience'] = { $gte: filters.experienceLevel };
  }
  
  if (filters?.skills) {
    query.skills = { $in: filters.skills };
  }
  
  const resumes = await db.collection('resumes').find(query).toArray();
  return calculateSimilarities(resumes, queryEmbedding, limit);
}
```

### Phase 3: AI Agent Integration

#### 1. Enhanced AI Agent Search

```typescript
export const aiAgentSearch = action({
  args: {
    query: v.string(),
    searchType: v.union(v.literal("jobs"), v.literal("resumes"), v.literal("both")),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    jobs: v.array(v.any()),
    resumes: v.array(v.any()),
    analysis: v.string(),
    recommendations: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Use AI to analyze the query and determine search strategy
    const analysis = await analyzeQueryWithAI(args.query);
    
    // Extract filters from AI analysis
    const filters = extractFiltersFromAnalysis(analysis);
    
    // Perform vector search with extracted filters
    const searchResults = await enhancedVectorSearch({
      query: args.query,
      searchType: args.searchType,
      filters,
      limit: args.limit,
    });
    
    // Generate recommendations based on results
    const recommendations = await generateRecommendations(searchResults, analysis);
    
    return {
      jobs: searchResults.results.filter(r => r.collection === 'jobpostings'),
      resumes: searchResults.results.filter(r => r.collection === 'resumes'),
      analysis,
      recommendations,
    };
  },
});
```

#### 2. Query Analysis Function

```typescript
async function analyzeQueryWithAI(query: string) {
  const prompt = `
    Analyze this search query and extract relevant information:
    Query: "${query}"
    
    Please identify:
    1. Job titles or roles mentioned
    2. Required skills or technologies
    3. Experience level requirements
    4. Location preferences
    5. Industry or sector
    6. Security clearance requirements
    7. Education or certification requirements
    
    Return as JSON format.
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Phase 4: User Interface Integration

#### 1. Search Component with Suggestions

```tsx
// Enhanced search component with prompt suggestions
export function VectorSearchComponent() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"jobs" | "resumes" | "both">("both");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Predefined prompt categories
  const promptCategories = {
    aviation: [
      "Find resumes for Aviation Safety Inspector positions with FAA experience",
      "Search for candidates with aviation safety and operations experience",
    ],
    engineering: [
      "Find resumes for General Engineer positions with technical expertise",
      "Search for candidates with mechanical engineering and design experience",
    ],
    skills: [
      "Find candidates or jobs with Python programming skills",
      "Search for positions or resumes with project management experience",
    ],
  };
  
  const handleSearch = async () => {
    const results = await enhancedVectorSearch({
      query,
      searchType,
      limit: 10,
    });
    // Handle results
  };
  
  return (
    <div>
      <div className="search-container">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query..."
          list="search-suggestions"
        />
        <datalist id="search-suggestions">
          {Object.values(promptCategories).flat().map((suggestion, index) => (
            <option key={index} value={suggestion} />
          ))}
        </datalist>
        
        <select value={searchType} onChange={(e) => setSearchType(e.target.value as any)}>
          <option value="both">Jobs & Resumes</option>
          <option value="jobs">Jobs Only</option>
          <option value="resumes">Resumes Only</option>
        </select>
        
        <button onClick={handleSearch}>Search</button>
      </div>
      
      <div className="prompt-suggestions">
        <h3>Search Suggestions:</h3>
        <div className="suggestion-categories">
          {Object.entries(promptCategories).map(([category, prompts]) => (
            <div key={category} className="category">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              {prompts.slice(0, 3).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(prompt)}
                  className="suggestion-button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 2. Results Display Component

```tsx
export function SearchResultsComponent({ results, searchType }) {
  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };
  
  return (
    <div className="search-results">
      {searchType === "both" || searchType === "jobs" ? (
        <div className="jobs-section">
          <h3>Matching Jobs</h3>
          {results.jobs?.map((job, index) => (
            <div key={index} className="result-card">
              <h4>{job.jobTitle}</h4>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Department:</strong> {job.department}</p>
              <p><strong>Match:</strong> {formatSimilarity(job.similarity)}</p>
              <p>{job.jobSummary?.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      ) : null}
      
      {searchType === "both" || searchType === "resumes" ? (
        <div className="resumes-section">
          <h3>Matching Resumes</h3>
          {results.resumes?.map((resume, index) => (
            <div key={index} className="result-card">
              <h4>{resume.personalInfo?.firstName} {resume.personalInfo?.lastName}</h4>
              <p><strong>Experience:</strong> {resume.personalInfo?.yearsOfExperience} years</p>
              <p><strong>Match:</strong> {formatSimilarity(resume.similarity)}</p>
              <p>{resume.professionalSummary?.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

## Usage Examples

### Example 1: Aviation Safety Search
```javascript
// Search for aviation safety positions
const results = await enhancedVectorSearch({
  query: "Find resumes for Aviation Safety Inspector positions with FAA experience",
  searchType: "resumes",
  filters: {
    skills: ["aviation", "safety", "FAA"],
    experienceLevel: 5,
  },
  limit: 10,
});
```

### Example 2: Engineering Skills Search
```javascript
// Search for engineering positions with specific skills
const results = await enhancedVectorSearch({
  query: "Find resumes for Computer Engineer positions with software development skills",
  searchType: "resumes",
  filters: {
    skills: ["Python", "JavaScript", "software development"],
    location: "California",
  },
  limit: 15,
});
```

### Example 3: Government Security Clearance Search
```javascript
// Search for government positions requiring clearance
const results = await enhancedVectorSearch({
  query: "Find resumes for government positions requiring security clearance",
  searchType: "resumes",
  filters: {
    securityClearance: "TS/SCI",
    experienceLevel: 8,
  },
  limit: 10,
});
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache frequently used embeddings
const embeddingCache = new Map();

async function getCachedEmbedding(text: string) {
  const hash = createHash(text);
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash);
  }
  
  const embedding = await generateQueryEmbedding(text);
  embeddingCache.set(hash, embedding);
  return embedding;
}
```

### 2. Batch Processing
```typescript
// Process multiple queries in batch
async function batchVectorSearch(queries: string[]) {
  const embeddings = await Promise.all(
    queries.map(query => generateQueryEmbedding(query))
  );
  
  return embeddings.map((embedding, index) => ({
    query: queries[index],
    embedding,
  }));
}
```

### 3. Index Optimization
```javascript
// Create compound indexes for better performance
db.jobpostings.createIndex({ 
  "location": 1, 
  "securityClearance": 1, 
  "embedding": "vectorSearch" 
});

db.resumes.createIndex({ 
  "personalInfo.yearsOfExperience": 1, 
  "skills": 1, 
  "embedding": "vectorSearch" 
});
```

## Monitoring and Analytics

### 1. Search Analytics
```typescript
// Track search performance and usage
export const logSearchAnalytics = action({
  args: {
    query: v.string(),
    searchType: v.string(),
    resultsCount: v.number(),
    responseTime: v.number(),
    filters: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.logs.create, {
      userId: "system",
      action: "vector_search",
      type: "action",
      details: {
        query: args.query,
        searchType: args.searchType,
        resultsCount: args.resultsCount,
        responseTime: args.responseTime,
        filters: args.filters,
      },
      createdAt: Date.now(),
    });
  },
});
```

### 2. Performance Metrics
```typescript
// Monitor vector search performance
export const getSearchMetrics = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("logs")
      .withIndex("by_type", (q) => q.eq("type", "action"))
      .filter((q) => q.eq(q.field("action"), "vector_search"))
      .collect();
    
    return {
      totalSearches: logs.length,
      averageResponseTime: logs.reduce((sum, log) => sum + log.details.responseTime, 0) / logs.length,
      popularQueries: getPopularQueries(logs),
    };
  },
});
```

## Next Steps

1. **Implement the enhanced vector search functions** with filtering capabilities
2. **Generate embeddings** for all existing data
3. **Create the user interface** with search suggestions
4. **Add monitoring and analytics** to track performance
5. **Test with real queries** using the provided prompts
6. **Optimize based on usage patterns** and performance metrics

This implementation will provide a powerful, AI-driven vector search system specifically tailored to your job posting and resume matching needs. 