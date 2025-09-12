# Vector-Aware Embedding Service Migration Guide

## Overview

This guide covers the migration from separate embedding services (`embeddingService.ts`, `enhancedEmbeddingService.ts`, `embeddingManagement.ts`) to the new consolidated **Vector-Aware Embedding Service** that integrates with the 235 vector search prompts and implements dynamic prompt learning.

## Key Improvements

### 1. **Consolidated Architecture**
- Single service handling all embedding operations
- Unified API for job postings, resumes, and user queries
- Consistent error handling and validation

### 2. **Vector Search Prompt Integration**
- Embeddings enhanced with relevant prompts from `VECTOR_SEARCH_PROMPTS.md`
- Context-aware enhancement based on document type and content
- Dynamic skill extraction and categorization

### 3. **Dynamic Prompt Learning**
- User queries automatically captured and analyzed
- Frequently used novel queries suggested for prompt library
- Continuous improvement of embedding quality

### 4. **Enhanced Search Capabilities**
- Multi-dimensional similarity search
- Industry, skill, and location context awareness
- Confidence scoring for embedding quality

## Architecture

```
vectorEmbeddingService.ts
├── generateVectorAwareEmbedding (action)
├── generateBatchVectorEmbeddings (action)
├── vectorAwareSemanticSearch (action)
├── updateDocumentEmbedding (mutation)
├── storeUserQuery (mutation)
└── getNovelUserQueries (query)

Schema: userQueries table
├── query: string
├── promptsUsed: string[]
├── confidence: number
├── timestamp: number
├── addedToPrompts: boolean
└── effectiveness: number
```

## Migration Steps

### 1. **Pre-Migration Setup**

```bash
# Backup existing embeddings
node scripts/migrate-to-vector-embeddings.mjs --backup-only

# Validate current state
node scripts/migrate-to-vector-embeddings.mjs --validate-only
```

### 2. **Run Migration**

```bash
# Full migration with validation
node scripts/migrate-to-vector-embeddings.mjs

# Check migration report
ls backups/embeddings/migration-report-*.json
```

### 3. **Frontend Updates**

The following components have been updated:

#### **EmbeddingManagement.tsx**
- Uses `generateBatchVectorEmbeddings` for embedding generation
- Displays novel user queries for prompt enhancement
- Shows vector prompt usage statistics

#### **EnhancedSearchInterface.tsx**
- Uses `vectorAwareSemanticSearch` for all searches
- Passes context (skills, location, experience) to improve results
- Automatically captures user queries for learning

### 4. **Environment Configuration**

Ensure these environment variables are set:

```env
GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_CONVEX_URL=your_convex_deployment_url
```

## New Features

### 1. **Prompt-Enhanced Embeddings**

The service now enhances text with relevant vector search prompts:

```typescript
// Example: Job posting enhanced with relevant prompts
const embeddingResult = await generateVectorAwareEmbedding({
  text: "Senior React Developer position...",
  context: {
    type: "job_posting",
    industry: "technology",
    skills: ["React", "JavaScript", "TypeScript"],
    location: "San Francisco",
    experience_level: "senior"
  },
  usePromptEnhancement: true,
  useSkillEnhancement: true
});

// Result includes:
// - Enhanced text with prompt context
// - Extracted skills with categories
// - Confidence score
// - Prompts used for enhancement
```

### 2. **Dynamic Query Learning**

User searches are automatically captured and analyzed:

```typescript
// Automatic capture when users search
await vectorAwareSemanticSearch({
  query: "iOS developer with SwiftUI experience",
  targetCollection: "both",
  context: { skills: ["iOS", "SwiftUI"] }
});

// Query stored in userQueries table
// Novel queries suggested in admin interface
```

### 3. **Enhanced Search Results**

Search results now include enhanced metadata:

```typescript
{
  query: "React developer",
  queryEmbedding: {
    extractedSkills: ["React", "JavaScript"],
    confidence: 0.85,
    promptsUsed: ["software-engineer-react", "frontend-developer"]
  },
  results: {
    resumes: [...],
    jobpostings: [...]
  }
}
```

## Vector Search Prompt Categories

The system uses 235 predefined prompts organized by:

- **Job-to-Resume Matching** (Aviation, Engineering, General)
- **Resume-to-Job Matching** (Experience-based, Skill-based)
- **Skill-Specific Searches** (Technical, Professional)
- **Location-Based Searches** (Cities, Regions, Remote)
- **Experience-Level Searches** (Entry to Executive)
- **Industry-Specific Searches** (Aviation, Government, Technology)

