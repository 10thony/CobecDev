# MongoDB to Convex Migration Guide

## 🎯 Overview

This guide covers the complete migration of the AJAI application from MongoDB to Convex, specifically focusing on **job postings** and **resumes** with vector search capabilities. The migration preserves all existing data while enabling real-time updates and improved performance through Convex's native capabilities.

## 🏗️ Architecture Changes

### Before (MongoDB)
- **Data Storage**: MongoDB Atlas/local with manual connection management
- **Vector Search**: Custom implementation with MongoDB queries
- **Real-time**: Polling-based updates
- **Scalability**: Manual infrastructure management

### After (Convex)
- **Data Storage**: Convex with automatic scaling and edge deployment
- **Vector Search**: Native Convex queries with optimized indexes
- **Real-time**: Automatic live subscriptions
- **Scalability**: Built-in scaling with pay-per-use model

## 📋 Prerequisites

### Environment Variables
Ensure these are configured in your `.env` file:

```env
# Convex Configuration
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_URL=https://your-deployment.convex.cloud

# MongoDB (for migration source)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=workdemos
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password

# AI Services (for embeddings)
GOOGLE_AI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

### Dependencies
```bash
npm install convex@latest
npm install @google/generative-ai
npm install mongodb
```

## 🚀 Migration Process

### Step 1: Schema Update
The Convex schema has been updated to support vector search:

```typescript
// Job Postings with vector support
jobpostings: defineTable({
  // ... existing fields ...
  embedding: v.optional(v.array(v.number())), // Will migrate to v.vector() when available
  searchableText: v.optional(v.string()),
  extractedSkills: v.optional(v.array(v.string())),
}).index("by_embedding", ["embedding"]);

// Resumes with vector support  
resumes: defineTable({
  // ... existing fields ...
  embedding: v.optional(v.array(v.number())), // Will migrate to v.vector() when available
  searchableText: v.optional(v.string()),
  extractedSkills: v.optional(v.array(v.string())),
}).index("by_embedding", ["embedding"]);
```

### Step 2: Deploy Schema Changes
```bash
# Deploy the updated schema to Convex
npx convex dev --once
```

### Step 3: Run Migration
Use the migration script to move data from MongoDB to Convex:

```bash
# Check current migration status
node scripts/migrate-to-convex.js --status

# Migrate job postings only
node scripts/migrate-to-convex.js --jobs

# Migrate resumes only
node scripts/migrate-to-convex.js --resumes

# Migrate both (recommended)
node scripts/migrate-to-convex.js --all

# Clean up MongoDB data after successful migration
node scripts/migrate-to-convex.js --cleanup
```

## 🔧 Migration Script Options

| Option | Description |
|--------|-------------|
| `--status` | Check current migration progress |
| `--jobs` | Migrate job postings only |
| `--resumes` | Migrate resumes only |
| `--all` | Migrate both jobs and resumes |
| `--cleanup` | Remove MongoDB data after migration |

## 📊 Migration Progress Tracking

The migration script provides real-time progress updates:

```
📊 Migration Progress:
   Jobs: 150/200 (75.0%)
   Resumes: 80/100 (80.0%)

🔄 Migration is in progress...
   Continue running migration until complete.
```

## 🎯 Vector Search Functions

### New Convex Functions

#### `convexVectorSearch.searchJobsByVector`
- **Purpose**: Semantic search for job postings
- **Features**: Skill matching, similarity scoring, filtering
- **Usage**: 
```typescript
const results = await convex.query('convexVectorSearch:searchJobsByVector', {
  query: "software engineer with React experience",
  limit: 10,
  filters: { location: "Remote", department: "Engineering" }
});
```

#### `convexVectorSearch.searchResumesByVector`
- **Purpose**: Semantic search for resumes
- **Features**: Skill matching, experience filtering, similarity scoring
- **Usage**:
```typescript
const results = await convex.query('convexVectorSearch:searchResumesByVector', {
  query: "iOS developer with Swift experience",
  limit: 10,
  filters: { skills: ["Swift", "iOS"], experienceLevel: "senior" }
});
```

#### `convexVectorSearch.aiAgentSearch`
- **Purpose**: Combined search across jobs and resumes
- **Features**: AI analysis, recommendations, cross-matching
- **Usage**:
```typescript
const results = await convex.query('convexVectorSearch:aiAgentSearch', {
  query: "full-stack developer",
  searchType: "both",
  limit: 20
});
```

## 🔄 Data Migration Details

### Job Postings Migration
- **Source**: MongoDB `jobpostings` collection
- **Processing**: Generates embeddings for job descriptions
- **Skills**: Extracts technical skills automatically
- **Metadata**: Preserves import history and source information

### Resumes Migration
- **Source**: MongoDB `resumes` collection
- **Processing**: Generates embeddings for resume content
- **Skills**: Extracts skills from experience and education
- **Metadata**: Preserves file information and parsing history

### Embedding Generation
- **Model**: Google Gemini `embedding-001`
- **Dimensions**: 768 (optimized for semantic search)
- **Text Processing**: Combines relevant fields for context
- **Fallback**: Handles missing or malformed data gracefully

## 🧪 Testing Migration

### 1. Verify Data Counts
```bash
node scripts/migrate-to-convex.js --status
```

### 2. Test Vector Search
```typescript
// Test job search
const jobResults = await convex.query('convexVectorSearch:searchJobsByVector', {
  query: "software engineer",
  limit: 5
});

