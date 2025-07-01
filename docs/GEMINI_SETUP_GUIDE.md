# Gemini-Powered Vector Search Setup Guide

## Overview

This guide covers the migration from OpenAI to Gemini AI for vector search embeddings and the implementation of optimized multi-embedding data structures for enhanced search capabilities.

## Key Changes

### 1. AI Provider Migration
- **From**: OpenAI `text-embedding-ada-002` (1536 dimensions)
- **To**: Google Gemini `embedding-001` (768 dimensions)
- **Benefits**: Better performance, lower costs, improved semantic understanding

### 2. Multi-Embedding Architecture
Instead of a single embedding per document, we now generate multiple specialized embeddings:

#### For Job Postings:
- `titleEmbedding`: Job title only
- `summaryEmbedding`: Job summary and description
- `requirementsEmbedding`: Requirements and qualifications
- `dutiesEmbedding`: Job duties and responsibilities
- `combinedEmbedding`: All job information combined

#### For Resumes:
- `nameEmbedding`: Candidate name
- `summaryEmbedding`: Professional summary
- `skillsEmbedding`: Skills and competencies
- `experienceEmbedding`: Work experience
- `educationEmbedding`: Education and training
- `combinedEmbedding`: All resume information combined

## Setup Instructions

### 1. Environment Configuration

Ensure your `.env.local` file contains:
```bash
# Gemini AI API Key (using OPENAI_API_KEY variable name for compatibility)
OPENAI_API_KEY=your_gemini_api_key_here

# MongoDB credentials
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password
MONGODB_CLUSTER=your_mongodb_cluster
```

### 2. Install Dependencies

The required dependencies are already included in `package.json`:
```json
{
  "@google/generative-ai": "^0.2.1"
}
```

### 3. Test Gemini Embeddings

Run the test script to verify Gemini AI integration:
```bash
node tests/test_gemini_embeddings.js
```

This will:
- Test basic embedding generation
- Verify multi-embedding functionality
- Measure performance metrics
- Simulate search scenarios

### 4. Import Data with Gemini Embeddings

Use the new Gemini-powered import script:
```bash
node mongodb_jobpostings_gemini.js
```

This script will:
- Read the Excel file (`usajobs_data_formatted.xlsx`)
- Analyze data structure using Gemini AI for optimal chunking
- Generate multiple embeddings for each job posting
- Store optimized data structure in MongoDB

### 5. MongoDB Atlas Vector Search Setup

Create vector search indexes for the new multi-embedding structure:

#### For Job Postings Collection:
```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embeddings.titleEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.summaryEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.requirementsEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.dutiesEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.combinedEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "jobTitle": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "department": {
        "type": "string"
      }
    }
  }
}
```

#### For Resumes Collection:
```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embeddings.nameEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.summaryEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.skillsEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.experienceEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.educationEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "embeddings.combinedEmbedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "processedMetadata.name": {
        "type": "string"
      },
      "processedMetadata.email": {
        "type": "string"
      }
    }
  }
}
```

## Usage Examples

### 1. Basic Vector Search

```typescript
// Search jobs by title
const titleResults = await ctx.runAction(api.vectorSearch.multiEmbeddingJobSearch, {
  query: "Software Engineer",
  embeddingType: "title",
  limit: 5
});

// Search jobs by requirements
const requirementsResults = await ctx.runAction(api.vectorSearch.multiEmbeddingJobSearch, {
  query: "Python JavaScript AWS",
  embeddingType: "requirements",
  limit: 5
});
```

### 2. Enhanced Search with Skill Filtering

```typescript
// Enhanced search with skill filtering
const enhancedResults = await ctx.runAction(api.vectorSearch.searchSimilarJobsEnhanced, {
  query: "Python developer with cloud experience",
  limit: 10,
  minSimilarity: 0.4,
  skillFilter: ["Python", "AWS", "JavaScript"]
});
```

### 3. Multi-Embedding Resume Search