## Admin Interface Enhancements

### 1. **Embedding Management**
- Vector-aware embedding generation
- Novel query suggestions
- Prompt usage analytics
- Enhanced statistics with confidence scores

### 2. **Search Interface**
- Context-aware search options
- Real-time prompt learning
- Enhanced filtering with skill categories

## Performance Considerations

### 1. **Batch Processing**
- Default batch size: 10 documents
- Rate limiting: 200ms between batches
- Configurable batch sizes for different workloads

### 2. **Caching Strategy**
- Embeddings cached with 30-day expiration
- Prompt relevance scores cached
- User query patterns cached for analytics

### 3. **Cost Optimization**
- Smart regeneration (only when needed)
- Confidence-based quality thresholds
- Efficient prompt selection algorithms

## Monitoring and Analytics

### 1. **Embedding Quality Metrics**
- Coverage percentage by collection
- Average confidence scores
- Skill extraction accuracy
- Prompt usage effectiveness

### 2. **Search Performance**
- Query response times
- Result relevance scores
- User query patterns
- Novel query identification

### 3. **System Health**
- API rate limit monitoring
- Error rate tracking
- Batch processing status
- Migration validation results

## Troubleshooting

### Common Issues

#### 1. **Migration Failures**
```bash
# Check backup integrity
node scripts/migrate-to-vector-embeddings.mjs --validate-only

# Re-run failed collections
# Edit script to target specific collections
```

#### 2. **Low Confidence Scores**
```typescript
// Improve skill extraction
// Add more specific prompts to static library
// Increase batch processing quality thresholds
```

#### 3. **Search Result Quality**
```typescript
// Adjust similarity thresholds
// Update prompt relevance scoring
// Review user query learning effectiveness
```

## Best Practices

### 1. **Embedding Generation**
- Run during off-peak hours for large collections
- Monitor API rate limits
- Use force regeneration sparingly
- Validate embeddings after generation

### 2. **Prompt Management**
- Regularly review novel queries
- Add high-frequency patterns to static prompts
- Update prompt effectiveness scores
- Maintain prompt category balance

### 3. **Search Optimization**
- Use appropriate similarity thresholds (0.5-0.7 for HR)
- Provide context when available
- Monitor user query patterns
- A/B test prompt enhancements

## API Reference

### Core Actions

#### `generateVectorAwareEmbedding`
```typescript
await ctx.runAction(api.vectorEmbeddingService.generateVectorAwareEmbedding, {
  text: string,
  context: {
    type: "resume" | "job_posting" | "user_query",
    industry?: string,
    skills?: string[],
    location?: string,
    experience_level?: string
  },
  usePromptEnhancement?: boolean,
  useSkillEnhancement?: boolean
});
```

#### `vectorAwareSemanticSearch`
```typescript
await ctx.runAction(api.vectorEmbeddingService.vectorAwareSemanticSearch, {
  query: string,
  targetCollection: "resumes" | "jobpostings" | "both",
  limit?: number,
  minSimilarity?: number,
  context?: {
    industry?: string,
    skills?: string[],
    location?: string,
    experience_level?: string
  }
});
```

#### `generateBatchVectorEmbeddings`
```typescript
await ctx.runAction(api.vectorEmbeddingService.generateBatchVectorEmbeddings, {
  collection: "resumes" | "jobpostings",
  documentIds?: string[],
  batchSize?: number,
  forceRegenerate?: boolean
});
```

### Query Functions

#### `getNovelUserQueries`
```typescript
await ctx.runQuery(api.vectorEmbeddingService.getNovelUserQueries, {
  minUsageCount?: number,
  limit?: number
});
```

## Future Enhancements

### 1. **Machine Learning Integration**
- Automated prompt generation
- Intelligent skill categorization
- Predictive search suggestions

### 2. **Real-time Analytics**
- Live search result optimization
- Dynamic prompt weighting
- User behavior analysis

### 3. **Advanced Features**
- Multi-language support
- Industry-specific models
- Custom embedding fine-tuning

## Support

For migration issues or questions:

1. Check the migration report for detailed analysis
2. Review logs in `logs/embedding-regeneration-*.log`
3. Validate using the migration script validation mode
4. Monitor embedding quality through the admin interface

## Conclusion

The Vector-Aware Embedding Service provides a robust foundation for semantic search with continuous learning capabilities. The migration preserves existing functionality while adding significant enhancements for prompt-aware embedding generation and dynamic query learning.

Regular monitoring and maintenance of the prompt library will ensure optimal search performance and user experience.