// Test resume search
const resumeResults = await convex.query('convexVectorSearch:searchResumesByVector', {
  query: "React developer",
  limit: 5
});
```

### 3. Validate Real-time Updates
```typescript
// Subscribe to real-time updates
const jobs = useQuery('jobPostings:list');
const resumes = useQuery('resumes:list');
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Migration Fails with "Job Already Exists"
**Cause**: Duplicate migration attempts
**Solution**: Migration automatically skips existing records

#### 2. Embedding Generation Fails
**Cause**: Missing or invalid AI API keys
**Solution**: Verify `GOOGLE_AI_API_KEY` is set correctly

#### 3. MongoDB Connection Issues
**Cause**: Network or authentication problems
**Solution**: Check MongoDB connection string and credentials

#### 4. Convex Deployment Errors
**Cause**: Schema validation failures
**Solution**: Run `npx convex dev --once` to see detailed errors

### Error Recovery

#### Partial Migration Recovery
```bash
# Check what was migrated
node scripts/migrate-to-convex.js --status

# Continue migration from where it left off
node scripts/migrate-to-convex.js --all
```

#### Data Validation
```typescript
// Verify data integrity
const convexJobs = await convex.query('jobPostings:list');
const convexResumes = await convex.query('resumes:list');

console.log(`Convex: ${convexJobs.length} jobs, ${convexResumes.length} resumes`);
```

## 🔒 Security Considerations

### API Key Management
- **Never commit API keys** to version control
- **Use environment variables** for all sensitive data
- **Rotate keys regularly** for production environments

### Data Access Control
- **Convex automatically handles** authentication through Clerk
- **Role-based access** is preserved during migration
- **Vector search results** respect user permissions

## 📈 Performance Optimization

### Indexing Strategy
- **Vector indexes** for semantic search
- **Traditional indexes** for filtering and sorting
- **Composite indexes** for complex queries

### Query Optimization
- **Batch processing** during migration
- **Lazy loading** for large datasets
- **Caching** through Convex's built-in optimizations

## 🎉 Post-Migration Steps

### 1. Update Frontend Components
Replace MongoDB service calls with Convex queries:

```typescript
// Before (MongoDB)
const jobs = await mongoService.searchJobs(query);

// After (Convex)
const jobs = await convex.query('convexVectorSearch:searchJobsByVector', { query });
```

### 2. Implement Real-time Subscriptions
```typescript
// Real-time job updates
const jobs = useQuery('jobPostings:list');

// Real-time resume updates  
const resumes = useQuery('resumes:list');
```

### 3. Remove MongoDB Dependencies
```bash
# Remove MongoDB packages
npm uninstall mongodb

# Update import statements
# Remove MongoDB service files
```

### 4. Monitor Performance
- **Vector search response times**
- **Real-time update latency**
- **Resource usage and costs**

## 🔮 Future Enhancements

### Vector Type Migration
When Convex supports `v.vector()` types:
1. Update schema to use proper vector types
2. Migrate existing array embeddings
3. Optimize vector search performance

### Advanced Vector Features
- **Multi-modal embeddings** for documents and images
- **Hybrid search** combining vector and traditional queries
- **Semantic clustering** for data organization

## 📞 Support

### Migration Issues
1. Check the troubleshooting section above
2. Review Convex logs: `npx convex logs`
3. Verify environment variables and configuration

### Performance Issues
1. Monitor query performance in Convex dashboard
2. Check index usage and optimization
3. Review vector search parameters and thresholds

---

**Migration Status**: ✅ **Ready for Production**

**Last Updated**: December 2024  
**Convex Version**: 1.24.8+  
**Vector Support**: Array-based (migration-ready for v.vector())
