# Semantic Search Implementation - Phase 1: Schema Updates

## Overview
Phase 1 implements the foundational schema changes required to enable semantic search capabilities in the AJAI application using Convex's built-in vector search with Gemini MRL 2048 embeddings.

## Schema Changes

### 1. Job Postings Table
Added new fields for semantic search:
- `completeSearchableText`: Aggregated, deduplicated content from all searchable fields
- `embeddingModel`: Tracks which AI model generated the embedding
- `embeddingGeneratedAt`: Timestamp for embedding freshness tracking

**Fields aggregated into completeSearchableText:**
- job summary
- job type
- job title
- location
- qualifications
- requirements
- searchable text
- experienceRequired
- educationRequired
- duties
- closeDate

### 2. Resumes Table
Added new fields for semantic search:
- `completeSearchableText`: Aggregated, deduplicated content from all searchable fields
- `embeddingModel`: Tracks which AI model generated the embedding
- `embeddingGeneratedAt`: Timestamp for embedding freshness tracking

**Fields aggregated into completeSearchableText:**
- certifications
- education
- experience
- originalText
- skills
- professionalSummary
- searchableText

### 3. KFC Points Table
Added embedding fields for semantic search:
- `embedding`: Vector representation using Gemini MRL 2048
- `embeddingModel`: Tracks which AI model generated the embedding
- `embeddingGeneratedAt`: Timestamp for embedding freshness tracking

## New Indexes
Added performance indexes for vector search:
- `by_embedding`: Vector similarity search
- `by_embedding_model`: Filter by embedding model
- `by_embedding_generated`: Sort by embedding generation time

## Setup Script
Created `scripts/setup-semantic-search.js` to:
- Populate `completeSearchableText` fields for existing data
- Remove duplicate strings during aggregation
- Set initial embedding model and timestamp values

## Usage

### Running the Setup Script
```bash
cd scripts
node setup-semantic-search.js
```

### Environment Variables Required
- `VITE_CONVEX_URL`: Your Convex deployment URL

## Next Steps (Phase 2)
1. **Embedding Service**: Implement Gemini MRL 2048 integration
2. **Vector Generation**: Create embeddings for all `completeSearchableText` content
3. **Search Functions**: Implement Convex functions for semantic search
4. **Frontend Integration**: Build React hooks and search interface

## Technical Notes

### Embedding Dimensions
- **Gemini MRL 2048**: 2048-dimensional vectors
- **Storage**: Stored as `v.array(v.number())` in Convex
- **Future Migration**: Ready for Convex `v.vector()` when available

### Data Deduplication
- Removes duplicate strings during text aggregation
- Ensures efficient embedding generation
- Maintains data quality for semantic search

### Performance Considerations
- New indexes optimize vector similarity queries
- Embedding timestamps enable freshness tracking
- Model tracking supports multi-model deployments

## Security & Access Control
- **Schema changes**: Only affect data structure, no security implications
- **Embedding fields**: Optional fields, backward compatible
- **Access patterns**: Follow existing table-level permissions

## Migration Notes
- **Backward compatible**: Existing data remains functional
- **Gradual rollout**: New fields can be populated incrementally
- **Rollback capability**: Schema changes can be reverted if needed