```typescript
// Search resumes by skills
const skillsResults = await ctx.runAction(api.vectorSearch.multiEmbeddingResumeSearch, {
  query: "Python machine learning data science",
  embeddingType: "skills",
  limit: 5
});

// Search resumes by experience
const experienceResults = await ctx.runAction(api.vectorSearch.multiEmbeddingResumeSearch, {
  query: "Senior software engineer with 5+ years experience",
  embeddingType: "experience",
  limit: 5
});
```

## Performance Optimizations

### 1. Parallel Embedding Generation
The system generates multiple embeddings in parallel for efficiency:
```typescript
const [titleEmbedding, summaryEmbedding, requirementsEmbedding, dutiesEmbedding, combinedEmbedding] = 
  await Promise.all([
    titleText ? generateGeminiEmbedding(titleText) : [],
    summaryText ? generateGeminiEmbedding(summaryText) : [],
    requirementsText ? generateGeminiEmbedding(requirementsText) : [],
    dutiesText ? generateGeminiEmbedding(dutiesText) : [],
    combinedText ? generateGeminiEmbedding(combinedText) : []
  ]);
```

### 2. Rate Limiting
Built-in rate limiting to avoid overwhelming the Gemini API:
```typescript
// Add delay between API calls
await new Promise(resolve => setTimeout(resolve, 200));
```

### 3. Caching Strategy
Consider implementing embedding caching for frequently accessed content.

## Data Structure Changes

### Before (Single Embedding):
```json
{
  "jobTitle": "Software Engineer",
  "jobSummary": "...",
  "requirements": "...",
  "embedding": [0.1, 0.2, ...] // 1536 dimensions
}
```

### After (Multi-Embedding):
```json
{
  "jobTitle": "Software Engineer",
  "jobSummary": "...",
  "requirements": "...",
  "searchableText": {
    "title": "Software Engineer",
    "summary": "...",
    "requirements": "...",
    "duties": "...",
    "combined": "..."
  },
  "embeddings": {
    "titleEmbedding": [0.1, 0.2, ...], // 768 dimensions
    "summaryEmbedding": [0.3, 0.4, ...],
    "requirementsEmbedding": [0.5, 0.6, ...],
    "dutiesEmbedding": [0.7, 0.8, ...],
    "combinedEmbedding": [0.9, 1.0, ...]
  },
  "_metadata": {
    "embeddingModel": "gemini-embedding-001",
    "chunkingStrategy": ["title", "summary", "requirements", "duties", "combined"]
  }
}
```

## Migration Checklist

- [ ] Update environment variables with Gemini API key
- [ ] Test Gemini embeddings functionality
- [ ] Run new import script with multi-embedding structure
- [ ] Update MongoDB Atlas vector search indexes
- [ ] Test new search functions
- [ ] Update frontend to use new search endpoints
- [ ] Monitor performance and adjust similarity thresholds
- [ ] Implement caching if needed

## Troubleshooting

### Common Issues:

1. **API Key Errors**: Ensure `OPENAI_API_KEY` contains a valid Gemini API key
2. **Dimension Mismatch**: Verify all embeddings use 768 dimensions (Gemini standard)
3. **Rate Limiting**: Increase delays between API calls if hitting rate limits
4. **Memory Issues**: Process data in smaller batches for large datasets

### Performance Monitoring:

- Monitor embedding generation time per document
- Track search response times
- Monitor API usage and costs
- Adjust similarity thresholds based on search quality

## Benefits of the New System

1. **Better Search Precision**: Multi-embedding approach captures different aspects of content
2. **Cost Efficiency**: Gemini embeddings are more cost-effective than OpenAI
3. **Improved Performance**: 768 dimensions vs 1536 reduces storage and computation
4. **Flexible Search**: Users can search specific aspects (title, requirements, etc.)
5. **AI-Powered Optimization**: Gemini AI analyzes data structure for optimal chunking

## Next Steps

1. Implement the new system in production
2. Gather user feedback on search quality
3. Fine-tune similarity thresholds
4. Consider implementing hybrid search (vector + keyword)
5. Explore advanced features like semantic clustering 