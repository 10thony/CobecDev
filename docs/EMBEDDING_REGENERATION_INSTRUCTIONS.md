# Embedding Regeneration Instructions

## ✅ Prerequisites Completed

1. ✅ **63 semantic questions** successfully seeded in database
2. ✅ Questions properly categorized:
   - 27 job_posting questions
   - 22 resume questions
   - 14 general questions
3. ✅ All questions marked as active
4. ✅ Convex functions deployed and ready

## 📊 Current State

- **Job Postings**: 100 documents with old embeddings
- **Resumes**: 100 documents with old embeddings
- **Questions**: 63 active semantic questions ready to use
- **Total Documents**: 200 requiring embedding regeneration

## 🔄 Regeneration Options

### Option 1: Use Semantic Embedding Service (Automated)

The semantic embedding service will:
1. Load all active semantic questions for the category
2. Generate Q&A pairs for each document
3. Create enhanced text combining original text + Q&A
4. Generate embeddings from the enhanced text
5. Update documents with new embeddings

**Command:**
```bash
# Regenerate all embeddings (both resumes and job postings)
npx convex run semanticEmbeddingService:regenerateAllEmbeddings '{}'

# Or regenerate one collection at a time
npx convex run semanticEmbeddingService:batchRegenerateEmbeddings '{"collection":"resumes","batchSize":5,"delayMs":2000}'

npx convex run semanticEmbeddingService:batchRegenerateEmbeddings '{"collection":"jobpostings","batchSize":5,"delayMs":2000}'
```

**Parameters:**
- `batchSize`: Number of documents to process simultaneously (default: 5)
- `delayMs`: Delay between batches to avoid rate limits (default: 1000ms)

### Option 2: Use Frontend UI (Interactive)

If the backend functions fail due to API rate limits or other issues:

1. Navigate to the **Questions Page** in your application
2. Look for an "Embedding Management" or "Regenerate Embeddings" section
3. Select the collection (resumes or job postings)
4. Click "Regenerate" button
5. Monitor progress through the UI
6. System will handle batching and rate limiting automatically

### Option 3: Gradual Regeneration (Safest)

Process documents in smaller batches over time:

```bash
# Process first 10 resumes
npx convex run semanticEmbeddingService:batchRegenerateEmbeddings '{"collection":"resumes","batchSize":2,"delayMs":3000}'

# Wait 5 minutes, then process next batch
# Repeat until all documents are processed
```

## ⚠️ Important Notes

### API Rate Limits
- OpenAI API has rate limits (typically 3,500 requests/minute for embeddings)
- Each document requires:
  - 1 embedding API call for the final embedding
  - Potentially multiple API calls if using GPT for Q&A generation
- **Recommended**: Start with small batches (batchSize: 2-5) and longer delays (delayMs: 2000-3000)

### Processing Time Estimates
With conservative settings (batchSize: 5, delayMs: 2000):
- **Per document**: ~2-5 seconds
- **100 resumes**: ~3-8 minutes
- **100 job postings**: ~3-8 minutes
- **Total**: ~6-16 minutes for all 200 documents

### Cost Estimates (OpenAI API)
Using `text-embedding-3-small` model:
- **Cost per 1M tokens**: $0.02
- **Average tokens per document**: ~1,000-2,000 (with semantic enhancement)
- **Estimated cost for 200 documents**: $0.04-$0.08 USD

## 🔍 Monitoring Progress

### Check Embedding Stats
```bash
npx convex run semanticEmbeddingService:getSemanticEmbeddingStats
```

This will show:
- Total documents in each collection
- Documents with embeddings
- Documents with recent embeddings (last 7 days)
- Semantic questions usage statistics

### Check Logs
Monitor the Convex dashboard logs for:
- Successful embedding generation messages
- Error messages if API calls fail
- Progress updates (e.g., "Processing document 5 of 100")

## 🐛 Troubleshooting

### Error: "Failed to generate embedding"

**Possible Causes:**
1. OpenAI API key not set or invalid
2. API rate limit exceeded
3. Network connectivity issues

**Solutions:**
1. Verify API key in environment variables
2. Reduce batch size and increase delay
3. Check OpenAI account status and billing

### Error: "Function execution timed out"

**Possible Causes:**
1. Batch size too large
2. Documents too large
3. API responses slow

**Solutions:**
1. Reduce batchSize to 2-3
2. Increase delayMs to 3000-5000
3. Process collections separately instead of all at once

### Error: "No active questions found"

**Possible Causes:**
1. Questions not properly seeded
2. Questions marked as inactive
3. Wrong category selected

**Solutions:**
1. Run: `npx convex run semanticQuestions:getStats`
2. Verify questions are active
3. Re-seed if necessary: `npx convex run seedSemanticQuestions:seed`

## ✅ Verification After Regeneration

### 1. Check Stats
```bash
npx convex run semanticEmbeddingService:getSemanticEmbeddingStats
```

Look for:
- `withRecentEmbeddings` should equal total count for both collections
- `coverage` should be 100% for both

### 2. Test Search Quality
```bash
# Test semantic search with a query
npx convex run vectorSearch:searchResumesWithEmbedding '{"query":"software engineer with Python and AWS experience","limit":5}'

npx convex run vectorSearch:searchJobPostingsWithEmbedding '{"query":"senior engineer position requiring security clearance","limit":5}'
```

### 3. Verify Embedding Dimensions
New embeddings should have:
- Model: `text-embedding-3-small` or `text-embedding-3-large`
- Dimensions: 1536 (small) or 3072 (large)
- `embeddingGeneratedAt` timestamp should be recent

## 📈 Expected Improvements

After regeneration, you should see:
1. **Better Match Quality**: More relevant results in semantic searches
2. **Improved Relevance Scores**: Higher similarity scores for truly matching documents
3. **Better Understanding**: System understands aviation, government, and technical terminology
4. **Enhanced Context**: Embeddings capture requirements, skills, experience levels, and locations

## 📚 Next Steps After Successful Regeneration

1. **Test Searches**: Try various search queries to verify improved results
2. **Monitor Performance**: Check search speed and relevance
3. **Adjust Questions**: Based on results, you can:
   - Add more questions for underrepresented areas
   - Adjust question weights
   - Disable questions that don't improve results
4. **Schedule Regular Updates**: Consider regenerating embeddings:
   - When new questions are added
   - When documents are significantly updated
   - Periodically (e.g., monthly) to maintain quality

## 🚀 Ready to Start?

If you're ready to regenerate embeddings, start with the safest approach:

```bash
# Test with just 5 resumes first
npx convex run semanticEmbeddingService:batchRegenerateEmbeddings \
  '{"collection":"resumes","batchSize":2,"delayMs":3000}'
```

Monitor the results, then scale up if successful!

